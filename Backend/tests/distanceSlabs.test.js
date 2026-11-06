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

const airportCases = [
  [0, 'base', 0],
  [32, 'base', 0],
  [40, 'base', 0],
  [41, 'extra', 1],
  [45, 'extra', 1],
  [46, 'extra', 2],
  [47, 'extra', 2],
  [50, 'extra', 2],
  [51, 'extra', 3],
  [55, 'extra', 3],
  [56, 'extra', 4],
  [60, 'extra', 4],
  [61, 'extra', 5],
];

for (const [km, kind, extraSlabs] of airportCases) {
  const slab = airportSlabForDistance(km);
  assert.strictEqual(slab.kind, kind, `${km} km airport kind`);
  assert.strictEqual(slab.extraSlabs, extraSlabs, `${km} km airport slabs`);
}

console.log('distanceSlabs tests passed');
