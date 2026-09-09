const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const paymentService = require('../services/paymentService');
const { success, error } = require('../utils/apiResponse');

exports.createPayment = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return error(res, 404, 'Booking not found');

    const existing = await Payment.findOne({ booking: bookingId, status: 'PENDING' });
    if (existing) {
      return success(res, 200, 'Existing pending payment', { payment: existing, booking: booking.toPublicJSON() });
    }

    const payment = await paymentService.createPayment({
      booking,
      amount: booking.pricing?.totalAmount || 0,
      currency: booking.pricing?.currency || 'SAR',
    });

    const refreshed = await Booking.findById(bookingId);
    return success(res, 201, 'Payment created', { payment, booking: refreshed.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

exports.mockComplete = async (req, res, next) => {
  try {
    const { paymentId } = req.body;
    const result = await paymentService.completePayment(paymentId, 'success');
    return success(res, 200, 'Payment completed successfully', result);
  } catch (err) {
    next(err);
  }
};

exports.mockFail = async (req, res, next) => {
  try {
    const { paymentId } = req.body;
    const result = await paymentService.completePayment(paymentId, 'fail');
    return success(res, 200, 'Payment marked as failed', result);
  } catch (err) {
    next(err);
  }
};

exports.webhook = async (req, res, next) => {
  try {
    const result = await paymentService.handleWebhook(req.body);
    return success(res, 200, 'Webhook processed', result);
  } catch (err) {
    next(err);
  }
};

exports.getPaymentByBooking = async (req, res, next) => {
  try {
    const payments = await Payment.find({ booking: req.params.bookingId }).sort({ createdAt: -1 });
    return success(res, 200, 'Payments fetched', { payments });
  } catch (err) {
    next(err);
  }
};

exports.getAllPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find().populate('booking', 'bookingNumber customer bookingStatus').sort({ createdAt: -1 });
    return success(res, 200, 'Payments fetched', { payments });
  } catch (err) {
    next(err);
  }
};
