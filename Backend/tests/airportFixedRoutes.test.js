const assert = require('assert');
const {
  AIRPORT_FIXED_ROUTES,
  resolveFixedRouteLocation,
  matchAirportFixedRoute,
  fixedRoutePriceForVehicle,
} = require('../data/airportFixedRoutes');

assert.strictEqual(AIRPORT_FIXED_ROUTES.length, 13);

assert.strictEqual(resolveFixedRouteLocation('Jeddah Airport').id, 'jeddah_airport');
assert.strictEqual(resolveFixedRouteLocation('King Abdulaziz International Airport').id, 'jeddah_airport');
assert.strictEqual(resolveFixedRouteLocation('JED').id, 'jeddah_airport');
assert.strictEqual(resolveFixedRouteLocation('Mecca').id, 'makkah');
assert.strictEqual(resolveFixedRouteLocation('Maka').id, 'makkah');
assert.strictEqual(resolveFixedRouteLocation('Makkah').id, 'makkah');
assert.strictEqual(resolveFixedRouteLocation({ kind: 'place', id: 'mecca', nameEn: 'Mecca' }).id, 'makkah');
assert.strictEqual(resolveFixedRouteLocation('Riyadh').id, 'riyadh');
assert.strictEqual(resolveFixedRouteLocation('Jeda').id, 'jeddah');
assert.strictEqual(resolveFixedRouteLocation('Al Qassim Airport').id, 'al_qassim_airport');
assert.strictEqual(resolveFixedRouteLocation('ELQ').id, 'al_qassim_airport');
assert.strictEqual(resolveFixedRouteLocation('Bahrain').id, 'bahrain');
assert.strictEqual(resolveFixedRouteLocation('Manama').id, 'bahrain');
assert.strictEqual(resolveFixedRouteLocation('Bahrain Airport').id, 'bahrain_airport');
assert.strictEqual(resolveFixedRouteLocation('Bahrain International Airport').id, 'bahrain_airport');
assert.strictEqual(resolveFixedRouteLocation('BAH').id, 'bahrain_airport');
assert.strictEqual(resolveFixedRouteLocation('OBBI').id, 'bahrain_airport');
assert.strictEqual(resolveFixedRouteLocation('Bahrain Airport').cityHubId, 'bahrain');
assert.strictEqual(resolveFixedRouteLocation('Al Khobar').id, 'khobar');
assert.strictEqual(resolveFixedRouteLocation('Khobar').id, 'khobar');

assert.strictEqual(resolveFixedRouteLocation('King Khalid International Airport').id, 'riyadh_airport');
assert.strictEqual(resolveFixedRouteLocation({ kind: 'airport', iata: 'RUH', id: 'riyadh-airport', nameEn: 'King Khalid International Airport', cityEn: 'Riyadh' }).id, 'riyadh_airport');
assert.strictEqual(resolveFixedRouteLocation('Riyadh Airport').id, 'riyadh_airport');
assert.strictEqual(resolveFixedRouteLocation('King Fahd International Airport').id, 'dammam_airport');
assert.strictEqual(resolveFixedRouteLocation('Prince Mohammad Bin Abdulaziz Airport').id, 'madinah_airport');

const jeddahMakkah = matchAirportFixedRoute('Jeddah Airport', 'Makkah');
assert.strictEqual(jeddahMakkah.id, 'jeddah_airport_makkah');
assert.strictEqual(jeddahMakkah.gmc, 800);
assert.strictEqual(jeddahMakkah.sedan, 600);
assert.strictEqual(jeddahMakkah.distanceKm, 90);
assert.strictEqual(fixedRoutePriceForVehicle(jeddahMakkah, 'gmc'), 800);
assert.strictEqual(fixedRoutePriceForVehicle(jeddahMakkah, 'ford_taurus'), 600);
assert.strictEqual(fixedRoutePriceForVehicle(jeddahMakkah, 'lexus_es'), 600);
assert.strictEqual(fixedRoutePriceForVehicle(jeddahMakkah, 'bmw_5'), null);

assert.strictEqual(matchAirportFixedRoute('Makkah', 'Jeddah Airport')?.gmc, 800);
assert.strictEqual(matchAirportFixedRoute('Madinah', 'Makkah')?.sedan, 800);
assert.strictEqual(matchAirportFixedRoute('King Abdulaziz International Airport', 'Makkah')?.gmc, 800);
assert.strictEqual(matchAirportFixedRoute('Makkah', 'King Abdulaziz International Airport')?.sedan, 600);
assert.strictEqual(matchAirportFixedRoute('King Khalid International Airport', 'Dammam')?.gmc, 1300);
assert.strictEqual(matchAirportFixedRoute('King Khalid International Airport', 'Al Khobar')?.gmc, 1300);
assert.strictEqual(matchAirportFixedRoute('Al Khobar', 'Riyadh')?.gmc, 1300);
assert.strictEqual(matchAirportFixedRoute('Al Khobar', 'King Khalid International Airport')?.sedan, 1100);
assert.strictEqual(matchAirportFixedRoute('Riyadh', 'King Fahd International Airport')?.gmc, 1300);
assert.strictEqual(matchAirportFixedRoute('Riyadh', 'Jeddah Airport')?.gmc, 3200);
assert.strictEqual(matchAirportFixedRoute('King Khalid International Airport', 'Madinah')?.gmc, 2900);
assert.strictEqual(matchAirportFixedRoute('King Khalid International Airport', 'Madinah')?.distanceKm, 850);
assert.strictEqual(matchAirportFixedRoute('King Khalid International Airport', 'Madinah')?.reversed, false);
assert.strictEqual(matchAirportFixedRoute('Madinah', 'King Khalid International Airport')?.gmc, 2900);
assert.strictEqual(matchAirportFixedRoute('Madinah', 'King Khalid International Airport')?.reversed, true);
assert.strictEqual(matchAirportFixedRoute('King Khalid International Airport', 'Riyadh'), null);
assert.strictEqual(matchAirportFixedRoute('King Khalid International Airport', 'Olaya'), null);
assert.strictEqual(matchAirportFixedRoute('Jeddah Airport', 'Makkah')?.gmc, 800);

assert.strictEqual(resolveFixedRouteLocation('Al Olaya').id, 'olaya');
assert.strictEqual(resolveFixedRouteLocation('Al Olaya').cityHubId, 'riyadh');
assert.strictEqual(resolveFixedRouteLocation('KAFD').id, 'kafd');
assert.strictEqual(resolveFixedRouteLocation('Hittin').id, 'hittin');
assert.strictEqual(resolveFixedRouteLocation('Jeddah Corniche').id, 'jeddah-corniche');
assert.strictEqual(resolveFixedRouteLocation('Al Hamra').cityHubId, 'jeddah');
assert.strictEqual(resolveFixedRouteLocation('Ash Shati').id, 'ash-shati');
assert.strictEqual(resolveFixedRouteLocation('Obhur').id, 'obhur');
assert.strictEqual(resolveFixedRouteLocation({ kind: 'neighbourhood', id: 'olaya', nameEn: 'Al Olaya', pricingCity: 'Riyadh' }).id, 'olaya');

assert.strictEqual(matchAirportFixedRoute('Al Olaya', 'Jeddah Airport')?.gmc, 3200);
assert.strictEqual(matchAirportFixedRoute('Al Olaya', 'Jeddah Airport')?.sedan, 2500);
assert.strictEqual(matchAirportFixedRoute('Jeddah Airport', 'Al Olaya')?.gmc, 3200);
assert.strictEqual(matchAirportFixedRoute('KAFD', 'Jeddah Airport')?.gmc, 3200);
assert.strictEqual(matchAirportFixedRoute('Hittin', 'Jeddah Airport')?.gmc, 3200);
assert.strictEqual(matchAirportFixedRoute('Al Sahafa', 'Makkah')?.gmc, 3000);
assert.strictEqual(matchAirportFixedRoute('King Khalid International Airport', 'Al Malqa'), null);
assert.strictEqual(matchAirportFixedRoute('Jeddah Corniche', 'Makkah')?.gmc, 800);
assert.strictEqual(matchAirportFixedRoute('Al Hamra', 'Makkah')?.gmc, 800);
assert.strictEqual(matchAirportFixedRoute('Al Hamra', 'Makkah')?.sedan, 600);
assert.strictEqual(matchAirportFixedRoute('Makkah', 'Ash Shati')?.gmc, 800);
assert.strictEqual(matchAirportFixedRoute('Al Rawdah', 'Madinah')?.gmc, 1000);
assert.strictEqual(matchAirportFixedRoute('Al Zahra', 'Madinah')?.sedan, 800);
assert.strictEqual(matchAirportFixedRoute('Al Olaya', 'Al Hamra')?.gmc, 3200);
assert.strictEqual(matchAirportFixedRoute('Al Hamra', 'Al Olaya')?.gmc, 3200);
assert.strictEqual(matchAirportFixedRoute('Al Olaya', 'Al Malqa'), null);

const expected = [
  ['Jeddah Airport', 'Makkah', 800, 600, 90],
  ['Jeddah Airport', 'Madinah', 1000, 800, 394],
  ['Makkah', 'Madinah', 1000, 800, 437],
  ['Riyadh', 'Al Qassim Airport', 1000, 800, 370],
  ['Riyadh', 'Dammam', 1300, 1100, 430],
  ['Riyadh', 'Al Khobar', 1300, 1100, 430],
  ['Riyadh', 'Bahrain', 1500, 1300, 480],
  ['Riyadh', 'Jeddah', 3200, 2500, 980],
  ['Riyadh', 'Makkah', 3000, 2500, 850],
  ['Riyadh', 'Madinah', 2900, 2500, 850],
];

for (const [pickup, dropoff, gmc, sedan, km] of expected) {
  const route = matchAirportFixedRoute(pickup, dropoff);
  assert.ok(route, `missing route ${pickup} → ${dropoff}`);
  assert.strictEqual(route.gmc, gmc, `${pickup} → ${dropoff} GMC`);
  assert.strictEqual(route.sedan, sedan, `${pickup} → ${dropoff} Sedan`);
  assert.strictEqual(route.distanceKm, km, `${pickup} → ${dropoff} km`);
  if (pickup === 'Riyadh' && dropoff === 'Bahrain') {
    // Bahrain → Riyadh has its own explicit one-way approved route (SAR 1,800, tax-inclusive)
    const bahrainToRiyadh = matchAirportFixedRoute('Bahrain', 'Riyadh');
    assert.ok(bahrainToRiyadh);
    assert.strictEqual(bahrainToRiyadh.id, 'bahrain_riyadh');
    assert.strictEqual(bahrainToRiyadh.gmc, 1800);
    assert.strictEqual(bahrainToRiyadh.sedan, 1800);
    assert.strictEqual(bahrainToRiyadh.taxIncluded, true);
    assert.strictEqual(bahrainToRiyadh.reversed, false);
    continue;
  }
  const reverse = matchAirportFixedRoute(dropoff, pickup);
  assert.ok(reverse, `missing reverse ${dropoff} → ${pickup}`);
  assert.strictEqual(reverse.gmc, gmc, `reverse ${dropoff} → ${pickup} GMC`);
  assert.strictEqual(reverse.sedan, sedan, `reverse ${dropoff} → ${pickup} Sedan`);
  assert.strictEqual(reverse.reversed, true);
}

// New approved Bahrain one-way routes
const bahrainDammam = matchAirportFixedRoute('Bahrain', 'Dammam');
assert.strictEqual(bahrainDammam?.id, 'bahrain_dammam');
assert.strictEqual(fixedRoutePriceForVehicle(bahrainDammam, 'gmc'), 650);
assert.strictEqual(fixedRoutePriceForVehicle(bahrainDammam, 'gmc_yukon'), 650);
assert.strictEqual(fixedRoutePriceForVehicle(bahrainDammam, 'ford_taurus'), 550);
assert.strictEqual(fixedRoutePriceForVehicle(bahrainDammam, 'lexus_es'), 550);
assert.strictEqual(fixedRoutePriceForVehicle(bahrainDammam, 'bmw_5'), null);
assert.strictEqual(fixedRoutePriceForVehicle(bahrainDammam, 'mercedes_s'), null);
assert.strictEqual(matchAirportFixedRoute('Dammam', 'Bahrain'), null, 'Dammam → Bahrain must NOT auto-reverse');
assert.strictEqual(matchAirportFixedRoute('Dammam Airport', 'Bahrain'), null, 'Dammam Airport → Bahrain must NOT auto-reverse');

const bahrainKhobar = matchAirportFixedRoute('Bahrain', 'Al Khobar');
assert.strictEqual(bahrainKhobar?.id, 'bahrain_khobar');
assert.strictEqual(fixedRoutePriceForVehicle(bahrainKhobar, 'gmc'), 650);
assert.strictEqual(fixedRoutePriceForVehicle(bahrainKhobar, 'ford_taurus'), 550);
assert.strictEqual(fixedRoutePriceForVehicle(bahrainKhobar, 'toyota_hiace'), null);
assert.strictEqual(matchAirportFixedRoute('Al Khobar', 'Bahrain'), null, 'Al Khobar → Bahrain must NOT auto-reverse');

const bahrainRiyadh = matchAirportFixedRoute('Bahrain', 'Riyadh');
assert.strictEqual(bahrainRiyadh?.id, 'bahrain_riyadh');
assert.strictEqual(fixedRoutePriceForVehicle(bahrainRiyadh, 'gmc'), 1800);
assert.strictEqual(fixedRoutePriceForVehicle(bahrainRiyadh, 'ford_taurus'), 1800);
assert.strictEqual(fixedRoutePriceForVehicle(bahrainRiyadh, 'mercedes_v_class'), null);
assert.strictEqual(bahrainRiyadh.taxIncluded, true);
assert.strictEqual(matchAirportFixedRoute('Riyadh', 'Bahrain')?.id, 'riyadh_bahrain');
assert.strictEqual(matchAirportFixedRoute('Riyadh', 'Bahrain')?.gmc, 1500);
assert.strictEqual(matchAirportFixedRoute('Riyadh', 'Bahrain')?.sedan, 1300);

// Bahrain International Airport aliases resolve to Bahrain hub for all 3 approved routes (one-way only)
for (const bahrainInput of ['Bahrain', 'Manama', 'Bahrain Airport', 'Bahrain International Airport', 'BAH']) {
  const toDammam = matchAirportFixedRoute(bahrainInput, 'Dammam');
  assert.strictEqual(toDammam?.id, 'bahrain_dammam', `${bahrainInput} → Dammam must match bahrain_dammam`);
  assert.strictEqual(fixedRoutePriceForVehicle(toDammam, 'gmc'), 650);
  assert.strictEqual(fixedRoutePriceForVehicle(toDammam, 'ford_taurus'), 550);

  const toKhobar = matchAirportFixedRoute(bahrainInput, 'Al Khobar');
  assert.strictEqual(toKhobar?.id, 'bahrain_khobar', `${bahrainInput} → Al Khobar must match bahrain_khobar`);
  assert.strictEqual(fixedRoutePriceForVehicle(toKhobar, 'gmc'), 650);
  assert.strictEqual(fixedRoutePriceForVehicle(toKhobar, 'lexus_es'), 550);

  const toRiyadh = matchAirportFixedRoute(bahrainInput, 'Riyadh');
  assert.strictEqual(toRiyadh?.id, 'bahrain_riyadh', `${bahrainInput} → Riyadh must match bahrain_riyadh`);
  assert.strictEqual(fixedRoutePriceForVehicle(toRiyadh, 'gmc'), 1800);
  assert.strictEqual(fixedRoutePriceForVehicle(toRiyadh, 'ford_taurus'), 1800);
  assert.strictEqual(toRiyadh.taxIncluded, true);
}
assert.strictEqual(matchAirportFixedRoute('Dammam', 'Bahrain Airport'), null, 'Dammam → Bahrain Airport must NOT auto-reverse');
assert.strictEqual(matchAirportFixedRoute('Al Khobar', 'Bahrain Airport'), null, 'Al Khobar → Bahrain Airport must NOT auto-reverse');
assert.strictEqual(matchAirportFixedRoute('Bahrain Airport', 'Bahrain'), null, 'Bahrain Airport → Bahrain must NOT match');
assert.strictEqual(matchAirportFixedRoute('Riyadh', 'Bahrain Airport')?.id, 'riyadh_bahrain');
assert.strictEqual(matchAirportFixedRoute('Riyadh', 'Bahrain Airport')?.gmc, 1500);
assert.strictEqual(matchAirportFixedRoute('Riyadh', 'Bahrain Airport')?.sedan, 1300);

console.log('airportFixedRoutes tests passed');
