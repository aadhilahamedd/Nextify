function mockPaymentEndpointsEnabled() {
  if (process.env.NODE_ENV === 'production') return false;
  if (String(process.env.MOYASAR_ENV || 'test').trim().toLowerCase() === 'live') return false;
  return (process.env.PAYMENT_PROVIDER || 'mock') === 'mock';
}

module.exports = { mockPaymentEndpointsEnabled };
