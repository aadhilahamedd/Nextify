/**
 * Run: node Backend/tests/pricing.test.js
 * Requires MongoDB connection via MONGODB_URI or connectionString
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { calculatePrice } = require('../services/pricingService');
const { seedApprovedPricing } = require('../seed/pricingSeed');

const tests = [
  { name: 'Airport GMC', payload: { serviceType: 'airport_transfer', airport: 'Riyadh', vehicleCategory: 'gmc' }, expect: 240 },
  { name: 'Airport Ford Taurus', payload: { serviceType: 'airport_transfer', airport: 'Jeddah', vehicleCategory: 'ford_taurus' }, expect: 180 },
  { name: 'Airport Lexus', payload: { serviceType: 'airport_transfer', airport: 'Dammam', vehicleCategory: 'lexus_es' }, expect: 180 },
  { name: 'Airport BMW 5', payload: { serviceType: 'airport_transfer', airport: 'Riyadh', vehicleCategory: 'bmw_5' }, expect: 800 },
  { name: 'Airport S-Class', payload: { serviceType: 'airport_transfer', airport: 'Riyadh', vehicleCategory: 'mercedes_s' }, expect: 1000 },
  { name: 'Airport Hiace', payload: { serviceType: 'airport_transfer', airport: 'Riyadh', vehicleCategory: 'toyota_hiace' }, expect: 600 },
  { name: 'Airport Coaster', payload: { serviceType: 'airport_transfer', airport: 'Riyadh', vehicleCategory: 'toyota_coaster' }, expect: 600 },
  { name: 'Airport V-Class', payload: { serviceType: 'airport_transfer', airport: 'Riyadh', vehicleCategory: 'mercedes_v_class' }, expect: 1200 },
  { name: 'City GMC', payload: { serviceType: 'city_transfer', vehicleCategory: 'gmc', distanceKm: 10 }, expect: 140 },
  { name: 'City Taurus', payload: { serviceType: 'city_transfer', vehicleCategory: 'ford_taurus', distanceKm: 15 }, expect: 120 },
  { name: 'City S-Class unavailable', payload: { serviceType: 'city_transfer', vehicleCategory: 'mercedes_s', distanceKm: 10 }, expectCustom: true },
  { name: 'City Hiace unavailable', payload: { serviceType: 'city_transfer', vehicleCategory: 'toyota_hiace', distanceKm: 10 }, expectCustom: true },
  { name: 'City over 20km', payload: { serviceType: 'city_transfer', vehicleCategory: 'gmc', distanceKm: 25 }, expectCustom: true },
  { name: 'Chauffeur GMC Half', payload: { serviceType: 'chauffeur', vehicleCategory: 'gmc', durationType: 'half_day' }, expect: 800 },
  { name: 'Chauffeur GMC Full', payload: { serviceType: 'chauffeur', vehicleCategory: 'gmc', durationType: 'full_day' }, expect: 1400 },
  { name: 'Chauffeur Taurus Half', payload: { serviceType: 'chauffeur', vehicleCategory: 'ford_taurus', durationType: 'half_day' }, expect: 700 },
  { name: 'Chauffeur Taurus Full', payload: { serviceType: 'chauffeur', vehicleCategory: 'ford_taurus', durationType: 'full_day' }, expect: 1200 },
  { name: 'Chauffeur S-Class Full', payload: { serviceType: 'chauffeur', vehicleCategory: 'mercedes_s', durationType: 'full_day' }, expect: 3000 },
  { name: 'Chauffeur S-Class half unavailable', payload: { serviceType: 'chauffeur', vehicleCategory: 'mercedes_s', durationType: 'half_day' }, expectCustom: true },
  { name: 'Chauffeur V-Class Full', payload: { serviceType: 'chauffeur', vehicleCategory: 'mercedes_v_class', durationType: 'full_day' }, expect: 2500 },
  { name: 'Intercity Khobar Taurus', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Khobar', vehicleCategory: 'ford_taurus' }, expect: 1000 },
  { name: 'Intercity Khobar GMC', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Khobar', vehicleCategory: 'gmc' }, expect: 1400 },
  { name: 'Intercity Jeddah Lexus', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Jeddah', vehicleCategory: 'lexus_es' }, expect: 2200 },
  { name: 'GCC Dubai GMC', payload: { serviceType: 'gcc_transfer', destination: 'Dubai', vehicleCategory: 'gmc' }, expect: 4800 },
  { name: 'GCC invalid S-Class', payload: { serviceType: 'gcc_transfer', destination: 'Dubai', vehicleCategory: 'mercedes_s' }, expectCustom: true },
];

async function run() {
  const uri = process.env.MONGODB_URI || process.env.connectionString;
  if (!uri) {
    console.error('Set MONGODB_URI to run pricing tests');
    process.exit(1);
  }
  await mongoose.connect(uri);
  await seedApprovedPricing();

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    const result = await calculatePrice(t.payload);
    const ok = t.expectCustom
      ? result.customQuoteRequired === true
      : result.price === t.expect && !result.customQuoteRequired;
    if (ok) {
      passed += 1;
      console.log(`✅ ${t.name}`);
    } else {
      failed += 1;
      console.log(`❌ ${t.name} — got price=${result.price} custom=${result.customQuoteRequired}`);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  await mongoose.disconnect();
  process.exit(failed ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
