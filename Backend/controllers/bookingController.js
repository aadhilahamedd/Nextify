const Booking = require('../models/Booking');
const { isDriverAvailable } = require('../services/availabilityService');
const { createBookingFromPayload } = require('../services/bookingCreateService');
const { success, error } = require('../utils/apiResponse');
const { toCheckoutBooking } = require('../utils/checkoutBooking');
const {
  CHECKOUT_UNAUTHORIZED_MESSAGE,
  authorizeBookingCheckout,
  isValidObjectIdString,
} = require('../utils/checkoutToken');
const {
  MIN_PHONE_DIGITS,
  normalizePhone,
  canonicalizePhone,
  phonesMatch,
} = require('../utils/phoneMatch');

exports.createBooking = async (req, res, next) => {
  try {
    const { booking, quote, checkoutToken } = await createBookingFromPayload(req.body, { userId: req.user?.userId || null });
    return success(res, 201, quote.customQuoteRequired ? 'Quote request submitted' : 'Booking created successfully', {
      booking: booking.toPublicJSON(),
      quote,
      ...(checkoutToken ? { checkoutToken } : {}),
    });
  } catch (err) {
    if (err.statusCode && err.statusCode < 500) {
      return error(res, err.statusCode, err.message, err.details);
    }
    next(err);
  }
};

exports.getPublicPayBooking = async (req, res, next) => {
  try {
    if (!isValidObjectIdString(req.params.id)) {
      return error(res, 403, CHECKOUT_UNAUTHORIZED_MESSAGE);
    }
    // Lean + no populate: avoid accidental driver/customer leakage via refs.
    const booking = await Booking.findById(req.params.id).select(
      '_id bookingNumber user serviceType vehicle vehicleName quotedPrice pricing paymentStatus bookingStatus customQuoteRequired isInternalPaymentTest +checkoutTokenHash +checkoutTokenExpiresAt'
    ).lean();
    if (booking?.isInternalPaymentTest) {
      return error(res, 403, CHECKOUT_UNAUTHORIZED_MESSAGE);
    }
    const auth = await authorizeBookingCheckout(req, booking);
    if (!auth.authorized) {
      return error(res, auth.statusCode, auth.message);
    }
    return success(res, 200, 'Booking fetched', { booking: toCheckoutBooking(booking) });
  } catch (err) {
    next(err);
  }
};

exports.getBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    const normalized = bookings.map((b) => Booking.normalizeLegacy(b.toObject()));
    return success(res, 200, 'Bookings fetched', { bookings: normalized });
  } catch (err) {
    next(err);
  }
};

exports.getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('driver', 'name phone email status');
    if (!booking) return error(res, 404, 'Booking not found');
    return success(res, 200, 'Booking fetched', { booking: Booking.normalizeLegacy(booking.toObject()) });
  } catch (err) {
    next(err);
  }
};

const DRIVER_VISIBLE_STATUSES = ['DRIVER_ASSIGNED', 'DRIVER_ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED'];
const MIN_TRACK_PHONE_DIGITS = MIN_PHONE_DIGITS;

function normalizeTrackEmail(value) {
  return String(value || '').trim().toLowerCase();
}

const normalizeTrackPhone = normalizePhone;
const canonicalizeTrackPhone = canonicalizePhone;
const phonesMatchForTracking = phonesMatch;

/** Public tracking projection — only fields used by TrackBooking.jsx. */
function toPublicTrackBooking(doc) {
  const normalized = Booking.normalizeLegacy(doc.toObject ? doc.toObject() : doc);
  const showDriver = DRIVER_VISIBLE_STATUSES.includes(normalized.bookingStatus);
  return {
    bookingNumber: normalized.bookingNumber,
    bookingStatus: normalized.bookingStatus,
    paymentStatus: normalized.paymentStatus,
    serviceType: normalized.serviceType,
    vehicle: normalized.vehicle?.name
      ? { name: normalized.vehicle.name }
      : undefined,
    vehicleName: normalized.vehicleName || normalized.vehicle?.name || '',
    pickup: normalized.pickup?.address
      ? { address: normalized.pickup.address }
      : undefined,
    pickupLocation: normalized.pickupLocation || normalized.pickup?.address || '',
    destination: normalized.destination?.address
      ? { address: normalized.destination.address }
      : undefined,
    dropoffLocation: normalized.dropoffLocation || normalized.destination?.address || '',
    schedule: normalized.schedule?.pickupDateTime
      ? { pickupDateTime: normalized.schedule.pickupDateTime }
      : undefined,
    arrivalDateTime: normalized.arrivalDateTime || normalized.schedule?.pickupDateTime || null,
    quotedPrice: normalized.quotedPrice,
    pricing: normalized.pricing
      ? {
          totalAmount: normalized.pricing.totalAmount,
          currency: normalized.pricing.currency || 'SAR',
          breakdown: normalized.pricing.breakdown
            ? {
                pricingType: normalized.pricing.breakdown.pricingType,
                message: normalized.pricing.breakdown.message,
              }
            : undefined,
        }
      : undefined,
    pricingType: normalized.pricingType || normalized.pricing?.breakdown?.pricingType,
    customQuoteRequired: Boolean(normalized.customQuoteRequired),
    customer: {
      name: normalized.customer?.name || '',
    },
    driver: showDriver && normalized.driver?.name
      ? {
          name: normalized.driver.name,
          phone: normalized.driver.phone || '',
        }
      : undefined,
  };
}

exports.trackBooking = async (req, res, next) => {
  try {
    const bookingNumber = String(req.body?.bookingNumber || '').trim();
    const emailRaw = req.body?.email;
    const mobileRaw = req.body?.mobile;

    if (!bookingNumber) {
      return error(res, 400, 'Booking number is required');
    }

    const email = normalizeTrackEmail(emailRaw);
    const mobileDigits = normalizeTrackPhone(mobileRaw);
    if (!email && !mobileDigits) {
      return error(res, 400, 'Email or mobile is required to track booking');
    }
    if (mobileRaw && mobileDigits.length > 0 && mobileDigits.length < MIN_TRACK_PHONE_DIGITS) {
      return error(res, 400, 'Mobile number must include at least 9 digits');
    }

    const booking = await Booking.findOne({ bookingNumber }).populate('driver', 'name phone status');
    if (!booking || booking.isInternalPaymentTest) return error(res, 404, 'Booking not found');

    const customerEmail = normalizeTrackEmail(booking.customer?.email || booking.email);
    const customerMobile = booking.customer?.mobile || booking.mobile || '';
    const emailMatch = Boolean(email) && customerEmail === email;
    const mobileMatch = Boolean(mobileDigits) && phonesMatchForTracking(customerMobile, mobileDigits);

    if (!emailMatch && !mobileMatch) {
      return error(res, 403, 'Booking details do not match provided contact information');
    }

    return success(res, 200, 'Booking found', {
      booking: toPublicTrackBooking(booking.toObject()),
    });
  } catch (err) {
    next(err);
  }
};

exports.updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return error(res, 404, 'Booking not found');

    if (booking.isInternalPaymentTest && req.body.driver) {
      return error(res, 400, 'Cannot assign a driver to an internal payment test booking');
    }

    if (req.body.paymentStatus !== undefined) {
      const nextPayment = String(req.body.paymentStatus).toUpperCase();
      const currentPayment = String(booking.paymentStatus || '').toUpperCase();
      // PAID is reserved for verified Moyasar (or mock provider) payment processing.
      if (nextPayment === 'PAID' && currentPayment !== 'PAID') {
        return error(
          res,
          400,
          'paymentStatus PAID can only be set by verified payment processing. For custom quotes use CONFIRMED with NOT_REQUIRED.'
        );
      }
      // NOT_REQUIRED is only valid for server-flagged custom-quote bookings.
      if (nextPayment === 'NOT_REQUIRED' && !booking.customQuoteRequired) {
        return error(
          res,
          400,
          'paymentStatus NOT_REQUIRED is only allowed for custom-quote bookings created by server pricing.'
        );
      }
    }

    if (req.body.bookingStatus !== undefined) {
      const nextStatus = String(req.body.bookingStatus);
      const nextPayment = req.body.paymentStatus !== undefined
        ? String(req.body.paymentStatus).toUpperCase()
        : String(booking.paymentStatus || '').toUpperCase();
      // Approving a custom quote: CONFIRMED + NOT_REQUIRED requires customQuoteRequired.
      if (
        ['CONFIRMED', 'confirmed'].includes(nextStatus)
        && nextPayment === 'NOT_REQUIRED'
        && !booking.customQuoteRequired
      ) {
        return error(
          res,
          400,
          'CONFIRMED with NOT_REQUIRED is only allowed for approved custom-quote bookings.'
        );
      }
    }

    // customQuoteRequired is server-owned (pricing); never accept client/admin body overrides here.
    const allowed = ['bookingStatus', 'paymentStatus', 'specialRequests', 'driver', 'vehicle', 'quotedPrice'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) booking[key] = req.body[key];
    }
    if (req.body.schedule?.pickupDateTime) {
      booking.schedule.pickupDateTime = new Date(req.body.schedule.pickupDateTime);
    }
    await booking.save();
    return success(res, 200, 'Booking updated', { booking: booking.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

exports.assignDriver = async (req, res, next) => {
  try {
    const { driverId } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return error(res, 404, 'Booking not found');

    if (booking.isInternalPaymentTest) {
      return error(res, 400, 'Cannot assign a driver to an internal payment test booking');
    }

    if (['CANCELLED', 'cancelled'].includes(booking.bookingStatus)) {
      return error(res, 400, 'Cannot assign a driver to a cancelled booking');
    }

    const isPaid = String(booking.paymentStatus || '').toUpperCase() === 'PAID';
    const isApprovedExemption =
      Boolean(booking.customQuoteRequired) &&
      ['CONFIRMED', 'confirmed'].includes(booking.bookingStatus) &&
      String(booking.paymentStatus || '').toUpperCase() === 'NOT_REQUIRED';

    if (!isPaid && !isApprovedExemption) {
      return error(
        res,
        400,
        'Cannot assign a driver to an unpaid booking. Driver assignment requires verified payment or an approved custom-quote exemption.'
      );
    }

    const pickupDateTime = booking.schedule?.pickupDateTime || booking.arrivalDateTime;
    const availability = await isDriverAvailable(driverId, pickupDateTime, booking._id);
    if (!availability.available) {
      return error(res, 409, availability.reason || 'Driver not available');
    }

    booking.driver = driverId;
    booking.bookingStatus = 'DRIVER_ASSIGNED';
    await booking.save();

    const Driver = require('../models/Driver');
    await Driver.findByIdAndUpdate(driverId, { status: 'ASSIGNED' });

    const populated = await Booking.findById(booking._id).populate('driver');
    return success(res, 200, 'Driver assigned', { booking: Booking.normalizeLegacy(populated.toObject()) });
  } catch (err) {
    next(err);
  }
};

exports.deleteBooking = async (req, res, next) => {
  try {
    const deleted = await Booking.findByIdAndDelete(req.params.id);
    if (!deleted) return error(res, 404, 'Booking not found');
    return success(res, 200, 'Booking deleted', { booking: deleted });
  } catch (err) {
    next(err);
  }
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ isInternalPaymentTest: { $ne: true } });
    const stats = {
      totalBookings: bookings.length,
      pendingBookings: bookings.filter((b) =>
        ['PENDING', 'PAYMENT_PENDING', 'pending'].includes(b.bookingStatus)
      ).length,
      confirmedBookings: bookings.filter((b) => ['CONFIRMED', 'confirmed'].includes(b.bookingStatus)).length,
      activeTrips: bookings.filter((b) =>
        ['DRIVER_ASSIGNED', 'DRIVER_ON_THE_WAY', 'IN_PROGRESS'].includes(b.bookingStatus)
      ).length,
      completedTrips: bookings.filter((b) => b.bookingStatus === 'COMPLETED').length,
      totalRevenue: bookings
        .filter((b) => b.paymentStatus === 'PAID')
        .reduce((sum, b) => sum + (b.quotedPrice ?? b.pricing?.totalAmount ?? 0), 0),
      recentBookings: bookings
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map((b) => Booking.normalizeLegacy(b.toObject())),
    };
    return success(res, 200, 'Dashboard stats', { stats });
  } catch (err) {
    next(err);
  }
};

exports.addBooking = exports.createBooking;

// Exported for unit tests only — not an HTTP route.
exports._test = {
  normalizeTrackPhone,
  canonicalizeTrackPhone,
  phonesMatchForTracking,
  MIN_TRACK_PHONE_DIGITS,
};
