const mongoose = require('mongoose');

const SERVICE_TYPES = [
  'airport_transfer',
  'city_transfer',
  'chauffeur',
  'intercity_transfer',
  'gcc_transfer',
];

const PRICING_MODES = ['fixed', 'whatsapp_assistant'];

const pricingRuleSchema = new mongoose.Schema(
  {
    serviceType: {
      type: String,
      enum: SERVICE_TYPES,
      required: true,
      index: true,
    },
    routeType: { type: String, default: 'fixed', trim: true },
    origin: { type: String, default: '', trim: true, index: true },
    originId: { type: String, default: '', trim: true, index: true },
    destination: { type: String, default: '', trim: true, index: true },
    destinationId: { type: String, default: '', trim: true, index: true },
    airports: { type: [String], default: [] },
    vehicleId: { type: String, default: '', trim: true, index: true },
    vehicleCarId: { type: Number, default: null, index: true },
    vehicleCategory: { type: String, default: '', trim: true, index: true },
    vehicleNames: { type: [String], default: [] },
    vehicleApplicability: {
      type: String,
      enum: ['specific', 'all'],
      default: 'specific',
    },
    allowedVehicleCategories: { type: [String], default: [] },
    durationType: {
      type: String,
      enum: ['', 'hourly', 'half_day', 'full_day'],
      default: '',
    },
    minDistanceKm: { type: Number, default: null },
    maxDistanceKm: { type: Number, default: null },
    baseDistanceKm: { type: Number, default: null },
    extraKmIncrement: { type: Number, default: null, min: 0 },
    pricingMode: {
      type: String,
      enum: PRICING_MODES,
      default: 'fixed',
      index: true,
    },
    price: {
      type: Number,
      default: null,
      min: 0,
      required() {
        return this.pricingMode !== 'whatsapp_assistant';
      },
    },
    priceUsd: { type: Number, default: null, min: 0 },
    currency: { type: String, default: 'SAR' },
    allowReverse: { type: Boolean, default: false },
    taxIncluded: { type: Boolean, default: false },
    active: { type: Boolean, default: true, index: true },
    notes: { type: String, default: '', trim: true },
    displayLabel: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

pricingRuleSchema.index({ serviceType: 1, vehicleCategory: 1, durationType: 1 });
pricingRuleSchema.index({ serviceType: 1, origin: 1, destination: 1 });
pricingRuleSchema.index({ serviceType: 1, vehicleId: 1, originId: 1, destinationId: 1, durationType: 1, active: 1 });

module.exports = mongoose.model('PricingRule', pricingRuleSchema);
module.exports.SERVICE_TYPES = SERVICE_TYPES;
module.exports.PRICING_MODES = PRICING_MODES;
