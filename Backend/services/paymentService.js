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
  toSafePayment,
  PROVIDER,
};
