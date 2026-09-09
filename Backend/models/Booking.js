const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    address: { type: String, default: '' },
    placeId: { type: String, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    basePrice: { type: Number, default: 0 },
    distanceCharge: { type: Number, default: 0 },
    hourlyCharge: { type: Number, default: 0 },
    extraKmCharge: { type: Number, default: 0 },
    waitingCharge: { type: Number, default: 0 },
    airportCharge: { type: Number, default: 0 },
    extraStopCharge: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'SAR' },
    breakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      mobile: { type: String, required: true, trim: true },
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    serviceType: {
      type: String,
      enum: [
        'airport_transfer', 'city_transfer', 'chauffeur', 'intercity_transfer', 'gcc_transfer',
        'AIRPORT_TRANSFER', 'POINT_TO_POINT', 'HOURLY', 'airport', 'pointToPoint', 'hourly',
      ],
      required: true,
    },
    airport: { type: String, default: '' },
    routeType: { type: String, default: '' },
    origin: { type: String, default: '' },
    destinationText: { type: String, default: '' },
    vehicleCategory: { type: String, default: '' },
    durationType: { type: String, enum: ['', 'half_day', 'full_day'], default: '' },
    distanceKm: { type: Number, default: null },
    quotedPrice: { type: Number, default: null },
    pricingType: { type: String, enum: ['fixed', 'custom_quote', ''], default: 'fixed' },
    customQuoteRequired: { type: Boolean, default: false },
    pricingRuleId: { type: mongoose.Schema.Types.ObjectId, ref: 'PricingRule', default: null },
    pickup: { type: locationSchema, default: () => ({}) },
    destination: { type: locationSchema, default: () => ({}) },
    schedule: {
      pickupDateTime: { type: Date, required: true },
      arrivalDateTime: { type: Date, default: null },
    },
    flight: {
      flightNumber: { type: String, default: '' },
      airline: { type: String, default: '' },
      arrivalDate: { type: String, default: '' },
      arrivalTime: { type: String, default: '' },
    },
    vehicle: {
      carId: { type: Number, default: null },
      name: { type: String, required: true },
      type: { type: String, default: '' },
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
    },
    trip: {
      estimatedDistanceKm: { type: Number, default: 0 },
      estimatedDurationMinutes: { type: Number, default: 0 },
      actualDistanceKm: { type: Number, default: null },
      actualDurationMinutes: { type: Number, default: null },
      passengerCount: { type: Number, default: 1, min: 1 },
      luggageCount: { type: Number, default: 0, min: 0 },
      optionalStops: { type: [String], default: [] },
    },
    hourlyBooking: {
      hours: { type: Number, default: null },
      minimumHours: { type: Number, default: null },
      includedKm: { type: Number, default: null },
      hourlyRate: { type: Number, default: null },
    },
    pricing: { type: pricingSchema, default: () => ({ totalAmount: 0, currency: 'SAR' }) },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PARTIALLY_PAID', 'PAID', 'FAILED', 'REFUNDED', 'NOT_REQUIRED', 'pending', 'paid', 'failed', 'refunded', 'not_required'],
      default: 'PENDING',
      index: true,
    },
    bookingStatus: {
      type: String,
      enum: [
        'PENDING',
        'PAYMENT_PENDING',
        'CONFIRMED',
        'DRIVER_ASSIGNED',
        'DRIVER_ON_THE_WAY',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'pending',
        'confirmed',
        'cancelled',
      ],
      default: 'PAYMENT_PENDING',
      index: true,
    },
    specialRequests: { type: String, default: '' },
    eventType: { type: String, default: '' },
    eventOther: { type: String, default: '' },

    // Legacy flat fields kept for backward compatibility when reading old records
    name: { type: String, default: '' },
    mobile: { type: String, default: '' },
    email: { type: String, default: '' },
    pickupLocation: { type: String, default: '' },
    otherPickupLocation: { type: String, default: '' },
    dropoffLocation: { type: String, default: '' },
    vehicleName: { type: String, default: '' },
    hours: { type: String, default: '' },
    flightNumber: { type: String, default: '' },
    arrivalDateTime: { type: Date, default: null },
  },
  { timestamps: true }
);

bookingSchema.index({ 'schedule.pickupDateTime': 1 });
bookingSchema.index({ 'vehicle.carId': 1 });
bookingSchema.index({ driver: 1 });
bookingSchema.index({ 'customer.email': 1 });
bookingSchema.index({ 'customer.mobile': 1 });

bookingSchema.methods.toPublicJSON = function toPublicJSON() {
  const doc = this.toObject({ virtuals: true });
  return normalizeBooking(doc);
};

bookingSchema.statics.normalizeLegacy = normalizeBooking;

function normalizeBooking(doc) {
  if (!doc.customer?.name && doc.name) {
    doc.customer = {
      name: doc.name,
      email: doc.email || '',
      mobile: doc.mobile || '',
    };
  }
  if (!doc.pickup?.address && doc.pickupLocation) {
    doc.pickup = { address: doc.pickupLocation, placeId: '', latitude: null, longitude: null };
  }
  if (!doc.destination?.address && doc.dropoffLocation) {
    doc.destination = { address: doc.dropoffLocation, placeId: '', latitude: null, longitude: null };
  }
  if (!doc.schedule?.pickupDateTime && doc.arrivalDateTime) {
    doc.schedule = { pickupDateTime: doc.arrivalDateTime, arrivalDateTime: doc.arrivalDateTime };
  }
  if (!doc.vehicle?.name && (doc.vehicleName || typeof doc.vehicle === 'string')) {
    doc.vehicle = {
      carId: doc.vehicle?.carId || null,
      name: doc.vehicleName || doc.vehicle || '',
      type: doc.vehicle?.type || '',
    };
  }
  if (doc.serviceType === 'airport') doc.serviceType = 'AIRPORT_TRANSFER';
  if (doc.serviceType === 'pointToPoint') doc.serviceType = 'POINT_TO_POINT';
  if (doc.serviceType === 'hourly') doc.serviceType = 'HOURLY';
  if (doc.bookingStatus === 'pending') doc.bookingStatus = 'PAYMENT_PENDING';
  if (doc.bookingStatus === 'confirmed') doc.bookingStatus = 'CONFIRMED';
  return doc;
}

module.exports = mongoose.model('Booking', bookingSchema);
