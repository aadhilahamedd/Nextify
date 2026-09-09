const PricingRule = require('../models/PricingRule');
const Settings = require('../models/Settings');

const PRICING_VERSION = 4;
const AIRPORTS = ['Riyadh', 'Jeddah', 'Dammam'];

const APPROVED_RATES = [
  // ── Airport Transfer (same rates for Riyadh, Jeddah, Dammam) ──
  { serviceType: 'airport_transfer', airports: AIRPORTS, vehicleCategory: 'sedan', vehicleNames: ['Sedan'], displayLabel: 'Sedan', price: 160 },
  { serviceType: 'airport_transfer', airports: AIRPORTS, vehicleCategory: 'ford_taurus', vehicleNames: ['Ford Taurus'], displayLabel: 'Ford Taurus', price: 170 },
  { serviceType: 'airport_transfer', airports: AIRPORTS, vehicleCategory: 'prado_fortuner', vehicleNames: ['Prado / Fortuner', 'Prado', 'Fortuner'], displayLabel: 'Prado / Fortuner', price: 170 },
  { serviceType: 'airport_transfer', airports: AIRPORTS, vehicleCategory: 'gmc_yukon', vehicleNames: ['GMC Yukon / Tahoe / Chevrolet Suburban', 'GMC Yukon', 'GMC Tahoe', 'Chevrolet Suburban'], displayLabel: 'GMC Yukon / Tahoe / Chevrolet Suburban', price: 230 },
  { serviceType: 'airport_transfer', airports: AIRPORTS, vehicleCategory: 'mini_van', vehicleNames: ['Mini Van / Toyota Coaster', 'Mini Van', 'Toyota Coaster'], displayLabel: 'Mini Van / Toyota Coaster', price: 600 },
  { serviceType: 'airport_transfer', airports: AIRPORTS, vehicleCategory: 'mercedes_v_class', vehicleNames: ['Mercedes V-Class', 'Mercedes-Benz V-Class'], displayLabel: 'Mercedes V-Class', price: 1200 },

  // ── City Transfer – Riyadh up to 20 KM ──
  { serviceType: 'city_transfer', origin: 'Riyadh', routeType: 'fixed', maxDistanceKm: 20, vehicleCategory: 'sedan', vehicleNames: ['Sedan'], displayLabel: 'Sedan', price: 80, notes: 'Riyadh up to 20 KM' },
  { serviceType: 'city_transfer', origin: 'Riyadh', routeType: 'fixed', maxDistanceKm: 20, vehicleCategory: 'prado_fortuner', vehicleNames: ['Prado / Fortuner'], displayLabel: 'Prado / Fortuner', price: 100, notes: 'Riyadh up to 20 KM' },
  { serviceType: 'city_transfer', origin: 'Riyadh', routeType: 'fixed', maxDistanceKm: 20, vehicleCategory: 'gmc_yukon', vehicleNames: ['GMC Yukon'], displayLabel: 'GMC Yukon', price: 140, notes: 'Riyadh up to 20 KM' },

  // ── Chauffeur Service ──
  { serviceType: 'chauffeur', vehicleCategory: 'sedan', vehicleNames: ['Sedan'], durationType: 'half_day', displayLabel: 'Sedan – Half Day', price: 450 },
  { serviceType: 'chauffeur', vehicleCategory: 'sedan', vehicleNames: ['Sedan'], durationType: 'full_day', displayLabel: 'Sedan – Full Day', price: 800 },
  { serviceType: 'chauffeur', vehicleCategory: 'prado_fortuner', vehicleNames: ['Prado / Fortuner'], durationType: 'half_day', displayLabel: 'Prado / Fortuner – Half Day', price: 600 },
  { serviceType: 'chauffeur', vehicleCategory: 'prado_fortuner', vehicleNames: ['Prado / Fortuner'], durationType: 'full_day', displayLabel: 'Prado / Fortuner – Full Day', price: 1000 },
  { serviceType: 'chauffeur', vehicleCategory: 'gmc_yukon', vehicleNames: ['GMC Yukon'], durationType: 'half_day', displayLabel: 'GMC Yukon – Half Day', price: 800 },
  { serviceType: 'chauffeur', vehicleCategory: 'gmc_yukon', vehicleNames: ['GMC Yukon'], durationType: 'full_day', displayLabel: 'GMC Yukon – Full Day', price: 1400 },

  // ── Intercity ──
  { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Khobar', vehicleCategory: 'sedan', vehicleNames: ['Sedan'], displayLabel: 'Riyadh ↔ Khobar – Sedan', price: 1000 },
  { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Khobar', vehicleCategory: 'prado_fortuner', vehicleNames: ['Prado / Fortuner', 'Prado', 'Fortuner', 'Mini SUV'], displayLabel: 'Riyadh ↔ Khobar – Prado / Fortuner (Mini SUV)', price: 1200 },
  { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Khobar', vehicleCategory: 'gmc_yukon', vehicleNames: ['GMC Yukon', 'GMC', 'GMC Tahoe', 'Chevrolet Suburban'], displayLabel: 'Riyadh ↔ Khobar – GMC', price: 1400 },
  { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Jubail', vehicleCategory: 'sedan', vehicleNames: ['Sedan'], displayLabel: 'Riyadh ↔ Jubail – Sedan', price: 900 },
  { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Jubail', vehicleCategory: 'prado_fortuner', vehicleNames: ['Prado / Fortuner'], displayLabel: 'Riyadh ↔ Jubail – Prado / Fortuner', price: 1000 },
  { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Jubail', vehicleCategory: 'gmc_yukon', vehicleNames: ['GMC Yukon'], displayLabel: 'Riyadh ↔ Jubail – GMC Yukon', price: 1400 },
  { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Jeddah', vehicleCategory: 'sedan', vehicleNames: ['Sedan'], displayLabel: 'Riyadh ↔ Jeddah – Sedan', price: 2200 },
  { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Jeddah', vehicleCategory: 'prado_fortuner', vehicleNames: ['Prado / Fortuner', 'Mini SUV'], displayLabel: 'Riyadh ↔ Jeddah – Prado / Fortuner / Mini SUV', price: 3000 },
  { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Jeddah', vehicleCategory: 'gmc_yukon', vehicleNames: ['GMC Yukon', 'Chevrolet Suburban', 'GMC Yukon / Chevrolet Suburban'], displayLabel: 'Riyadh ↔ Jeddah – GMC Yukon / Suburban', price: 3500 },

  // ── GCC Transfers ──
  { serviceType: 'gcc_transfer', origin: 'Riyadh', destination: 'Dubai', allowedVehicleCategories: ['gmc_yukon', 'gmc_tahoe', 'chevrolet_suburban'], displayLabel: 'Riyadh → Dubai', price: 4800 },
  { serviceType: 'gcc_transfer', origin: 'Riyadh', destination: 'Abu Dhabi', allowedVehicleCategories: ['gmc_yukon', 'gmc_tahoe', 'chevrolet_suburban'], displayLabel: 'Riyadh → Abu Dhabi', price: 4000 },
  { serviceType: 'gcc_transfer', origin: 'Riyadh', destination: 'Bahrain', allowedVehicleCategories: ['gmc_yukon', 'gmc_tahoe', 'chevrolet_suburban'], displayLabel: 'Riyadh → Bahrain', price: 1900 },
  { serviceType: 'gcc_transfer', origin: 'Riyadh', destination: 'Qatar', allowedVehicleCategories: ['gmc_yukon', 'gmc_tahoe', 'chevrolet_suburban'], displayLabel: 'Riyadh → Qatar', price: 3500 },
  { serviceType: 'gcc_transfer', origin: 'Riyadh', destination: 'Oman', allowedVehicleCategories: ['gmc_yukon', 'gmc_tahoe', 'chevrolet_suburban'], displayLabel: 'Riyadh → Oman', price: 6800 },
].map((r) => ({ ...r, currency: 'SAR', active: true, routeType: r.routeType || 'fixed' }));

async function seedApprovedPricing() {
  const versionDoc = await Settings.findOne({ key: 'pricingVersion' });
  if (versionDoc?.value === PRICING_VERSION) {
    return { seeded: false, count: await PricingRule.countDocuments({ active: true }) };
  }

  await PricingRule.deleteMany({});
  await PricingRule.insertMany(APPROVED_RATES);
  await Settings.findOneAndUpdate(
    { key: 'pricingVersion' },
    { value: PRICING_VERSION },
    { upsert: true }
  );

  console.log(`✅ Seeded ${APPROVED_RATES.length} approved pricing rules (v${PRICING_VERSION})`);
  return { seeded: true, count: APPROVED_RATES.length };
}

module.exports = { seedApprovedPricing, APPROVED_RATES, PRICING_VERSION };
