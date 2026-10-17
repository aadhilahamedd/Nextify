const Booking = require('../models/Booking');
const { generateBookingNumber } = require('../utils/bookingNumber');
const { calculatePrice, normalizeServiceType } = require('./pricingService');
const { isVehicleAvailable } = require('./availabilityService');

function httpError(statusCode, message, details) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (details) err.details = details;
  return err;
}

async function createBookingFromPayload(body, { userId } = {}) {
  const serviceType = normalizeServiceType(body.serviceType);

  if (!body.customer?.name && !body.name) {
    throw httpError(400, 'Customer name is required');
  }

  const travelDate = body.travelDate || body.schedule?.pickupDateTime?.split('T')[0];
  const travelTime = body.travelTime || body.schedule?.pickupDateTime?.split('T')[1];
  const pickupDateTime =
    body.schedule?.pickupDateTime ||
    (travelDate && travelTime ? `${travelDate}T${travelTime}` : null) ||
    body.arrivalDateTime ||
    body.pickupDateTime;

  if (!pickupDateTime) {
    throw httpError(400, 'Travel date and time is required');
  }
  if (new Date(pickupDateTime) < new Date()) {
    throw httpError(400, 'Travel date and time cannot be in the past');
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
      throw httpError(409, 'Selected vehicle is not available for this time slot', [
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
      email: (body.customer?.email || body.email || '').toLowerCase(),
      mobile: body.customer?.mobile || body.mobile,
    },
    user: userId || null,
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
  return { booking, quote };
}

module.exports = { createBookingFromPayload };
