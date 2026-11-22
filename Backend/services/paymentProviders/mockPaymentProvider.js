const Payment = require('../../models/Payment');
const Booking = require('../../models/Booking');

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function createPayment({ booking, amount, currency = 'SAR' }) {
  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      customQuoteRequired: { $ne: true },
      paymentStatus: { $nin: ['PAID', 'paid', 'NOT_REQUIRED', 'not_required'] },
      'pricing.breakdown.quoteStatus': { $nin: ['rate_on_request', 'long_distance'] },
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
  if (!updatedBooking) {
    const latest = await Booking.findById(booking._id);
    if (String(latest?.paymentStatus || '').toUpperCase() === 'PAID') {
      throw httpError(409, 'Booking already paid');
    }
    throw httpError(409, 'This booking is not eligible for checkout');
  }

  const payment = await Payment.create({
    booking: updatedBooking._id,
    bookingNumber: updatedBooking.bookingNumber,
    amount,
    currency,
    provider: 'mock',
    status: 'PENDING',
    providerReference: `MOCK-${Date.now()}`,
  });

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
    booking.checkoutTokenHash = '';
    booking.checkoutTokenExpiresAt = null;
  } else if (outcome === 'fail') {
    payment.status = 'FAILED';
    booking.paymentStatus = 'FAILED';
    booking.bookingStatus = 'CANCELLED';
  } else if (outcome === 'cancel') {
    payment.status = 'CANCELLED';
    booking.paymentStatus = 'FAILED';
    booking.bookingStatus = 'CANCELLED';
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
