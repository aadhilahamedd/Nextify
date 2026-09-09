/**
 * Run: node Backend/tests/pricing.test.js
 * Requires MongoDB connection via MONGODB_URI or connectionString
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { calculatePrice } = require('../services/pricingService');
const { seedApprovedPricing } = require('../seed/pricingSeed');

const tests = [
  { name: 'Airport Sedan', payload: { serviceType: 'airport_transfer', airport: 'Riyadh', vehicleCategory: 'sedan' }, expect: 160 },
  { name: 'Airport Ford Taurus', payload: { serviceType: 'airport_transfer', airport: 'Jeddah', vehicleCategory: 'ford_taurus' }, expect: 170 },
  { name: 'Airport Prado', payload: { serviceType: 'airport_transfer', airport: 'Dammam', vehicleCategory: 'prado_fortuner' }, expect: 170 },
  { name: 'Airport GMC group', payload: { serviceType: 'airport_transfer', airport: 'Riyadh', vehicleCategory: 'gmc_yukon' }, expect: 230 },
  { name: 'Airport Mini Van', payload: { serviceType: 'airport_transfer', airport: 'Riyadh', vehicleCategory: 'mini_van' }, expect: 600 },
  { name: 'Airport V-Class', payload: { serviceType: 'airport_transfer', airport: 'Riyadh', vehicleCategory: 'mercedes_v_class' }, expect: 1200 },
  { name: 'City Sedan', payload: { serviceType: 'city_transfer', vehicleCategory: 'sedan', distanceKm: 15 }, expect: 80 },
  { name: 'City Prado', payload: { serviceType: 'city_transfer', vehicleCategory: 'prado_fortuner', distanceKm: 20 }, expect: 100 },
  { name: 'City GMC', payload: { serviceType: 'city_transfer', vehicleCategory: 'gmc_yukon', distanceKm: 10 }, expect: 140 },
  { name: 'City over 20km', payload: { serviceType: 'city_transfer', vehicleCategory: 'sedan', distanceKm: 25 }, expectCustom: true },
  { name: 'Chauffeur Sedan Half', payload: { serviceType: 'chauffeur', vehicleCategory: 'sedan', durationType: 'half_day' }, expect: 450 },
  { name: 'Chauffeur Sedan Full', payload: { serviceType: 'chauffeur', vehicleCategory: 'sedan', durationType: 'full_day' }, expect: 800 },
  { name: 'Chauffeur Prado Half', payload: { serviceType: 'chauffeur', vehicleCategory: 'prado_fortuner', durationType: 'half_day' }, expect: 600 },
  { name: 'Chauffeur Prado Full', payload: { serviceType: 'chauffeur', vehicleCategory: 'prado_fortuner', durationType: 'full_day' }, expect: 1000 },
  { name: 'Chauffeur GMC Half', payload: { serviceType: 'chauffeur', vehicleCategory: 'gmc_yukon', durationType: 'half_day' }, expect: 800 },
  { name: 'Chauffeur GMC Full', payload: { serviceType: 'chauffeur', vehicleCategory: 'gmc_yukon', durationType: 'full_day' }, expect: 1400 },
  { name: 'Intercity Khobar Riyadh→Khobar Sedan', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Khobar', vehicleCategory: 'sedan' }, expect: 1000 },
  { name: 'Intercity Khobar Riyadh→Khobar Prado', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Khobar', vehicleCategory: 'prado_fortuner' }, expect: 1200 },
  { name: 'Intercity Khobar Riyadh→Khobar GMC', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Khobar', vehicleCategory: 'gmc_yukon' }, expect: 1400 },
  { name: 'Intercity Khobar Khobar→Riyadh Sedan', payload: { serviceType: 'intercity_transfer', origin: 'Khobar', destination: 'Riyadh', vehicleCategory: 'sedan' }, expect: 1000 },
  { name: 'Intercity Khobar Khobar→Riyadh Prado', payload: { serviceType: 'intercity_transfer', origin: 'Khobar', destination: 'Riyadh', vehicleCategory: 'prado_fortuner' }, expect: 1200 },
  { name: 'Intercity Khobar Khobar→Riyadh GMC', payload: { serviceType: 'intercity_transfer', origin: 'Khobar', destination: 'Riyadh', vehicleCategory: 'gmc_yukon' }, expect: 1400 },
  { name: 'Intercity Jubail Sedan', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Jubail', vehicleCategory: 'sedan' }, expect: 900 },
  { name: 'Intercity Jubail Prado', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Jubail', vehicleCategory: 'prado_fortuner' }, expect: 1000 },
  { name: 'Intercity Jubail GMC', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Jubail', vehicleCategory: 'gmc_yukon' }, expect: 1400 },
  { name: 'Intercity Jeddah Sedan', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Jeddah', vehicleCategory: 'sedan' }, expect: 2200 },
  { name: 'Intercity Jeddah Mini SUV', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Jeddah', vehicleCategory: 'mini_suv' }, expect: 3000 },
  { name: 'Intercity Jeddah GMC', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Jeddah', vehicleCategory: 'gmc_yukon' }, expect: 3500 },
  { name: 'GCC Dubai', payload: { serviceType: 'gcc_transfer', destination: 'Dubai', vehicleCategory: 'gmc_yukon' }, expect: 4800 },
  { name: 'GCC Abu Dhabi', payload: { serviceType: 'gcc_transfer', destination: 'Abu Dhabi', vehicleCategory: 'gmc_tahoe' }, expect: 4000 },
  { name: 'GCC Bahrain', payload: { serviceType: 'gcc_transfer', destination: 'Bahrain', vehicleCategory: 'chevrolet_suburban' }, expect: 1900 },
  { name: 'GCC Qatar', payload: { serviceType: 'gcc_transfer', destination: 'Qatar', vehicleCategory: 'gmc_yukon' }, expect: 3500 },
  { name: 'GCC Oman', payload: { serviceType: 'gcc_transfer', destination: 'Oman', vehicleCategory: 'gmc_yukon' }, expect: 6800 },
  { name: 'GCC invalid sedan', payload: { serviceType: 'gcc_transfer', destination: 'Dubai', vehicleCategory: 'sedan' }, expectCustom: true },
  { name: 'Chauffeur V-Class invalid', payload: { serviceType: 'chauffeur', vehicleCategory: 'mercedes_v_class', durationType: 'half_day' }, expectCustom: true },
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
