const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const mockPaymentProvider = require('./paymentProviders/mockPaymentProvider');
const moyasarPaymentProvider = require('./paymentProviders/moyasarPaymentProvider');
const { assertMoyasarCredentials } = require('./paymentProviders/moyasarConfig');
const { frontendBaseUrl } = require('../config/publicUrls');

const PROVIDER = process.env.PAYMENT_PROVIDER || 'mock';

function getProvider() {
  switch (PROVIDER) {
    case 'moyasar':
      return moyasarPaymentProvider;
    case 'mock':
    default:
      return mockPaymentProvider;
  }
}

function toSafePayment(payment) {
  if (!payment) return null;
  const doc = typeof payment.toObject === 'function' ? payment.toObject() : payment;
  return {
    _id: doc._id,
    booking: doc.booking,
    bookingNumber: doc.bookingNumber,
    amount: doc.amount,
    currency: doc.currency,
    provider: doc.provider,
    providerReference: doc.providerReference,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function createPayment({ booking, amount, currency }) {
  return getProvider().createPayment({ booking, amount, currency });
}

async function completePayment(paymentId, outcome) {
  return mockPaymentProvider.completePayment(paymentId, outcome);
}

async function handleWebhook(payload) {
  return getProvider().handleWebhook(payload);
}

async function verifyPayment(moyasarPaymentId) {
  if (typeof getProvider().verifyPayment !== 'function') {
    const err = new Error('Payment verification is only available for Moyasar');
    err.statusCode = 400;
    throw err;
  }
  return getProvider().verifyPayment(moyasarPaymentId);
}

function getCheckoutConfig(payment, booking) {
  const provider = getProvider();
  if (typeof provider.getCheckoutConfig === 'function') {
    return provider.getCheckoutConfig(payment, booking);
  }
  return { provider: PROVIDER };
}

async function createOrReuseCheckout(bookingDoc) {
  const booking = bookingDoc?._id ? bookingDoc : await Booking.findById(bookingDoc);
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }
  const quoteStatus = booking.pricing?.breakdown?.quoteStatus;
  if (
    booking.customQuoteRequired
    || booking.paymentStatus === 'NOT_REQUIRED'
    || quoteStatus === 'rate_on_request'
    || quoteStatus === 'long_distance'
  ) {
    const err = new Error('This booking does not require online payment');
    err.statusCode = 400;
    throw err;
  }
  if (booking.paymentStatus === 'PAID') {
    const err = new Error('Booking already paid');
    err.statusCode = 409;
    throw err;
  }
  if (booking.bookingStatus === 'CANCELLED' && String(booking.paymentStatus || '').toUpperCase() !== 'FAILED') {
    const err = new Error('This booking has been cancelled');
    err.statusCode = 400;
    throw err;
  }
  if (PROVIDER === 'moyasar') assertMoyasarCredentials({ force: true });

  const alreadyPaid = await Payment.findOne({ booking: booking._id, status: 'PAID' });
  if (alreadyPaid) {
    const err = new Error('Booking already paid');
    err.statusCode = 409;
    throw err;
  }

  const amount = Number(booking.pricing?.totalAmount ?? booking.quotedPrice ?? 0);
  const currency = booking.pricing?.currency || 'SAR';
  if (!Number.isFinite(amount) || amount < 1) {
    const err = new Error('Invalid booking amount');
    err.statusCode = 400;
    throw err;
  }

  // Reuse only an open attempt with no Moyasar id yet. Attempts that already have a
  // providerReference are immutable history and must not be reused for a new checkout.
  let payment = await Payment.findOne({
    booking: booking._id,
    status: 'PENDING',
    $or: [{ providerReference: { $in: ['', null] } }, { providerReference: { $exists: false } }],
  }).sort({ createdAt: -1 });

  let createdFreshPayment = false;
  if (!payment) {
    try {
      payment = await createPayment({ booking, amount, currency });
      createdFreshPayment = true;
    } catch (err) {
      // Race: another request created the open PENDING attempt first.
      if (err.code === 11000) {
        payment = await Payment.findOne({
          booking: booking._id,
          status: 'PENDING',
          $or: [{ providerReference: { $in: ['', null] } }, { providerReference: { $exists: false } }],
        }).sort({ createdAt: -1 });
      }
      if (!payment) throw err;
    }
  }

  if (
    payment
    && (
      booking.bookingStatus === 'CANCELLED'
      || String(booking.paymentStatus || '').toUpperCase() === 'FAILED'
    )
  ) {
    // Reused/created attempt after a failed/cancelled cycle: atomically reopen checkout state
    // only if the booking has not concurrently transitioned to PAID or become ineligible.
    const reopened = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        customQuoteRequired: { $ne: true },
        paymentStatus: { $nin: ['PAID', 'paid', 'NOT_REQUIRED', 'not_required'] },
        $or: [
          { bookingStatus: { $nin: ['CANCELLED', 'cancelled'] } },
          { paymentStatus: { $in: ['FAILED', 'failed'] } },
        ],
      },
      {
        $set: {
          paymentStatus: 'PENDING',
          bookingStatus: 'PAYMENT_PENDING',
        },
      },
      { new: true }
    );
    if (!reopened) {
      const latest = await Booking.findById(booking._id);
      if (String(latest?.paymentStatus || '').toUpperCase() === 'PAID') {
        const err = new Error('Booking already paid');
        err.statusCode = 409;
        throw err;
      }
      const err = new Error('This booking is not eligible for checkout');
      err.statusCode = 409;
      throw err;
    }
  }

  const refreshed = await Booking.findById(booking._id);
  if (String(refreshed?.paymentStatus || '').toUpperCase() === 'PAID') {
    if (createdFreshPayment && payment?._id) {
      try {
        await Payment.deleteOne({
          _id: payment._id,
          status: 'PENDING',
          providerReference: '',
        });
      } catch {
        // Best-effort cleanup of unused orphaned attempt; never mask 409 already-paid.
      }
    }
    const err = new Error('Booking already paid');
    err.statusCode = 409;
    throw err;
  }
  return {
    payment,
    booking: refreshed,
    checkout: getCheckoutConfig(payment, refreshed),
    paymentUrl: `${frontendBaseUrl()}/payment?bookingId=${booking._id}`,
  };
}

async function attachMoyasarReference(localPaymentId, moyasarPaymentId) {
  if (typeof moyasarPaymentProvider.attachReference !== 'function') {
    const err = new Error('Moyasar is not available');
    err.statusCode = 400;
    throw err;
  }
  return moyasarPaymentProvider.attachReference(localPaymentId, moyasarPaymentId);
}

module.exports = {
  createPayment,
  completePayment,
  handleWebhook,
  verifyPayment,
  getCheckoutConfig,
  attachMoyasarReference,
  createOrReuseCheckout,
  toSafePayment,
  PROVIDER,
};
