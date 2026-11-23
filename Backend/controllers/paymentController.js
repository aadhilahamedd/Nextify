const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const paymentService = require('../services/paymentService');
const { mockPaymentEndpointsEnabled } = require('../services/paymentProviders/mockPaymentGuard');
const { success, error } = require('../utils/apiResponse');
const { toCheckoutBooking, toPaymentConfirmationBooking } = require('../utils/checkoutBooking');
const {
  CHECKOUT_UNAUTHORIZED_MESSAGE,
  authorizeBookingCheckout,
  isValidObjectIdString,
} = require('../utils/checkoutToken');

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
    if (!isValidObjectIdString(String(bookingId))) {
      return error(res, 403, CHECKOUT_UNAUTHORIZED_MESSAGE);
    }

    const booking = await Booking.findById(bookingId).select('+checkoutTokenHash +checkoutTokenExpiresAt');
    const auth = await authorizeBookingCheckout(req, booking);
    if (!auth.authorized) {
      return error(res, auth.statusCode, auth.message);
    }

    const quoteStatus = booking.pricing?.breakdown?.quoteStatus;
    if (
      booking.customQuoteRequired
      || booking.paymentStatus === 'NOT_REQUIRED'
      || quoteStatus === 'rate_on_request'
      || quoteStatus === 'long_distance'
    ) {
      return error(res, 400, 'This booking does not require online payment');
    }

    if (String(booking.paymentStatus || '').toUpperCase() === 'PAID') {
      return error(res, 409, 'Booking already paid');
    }
    if (String(booking.paymentStatus || '').toUpperCase() === 'REFUNDED') {
      return error(res, 409, 'Booking has been refunded and is not eligible for checkout');
    }

    const result = await paymentService.createOrReuseCheckout(booking);
    return success(res, result.payment.createdAt?.getTime() === result.payment.updatedAt?.getTime() ? 201 : 200, 'Payment ready', {
      payment: paymentService.toSafePayment(result.payment),
      booking: toCheckoutBooking(result.booking),
      checkout: result.checkout,
    });
  } catch (err) {
    next(err);
  }
};

exports.mockComplete = async (req, res, next) => {
  try {
    if (!mockPaymentEndpointsEnabled()) return error(res, 404, 'Not found');
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
    if (!mockPaymentEndpointsEnabled()) return error(res, 404, 'Not found');
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
    if (!result.reused && !result.duplicateCharge) notifyWhatsAppPayment(result);

    const httpMessage = result.manualInterventionRequired
      ? result.message
      : (verified ? 'Payment verified' : 'Payment not successful');
    return success(res, verified ? 200 : 422, httpMessage, {
      payment: paymentService.toSafePayment(result.payment),
      booking: toPaymentConfirmationBooking(result.booking, result.payment),
      verified,
      status: mapped,
      duplicateCharge: Boolean(result.duplicateCharge),
      manualInterventionRequired: Boolean(result.manualInterventionRequired),
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
    if (result?.verification || result?.ignored) {
      return success(res, 200, 'Webhook accepted', {
        verification: Boolean(result.verification),
        ignored: Boolean(result.ignored),
      });
    }
    if (!result.reused && !result.duplicateCharge) notifyWhatsAppPayment(result);
    return success(res, 200, result.manualInterventionRequired ? result.message : 'Webhook processed', {
      payment: paymentService.toSafePayment(result.payment),
      bookingNumber: result.booking?.bookingNumber,
      status: result.mappedStatus || result.payment?.status,
      duplicateCharge: Boolean(result.duplicateCharge),
      manualInterventionRequired: Boolean(result.manualInterventionRequired),
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
