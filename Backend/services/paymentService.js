const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const mockPaymentProvider = require('./paymentProviders/mockPaymentProvider');
const moyasarPaymentProvider = require('./paymentProviders/moyasarPaymentProvider');

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

function frontendBaseUrl() {
  return (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
}

async function createOrReuseCheckout(bookingDoc) {
  const booking = bookingDoc?._id ? bookingDoc : await Booking.findById(bookingDoc);
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }
  if (booking.customQuoteRequired || booking.paymentStatus === 'NOT_REQUIRED') {
    const err = new Error('This booking does not require online payment');
    err.statusCode = 400;
    throw err;
  }
  if (booking.paymentStatus === 'PAID') {
    const err = new Error('Booking already paid');
    err.statusCode = 409;
    throw err;
  }

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

  let payment = await Payment.findOne({ booking: booking._id, status: 'PENDING' }).sort({ createdAt: -1 });
  if (!payment) {
    payment = await createPayment({ booking, amount, currency });
  }

  const refreshed = await Booking.findById(booking._id);
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
