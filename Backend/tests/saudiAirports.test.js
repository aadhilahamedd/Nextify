const assert = require('assert');
const { SAUDI_AIRPORTS, findAirport } = require('../data/saudiAirports');

assert.ok(SAUDI_AIRPORTS.length >= 20, 'expected operational Saudi passenger airports');

const iata = SAUDI_AIRPORTS.map((item) => item.iata);
assert.strictEqual(new Set(iata).size, iata.length, 'duplicate IATA codes');

for (const airport of SAUDI_AIRPORTS) {
  assert.ok(airport.nameEn, `${airport.id} missing name`);
  assert.ok(airport.iata && airport.iata.length === 3, `${airport.id} missing IATA`);
  assert.ok(Number.isFinite(airport.lat) && Number.isFinite(airport.lng), `${airport.id} missing coordinates`);
  assert.ok(airport.cityEn, `${airport.id} missing city`);
  assert.ok(airport.regionEn, `${airport.id} missing region`);
}

assert.strictEqual(findAirport('RUH').id, 'riyadh-airport');
assert.strictEqual(findAirport('King Khalid International Airport').iata, 'RUH');
assert.strictEqual(findAirport('JED').iata, 'JED');
assert.strictEqual(findAirport('DMM').cityEn, 'Dammam');
assert.ok(!findAirport('King Abdulaziz Air Base'));
assert.ok(!findAirport('Prince Sultan Air Base'));

console.log(`saudiAirports tests passed (${SAUDI_AIRPORTS.length} airports)`);
