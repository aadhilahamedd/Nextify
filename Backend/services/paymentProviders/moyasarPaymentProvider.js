const crypto = require('crypto');
const Payment = require('../../models/Payment');
const Booking = require('../../models/Booking');
const { retrievePayment } = require('./moyasarClient');

function toHalalas(amountSar) {
  return Math.round(Number(amountSar) * 100);
}

function frontendBaseUrl() {
  return (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function publishableKey() {
  const key = process.env.MOYASAR_PUBLISHABLE_KEY || '';
  if (key && (process.env.MOYASAR_ENV || 'test') !== 'live' && key.startsWith('pk_live_')) {
    const err = new Error('Live Moyasar keys are not allowed while MOYASAR_ENV=test');
    err.statusCode = 500;
    throw err;
  }
  return key;
}

function getCheckoutConfig(payment, booking) {
  return {
    provider: 'moyasar',
    publishableKey: publishableKey(),
    amount: payment.amount,
    amountHalalas: toHalalas(payment.amount),
    currency: payment.currency || 'SAR',
    description: `NEXTIFY ${booking.bookingNumber}`,
    callbackUrl: `${frontendBaseUrl()}/payment-result`,
    metadata: {
      booking_number: String(booking.bookingNumber),
      payment_id: String(payment._id),
    },
  };
}

async function createPayment({ booking, amount, currency = 'SAR' }) {
  const payment = await Payment.create({
    booking: booking._id,
    bookingNumber: booking.bookingNumber,
    amount,
    currency,
    provider: 'moyasar',
    status: 'PENDING',
    metadata: {
      amountHalalas: toHalalas(amount),
      env: process.env.MOYASAR_ENV || 'test',
    },
  });

  booking.paymentStatus = 'PENDING';
  booking.bookingStatus = 'PAYMENT_PENDING';
  await booking.save();

  return payment;
}

async function findLocalPayment(moyasarPayment) {
  const metadata = moyasarPayment?.metadata || {};
  if (metadata.payment_id) {
    const byId = await Payment.findById(metadata.payment_id);
    if (byId) return byId;
  }
  if (moyasarPayment?.id) {
    const byRef = await Payment.findOne({ providerReference: moyasarPayment.id, provider: 'moyasar' });
    if (byRef) return byRef;
  }
  if (metadata.booking_number) {
    return Payment.findOne({
      bookingNumber: metadata.booking_number,
      provider: 'moyasar',
    }).sort({ createdAt: -1 });
  }
  return null;
}

function mapMoyasarStatus(status) {
  switch (String(status || '').toLowerCase()) {
    case 'paid':
    case 'captured':
      return 'PAID';
    case 'failed':
      return 'FAILED';
    case 'refunded':
      return 'REFUNDED';
    case 'voided':
    case 'abandoned':
      return 'CANCELLED';
    default:
      return 'PENDING';
  }
}

async function applyVerifiedStatus(localPayment, moyasarPayment) {
  const booking = await Booking.findById(localPayment.booking);
  if (!booking) {
    const err = new Error('Booking not found for payment');
    err.statusCode = 404;
    throw err;
  }

  localPayment.providerReference = moyasarPayment.id || localPayment.providerReference;
  localPayment.metadata = {
    ...(localPayment.metadata || {}),
    moyasarStatus: moyasarPayment.status,
    moyasarPaymentId: moyasarPayment.id,
  };
  await localPayment.save();

  const expectedHalalas = toHalalas(localPayment.amount);
  const expectedCurrency = (localPayment.currency || 'SAR').toUpperCase();
  const actualCurrency = String(moyasarPayment.currency || '').toUpperCase();
  const actualAmount = Number(moyasarPayment.amount);

  if (actualCurrency && actualCurrency !== expectedCurrency) {
    const err = new Error('Payment currency mismatch');
    err.statusCode = 409;
    throw err;
  }
  if (Number.isFinite(actualAmount) && actualAmount !== expectedHalalas) {
    const err = new Error('Payment amount mismatch');
    err.statusCode = 409;
    throw err;
  }

  const mapped = mapMoyasarStatus(moyasarPayment.status);

  if (mapped === 'PAID') {
    localPayment.status = 'PAID';
    booking.paymentStatus = 'PAID';
    booking.bookingStatus = 'CONFIRMED';
  } else if (mapped === 'FAILED') {
    if (localPayment.status !== 'PAID') {
      localPayment.status = 'FAILED';
      booking.paymentStatus = 'FAILED';
      booking.bookingStatus = 'PAYMENT_PENDING';
    }
  } else if (mapped === 'REFUNDED') {
    localPayment.status = 'REFUNDED';
    booking.paymentStatus = 'REFUNDED';
  } else if (mapped === 'CANCELLED') {
    if (localPayment.status !== 'PAID') {
      localPayment.status = 'CANCELLED';
      booking.paymentStatus = 'PENDING';
      booking.bookingStatus = 'PAYMENT_PENDING';
    }
  }

  await localPayment.save();
  await booking.save();
  return { payment: localPayment, booking, moyasarStatus: moyasarPayment.status, mappedStatus: mapped };
}

async function verifyPayment(moyasarPaymentId) {
  const moyasarPayment = await retrievePayment(moyasarPaymentId);
  const localPayment = await findLocalPayment(moyasarPayment);

  if (!localPayment) {
    const err = new Error('Payment does not belong to a Nextify booking');
    err.statusCode = 404;
    throw err;
  }

  console.log('[payments] Moyasar verification', {
    moyasarId: moyasarPaymentId,
    status: moyasarPayment.status,
    bookingNumber: localPayment.bookingNumber,
  });

  if (localPayment.status === 'PAID' && mapMoyasarStatus(moyasarPayment.status) === 'PAID') {
    const booking = await Booking.findById(localPayment.booking);
    return {
      payment: localPayment,
      booking,
      moyasarStatus: moyasarPayment.status,
      mappedStatus: 'PAID',
      reused: true,
    };
  }

  return applyVerifiedStatus(localPayment, moyasarPayment);
}

function webhookSecretValid(provided) {
  const expected = process.env.MOYASAR_WEBHOOK_SECRET;
  if (!expected) return false;
  const a = Buffer.from(String(provided || ''));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function handleWebhook(payload) {
  if (!webhookSecretValid(payload?.secret_token)) {
    const err = new Error('Invalid webhook');
    err.statusCode = 401;
    throw err;
  }

  const moyasarId = payload?.data?.id;
  if (!moyasarId) {
    const err = new Error('Webhook payment id is missing');
    err.statusCode = 400;
    throw err;
  }

  return verifyPayment(moyasarId);
}

async function attachReference(localPaymentId, moyasarPaymentId) {
  const payment = await Payment.findById(localPaymentId);
  if (!payment) {
    const err = new Error('Payment not found');
    err.statusCode = 404;
    throw err;
  }
  if (payment.provider !== 'moyasar') {
    const err = new Error('Not a Moyasar payment');
    err.statusCode = 400;
    throw err;
  }
  payment.providerReference = moyasarPaymentId;
  payment.metadata = {
    ...(payment.metadata || {}),
    moyasarPaymentId,
  };
  await payment.save();
  return payment;
}

module.exports = {
  createPayment,
  retrievePayment,
  verifyPayment,
  handleWebhook,
  getCheckoutConfig,
  attachReference,
  toHalalas,
};
