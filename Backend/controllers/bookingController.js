const Booking = require('../models/Booking');
const { generateBookingNumber } = require('../utils/bookingNumber');
const { calculatePrice, normalizeServiceType } = require('../services/pricingService');
const { isVehicleAvailable, isDriverAvailable } = require('../services/availabilityService');
const { success, error } = require('../utils/apiResponse');

exports.createBooking = async (req, res, next) => {
  try {
    const body = req.body;
    const serviceType = normalizeServiceType(body.serviceType);

    if (!body.customer?.name && !body.name) {
      return error(res, 400, 'Customer name is required');
    }

    const travelDate = body.travelDate || body.schedule?.pickupDateTime?.split('T')[0];
    const travelTime = body.travelTime || body.schedule?.pickupDateTime?.split('T')[1];
    const pickupDateTime =
      body.schedule?.pickupDateTime ||
      (travelDate && travelTime ? `${travelDate}T${travelTime}` : null) ||
      body.arrivalDateTime ||
      body.pickupDateTime;

    if (!pickupDateTime) {
      return error(res, 400, 'Travel date and time is required');
    }
    if (new Date(pickupDateTime) < new Date()) {
      return error(res, 400, 'Travel date and time cannot be in the past');
    }

    const quote = await calculatePrice({
      serviceType,
      vehicleCategory: body.vehicleCategory,
      vehicleName: body.vehicleName || body.vehicle?.label || body.vehicle?.name,
      airport: body.airport,
      origin: body.origin || body.pickup?.address || body.pickupLocation,
      destination: body.destination || body.destinationText || body.dropoffLocation,
      durationType: body.durationType,
      distanceKm: body.distanceKm,
    });

    if (body.vehicle?.carId && !quote.customQuoteRequired) {
      const availability = await isVehicleAvailable(
        body.vehicle.carId,
        body.vehicleName,
        pickupDateTime
      );
      if (!availability.available) {
        return error(res, 409, 'Selected vehicle is not available for this time slot', [
          `Conflict with booking ${availability.conflictBooking}`,
        ]);
      }
    }

    let bookingNumber = generateBookingNumber();
    for (let i = 0; i < 5; i += 1) {
      const exists = await Booking.findOne({ bookingNumber });
      if (!exists) break;
      bookingNumber = generateBookingNumber();
    }

    const vehicleLabel =
      body.vehicleName ||
      body.vehicle?.label ||
      quote.displayLabel ||
      body.vehicleCategory ||
      '';

    const booking = new Booking({
      bookingNumber,
      customer: {
        name: body.customer?.name || body.name,
        email: (body.customer?.email || body.email).toLowerCase(),
        mobile: body.customer?.mobile || body.mobile,
      },
      user: req.user?.userId || null,
      serviceType,
      airport: body.airport || '',
      routeType: quote.pricingType || 'fixed',
      origin: body.origin || body.pickup?.address || body.pickupLocation || '',
      destinationText: body.destination || body.destinationText || body.dropoffLocation || '',
      vehicleCategory: body.vehicleCategory || quote.vehicleCategory || '',
      durationType: body.durationType || '',
      distanceKm: body.distanceKm ?? null,
      quotedPrice: quote.price,
      pricingType: quote.pricingType,
      customQuoteRequired: quote.customQuoteRequired,
      pricingRuleId: quote.pricingRuleId || null,
      pickup: body.pickup || { address: body.pickupLocation || body.origin || '' },
      destination: body.destination
        ? { address: typeof body.destination === 'string' ? body.destination : body.destination.address }
        : { address: body.dropoffLocation || body.destinationText || '' },
      schedule: { pickupDateTime: new Date(pickupDateTime) },
      flight: {
        flightNumber: body.flightNumber || body.flight?.flightNumber || '',
        airline: body.flight?.airline || '',
      },
      vehicle: {
        carId: body.vehicle?.carId || null,
        name: vehicleLabel,
        type: body.vehicle?.type || body.vehicleCategory || '',
        label: vehicleLabel,
      },
      trip: {
        passengerCount: body.passengers || body.trip?.passengerCount || body.passengerCount || 1,
        luggageCount: body.luggage || body.trip?.luggageCount || body.luggageCount || 0,
      },
      pricing: {
        totalAmount: quote.price ?? 0,
        currency: quote.currency || 'SAR',
        breakdown: {
          pricingType: quote.pricingType,
          message: quote.message,
          displayLabel: quote.displayLabel,
        },
      },
      paymentStatus: quote.customQuoteRequired ? 'NOT_REQUIRED' : 'PENDING',
      bookingStatus: quote.customQuoteRequired ? 'PENDING' : 'PAYMENT_PENDING',
      specialRequests: body.specialRequests || body.specialRequest || '',
    });

    await booking.save();
    return success(res, 201, quote.customQuoteRequired ? 'Quote request submitted' : 'Booking created successfully', {
      booking: booking.toPublicJSON(),
      quote,
    });
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

exports.trackBooking = async (req, res, next) => {
  try {
    const { bookingNumber } = req.params;
    const { email, mobile } = req.query;
    if (!email && !mobile) return error(res, 400, 'Email or mobile is required to track booking');

    const booking = await Booking.findOne({ bookingNumber }).populate('driver', 'name phone email status');
    if (!booking) return error(res, 404, 'Booking not found');

    const customerEmail = (booking.customer?.email || booking.email || '').toLowerCase();
    const customerMobile = booking.customer?.mobile || booking.mobile || '';
    const emailMatch = email && customerEmail === email.toLowerCase();
    const mobileMatch =
      mobile && customerMobile.replace(/\D/g, '').endsWith(String(mobile).replace(/\D/g, '').slice(-9));

    if (!emailMatch && !mobileMatch) {
      return error(res, 403, 'Booking details do not match provided contact information');
    }

    const normalized = Booking.normalizeLegacy(booking.toObject());
    if (!['DRIVER_ASSIGNED', 'DRIVER_ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED'].includes(normalized.bookingStatus)) {
      delete normalized.driver;
    }
    return success(res, 200, 'Booking found', { booking: normalized });
  } catch (err) {
    next(err);
  }
};

exports.updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return error(res, 404, 'Booking not found');
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
    const bookings = await Booking.find({});
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
