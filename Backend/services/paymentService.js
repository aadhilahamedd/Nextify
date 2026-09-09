const mockPaymentProvider = require('./paymentProviders/mockPaymentProvider');

const PROVIDER = process.env.PAYMENT_PROVIDER || 'mock';

function getProvider() {
  switch (PROVIDER) {
    case 'mock':
    default:
      return mockPaymentProvider;
  }
}

async function createPayment({ booking, amount, currency }) {
  return getProvider().createPayment({ booking, amount, currency });
}

async function completePayment(paymentId, outcome) {
  return getProvider().completePayment(paymentId, outcome);
}

async function handleWebhook(payload) {
  return getProvider().handleWebhook(payload);
}

module.exports = { createPayment, completePayment, handleWebhook, PROVIDER };
