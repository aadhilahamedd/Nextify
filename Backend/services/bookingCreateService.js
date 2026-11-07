const Booking = require('../models/Booking');
const { generateBookingNumber } = require('../utils/bookingNumber');
const { calculatePrice, normalizeServiceType } = require('./pricingService');
const { findAirport } = require('../data/saudiAirports');
const { resolveFixedRouteLocation } = require('../data/airportFixedRoutes');
const { findNeighbourhood, formatNeighbourhoodLabel } = require('../data/cityNeighbourhoods');

function bookingLocationAddress(place, fallback = '') {
  const neighbourhood = findNeighbourhood(place);
  if (neighbourhood) return formatNeighbourhoodLabel(neighbourhood);
  const loc = resolveFixedRouteLocation(place);
  if (loc?.displayLabel) return loc.displayLabel;
  if (place?.nameEn && (place.cityEn || place.pricingCity)) {
    return `${place.nameEn}, ${place.cityEn || place.pricingCity}`;
  }
  return place?.nameEn || place?.address || fallback || '';
}
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

  const origin = body.origin || body.pickup?.address || body.pickupLocation;
  const destination = typeof body.destination === 'string'
    ? body.destination
    : (body.destination?.address || body.destinationText || body.dropoffLocation);
  const pickupPlace = body.pickupPlace || body.pickup || null;
  const dropoffPlace = body.dropoffPlace || (typeof body.destination === 'object' ? body.destination : null);
  let airportMatch = null;

  const dropoffAirport = serviceType === 'airport_transfer'
    ? findAirport(dropoffPlace || destination)
    : null;
  if (serviceType === 'airport_transfer') {
    const pickupValue = pickupPlace || origin || body.airport;
    const pickupLocation = resolveFixedRouteLocation(pickupValue);
    if (pickupLocation?.kind !== 'city' && pickupLocation?.kind !== 'neighbourhood') {
      airportMatch = findAirport(pickupValue);
    }
  }

  // Never trust a client-submitted price. Recalculate on the server.
  const quote = await calculatePrice({
    serviceType,
    vehicleCategory: body.vehicleCategory,
    vehicleName: body.vehicleName || body.vehicle?.label || body.vehicle?.name,
    airport: airportMatch?.nameEn || body.airport,
    origin: airportMatch?.nameEn || origin || pickupPlace?.nameEn || pickupPlace?.address || body.airport,
    destination,
    pickupPlace: pickupPlace || airportMatch,
    dropoffPlace,
    durationType: body.durationType,
    distanceKm: body.distanceKm,
    returnTrip: Boolean(body.returnTrip),
  });

  if (
    serviceType === 'airport_transfer'
    && !airportMatch
    && !dropoffAirport
    && quote.pricingType !== 'airport_fixed_route'
    && !quote.customQuoteRequired
  ) {
    throw httpError(400, 'Please select a pickup and drop-off location');
  }

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
    airport: airportMatch?.nameEn || body.airport || '',
    routeType: quote.routeType || quote.pricingType || 'fixed',
    origin: bookingLocationAddress(
      pickupPlace,
      quote.originLabel || airportMatch?.nameEn || body.origin || body.pickup?.address || body.pickupLocation || '',
    ),
    destinationText: bookingLocationAddress(
      dropoffPlace,
      quote.destinationLabel || destination || body.destinationText || body.dropoffLocation || '',
    ),
    vehicleCategory: body.vehicleCategory || quote.vehicleCategory || '',
    durationType: body.durationType || '',
    distanceKm: quote.distanceKm ?? body.distanceKm ?? null,
    quotedPrice: quote.price,
    pricingType: quote.customQuoteRequired ? 'custom_quote' : 'fixed',
    customQuoteRequired: quote.customQuoteRequired,
    pricingRuleId: quote.pricingRuleId || null,
    pickup: airportMatch
      ? {
          address: airportMatch.nameEn,
          latitude: airportMatch.lat,
          longitude: airportMatch.lng,
          placeId: airportMatch.id || '',
        }
      : (body.pickup || {
          address: bookingLocationAddress(
            pickupPlace,
            quote.originLabel || body.pickupLocation || body.origin || body.airport || '',
          ),
          placeId: pickupPlace?.id || '',
          latitude: pickupPlace?.lat ?? pickupPlace?.latitude ?? null,
          longitude: pickupPlace?.lng ?? pickupPlace?.longitude ?? null,
        }),
    destination: {
      address: bookingLocationAddress(
        dropoffPlace,
        quote.destinationLabel
          || (typeof body.destination === 'string' ? body.destination : body.destination?.address)
          || destination
          || body.dropoffLocation
          || body.destinationText
          || '',
      ),
      placeId: dropoffPlace?.id || '',
      latitude: dropoffPlace?.lat ?? dropoffPlace?.latitude ?? null,
      longitude: dropoffPlace?.lng ?? dropoffPlace?.longitude ?? null,
    },
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
      totalAmount: quote.customQuoteRequired ? 0 : (quote.totalAmount ?? quote.price ?? 0),
      extraKmCharge: quote.pricingType === 'airport_fixed_route' ? 0 : (quote.extraCharge || 0),
      currency: quote.currency || 'SAR',
      breakdown: {
        pricingType: quote.pricingType,
        pricingModel: quote.pricingModel,
        quoteStatus: quote.quoteStatus,
        message: quote.message,
        displayLabel: quote.displayLabel,
        distanceKm: quote.distanceKm ?? body.distanceKm ?? null,
        distanceApproximate: Boolean(quote.distanceApproximate),
        slabLabel: quote.slabLabel || null,
        extraKmUnpriced: Boolean(quote.extraKmUnpriced),
        routeId: quote.routeId || null,
        originId: quote.originId || null,
        destinationId: quote.destinationId || null,
        originLabel: quote.originLabel || null,
        destinationLabel: quote.destinationLabel || null,
        routeType: quote.routeType || null,
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
