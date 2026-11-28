import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAR_PER_USD,
  formatSarAndUsd,
  parseOptionalPositiveUsd,
  resolveUsdDisplay,
  sarToUsd,
} from '../src/utils/currency.js';
import { formatCarDayPriceForLang } from '../src/i18n/format.js';
import { initialCars } from '../src/utils/carsStorage.js';

test('GMC Yukon SAR 1,400 with no USD override displays $373.33', () => {
  assert.equal(SAR_PER_USD, 3.75);
  assert.equal(sarToUsd(1400), 373.33);

  const yukon = { id: 10, name: 'GMC Yukon', price: 'SAR 1400', priceUsd: '' };
  assert.equal(formatCarDayPriceForLang(yukon, 'en'), 'SAR 1,400 · $373.33');
  assert.equal(formatSarAndUsd(1400, null), 'SAR 1,400 · $373.33');
});

test('Ford Taurus and Lexus ES 350 SAR 1,200 with no override display $320', () => {
  const taurus = { id: 9, name: 'Ford Taurus', price: '$180/day', priceUsd: '' };
  const lexus = { id: 2, name: 'Lexus ES 350', price: '$200/day', priceUsd: '' };
  assert.equal(formatCarDayPriceForLang(taurus, 'en'), 'SAR 1,200 · $320');
  assert.equal(formatCarDayPriceForLang(lexus, 'en'), 'SAR 1,200 · $320');
});

test('Admin manual USD override displays override and clearing returns to automatic 3.75 conversion', () => {
  const yukonOverride = { id: 10, name: 'GMC Yukon', price: 'SAR 1400', priceUsd: '300' };
  assert.equal(formatCarDayPriceForLang(yukonOverride, 'en'), 'SAR 1,400 · $300');
  assert.deepEqual(resolveUsdDisplay('SAR 1400', '300'), { amount: 300, isOverride: true });

  // Clearing USD override returns to automatic $373.33
  const yukonCleared = { id: 10, name: 'GMC Yukon', price: 'SAR 1400', priceUsd: '' };
  assert.equal(formatCarDayPriceForLang(yukonCleared, 'en'), 'SAR 1,400 · $373.33');
  assert.deepEqual(resolveUsdDisplay('SAR 1400', ''), { amount: 373.33, isOverride: false });
});

test('Changing SAR price updates automatic USD when override is empty', () => {
  const updatedYukon = { id: 10, name: 'GMC Yukon', price: 'SAR 1500', priceUsd: '' };
  assert.equal(formatCarDayPriceForLang(updatedYukon, 'en'), 'SAR 1,500 · $400');

  const updatedCustom = { id: 99, name: 'Custom Luxury', price: 'SAR 1875', priceUsd: '' };
  assert.equal(formatCarDayPriceForLang(updatedCustom, 'en'), 'SAR 1,875 · $500');
});

test('initialCars GMC Yukon has no stale hardcoded $300 override and invalid USD inputs are rejected', () => {
  const seededYukon = initialCars.find((c) => c.name === 'GMC Yukon');
  assert.ok(seededYukon);
  assert.equal(seededYukon.priceUsd, '');
  assert.equal(formatCarDayPriceForLang(seededYukon, 'en'), 'SAR 1,400 · $373.33');

  for (const bad of ['abc', '-10', '0', 'NaN', '-0.5']) {
    assert.equal(parseOptionalPositiveUsd(bad).valid, false, `${bad} must be rejected`);
  }
  assert.deepEqual(parseOptionalPositiveUsd(''), { valid: true, value: null });
  assert.deepEqual(parseOptionalPositiveUsd('373.33'), { valid: true, value: 373.33 });
});
