import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildManagedFleetVehicles,
  filterManagedVehiclesForService,
  getVehiclePriorityRank,
  getVehiclesForService,
  sortVehiclesByPriority,
} from '../src/data/fleetVehicles.js';
import { sortCarsForShowcase } from '../src/utils/carsStorage.js';

const rankOf = (v) => getVehiclePriorityRank(v);

test('static fleet lists order GMC → Sedan → other without removing vehicles', () => {
  for (const service of ['airport_transfer', 'city_transfer', 'chauffeur', 'intercity_transfer', 'gcc_transfer']) {
    const list = getVehiclesForService(service, 'All', service === 'chauffeur' ? 'full_day' : undefined);
    const ranks = list.map(rankOf);
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), `${service} must be GMC → Sedan → other`);
    assert.equal(list[0].category, 'gmc', `${service} must start with GMC`);
    assert.ok(list.length >= 10, `${service} must not hide vehicles`);
  }
  const airport = getVehiclesForService('airport_transfer');
  assert.deepEqual(airport.slice(1, 3).map((v) => v.category), ['ford_taurus', 'lexus_es']);
});

test('managed (database) fleet is ordered by category/type data, stable within groups, and keeps disabled checks', () => {
  const apiCars = [
    { id: 1, name: 'Mercedes-Benz Sprinter', category: 'mercedes_sprinter', type: 'Luxury Van', img: 'a', displayOrder: 1 },
    { id: 2, name: 'Custom Executive Sedan', category: 'exec_sedan', type: 'Executive Sedan', img: 'b', displayOrder: 2 },
    { id: 3, name: 'Lexus ES 350', category: 'lexus_es', type: 'Luxury Sedan', img: 'c', displayOrder: 3 },
    { id: 4, name: 'Yukon (renamed by admin)', category: 'gmc_yukon', type: 'Full-Size SUV', img: 'd', displayOrder: 4 },
    { id: 5, name: 'Toyota Coaster', category: 'toyota_coaster', type: 'Mini Bus', img: 'e', displayOrder: 5 },
    { id: 6, name: 'Disabled GMC', category: 'gmc_tahoe', type: 'Full-Size SUV', img: 'f', displayOrder: 0, available: false },
    { id: 7, name: 'Ford Taurus', category: 'ford_taurus', type: 'Executive Sedan', img: 'g', displayOrder: 6 },
  ];
  const managed = buildManagedFleetVehicles(apiCars);
  assert.equal(managed.some((v) => v.carId === 6), false, 'disabled vehicle stays hidden');

  const ordered = filterManagedVehiclesForService(managed, 'airport_transfer', 'All');
  assert.deepEqual(
    ordered.map((v) => v.carId),
    [4, 2, 3, 7, 1, 5],
    'GMC first, then sedans (existing order), then others (existing order)',
  );
  assert.equal(ordered.length, managed.length, 'no vehicles removed');
});

test('showcase ordering (Carlist/Home) puts GMC then Sedan then others and is stable', () => {
  const cars = [
    { id: 1, name: 'Toyota Coaster', type: 'Mini Bus' },
    { id: 2, name: 'Ford Taurus', type: 'Executive Sedan', category: 'ford_taurus' },
    { id: 3, name: 'Mercedes-Benz S-Class', type: 'Premium Executive' },
    { id: 4, name: 'GMC Yukon', type: 'Full-Size SUV', category: 'gmc' },
    { id: 5, name: 'Lexus ES 350', type: 'Luxury Sedan', category: 'lexus_es' },
  ];
  const sorted = sortCarsForShowcase(cars);
  assert.equal(sorted.length, cars.length);
  assert.equal(sorted[0].id, 4);
  assert.deepEqual(sorted.slice(1, 3).map((c) => c.id).sort(), [2, 5]);
  assert.ok(sorted.slice(3).every((c) => [1, 3].includes(c.id)));
});

test('sortVehiclesByPriority is stable for equal ranks', () => {
  const input = [
    { category: 'toyota_hiace', label: 'A' },
    { category: 'bmw_7', label: 'B' },
    { category: 'toyota_coaster', label: 'C' },
  ];
  assert.deepEqual(sortVehiclesByPriority(input).map((v) => v.label), ['A', 'B', 'C']);
});
