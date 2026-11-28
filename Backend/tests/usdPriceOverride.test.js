/**
 * Vehicle & Pricing Optional USD Override & 3.75 Conversion Tests
 * Run: node Backend/tests/usdPriceOverride.test.js
 */
const assert = require('assert');
const Car = require('../models/Car');
const PricingRule = require('../models/PricingRule');
const carController = require('../controllers/carController');
const pricingController = require('../controllers/pricingController');
const { SAR_PER_USD, sarToUsd, parseOptionalPositiveUsd } = require('../utils/currency');

const results = [];

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

async function check(name, fn) {
  const origCarFindOne = Car.findOne;
  const origCarSave = Car.prototype.save;
  const origRuleFind = PricingRule.find;
  const origRuleFindById = PricingRule.findById;
  const origRuleCreate = PricingRule.create;
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`ok ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`fail ${name} — ${err.message}`);
  } finally {
    Car.findOne = origCarFindOne;
    Car.prototype.save = origCarSave;
    PricingRule.find = origRuleFind;
    PricingRule.findById = origRuleFindById;
    PricingRule.create = origRuleCreate;
  }
}

async function run() {
  await check('1. Fixed 3.75 conversion calculates exact 2-decimal USD values and rejects invalid inputs', async () => {
    assert.strictEqual(SAR_PER_USD, 3.75);
    assert.strictEqual(sarToUsd(1400), 373.33);
    assert.strictEqual(sarToUsd(1200), 320);

    assert.deepStrictEqual(parseOptionalPositiveUsd(''), { valid: true, value: null });
    assert.deepStrictEqual(parseOptionalPositiveUsd(null), { valid: true, value: null });
    assert.deepStrictEqual(parseOptionalPositiveUsd('300'), { valid: true, value: 300 });
    assert.deepStrictEqual(parseOptionalPositiveUsd('373.33'), { valid: true, value: 373.33 });

    for (const bad of ['abc', '-100', '0', 'NaN', '-0.01']) {
      assert.strictEqual(parseOptionalPositiveUsd(bad).valid, false, `${bad} must be rejected`);
    }
  });

  await check('2. carController addCar & updateCar validate optional USD override and allow clearing back to automatic', async () => {
    const carDoc = {
      id: 10,
      name: 'GMC Yukon',
      price: 'SAR 1400',
      priceUsd: '',
      type: 'Full-Size SUV',
      seats: '7-8 passengers',
      luggage: '5 Bags',
      img: '/images/car/GMC Yukon.png',
      save: async function save() { return this; },
    };

    Car.findOne = () => ({
      sort: async () => ({ id: 14 }),
      select: () => ({ lean: async () => null }),
      then(resolve, reject) { return Promise.resolve(carDoc).then(resolve, reject); },
    });
    Car.prototype.save = async function save() { return this; };

    // Reject invalid USD on addCar
    const badAddRes = makeRes();
    await carController.addCar(
      {
        body: {
          name: 'Test SUV',
          price: 'SAR 1400',
          priceUsd: '-50',
          type: 'SUV',
          seats: '7',
          luggage: '5',
          img: '/images/car/test.webp',
        },
      },
      badAddRes
    );
    assert.strictEqual(badAddRes.statusCode, 400);

    // Set manual USD 300 on updateCar
    const setOverrideRes = makeRes();
    await carController.updateCar(
      { params: { id: '10' }, body: { priceUsd: '300' } },
      setOverrideRes
    );
    assert.strictEqual(setOverrideRes.statusCode, 200);
    assert.strictEqual(carDoc.priceUsd, '300');

    // Clear manual USD override back to automatic
    const clearOverrideRes = makeRes();
    await carController.updateCar(
      { params: { id: '10' }, body: { priceUsd: '' } },
      clearOverrideRes
    );
    assert.strictEqual(clearOverrideRes.statusCode, 200);
    assert.strictEqual(carDoc.priceUsd, '');

    // Reject text USD on updateCar
    const badUpdateRes = makeRes();
    await carController.updateCar(
      { params: { id: '10' }, body: { priceUsd: 'free' } },
      badUpdateRes
    );
    assert.strictEqual(badUpdateRes.statusCode, 400);
  });

  await check('3. pricingController create/update supports optional USD override, clearing to null, and rejects invalid USD', async () => {
    PricingRule.find = () => ({ lean: async () => [] });
    let createdDoc = null;
    PricingRule.create = async (doc) => { createdDoc = { _id: 'rule_1', ...doc }; return createdDoc; };

    // Empty priceUsd -> stored as null (automatic)
    const createAutoRes = makeRes();
    await pricingController.createPricingRule(
      {
        body: {
          serviceType: 'chauffeur',
          vehicleCategory: 'gmc',
          durationType: 'full_day',
          pricingMode: 'fixed',
          price: 1400,
          priceUsd: '',
        },
      },
      createAutoRes,
      (err) => { if (err) throw err; }
    );
    assert.strictEqual(createAutoRes.statusCode, 201);
    assert.strictEqual(createdDoc.priceUsd, null);

    // Invalid negative or zero USD -> 400
    for (const badUsd of ['abc', -20, 0]) {
      const badRes = makeRes();
      await pricingController.createPricingRule(
        {
          body: {
            serviceType: 'chauffeur',
            vehicleCategory: 'gmc',
            durationType: 'full_day',
            pricingMode: 'fixed',
            price: 1400,
            priceUsd: badUsd,
          },
        },
        badRes,
        (err) => { if (err) throw err; }
      );
      assert.strictEqual(badRes.statusCode, 400, `priceUsd=${badUsd} must return 400`);
    }

    // Manual override then clear back to null on updatePricingRule
    const existingRule = {
      _id: 'rule_1',
      serviceType: 'chauffeur',
      vehicleCategory: 'gmc',
      vehicleId: 'gmc',
      durationType: 'full_day',
      pricingMode: 'fixed',
      price: 1400,
      priceUsd: 300,
      active: true,
      save: async function save() { return this; },
    };
    PricingRule.findById = async () => existingRule;

    const clearRes = makeRes();
    await pricingController.updatePricingRule(
      { params: { id: 'rule_1' }, body: { priceUsd: '' } },
      clearRes,
      (err) => { if (err) throw err; }
    );
    assert.strictEqual(clearRes.statusCode, 200);
    assert.strictEqual(existingRule.priceUsd, null);
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
