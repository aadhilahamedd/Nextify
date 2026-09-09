const mongoose = require('mongoose');

const SERVICE_TYPES = [
  'airport_transfer',
  'city_transfer',
  'chauffeur',
  'intercity_transfer',
  'gcc_transfer',
];

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
    destination: { type: String, default: '', trim: true, index: true },
    airports: { type: [String], default: [] },
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
      enum: ['', 'half_day', 'full_day'],
      default: '',
    },
    maxDistanceKm: { type: Number, default: null },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'SAR' },
    active: { type: Boolean, default: true, index: true },
    notes: { type: String, default: '' },
    displayLabel: { type: String, default: '' },
  },
  { timestamps: true }
);

pricingRuleSchema.index({ serviceType: 1, vehicleCategory: 1, durationType: 1 });
pricingRuleSchema.index({ serviceType: 1, origin: 1, destination: 1 });

module.exports = mongoose.model('PricingRule', pricingRuleSchema);
module.exports.SERVICE_TYPES = SERVICE_TYPES;
