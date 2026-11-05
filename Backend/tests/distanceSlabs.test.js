const assert = require('assert');
const { citySlabForDistance, airportSlabForDistance } = require('../utils/distanceSlabs');

const cityCases = [
  [0, 'slab', '0–20 km', 20],
  [20, 'slab', '0–20 km', 20],
  [21, 'slab', '21–25 km', 25],
  [25, 'slab', '21–25 km', 25],
  [32, 'slab', '31–35 km', 35],
  [45, 'slab', '41–45 km', 45],
  [60, 'slab', '56–60 km', 60],
  [61, 'long_distance', '61+ km', 61],
];

for (const [km, kind, label, billedKm] of cityCases) {
  const slab = citySlabForDistance(km);
  assert.strictEqual(slab.kind, kind, `${km} km kind`);
  assert.strictEqual(slab.label, label, `${km} km label`);
  assert.strictEqual(slab.billedKm, billedKm, `${km} km billed`);
}

const airportBase = airportSlabForDistance(32);
assert.strictEqual(airportBase.kind, 'base');
assert.strictEqual(airportBase.extraSlabs, 0);

const airportExtra = airportSlabForDistance(47);
assert.strictEqual(airportExtra.kind, 'extra');
assert.strictEqual(airportExtra.extraSlabs, 2);
assert.strictEqual(airportExtra.extraKmBilled, 10);

console.log('distanceSlabs tests passed');
