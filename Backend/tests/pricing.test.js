/**
 * Run: node Backend/tests/pricing.test.js
 * Runs offline against approved pricing rules without connecting to MongoDB.
 */
const mongoose = require('mongoose');
const { calculatePrice } = require('../services/pricingService');

const tests = [
  // Unapproved / incomplete airport transfer routes must never use generic fallback pricing
  { name: 'Airport without destination requires custom quote (GMC)', payload: { serviceType: 'airport_transfer', airport: 'Riyadh', vehicleCategory: 'gmc' }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'Airport without destination requires custom quote (Sedan)', payload: { serviceType: 'airport_transfer', airport: 'Jeddah', vehicleCategory: 'ford_taurus' }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'Airport without destination requires custom quote (KKIA)', payload: { serviceType: 'airport_transfer', airport: 'King Khalid International Airport', vehicleCategory: 'gmc' }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'Unapproved Taif Airport to Riyadh GMC requires custom quote', payload: { serviceType: 'airport_transfer', origin: 'Taif Airport', destination: 'Riyadh', vehicleCategory: 'gmc' }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'Unapproved Jeddah Airport to Taif Sedan requires custom quote', payload: { serviceType: 'airport_transfer', origin: 'Jeddah Airport', destination: 'Taif', vehicleCategory: 'ford_taurus' }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'Unapproved Abha Airport to Abha Lexus requires custom quote', payload: { serviceType: 'airport_transfer', origin: 'Abha Airport', destination: 'Abha', vehicleCategory: 'lexus_es' }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'Unapproved Tabuk Airport to Riyadh GMC requires custom quote', payload: { serviceType: 'airport_transfer', origin: 'Tabuk Airport', destination: 'Riyadh', vehicleCategory: 'gmc' }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'Custom airport pickup location requires custom quote', payload: { serviceType: 'airport_transfer', origin: 'Al Hada Resort, Taif', destination: 'Makkah', pickupPlace: { kind: 'custom', address: 'Al Hada Resort, Taif', nameEn: 'Al Hada Resort, Taif' }, vehicleCategory: 'gmc' }, expectCustom: true, expectStatus: 'rate_on_request' },

  // Non-airport: City Transfer
  { name: 'Client submitted price is ignored', payload: { serviceType: 'city_transfer', vehicleCategory: 'gmc', distanceKm: 10, price: 1, quotedPrice: 1, totalAmount: 1 }, expect: 240, expectType: 'city_base' },
  { name: 'City GMC uses airport base', payload: { serviceType: 'city_transfer', vehicleCategory: 'gmc', distanceKm: 10 }, expect: 240, expectType: 'city_base' },
  { name: 'City GMC extra km still uses vehicle base', payload: { serviceType: 'city_transfer', vehicleCategory: 'gmc', distanceKm: 46 }, expect: 240, expectType: 'city_base' },
  { name: 'City Taurus uses airport base', payload: { serviceType: 'city_transfer', vehicleCategory: 'ford_taurus', distanceKm: 15 }, expect: 180, expectType: 'city_base' },
  { name: 'City S-Class uses airport base', payload: { serviceType: 'city_transfer', vehicleCategory: 'mercedes_s', distanceKm: 10 }, expect: 1000, expectType: 'city_base' },
  { name: 'City Hiace uses airport base', payload: { serviceType: 'city_transfer', vehicleCategory: 'toyota_hiace', distanceKm: 10 }, expect: 600, expectType: 'city_base' },
  { name: 'City BMW 7 uses airport base', payload: { serviceType: 'city_transfer', vehicleCategory: 'bmw_7', distanceKm: 45 }, expect: 1000, expectType: 'city_base' },
  { name: 'City BMW 7 ignores leftover GMC name', payload: { serviceType: 'city_transfer', vehicleCategory: 'bmw_7', vehicleName: 'GMC Yukon', distanceKm: 10 }, expect: 1000, expectType: 'city_base' },
  { name: 'City S-Class ignores leftover GMC name', payload: { serviceType: 'city_transfer', vehicleCategory: 'mercedes_s', vehicleName: 'GMC Yukon' }, expect: 1000, expectType: 'city_base' },
  { name: 'City Taurus uses sedan airport base', payload: { serviceType: 'city_transfer', vehicleCategory: 'lexus_es' }, expect: 180, expectType: 'city_base' },

  // Non-airport: Chauffeur Service
  { name: 'Chauffeur GMC Half', payload: { serviceType: 'chauffeur', vehicleCategory: 'gmc', durationType: 'half_day' }, expect: 800 },
  { name: 'Chauffeur GMC Full', payload: { serviceType: 'chauffeur', vehicleCategory: 'gmc', durationType: 'full_day' }, expect: 1400 },
  { name: 'Chauffeur Taurus Half', payload: { serviceType: 'chauffeur', vehicleCategory: 'ford_taurus', durationType: 'half_day' }, expect: 700 },
  { name: 'Chauffeur Taurus Full', payload: { serviceType: 'chauffeur', vehicleCategory: 'ford_taurus', durationType: 'full_day' }, expect: 1200 },
  { name: 'Chauffeur S-Class Full', payload: { serviceType: 'chauffeur', vehicleCategory: 'mercedes_s', durationType: 'full_day' }, expect: 3000 },
  { name: 'Chauffeur S-Class half unavailable', payload: { serviceType: 'chauffeur', vehicleCategory: 'mercedes_s', durationType: 'half_day' }, expectCustom: true },
  { name: 'Chauffeur V-Class Full', payload: { serviceType: 'chauffeur', vehicleCategory: 'mercedes_v_class', durationType: 'full_day' }, expect: 2500 },

  // Non-airport: Intercity Transfer
  { name: 'Intercity Khobar Taurus', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Khobar', vehicleCategory: 'ford_taurus' }, expect: 1000 },
  { name: 'Intercity Khobar GMC', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Khobar', vehicleCategory: 'gmc' }, expect: 1400 },
  { name: 'Intercity Jeddah Lexus', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Jeddah', vehicleCategory: 'lexus_es' }, expect: 2200 },
  { name: 'Intercity Jeddah to Riyadh uses same rate', payload: { serviceType: 'intercity_transfer', origin: 'Jeddah', destination: 'Riyadh', vehicleCategory: 'lexus_es' }, expect: 2200 },
  { name: 'Intercity Al Khobar to Riyadh GMC uses same rate', payload: { serviceType: 'intercity_transfer', origin: 'Al Khobar', destination: 'Riyadh', vehicleCategory: 'gmc' }, expect: 1400 },

  // Approved Airport Transfer Fixed Routes (exact published prices)
  { name: 'Fixed Jeddah Airport to Makkah GMC', payload: { serviceType: 'airport_transfer', origin: 'Jeddah Airport', destination: 'Makkah', vehicleCategory: 'gmc', distanceKm: 999, totalAmount: 1 }, expect: 800, expectType: 'airport_fixed_route', expectKm: 90 },
  { name: 'Fixed Jeddah Airport to Makkah Sedan', payload: { serviceType: 'airport_transfer', origin: 'Jeddah Airport', destination: 'Mecca', vehicleCategory: 'ford_taurus' }, expect: 600, expectType: 'airport_fixed_route' },
  { name: 'Fixed Jeddah Airport to Makkah Lexus', payload: { serviceType: 'airport_transfer', origin: 'JED', destination: 'Maka', vehicleCategory: 'lexus_es' }, expect: 600, expectType: 'airport_fixed_route' },
  { name: 'Fixed Jeddah Airport to Madinah GMC', payload: { serviceType: 'airport_transfer', origin: 'King Abdulaziz International Airport', destination: 'Madinah', vehicleCategory: 'gmc' }, expect: 1000, expectType: 'airport_fixed_route', expectKm: 394 },
  { name: 'Fixed Jeddah Airport to Madinah Sedan', payload: { serviceType: 'airport_transfer', origin: 'Jeddah Airport', destination: 'Medina', vehicleCategory: 'ford_taurus' }, expect: 800, expectType: 'airport_fixed_route' },
  { name: 'Fixed Makkah to Madinah GMC', payload: { serviceType: 'airport_transfer', origin: 'Makkah', destination: 'Madinah', vehicleCategory: 'gmc' }, expect: 1000, expectType: 'airport_fixed_route', expectKm: 437 },
  { name: 'Fixed Makkah to Madinah Sedan', payload: { serviceType: 'airport_transfer', origin: 'Mecca', destination: 'Medina', vehicleCategory: 'lexus_es' }, expect: 800, expectType: 'airport_fixed_route' },
  { name: 'Fixed Riyadh to Al Qassim Airport GMC', payload: { serviceType: 'airport_transfer', origin: 'Riyadh', destination: 'Al Qassim Airport', vehicleCategory: 'gmc' }, expect: 1000, expectType: 'airport_fixed_route', expectKm: 370 },
  { name: 'Fixed Riyadh to Al Qassim Airport Sedan', payload: { serviceType: 'airport_transfer', origin: 'Riyadh', destination: 'ELQ', vehicleCategory: 'ford_taurus' }, expect: 800, expectType: 'airport_fixed_route' },
  { name: 'Fixed Riyadh to Dammam GMC', payload: { serviceType: 'airport_transfer', origin: 'Riyadh', destination: 'Dammam', vehicleCategory: 'gmc' }, expect: 1300, expectType: 'airport_fixed_route', expectKm: 430 },
  { name: 'Fixed Riyadh to Dammam Sedan', payload: { serviceType: 'airport_transfer', origin: 'Riyadh', destination: 'Dammam', vehicleCategory: 'lexus_es' }, expect: 1100, expectType: 'airport_fixed_route' },
  { name: 'Fixed Riyadh to Al Khobar GMC uses Dammam rate', payload: { serviceType: 'airport_transfer', origin: 'Riyadh', destination: 'Al Khobar', vehicleCategory: 'gmc' }, expect: 1300, expectType: 'airport_fixed_route', expectKm: 430 },
  { name: 'Fixed Riyadh to Al Khobar Sedan uses Dammam rate', payload: { serviceType: 'airport_transfer', origin: 'Riyadh', destination: 'Khobar', vehicleCategory: 'lexus_es' }, expect: 1100, expectType: 'airport_fixed_route' },
  { name: 'KKIA to Al Khobar GMC uses Riyadh to Dammam rate', payload: { serviceType: 'airport_transfer', airport: 'King Khalid International Airport', origin: 'King Khalid International Airport', destination: 'Al Khobar', vehicleCategory: 'gmc' }, expect: 1300, expectType: 'airport_fixed_route', expectKm: 430 },
  { name: 'Fixed Riyadh to Bahrain GMC', payload: { serviceType: 'airport_transfer', origin: 'Riyadh', destination: 'Bahrain', vehicleCategory: 'gmc' }, expect: 1500, expectType: 'airport_fixed_route', expectKm: 480 },
  { name: 'Fixed Riyadh to Bahrain Sedan', payload: { serviceType: 'airport_transfer', origin: 'Riyadh', destination: 'Manama', vehicleCategory: 'ford_taurus' }, expect: 1300, expectType: 'airport_fixed_route' },
  { name: 'Fixed Riyadh to Jeddah GMC', payload: { serviceType: 'airport_transfer', origin: 'Riyadh', destination: 'Jeddah', vehicleCategory: 'gmc' }, expect: 3200, expectType: 'airport_fixed_route', expectKm: 980 },
  { name: 'Fixed Riyadh to Jeddah Sedan', payload: { serviceType: 'airport_transfer', origin: 'Riyadh', destination: 'Jeda', vehicleCategory: 'lexus_es' }, expect: 2500, expectType: 'airport_fixed_route' },
  { name: 'Fixed Riyadh to Makkah GMC', payload: { serviceType: 'airport_transfer', origin: 'Riyadh', destination: 'Makkah', vehicleCategory: 'gmc' }, expect: 3000, expectType: 'airport_fixed_route', expectKm: 850 },
  { name: 'Fixed Riyadh to Makkah Sedan', payload: { serviceType: 'airport_transfer', origin: 'Riyadh', destination: 'Maka', vehicleCategory: 'ford_taurus' }, expect: 2500, expectType: 'airport_fixed_route' },
  { name: 'Fixed Riyadh to Madinah GMC', payload: { serviceType: 'airport_transfer', origin: 'Riyadh', destination: 'Madinah', vehicleCategory: 'gmc' }, expect: 2900, expectType: 'airport_fixed_route', expectKm: 850 },
  { name: 'Fixed Riyadh to Madinah Sedan', payload: { serviceType: 'airport_transfer', origin: 'Riyadh', destination: 'Medina', vehicleCategory: 'lexus_es' }, expect: 2500, expectType: 'airport_fixed_route' },
  { name: 'Fixed route other vehicle is rate on request', payload: { serviceType: 'airport_transfer', origin: 'Jeddah Airport', destination: 'Makkah', vehicleCategory: 'bmw_5' }, expectCustom: true, expectStatus: 'rate_on_request', expectType: 'airport_fixed_route' },
  { name: 'Reverse Makkah to Jeddah Airport GMC', payload: { serviceType: 'airport_transfer', origin: 'Makkah', destination: 'Jeddah Airport', vehicleCategory: 'gmc' }, expect: 800, expectType: 'airport_fixed_route', expectKm: 90 },
  { name: 'Reverse Makkah to Jeddah Airport Sedan', payload: { serviceType: 'airport_transfer', origin: 'Makkah', destination: 'King Abdulaziz International Airport', vehicleCategory: 'ford_taurus' }, expect: 600, expectType: 'airport_fixed_route' },
  { name: 'Reverse Madinah to Makkah Sedan', payload: { serviceType: 'airport_transfer', origin: 'Madinah', destination: 'Makkah', vehicleCategory: 'ford_taurus' }, expect: 800, expectType: 'airport_fixed_route' },
  { name: 'Reverse Al Qassim Airport to Riyadh GMC', payload: { serviceType: 'airport_transfer', origin: 'Prince Naif bin Abdulaziz International Airport', destination: 'Riyadh', vehicleCategory: 'gmc' }, expect: 1000, expectType: 'airport_fixed_route', expectKm: 370 },
  { name: 'KKIA to Madinah GMC uses Riyadh to Madinah fixed price', payload: { serviceType: 'airport_transfer', airport: 'King Khalid International Airport', origin: 'King Khalid International Airport', destination: 'Madinah', vehicleCategory: 'gmc', pickupPlace: { kind: 'airport', iata: 'RUH', id: 'riyadh-airport', nameEn: 'King Khalid International Airport', cityEn: 'Riyadh' } }, expect: 2900, expectType: 'airport_fixed_route', expectKm: 850 },
  { name: 'KKIA to Madinah Sedan uses Riyadh to Madinah fixed price', payload: { serviceType: 'airport_transfer', airport: 'King Khalid International Airport', origin: 'King Khalid International Airport', destination: 'Madinah', vehicleCategory: 'ford_taurus' }, expect: 2500, expectType: 'airport_fixed_route', expectKm: 850 },
  { name: 'KKIA to Dammam GMC uses Riyadh to Dammam fixed price', payload: { serviceType: 'airport_transfer', airport: 'King Khalid International Airport', origin: 'King Khalid International Airport', destination: 'Dammam', vehicleCategory: 'gmc', distanceKm: 10 }, expect: 1300, expectType: 'airport_fixed_route', expectKm: 430 },
  { name: 'Al Olaya to Jeddah Airport GMC uses Riyadh to Jeddah', payload: { serviceType: 'airport_transfer', pickupPlace: { kind: 'neighbourhood', id: 'olaya', nameEn: 'Al Olaya', pricingCity: 'Riyadh' }, dropoffPlace: { kind: 'airport', iata: 'JED', id: 'jeddah-airport', nameEn: 'King Abdulaziz International Airport' }, vehicleCategory: 'gmc' }, expect: 3200, expectType: 'airport_fixed_route', expectKm: 980 },
  { name: 'Al Olaya to Jeddah Airport Sedan uses Riyadh to Jeddah', payload: { serviceType: 'airport_transfer', origin: 'Al Olaya', destination: 'Jeddah Airport', vehicleCategory: 'lexus_es' }, expect: 2500, expectType: 'airport_fixed_route' },
  { name: 'Jeddah Airport to Al Olaya reverse GMC', payload: { serviceType: 'airport_transfer', origin: 'Jeddah Airport', destination: 'Al Olaya', vehicleCategory: 'gmc' }, expect: 3200, expectType: 'airport_fixed_route' },
  { name: 'Al Hamra to Makkah uses Jeddah Airport to Makkah', payload: { serviceType: 'airport_transfer', origin: 'Al Hamra', destination: 'Makkah', vehicleCategory: 'gmc' }, expect: 800, expectType: 'airport_fixed_route', expectKm: 90 },
  { name: 'Makkah to Ash Shati reverse Sedan', payload: { serviceType: 'airport_transfer', origin: 'Makkah', destination: 'Ash Shati', vehicleCategory: 'ford_taurus' }, expect: 600, expectType: 'airport_fixed_route' },
  { name: 'Al Rawdah to Madinah GMC', payload: { serviceType: 'airport_transfer', origin: 'Al Rawdah', destination: 'Madinah', vehicleCategory: 'gmc' }, expect: 1000, expectType: 'airport_fixed_route' },
  { name: 'Riyadh neighbourhood to Jeddah neighbourhood GMC', payload: { serviceType: 'airport_transfer', origin: 'Al Olaya', destination: 'Al Hamra', vehicleCategory: 'gmc' }, expect: 3200, expectType: 'airport_fixed_route' },

  // New approved Bahrain one-way routes (no auto-reverse)
  { name: 'Bahrain to Dammam SUV (GMC)', payload: { serviceType: 'airport_transfer', origin: 'Bahrain', destination: 'Dammam', vehicleCategory: 'gmc' }, expect: 650, expectType: 'airport_fixed_route' },
  { name: 'Bahrain to Dammam Sedan (Taurus)', payload: { serviceType: 'airport_transfer', origin: 'Bahrain', destination: 'Dammam', vehicleCategory: 'ford_taurus' }, expect: 550, expectType: 'airport_fixed_route' },
  { name: 'Bahrain to Al Khobar SUV (GMC)', payload: { serviceType: 'airport_transfer', origin: 'Bahrain', destination: 'Al Khobar', vehicleCategory: 'gmc' }, expect: 650, expectType: 'airport_fixed_route' },
  { name: 'Bahrain to Al Khobar Sedan (Lexus)', payload: { serviceType: 'airport_transfer', origin: 'Bahrain', destination: 'Al Khobar', vehicleCategory: 'lexus_es' }, expect: 550, expectType: 'airport_fixed_route' },
  { name: 'Bahrain to Riyadh tax-inclusive GMC', payload: { serviceType: 'airport_transfer', origin: 'Bahrain', destination: 'Riyadh', vehicleCategory: 'gmc' }, expect: 1800, expectType: 'airport_fixed_route' },
  { name: 'Bahrain to Riyadh tax-inclusive Sedan', payload: { serviceType: 'airport_transfer', origin: 'Bahrain', destination: 'Riyadh', vehicleCategory: 'ford_taurus' }, expect: 1800, expectType: 'airport_fixed_route' },
  { name: 'Bahrain to Dammam unsupported vehicle requires custom quote', payload: { serviceType: 'airport_transfer', origin: 'Bahrain', destination: 'Dammam', vehicleCategory: 'mercedes_s' }, expectCustom: true, expectStatus: 'rate_on_request', expectType: 'airport_fixed_route' },
  { name: 'Reverse Dammam to Bahrain requires custom quote', payload: { serviceType: 'airport_transfer', origin: 'Dammam', destination: 'Bahrain', vehicleCategory: 'gmc' }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'Reverse Al Khobar to Bahrain requires custom quote', payload: { serviceType: 'airport_transfer', origin: 'Al Khobar', destination: 'Bahrain', vehicleCategory: 'ford_taurus' }, expectCustom: true, expectStatus: 'rate_on_request' },

  // Unapproved intra-city airport routes must return price: null and customQuoteRequired: true
  { name: 'KKIA to Riyadh city requires custom quote', payload: { serviceType: 'airport_transfer', airport: 'King Khalid International Airport', origin: 'King Khalid International Airport', destination: 'Riyadh', vehicleCategory: 'gmc' }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'KKIA to Olaya requires custom quote', payload: { serviceType: 'airport_transfer', airport: 'King Khalid International Airport', destination: 'Olaya', vehicleCategory: 'gmc', distanceKm: 46 }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'KKIA to Diplomatic Quarter requires custom quote', payload: { serviceType: 'airport_transfer', airport: 'King Khalid International Airport', destination: 'Diplomatic Quarter', vehicleCategory: 'ford_taurus', distanceKm: 12 }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'KKIA to Al Malqa requires custom quote', payload: { serviceType: 'airport_transfer', airport: 'King Khalid International Airport', destination: 'Al Malqa', vehicleCategory: 'gmc' }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'Jeddah Airport to Jeddah Corniche requires custom quote', payload: { serviceType: 'airport_transfer', origin: 'Jeddah Airport', destination: 'Jeddah Corniche', vehicleCategory: 'ford_taurus' }, expectCustom: true, expectStatus: 'rate_on_request' },

  // Non-airport: Intercity unpriced & GCC Transfer
  { name: 'Intercity Dammam GMC rate on request', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Dammam', vehicleCategory: 'gmc' }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'Intercity BMW 7 Khobar rate on request', payload: { serviceType: 'intercity_transfer', origin: 'Riyadh', destination: 'Khobar', vehicleCategory: 'bmw_7' }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'GCC Dubai GMC', payload: { serviceType: 'gcc_transfer', destination: 'Dubai', vehicleCategory: 'gmc' }, expect: 4800 },
  { name: 'GCC Dubai to Riyadh uses same rate', payload: { serviceType: 'gcc_transfer', origin: 'Dubai', destination: 'Riyadh', vehicleCategory: 'gmc' }, expect: 4800 },
  { name: 'GCC invalid S-Class', payload: { serviceType: 'gcc_transfer', destination: 'Dubai', vehicleCategory: 'mercedes_s' }, expectCustom: true, expectStatus: 'rate_on_request' },
  { name: 'GCC Kuwait GMC rate on request', payload: { serviceType: 'gcc_transfer', destination: 'Kuwait', vehicleCategory: 'gmc' }, expectCustom: true, expectStatus: 'rate_on_request' },
];

async function run() {
  if (mongoose.connection.readyState !== 0) {
    throw new Error('pricing.test.js must run offline without connecting to MongoDB');
  }

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    const result = await calculatePrice(t.payload);
    const statusOk = !t.expectStatus || result.quoteStatus === t.expectStatus;
    const typeOk = !t.expectType || result.pricingType === t.expectType;
    const kmOk = t.expectKm == null || result.distanceKm === t.expectKm;
    const ok = t.expectCustom
      ? result.customQuoteRequired === true && result.price === null && result.payable === false && statusOk && typeOk
      : result.price === t.expect && result.totalAmount === t.expect && !result.customQuoteRequired && statusOk && typeOk && kmOk;
    if (ok) {
      passed += 1;
      console.log(`✅ ${t.name}`);
    } else {
      failed += 1;
      console.log(`❌ ${t.name} — got price=${result.price} total=${result.totalAmount} custom=${result.customQuoteRequired} payable=${result.payable} status=${result.quoteStatus} type=${result.pricingType} km=${result.distanceKm}`);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
