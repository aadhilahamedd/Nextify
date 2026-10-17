const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const paymentService = require('../services/paymentService');
const { success, error } = require('../utils/apiResponse');

function notifyWhatsAppPayment(result) {
  setImmediate(() => {
    Promise.resolve()
      .then(() => require('../services/whatsapp/whatsappBookingService').notifyPaymentResult(result))
      .catch((err) => console.error('[whatsapp] payment notify failed', err.message));
  });
}

function publicResult(payment, booking, extra = {}) {
  return {
    payment: paymentService.toSafePayment(payment),
    booking: booking?.toPublicJSON ? booking.toPublicJSON() : booking,
    checkout: extra.checkout,
    verified: extra.verified,
    status: extra.status,
  };
}

exports.createPayment = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return error(res, 400, 'Booking id is required');

    const booking = await Booking.findById(bookingId);
    if (!booking) return error(res, 404, 'Booking not found');

    if (booking.customQuoteRequired || booking.paymentStatus === 'NOT_REQUIRED') {
      return error(res, 400, 'This booking does not require online payment');
    }

    if (booking.paymentStatus === 'PAID') {
      return error(res, 409, 'Booking already paid');
    }

    const result = await paymentService.createOrReuseCheckout(booking);
    return success(res, result.payment.createdAt?.getTime() === result.payment.updatedAt?.getTime() ? 201 : 200, 'Payment ready', publicResult(result.payment, result.booking, {
      checkout: result.checkout,
    }));
  } catch (err) {
    next(err);
  }
};

exports.mockComplete = async (req, res, next) => {
  try {
    const { paymentId } = req.body;
    const payment = await Payment.findById(paymentId);
    if (!payment) return error(res, 404, 'Payment not found');
    if (payment.provider !== 'mock') {
      return error(res, 400, 'This payment must be verified through Moyasar');
    }
    const result = await paymentService.completePayment(paymentId, 'success');
    notifyWhatsAppPayment({ ...result, mappedStatus: 'PAID' });
    return success(res, 200, 'Payment completed successfully', {
      payment: paymentService.toSafePayment(result.payment),
      booking: result.booking.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
};

exports.mockFail = async (req, res, next) => {
  try {
    const { paymentId } = req.body;
    const payment = await Payment.findById(paymentId);
    if (!payment) return error(res, 404, 'Payment not found');
    if (payment.provider !== 'mock') {
      return error(res, 400, 'This payment must be verified through Moyasar');
    }
    const result = await paymentService.completePayment(paymentId, 'fail');
    notifyWhatsAppPayment({ ...result, mappedStatus: 'FAILED' });
    return success(res, 200, 'Payment marked as failed', {
      payment: paymentService.toSafePayment(result.payment),
      booking: result.booking.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const paymentId = req.params.id || req.params.paymentId;
    if (!paymentId) return error(res, 400, 'Payment id is required');

    const result = await paymentService.verifyPayment(paymentId);
    const mapped = result.mappedStatus || result.payment.status;
    const verified = mapped === 'PAID';
    notifyWhatsAppPayment(result);

    return success(res, verified ? 200 : 422, verified ? 'Payment verified' : 'Payment not successful', {
      payment: paymentService.toSafePayment(result.payment),
      booking: result.booking?.toPublicJSON ? result.booking.toPublicJSON() : result.booking,
      verified,
      status: mapped,
    });
  } catch (err) {
    next(err);
  }
};

exports.attachMoyasarReference = async (req, res, next) => {
  try {
    const { paymentId, moyasarPaymentId } = req.body;
    if (!paymentId || !moyasarPaymentId) {
      return error(res, 400, 'paymentId and moyasarPaymentId are required');
    }
    const payment = await paymentService.attachMoyasarReference(paymentId, moyasarPaymentId);
    return success(res, 200, 'Payment reference saved', {
      payment: paymentService.toSafePayment(payment),
    });
  } catch (err) {
    next(err);
  }
};

exports.webhook = async (req, res, next) => {
  try {
    const result = await paymentService.handleWebhook(req.body);
    notifyWhatsAppPayment(result);
    return success(res, 200, 'Webhook processed', {
      payment: paymentService.toSafePayment(result.payment),
      bookingNumber: result.booking?.bookingNumber,
      status: result.mappedStatus || result.payment.status,
    });
  } catch (err) {
    next(err);
  }
};

exports.getPaymentByBooking = async (req, res, next) => {
  try {
    const payments = await Payment.find({ booking: req.params.bookingId }).sort({ createdAt: -1 });
    return success(res, 200, 'Payments fetched', {
      payments: payments.map((item) => paymentService.toSafePayment(item)),
    });
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
