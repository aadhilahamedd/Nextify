const assert = require('assert');
const {
  AIRPORT_FIXED_ROUTES,
  resolveFixedRouteLocation,
  matchAirportFixedRoute,
  fixedRoutePriceForVehicle,
} = require('../data/airportFixedRoutes');

assert.strictEqual(AIRPORT_FIXED_ROUTES.length, 10);

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
  const reverse = matchAirportFixedRoute(dropoff, pickup);
  assert.ok(reverse, `missing reverse ${dropoff} → ${pickup}`);
  assert.strictEqual(reverse.gmc, gmc, `reverse ${dropoff} → ${pickup} GMC`);
  assert.strictEqual(reverse.sedan, sedan, `reverse ${dropoff} → ${pickup} Sedan`);
  assert.strictEqual(reverse.reversed, true);
}

console.log('airportFixedRoutes tests passed');
