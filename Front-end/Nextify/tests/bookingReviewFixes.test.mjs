import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildManagedFleetVehicles,
  filterManagedVehiclesForService,
  findFleetVehicle,
  normalizeVehicleCategory,
} from '../src/data/fleetVehicles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wizardPath = path.resolve(__dirname, '../src/components/booking/BookingWizard.jsx');
const wizardSource = fs.readFileSync(wizardPath, 'utf8');

test('Managed fleet builder filters disabled vehicles, reflects edits/additions, and falls back safely', () => {
  assert.equal(buildManagedFleetVehicles(null), null);
  const fallbackList = filterManagedVehiclesForService(null, 'airport_transfer', 'All', '');
  assert.ok(fallbackList.length >= 10, 'Falls back to static FLEET_VEHICLES when API has not loaded');

  const apiCars = [
    { id: 10, name: 'GMC Yukon XL VIP', category: 'gmc', type: 'Full-Size SUV', img: '/images/car/GMC Yukon.png', available: true, displayOrder: 2 },
    { id: 9, name: 'Ford Taurus', category: 'ford_taurus', type: 'Executive Sedan', img: '/images/car/ford-taurus.webp', available: false, displayOrder: 1 },
    { id: 99, name: 'Toyota Land Cruiser Prado', category: 'prado_vip', type: 'Luxury SUV', img: '/images/car/prado.webp', available: true, displayOrder: 1 },
  ];

  const managed = buildManagedFleetVehicles(apiCars);
  assert.equal(managed.length, 2, 'Disabled vehicle must be excluded');
  assert.equal(managed[0].category, 'prado_vip', 'displayOrder must be respected');
  assert.equal(managed[0].carId, 99);
  assert.equal(managed[0].isCustom, true);
  assert.equal(managed[1].category, 'gmc');
  assert.equal(managed[1].carId, 10);
  assert.equal(managed[1].label, 'GMC Yukon XL VIP', 'Edited admin name must be preserved');
  assert.equal(managed[1].airport, 240, 'Known pricing metadata must be preserved');

  const halfDayList = filterManagedVehiclesForService(managed, 'chauffeur', 'All', 'half_day');
  assert.equal(halfDayList.length, 2, 'Custom vehicle and GMC half-day vehicle stay available');
});

test('Canonical vehicle category aliases normalize cleanly without collapsing distinct vehicles', () => {
  assert.equal(normalizeVehicleCategory('gmc_yukon'), 'gmc');
  assert.equal(normalizeVehicleCategory('gmc_tahoe'), 'gmc');
  assert.equal(normalizeVehicleCategory('chevrolet_suburban'), 'gmc');
  assert.equal(normalizeVehicleCategory('mini_van'), 'toyota_hiace');
  assert.equal(normalizeVehicleCategory('mercedes_s'), 'mercedes_s');
  assert.notEqual(normalizeVehicleCategory('mercedes_s'), normalizeVehicleCategory('ford_taurus'));

  const found = findFleetVehicle({ category: 'gmc_yukon' });
  assert.equal(found?.category, 'gmc');
});

test('BookingWizard uses managed fleet API with loading/error guards, custom-location quoteKey fields, and canonical category comparison', () => {
  assert.ok(wizardSource.includes('getCarsAPI()'), 'BookingWizard must fetch managed fleet via getCarsAPI');
  assert.ok(wizardSource.includes('buildManagedFleetVehicles'), 'BookingWizard must build managed vehicles');
  assert.ok(wizardSource.includes('if (fleetLoading) return []'), 'BookingWizard must not expose static fleet while loading');
  assert.ok(wizardSource.includes('Loading available vehicles...'), 'BookingWizard must render a fleet loading state');
  assert.ok(wizardSource.includes('fleetError'), 'BookingWizard must track API failure state');
  assert.ok(wizardSource.includes('form.pickupLocation'), 'quoteKey must include pickupLocation');
  assert.ok(wizardSource.includes('form.dropoffLocation'), 'quoteKey must include dropoffLocation');
  assert.ok(wizardSource.includes('form.otherOrigin'), 'quoteKey must include otherOrigin');
  assert.ok(wizardSource.includes('form.pickupPlace?.address'), 'quoteKey must include pickupPlace.address');
  assert.ok(wizardSource.includes('form.dropoffPlace?.address'), 'quoteKey must include dropoffPlace.address');
  assert.ok(
    wizardSource.includes('normalizeVehicleCategory(nextQuote.vehicleCategory)'),
    'BookingWizard must normalize backend vehicleCategory before comparing'
  );

  const pricingPanelSource = fs.readFileSync(
    path.resolve(__dirname, '../src/components/admin/AdminPricingPanel.jsx'),
    'utf8'
  );
  assert.ok(
    pricingPanelSource.includes('toCategorySlug'),
    'AdminPricingPanel must fall back to deterministic category slug for custom vehicles'
  );
});
