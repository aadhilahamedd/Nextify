const Payment = require('../../models/Payment');
const Booking = require('../../models/Booking');

async function createPayment({ booking, amount, currency = 'SAR' }) {
  const payment = await Payment.create({
    booking: booking._id,
    bookingNumber: booking.bookingNumber,
    amount,
    currency,
    provider: 'mock',
    status: 'PENDING',
    providerReference: `MOCK-${Date.now()}`,
  });

  booking.paymentStatus = 'PENDING';
  booking.bookingStatus = 'PAYMENT_PENDING';
  await booking.save();

  return payment;
}

async function completePayment(paymentId, outcome = 'success') {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new Error('Payment not found');

  const booking = await Booking.findById(payment.booking);
  if (!booking) throw new Error('Booking not found for payment');

  if (outcome === 'success') {
    payment.status = 'PAID';
    booking.paymentStatus = 'PAID';
    booking.bookingStatus = 'CONFIRMED';
  } else if (outcome === 'fail') {
    payment.status = 'FAILED';
    booking.paymentStatus = 'FAILED';
    booking.bookingStatus = 'PAYMENT_PENDING';
  } else if (outcome === 'cancel') {
    payment.status = 'CANCELLED';
    booking.paymentStatus = 'PENDING';
    booking.bookingStatus = 'PAYMENT_PENDING';
  }

  await payment.save();
  await booking.save();

  return { payment, booking };
}

async function handleWebhook(payload) {
  const { paymentId, status } = payload || {};
  if (!paymentId) throw new Error('Invalid webhook payload');

  const outcome =
    status === 'PAID' ? 'success' : status === 'FAILED' ? 'fail' : 'cancel';
  return completePayment(paymentId, outcome);
}

function getCheckoutConfig(payment) {
  return {
    provider: 'mock',
    paymentId: payment._id,
    amount: payment.amount,
    currency: payment.currency || 'SAR',
  };
}

module.exports = { createPayment, completePayment, handleWebhook, getCheckoutConfig };
