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
  { name: 'Client submitted price is ignored', payload: { serviceType: 'city_transfer', vehicleCategory: 'gmc', distanceKm: 10, price: 1, quotedPrice: 1, totalAmount: 1 }, expect: 140 },
  { name: 'City GMC 10km uses 20km minimum', payload: { serviceType: 'city_transfer', vehicleCategory: 'gmc', distanceKm: 10 }, expect: 140 },
  { name: 'City GMC 20km', payload: { serviceType: 'city_transfer', vehicleCategory: 'gmc', distanceKm: 20 }, expect: 140 },
  { name: 'City Taurus', payload: { serviceType: 'city_transfer', vehicleCategory: 'ford_taurus', distanceKm: 15 }, expect: 120 },
  { name: 'City S-Class unavailable', payload: { serviceType: 'city_transfer', vehicleCategory: 'mercedes_s', distanceKm: 10 }, expectCustom: true },
  { name: 'City Hiace unavailable', payload: { serviceType: 'city_transfer', vehicleCategory: 'toyota_hiace', distanceKm: 10 }, expectCustom: true },
  { name: 'City 21km GMC missing slab', payload: { serviceType: 'city_transfer', vehicleCategory: 'gmc', distanceKm: 21 }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'City 25km GMC missing slab', payload: { serviceType: 'city_transfer', vehicleCategory: 'gmc', distanceKm: 25 }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'City 32km GMC missing slab', payload: { serviceType: 'city_transfer', vehicleCategory: 'gmc', distanceKm: 32 }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'City 45km GMC missing slab', payload: { serviceType: 'city_transfer', vehicleCategory: 'gmc', distanceKm: 45 }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'City 60km GMC missing slab', payload: { serviceType: 'city_transfer', vehicleCategory: 'gmc', distanceKm: 60 }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'City 61km GMC long distance', payload: { serviceType: 'city_transfer', vehicleCategory: 'gmc', distanceKm: 61 }, expectCustom: true, expectStatus: 'long_distance' },
  { name: 'City BMW 7 has no city rate', payload: { serviceType: 'city_transfer', vehicleCategory: 'bmw_7', distanceKm: 45 }, expectCustom: true },
  { name: 'Airport GMC ignores extra distance', payload: { serviceType: 'airport_transfer', airport: 'Riyadh', vehicleCategory: 'gmc', distanceKm: 46 }, expect: 240 },
  { name: 'Airport Sedan ignores extra distance', payload: { serviceType: 'airport_transfer', airport: 'Riyadh', vehicleCategory: 'ford_taurus', distanceKm: 60 }, expect: 180 },
  { name: 'Airport never uses city GMC price', payload: { serviceType: 'airport_transfer', airport: 'Riyadh', vehicleCategory: 'gmc', distanceKm: 10 }, expect: 240 },
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
  { name: 'Intercity Jeddah to Riyadh uses same rate', payload: { serviceType: 'intercity_transfer', origin: 'Jeddah', destination: 'Riyadh', vehicleCategory: 'lexus_es' }, expect: 2200 },
  { name: 'Intercity Al Khobar to Riyadh GMC uses same rate', payload: { serviceType: 'intercity_transfer', origin: 'Al Khobar', destination: 'Riyadh', vehicleCategory: 'gmc' }, expect: 1400 },
  { name: 'Airport any Saudi airport uses configured vehicle rate', payload: { serviceType: 'airport_transfer', airport: 'King Khalid International Airport', vehicleCategory: 'gmc' }, expect: 240 },
  { name: 'Intercity Dammam GMC rate on request', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Dammam', vehicleCategory: 'gmc' }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'Intercity BMW 7 Khobar rate on request', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Khobar', vehicleCategory: 'bmw_7' }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'GCC Dubai GMC', payload: { serviceType: 'gcc_transfer', destination: 'Dubai', vehicleCategory: 'gmc' }, expect: 4800 },
  { name: 'GCC Dubai to Riyadh uses same rate', payload: { serviceType: 'gcc_transfer', origin: 'Dubai', destination: 'Riyadh', vehicleCategory: 'gmc' }, expect: 4800 },
  { name: 'GCC invalid S-Class', payload: { serviceType: 'gcc_transfer', destination: 'Dubai', vehicleCategory: 'mercedes_s' }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'GCC Kuwait GMC rate on request', payload: { serviceType: 'gcc_transfer', destination: 'Kuwait', vehicleCategory: 'gmc' }, expectCustom: true, expectStatus: 'rate_on_request' },
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
    const statusOk = !t.expectStatus || result.quoteStatus === t.expectStatus;
    const ok = t.expectCustom
      ? result.customQuoteRequired === true && result.price == null && statusOk
      : result.price === t.expect && !result.customQuoteRequired && statusOk;
    if (ok) {
      passed += 1;
      console.log(`✅ ${t.name}`);
    } else {
      failed += 1;
      console.log(`❌ ${t.name} — got price=${result.price} custom=${result.customQuoteRequired} status=${result.quoteStatus}`);
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
