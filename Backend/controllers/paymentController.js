const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const paymentService = require('../services/paymentService');
const {
  assertMoyasarCredentials,
  customerLivePaymentsEnabled,
  moyasarMode,
} = require('../services/paymentProviders/moyasarConfig');
const { mockPaymentEndpointsEnabled } = require('../services/paymentProviders/mockPaymentGuard');
const { generateBookingNumber } = require('../utils/bookingNumber');
const { success, error } = require('../utils/apiResponse');
const { toCheckoutBooking, toPaymentConfirmationBooking } = require('../utils/checkoutBooking');
const {
  CHECKOUT_UNAUTHORIZED_MESSAGE,
  authorizeBookingCheckout,
  isValidObjectIdString,
} = require('../utils/checkoutToken');

const ADMIN_LIVE_TEST_AMOUNT_SAR = 1;
const ADMIN_LIVE_TEST_CURRENCY = 'SAR';
let adminLiveTestInFlight = null;

function notifyWhatsAppPayment(result) {
  if (result?.booking?.isInternalPaymentTest) return;
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
    const { bookingId, expectedMode } = req.body;
    if (!bookingId) return error(res, 400, 'Booking id is required');
    if (expectedMode !== undefined && expectedMode !== null && String(expectedMode).trim() !== '') {
      const normalizedExpected = String(expectedMode).trim().toLowerCase();
      if (normalizedExpected !== 'test' && normalizedExpected !== 'live') {
        return error(res, 400, 'Invalid expected payment mode');
      }
      if ((process.env.PAYMENT_PROVIDER || 'mock') === 'moyasar') {
        const activeMode = moyasarMode();
        if (normalizedExpected !== activeMode) {
          return error(res, 409, 'Payment mode mismatch between frontend and backend');
        }
      }
    }
    if ((process.env.PAYMENT_PROVIDER || 'mock') === 'moyasar') {
      const activeMode = moyasarMode();
      if (activeMode === 'live' && !customerLivePaymentsEnabled()) {
        return error(
          res,
          503,
          'Online card payments are currently unavailable. Please complete your booking via WhatsApp assistance.'
        );
      }
    }
    if (!isValidObjectIdString(String(bookingId))) {
      return error(res, 403, CHECKOUT_UNAUTHORIZED_MESSAGE);
    }

    const booking = await Booking.findById(bookingId).select('+checkoutTokenHash +checkoutTokenExpiresAt');
    if (booking?.isInternalPaymentTest) {
      return error(res, 403, CHECKOUT_UNAUTHORIZED_MESSAGE);
    }
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
  const startedAt = Date.now();
  const eventType = typeof req.body?.type === 'string' ? req.body.type : null;
  const eventId = req.body?.id != null ? String(req.body.id) : null;
  const moyasarPaymentId = req.body?.data?.id != null ? String(req.body.data.id) : null;

  try {
    const result = await paymentService.handleWebhook(req.body);
    const durationMs = Date.now() - startedAt;

    if (result?.verification || result?.ignored) {
      console.log('[payments] Moyasar webhook accepted', {
        eventType,
        eventId,
        verification: Boolean(result.verification),
        ignored: Boolean(result.ignored),
        reason: result.reason || null,
        durationMs,
      });
      return success(res, 200, 'Webhook accepted', {
        received: true,
        verification: Boolean(result.verification),
        ignored: Boolean(result.ignored),
        ...(result.reason ? { reason: result.reason } : {}),
      });
    }
    if (!result.reused && !result.duplicateCharge) notifyWhatsAppPayment(result);
    console.log('[payments] Moyasar webhook processed', {
      eventType,
      eventId,
      moyasarPaymentId,
      bookingNumber: result.booking?.bookingNumber || null,
      status: result.mappedStatus || result.payment?.status || null,
      reused: Boolean(result.reused),
      duplicateCharge: Boolean(result.duplicateCharge),
      durationMs,
    });
    return success(res, 200, result.manualInterventionRequired ? result.message : 'Webhook processed', {
      payment: paymentService.toSafePayment(result.payment),
      bookingNumber: result.booking?.bookingNumber,
      status: result.mappedStatus || result.payment?.status,
      duplicateCharge: Boolean(result.duplicateCharge),
      manualInterventionRequired: Boolean(result.manualInterventionRequired),
    });
  } catch (err) {
    console.error('[payments] Moyasar webhook failed', {
      eventType,
      eventId,
      moyasarPaymentId,
      statusCode: err?.statusCode || err?.status || 500,
      errorCode: err?.code || null,
      message: err?.message || 'Webhook processing error',
      durationMs: Date.now() - startedAt,
    });
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
    const payments = await Payment.find()
      .populate('booking', 'bookingNumber customer bookingStatus isInternalPaymentTest')
      .sort({ createdAt: -1 });
    return success(res, 200, 'Payments fetched', { payments });
  } catch (err) {
    next(err);
  }
};

function toAdminTestBookingSummary(booking) {
  if (!booking) return null;
  const doc = typeof booking.toObject === 'function' ? booking.toObject() : booking;
  return {
    _id: doc._id,
    bookingNumber: doc.bookingNumber,
    isInternalPaymentTest: Boolean(doc.isInternalPaymentTest),
    paymentStatus: doc.paymentStatus,
    bookingStatus: doc.bookingStatus,
    quotedPrice: doc.quotedPrice ?? doc.pricing?.totalAmount ?? ADMIN_LIVE_TEST_AMOUNT_SAR,
    pricing: {
      totalAmount: doc.pricing?.totalAmount ?? doc.quotedPrice ?? ADMIN_LIVE_TEST_AMOUNT_SAR,
      currency: doc.pricing?.currency || ADMIN_LIVE_TEST_CURRENCY,
    },
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

exports.getAdminLivePaymentTestStatus = async (req, res, next) => {
  try {
    const provider = process.env.PAYMENT_PROVIDER || 'mock';
    let mode = null;
    if (provider === 'moyasar') {
      try {
        mode = moyasarMode();
      } catch {
        mode = null;
      }
    }

    const latestBooking = await Booking.findOne({ isInternalPaymentTest: true }).sort({ createdAt: -1 });
    const latestPayment = latestBooking
      ? await Payment.findOne({ booking: latestBooking._id }).sort({ createdAt: -1 })
      : null;

    const activePending = await Booking.findOne({
      isInternalPaymentTest: true,
      paymentStatus: 'PENDING',
    }).sort({ createdAt: -1 });

    return success(res, 200, 'Admin live payment test status fetched', {
      provider,
      moyasarMode: mode,
      customerLivePaymentsEnabled: customerLivePaymentsEnabled(),
      hasActivePendingTest: Boolean(activePending),
      latestTest: latestBooking
        ? {
            booking: toAdminTestBookingSummary(latestBooking),
            payment: paymentService.toSafePayment(latestPayment),
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
};

async function createOrReuseAdminLivePaymentTest() {
  const provider = process.env.PAYMENT_PROVIDER || 'mock';
  if (provider !== 'moyasar') {
    const err = new Error('Moyasar payment provider must be active for the LIVE payment test');
    err.statusCode = 409;
    throw err;
  }

  const { mode } = assertMoyasarCredentials({ force: true });
  if (mode !== 'live') {
    const err = new Error('Admin 1 SAR LIVE payment test requires MOYASAR_ENV=live');
    err.statusCode = 409;
    throw err;
  }

  const existingPending = await Booking.findOne({
    isInternalPaymentTest: true,
    paymentStatus: 'PENDING',
  }).sort({ createdAt: -1 });

  if (existingPending) {
    const checkoutResult = await paymentService.createOrReuseCheckout(existingPending);
    return {
      reused: true,
      booking: toAdminTestBookingSummary(checkoutResult.booking),
      payment: paymentService.toSafePayment(checkoutResult.payment),
      checkout: checkoutResult.checkout,
    };
  }

  const bookingNumber = generateBookingNumber().replace(/^NXT-/, 'NXT-TEST-');
  const testBooking = new Booking({
    bookingNumber,
    isInternalPaymentTest: true,
    customer: {
      name: 'ADMIN PAYMENT TEST',
      email: 'internal-payment-test@nextifylimo.invalid',
      mobile: '0000000000',
    },
    user: null,
    serviceType: 'city_transfer',
    origin: 'INTERNAL ADMIN LIVE PAYMENT TEST',
    destinationText: 'INTERNAL ADMIN LIVE PAYMENT TEST',
    vehicleCategory: 'internal_test',
    quotedPrice: ADMIN_LIVE_TEST_AMOUNT_SAR,
    pricingType: 'fixed',
    customQuoteRequired: false,
    pickup: { address: 'INTERNAL ADMIN LIVE PAYMENT TEST' },
    destination: { address: 'INTERNAL ADMIN LIVE PAYMENT TEST' },
    schedule: { pickupDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    vehicle: {
      carId: null,
      name: 'ADMIN PAYMENT TEST',
      type: 'internal_test',
    },
    pricing: {
      basePrice: ADMIN_LIVE_TEST_AMOUNT_SAR,
      totalAmount: ADMIN_LIVE_TEST_AMOUNT_SAR,
      currency: ADMIN_LIVE_TEST_CURRENCY,
      breakdown: {
        pricingType: 'internal_payment_test',
        label: 'ADMIN PAYMENT TEST',
      },
    },
    paymentStatus: 'PENDING',
    bookingStatus: 'PAYMENT_PENDING',
    specialRequests: 'Internal admin 1 SAR LIVE payment verification test — do not dispatch.',
  });

  await testBooking.save();

  const checkoutResult = await paymentService.createOrReuseCheckout(testBooking);
  return {
    reused: false,
    booking: toAdminTestBookingSummary(checkoutResult.booking),
    payment: paymentService.toSafePayment(checkoutResult.payment),
    checkout: checkoutResult.checkout,
  };
}

exports.createAdminLivePaymentTest = async (req, res, next) => {
  try {
    // Strictly ignore req.body — amount (1 SAR), currency (SAR), provider, and mode are server-enforced.
    if (!adminLiveTestInFlight) {
      adminLiveTestInFlight = createOrReuseAdminLivePaymentTest().finally(() => {
        adminLiveTestInFlight = null;
      });
    }
    const result = await adminLiveTestInFlight;
    return success(
      res,
      result.reused ? 200 : 201,
      result.reused ? 'Active 1 SAR LIVE payment test resumed' : '1 SAR LIVE payment test created',
      result
    );
  } catch (err) {
    next(err);
  }
};
