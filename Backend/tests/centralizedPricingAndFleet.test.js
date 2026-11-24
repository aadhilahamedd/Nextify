/**
 * Centralized Pricing Management & Admin Fleet Management Test Suite
 * Run: node Backend/tests/centralizedPricingAndFleet.test.js
 * Uses in-memory stubs only (no MongoDB connection, no external network calls).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const PricingRule = require('../models/PricingRule');
const Settings = require('../models/Settings');
const Car = require('../models/Car');
const Booking = require('../models/Booking');
const pricingController = require('../controllers/pricingController');
const carController = require('../controllers/carController');
const { calculatePrice } = require('../services/pricingService');
const { createBookingFromPayload } = require('../services/bookingCreateService');
const adminMiddleware = require('../middleware/adminMiddleware');
const route = require('../routes/route');

const results = [];

function makeMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function makeChainQuery(docs) {
  const query = {
    sort() { return query; },
    maxTimeMS() { return query; },
    lean() { return query; },
    exec: async () => docs,
    then(resolve, reject) {
      return Promise.resolve(docs).then(resolve, reject);
    },
  };
  return query;
}

async function check(name, fn) {
  const origFind = PricingRule.find;
  const origFindById = PricingRule.findById;
  const origCreate = PricingRule.create;
  const origDelete = PricingRule.findByIdAndDelete;
  const origRuleCount = PricingRule.countDocuments;
  const origSettingsFindOne = Settings.findOne;
  const origSettingsUpdate = Settings.findOneAndUpdate;
  const origBookingFindOne = Booking.findOne;
  const origBookingSave = Booking.prototype.save;
  const origCarFindOne = Car.findOne;
  const origCarFind = Car.find;
  const origCarCount = Car.countDocuments;
  const origCarDeleteMany = Car.deleteMany;
  const origReadyDesc = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');

  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`ok ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`fail ${name} — ${err.message}`);
  } finally {
    PricingRule.find = origFind;
    PricingRule.findById = origFindById;
    PricingRule.create = origCreate;
    PricingRule.findByIdAndDelete = origDelete;
    PricingRule.countDocuments = origRuleCount;
    Settings.findOne = origSettingsFindOne;
    Settings.findOneAndUpdate = origSettingsUpdate;
    Booking.findOne = origBookingFindOne;
    Booking.prototype.save = origBookingSave;
    Car.findOne = origCarFindOne;
    Car.find = origCarFind;
    Car.countDocuments = origCarCount;
    Car.deleteMany = origCarDeleteMany;
    if (origReadyDesc) {
      Object.defineProperty(mongoose.connection, 'readyState', origReadyDesc);
    } else {
      delete mongoose.connection.readyState;
    }
  }
}

function mockDbConnected(rulesStore, { configuredServices = [] } = {}) {
  const configuredSet = new Set(configuredServices.map((s) => `pricingConfigured:${s}`));
  Object.defineProperty(mongoose.connection, 'readyState', {
    value: 1,
    configurable: true,
    writable: true,
  });
  PricingRule.find = (filter = {}) => {
    const matched = rulesStore.filter((r) => {
      if (filter.active !== undefined && Boolean(r.active) !== Boolean(filter.active)) return false;
      if (filter.serviceType && r.serviceType !== filter.serviceType) return false;
      return true;
    });
    return makeChainQuery(matched);
  };
  PricingRule.countDocuments = (filter = {}) => {
    const count = rulesStore.filter((r) => {
      if (filter.serviceType && r.serviceType !== filter.serviceType) return false;
      return true;
    }).length;
    return makeChainQuery(count);
  };
  Settings.findOne = (query = {}) => {
    const key = query?.key;
    const hit = typeof key === 'string' && configuredSet.has(key);
    return makeChainQuery(hit ? { key, value: true } : null);
  };
  Settings.findOneAndUpdate = async (query = {}) => {
    if (query?.key) configuredSet.add(query.key);
    return { key: query?.key, value: true };
  };
}

function futureDateISO() {
  return new Date(Date.now() + 72 * 3600 * 1000).toISOString();
}

async function run() {
  await check('1. Admin authorization protects pricing & fleet write endpoints', async () => {
    const res = makeMockRes();
    let nextCalled = false;
    await adminMiddleware({ user: { role: 'user' } }, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);

    const routeLayers = route.stack.filter((l) => l.route);
    const protectedPaths = [
      ['post', '/api/pricing'],
      ['put', '/api/pricing/:id'],
      ['delete', '/api/pricing/:id'],
      ['get', '/api/pricing-rules'],
      ['post', '/api/pricing-rules'],
      ['put', '/api/pricing-rules/:id'],
      ['delete', '/api/pricing-rules/:id'],
      ['get', '/api/cars/admin'],
      ['post', '/api/cars'],
      ['put', '/api/cars/:id'],
      ['patch', '/api/cars/:id/availability'],
      ['delete', '/api/cars/:id'],
    ];
    for (const [method, p] of protectedPaths) {
      const layer = routeLayers.find((l) => l.route.path === p && l.route.methods[method]);
      assert.ok(layer, `Route ${method.toUpperCase()} ${p} must exist`);
      assert.ok(layer.route.stack.length >= 3, `Route ${method.toUpperCase()} ${p} must have auth + admin middleware`);
    }
  });

  await check('2. Add, edit, and delete pricing record with validation', async () => {
    const store = [];
    PricingRule.find = () => makeChainQuery(store);
    PricingRule.create = async (doc) => {
      const created = { _id: '507f1f77bcf86cd799439011', ...doc };
      store.push(created);
      return created;
    };

    const createRes = makeMockRes();
    await pricingController.createPricingRule({
      body: {
        serviceType: 'airport_transfer',
        vehicleCategory: 'gmc',
        origin: 'Al Ula Airport',
        destination: 'Al Ula Resort',
        pricingMode: 'fixed',
        price: 950,
        active: true,
        notes: 'New custom route',
      },
    }, createRes, (e) => { throw e; });

    assert.strictEqual(createRes.statusCode, 201);
    assert.strictEqual(createRes.body.data.rule.price, 950);
    assert.strictEqual(createRes.body.data.rule.originId, 'al_ula_airport');
    assert.strictEqual(createRes.body.data.rule.destinationId, 'al_ula_resort');

    const storedDoc = {
      ...store[0],
      async save() { return this; },
    };
    PricingRule.findById = async () => storedDoc;

    const updateRes = makeMockRes();
    await pricingController.updatePricingRule({
      params: { id: storedDoc._id },
      body: { price: 1100, notes: 'Updated rate' },
    }, updateRes, (e) => { throw e; });

    assert.strictEqual(updateRes.statusCode, 200);
    assert.strictEqual(updateRes.body.data.rule.price, 1100);

    PricingRule.findByIdAndDelete = async () => storedDoc;
    const deleteRes = makeMockRes();
    await pricingController.deletePricingRule({ params: { id: storedDoc._id } }, deleteRes, (e) => { throw e; });
    assert.strictEqual(deleteRes.statusCode, 200);
  });

  await check('3. Duplicate active directional route is rejected (409), while reverse direction is allowed', async () => {
    const store = [
      {
        _id: '507f1f77bcf86cd799439012',
        serviceType: 'airport_transfer',
        vehicleCategory: 'gmc',
        vehicleId: 'gmc',
        vehicleApplicability: 'specific',
        origin: 'Bahrain',
        originId: 'bahrain',
        destination: 'Riyadh',
        destinationId: 'riyadh',
        pricingMode: 'fixed',
        price: 1800,
        active: true,
      },
    ];
    PricingRule.find = () => makeChainQuery(store);
    PricingRule.create = async (doc) => ({ _id: '507f1f77bcf86cd799439013', ...doc });

    const dupRes = makeMockRes();
    await pricingController.createPricingRule({
      body: {
        serviceType: 'airport_transfer',
        vehicleCategory: 'gmc',
        origin: 'Bahrain',
        destination: 'Riyadh',
        pricingMode: 'fixed',
        price: 1900,
        active: true,
      },
    }, dupRes, (e) => { throw e; });
    assert.strictEqual(dupRes.statusCode, 409);

    const reverseRes = makeMockRes();
    await pricingController.createPricingRule({
      body: {
        serviceType: 'airport_transfer',
        vehicleCategory: 'gmc',
        origin: 'Riyadh',
        destination: 'Bahrain',
        pricingMode: 'fixed',
        price: 1500,
        active: true,
      },
    }, reverseRes, (e) => { throw e; });
    assert.strictEqual(reverseRes.statusCode, 201);
    assert.strictEqual(reverseRes.body.data.rule.price, 1500);
  });

  await check('4. Negative, zero, and non-finite prices are rejected server-side (400)', async () => {
    for (const badPrice of [-100, 0, NaN, Infinity, 'abc', '']) {
      const res = makeMockRes();
      await pricingController.createPricingRule({
        body: {
          serviceType: 'airport_transfer',
          vehicleCategory: 'gmc',
          origin: 'Riyadh',
          destination: 'Jeddah',
          pricingMode: 'fixed',
          price: badPrice,
        },
      }, res, (e) => { throw e; });
      assert.strictEqual(res.statusCode, 400, `Expected 400 for price=${String(badPrice)}`);
    }
  });

  await check('5. Bahrain → Riyadh (SAR 1,800 incl. tax) and Riyadh → Bahrain (SAR 1,500) remain independent and unequal', async () => {
    const bhrToRuh = await calculatePrice({
      serviceType: 'airport_transfer',
      origin: 'Bahrain',
      destination: 'Riyadh',
      vehicleCategory: 'gmc',
    });
    const ruhToBhr = await calculatePrice({
      serviceType: 'airport_transfer',
      origin: 'Riyadh',
      destination: 'Bahrain',
      vehicleCategory: 'gmc',
    });

    assert.strictEqual(bhrToRuh.price, 1800);
    assert.strictEqual(bhrToRuh.taxIncluded, true);
    assert.strictEqual(ruhToBhr.price, 1500);
    assert.notStrictEqual(bhrToRuh.price, ruhToBhr.price);
  });

  await check('6. Existing Bahrain routes and 10 fixed routes remain unchanged', async () => {
    const checks = [
      [{ origin: 'Bahrain', destination: 'Dammam', vehicleCategory: 'gmc' }, 650],
      [{ origin: 'Bahrain', destination: 'Dammam', vehicleCategory: 'ford_taurus' }, 550],
      [{ origin: 'Bahrain', destination: 'Al Khobar', vehicleCategory: 'gmc' }, 650],
      [{ origin: 'Bahrain', destination: 'Al Khobar', vehicleCategory: 'lexus_es' }, 550],
      [{ origin: 'Jeddah Airport', destination: 'Makkah', vehicleCategory: 'gmc' }, 800],
      [{ origin: 'Riyadh', destination: 'Jeddah', vehicleCategory: 'gmc' }, 3200],
      [{ origin: 'Riyadh', destination: 'Madinah', vehicleCategory: 'ford_taurus' }, 2500],
    ];
    for (const [params, expected] of checks) {
      const q = await calculatePrice({ serviceType: 'airport_transfer', ...params });
      assert.strictEqual(q.price, expected);
      assert.strictEqual(q.customQuoteRequired, false);
    }
  });

  await check('7. DB Airport Transfer rule supports vehicle-specific directional rates & inactive records are ignored', async () => {
    mockDbConnected([
      {
        _id: '507f1f77bcf86cd799439020',
        serviceType: 'airport_transfer',
        vehicleCategory: 'mercedes_s',
        vehicleId: 'mercedes_s',
        origin: 'Al Ula Airport',
        originId: 'al_ula_airport',
        destination: 'Al Ula Resort',
        destinationId: 'al_ula_resort',
        pricingMode: 'fixed',
        price: 1750,
        taxIncluded: true,
        allowReverse: false,
        active: true,
      },
      {
        _id: '507f1f77bcf86cd799439021',
        serviceType: 'airport_transfer',
        vehicleCategory: 'gmc',
        vehicleId: 'gmc',
        origin: 'Al Ula Airport',
        originId: 'al_ula_airport',
        destination: 'Al Ula Resort',
        destinationId: 'al_ula_resort',
        pricingMode: 'fixed',
        price: 900,
        allowReverse: false,
        active: false, // inactive must be ignored
      },
    ]);

    const forward = await calculatePrice({
      serviceType: 'airport_transfer',
      origin: 'Al Ula Airport',
      destination: 'Al Ula Resort',
      vehicleCategory: 'mercedes_s',
    });
    assert.strictEqual(forward.price, 1750);
    assert.strictEqual(forward.taxIncluded, true);
    assert.strictEqual(forward.customQuoteRequired, false);

    // Reverse direction must NOT auto-match
    const reverse = await calculatePrice({
      serviceType: 'airport_transfer',
      origin: 'Al Ula Resort',
      destination: 'Al Ula Airport',
      vehicleCategory: 'mercedes_s',
    });
    assert.strictEqual(reverse.customQuoteRequired, true);
    assert.strictEqual(reverse.price, null);

    // Inactive GMC record must NOT apply (returns Price on request)
    const inactive = await calculatePrice({
      serviceType: 'airport_transfer',
      origin: 'Al Ula Airport',
      destination: 'Al Ula Resort',
      vehicleCategory: 'gmc',
    });
    assert.strictEqual(inactive.customQuoteRequired, true);
    assert.strictEqual(inactive.price, null);
  });

  await check('8. Point-to-Point directional pricing and Hourly Chauffeur (hourly/half_day/full_day) work via DB', async () => {
    mockDbConnected([
      {
        _id: '507f1f77bcf86cd799439030',
        serviceType: 'city_transfer',
        vehicleCategory: 'gmc',
        origin: 'Diriyah',
        originId: 'diriyah',
        destination: 'KAFD',
        destinationId: 'kafd',
        pricingMode: 'fixed',
        price: 420,
        allowReverse: false,
        active: true,
      },
      {
        _id: '507f1f77bcf86cd799439031',
        serviceType: 'chauffeur',
        vehicleCategory: 'gmc',
        durationType: 'hourly',
        pricingMode: 'fixed',
        price: 220,
        active: true,
      },
    ]);

    const p2p = await calculatePrice({
      serviceType: 'point_to_point',
      origin: 'Diriyah',
      destination: 'KAFD',
      vehicleCategory: 'gmc',
    });
    assert.strictEqual(p2p.price, 420);
    assert.strictEqual(p2p.customQuoteRequired, false);

    const hourly = await calculatePrice({
      serviceType: 'hourly_chauffeur',
      durationType: 'hourly',
      vehicleCategory: 'gmc',
    });
    assert.strictEqual(hourly.price, 220);
    assert.strictEqual(hourly.durationType, 'hourly');
    assert.strictEqual(hourly.customQuoteRequired, false);
  });

  await check('9. WhatsApp Assistant pricingMode creates custom quote booking with no checkout token and ignores client price', async () => {
    mockDbConnected([
      {
        _id: '507f1f77bcf86cd799439040',
        serviceType: 'airport_transfer',
        vehicleCategory: 'gmc',
        origin: 'Riyadh',
        originId: 'riyadh',
        destination: 'Jeddah',
        destinationId: 'jeddah',
        pricingMode: 'whatsapp_assistant',
        price: null,
        active: true,
      },
    ]);

    Booking.findOne = async () => null;
    Booking.prototype.save = async function saveStub() { return this; };

    const { booking, quote, checkoutToken } = await createBookingFromPayload({
      serviceType: 'airport_transfer',
      origin: 'Riyadh',
      destination: 'Jeddah',
      vehicleCategory: 'gmc',
      vehicleName: 'GMC Yukon',
      quotedPrice: 1,
      totalAmount: 1,
      pickupDateTime: futureDateISO(),
      customer: { name: 'VIP Guest', email: 'vip@example.com', mobile: '+966551234567' },
    });

    assert.strictEqual(quote.customQuoteRequired, true);
    assert.strictEqual(quote.price, null);
    assert.strictEqual(quote.payable, false);
    assert.strictEqual(booking.customQuoteRequired, true);
    assert.strictEqual(booking.pricingType, 'custom_quote');
    assert.strictEqual(booking.paymentStatus, 'NOT_REQUIRED');
    assert.strictEqual(booking.bookingStatus, 'PENDING');
    assert.strictEqual(checkoutToken, null);
  });

  await check('10. Fixed-price booking persists server-validated amount & taxIncluded and ignores client price tampering', async () => {
    Booking.findOne = async () => null;
    Booking.prototype.save = async function saveStub() { return this; };

    const { booking, quote } = await createBookingFromPayload({
      serviceType: 'airport_transfer',
      origin: 'Bahrain International Airport',
      destination: 'Riyadh',
      vehicleCategory: 'gmc',
      vehicleName: 'GMC Yukon',
      quotedPrice: 10,
      totalAmount: 10,
      pickupDateTime: futureDateISO(),
      customer: { name: 'Bahrain Guest', email: 'bhr@example.com', mobile: '+97333123456' },
    });

    assert.strictEqual(quote.price, 1800);
    assert.strictEqual(quote.taxIncluded, true);
    assert.strictEqual(booking.quotedPrice, 1800);
    assert.strictEqual(booking.pricing.totalAmount, 1800);
    assert.strictEqual(booking.pricing.breakdown.taxIncluded, true);
  });

  await check('11. Fleet Management preserves vehicle ID on update and toggles availability cleanly', async () => {
    const mockCar = {
      id: 10,
      name: 'GMC Yukon',
      brand: 'GMC',
      model: 'Yukon',
      category: 'gmc',
      price: 'SAR 1125',
      priceUsd: '300',
      type: 'Full-Size SUV',
      seats: '7-8 passengers',
      luggage: '5-6 Bags',
      img: '/images/car/GMC Yukon.png',
      available: true,
      displayOrder: 1,
      async save() { return this; },
    };

    Car.findOne = async () => mockCar;

    const updateRes = makeMockRes();
    await carController.updateCar({
      params: { id: '10' },
      body: { id: 999, name: 'GMC Yukon XL', brand: 'GMC', description: 'Flagship SUV', displayOrder: 2 },
    }, updateRes);

    assert.strictEqual(updateRes.statusCode, 200);
    assert.strictEqual(updateRes.body.car.id, 10, 'Numeric car ID must never be overwritten');
    assert.strictEqual(updateRes.body.car.name, 'GMC Yukon XL');
    assert.strictEqual(updateRes.body.car.displayOrder, 2);

    const toggleRes = makeMockRes();
    await carController.toggleCarAvailability({
      params: { id: '10' },
      body: { available: false },
    }, toggleRes);

    assert.strictEqual(toggleRes.statusCode, 200);
    assert.strictEqual(toggleRes.body.car.available, false);
  });

  await check('12. WhatsApp checkout flag remains enabled (no unintended Moyasar checkout)', async () => {
    const modePath = path.join(__dirname, '../../Front-end/Nextify/src/utils/paymentMode.js');
    const content = fs.readFileSync(modePath, 'utf8');
    assert.ok(
      /export const TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR = true;/.test(content),
      'TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR must remain true'
    );
  });

  await check('13. Vehicle ID/category integrity: matching pair works, conflicting carId is rejected, missing category falls back to carId, aliases match canonical', async () => {
    mockDbConnected([
      {
        _id: '507f1f77bcf86cd799439050',
        serviceType: 'airport_transfer',
        vehicleCategory: 'ford_taurus',
        vehicleId: 'ford_taurus',
        vehicleCarId: 9,
        origin: 'Al Ula Airport',
        originId: 'al_ula_airport',
        destination: 'Al Ula Resort',
        destinationId: 'al_ula_resort',
        pricingMode: 'fixed',
        price: 500,
        active: true,
      },
      {
        _id: '507f1f77bcf86cd799439051',
        serviceType: 'airport_transfer',
        vehicleCategory: 'gmc',
        vehicleId: 'gmc',
        vehicleCarId: 10,
        origin: 'Al Ula Airport',
        originId: 'al_ula_airport',
        destination: 'Al Ula Resort',
        destinationId: 'al_ula_resort',
        pricingMode: 'fixed',
        price: 1200,
        active: true,
      },
      {
        _id: '507f1f77bcf86cd799439052',
        serviceType: 'airport_transfer',
        vehicleCategory: 'mercedes_s',
        vehicleId: 'mercedes_s',
        vehicleCarId: 8,
        origin: 'Al Ula Airport',
        originId: 'al_ula_airport',
        destination: 'Al Ula Resort',
        destinationId: 'al_ula_resort',
        pricingMode: 'fixed',
        price: 2400,
        active: true,
      },
    ]);

    // 1. Correct vehicle category + correct vehicleCarId
    const matched = await calculatePrice({
      serviceType: 'airport_transfer',
      origin: 'Al Ula Airport',
      destination: 'Al Ula Resort',
      vehicleCategory: 'mercedes_s',
      vehicleCarId: 8,
    });
    assert.strictEqual(matched.price, 2400);
    assert.strictEqual(matched.customQuoteRequired, false);

    // 2. Tampered: Mercedes S-Class category with Ford Taurus vehicleCarId (9) must NEVER get Sedan price
    const tampered = await calculatePrice({
      serviceType: 'airport_transfer',
      origin: 'Al Ula Airport',
      destination: 'Al Ula Resort',
      vehicleCategory: 'mercedes_s',
      vehicleCarId: 9,
    });
    assert.strictEqual(tampered.customQuoteRequired, true);
    assert.strictEqual(tampered.price, null);
    assert.strictEqual(tampered.payable, false);

    // 3. Missing vehicleCategory with valid vehicleCarId (10) falls back to carId
    const byCarIdOnly = await calculatePrice({
      serviceType: 'airport_transfer',
      origin: 'Al Ula Airport',
      destination: 'Al Ula Resort',
      vehicleCategory: '',
      vehicleCarId: 10,
    });
    assert.strictEqual(byCarIdOnly.price, 1200);
    assert.strictEqual(byCarIdOnly.customQuoteRequired, false);

    // 4. Legacy alias gmc_yukon matches canonical gmc rule
    const byAlias = await calculatePrice({
      serviceType: 'airport_transfer',
      origin: 'Al Ula Airport',
      destination: 'Al Ula Resort',
      vehicleCategory: 'gmc_yukon',
      vehicleCarId: 10,
    });
    assert.strictEqual(byAlias.price, 1200);
    assert.strictEqual(byAlias.customQuoteRequired, false);
  });

  await check('14. Service-specific pricingConfigured isolates City Transfer and Chauffeur fallbacks while preserving Airport/Bahrain rates', async () => {
    // 1. No pricing configuration -> approved fallback works for both City Transfer and Chauffeur
    mockDbConnected([], { configuredServices: [] });
    const freshCity = await calculatePrice({ serviceType: 'city_transfer', vehicleCategory: 'gmc' });
    const freshChauffeur = await calculatePrice({ serviceType: 'chauffeur', vehicleCategory: 'gmc', durationType: 'full_day' });
    assert.strictEqual(freshCity.price, 240);
    assert.strictEqual(freshChauffeur.price, 1400);

    // 2. Creating a City Transfer rule does NOT disable Chauffeur fallback
    mockDbConnected([
      {
        _id: '507f1f77bcf86cd799439060',
        serviceType: 'city_transfer',
        vehicleCategory: 'gmc',
        origin: 'Riyadh',
        pricingMode: 'fixed',
        price: 350,
        active: true,
      },
    ], { configuredServices: ['city_transfer'] });
    const activeCity = await calculatePrice({ serviceType: 'city_transfer', vehicleCategory: 'gmc' });
    const unaffectedChauffeur = await calculatePrice({ serviceType: 'chauffeur', vehicleCategory: 'gmc', durationType: 'full_day' });
    assert.strictEqual(activeCity.price, 350);
    assert.strictEqual(unaffectedChauffeur.price, 1400, 'Configuring city_transfer must not disable chauffeur fallback');

    // 3. Creating a Chauffeur rule does NOT disable City Transfer fallback
    mockDbConnected([
      {
        _id: '507f1f77bcf86cd799439069',
        serviceType: 'chauffeur',
        vehicleCategory: 'gmc',
        durationType: 'full_day',
        pricingMode: 'fixed',
        price: 1650,
        active: true,
      },
    ], { configuredServices: ['chauffeur'] });
    const activeChauffeur = await calculatePrice({ serviceType: 'chauffeur', vehicleCategory: 'gmc', durationType: 'full_day' });
    const unaffectedCity = await calculatePrice({ serviceType: 'city_transfer', vehicleCategory: 'gmc' });
    assert.strictEqual(activeChauffeur.price, 1650);
    assert.strictEqual(unaffectedCity.price, 240, 'Configuring chauffeur must not disable city_transfer fallback');

    // 4. Disabling all City Transfer rules returns quote-only for City Transfer, while Chauffeur remains priced
    mockDbConnected([
      {
        _id: '507f1f77bcf86cd799439061',
        serviceType: 'city_transfer',
        vehicleCategory: 'gmc',
        origin: 'Riyadh',
        pricingMode: 'fixed',
        price: 350,
        active: false,
      },
    ], { configuredServices: ['city_transfer'] });
    const disabledCity = await calculatePrice({ serviceType: 'city_transfer', vehicleCategory: 'gmc' });
    const stillActiveChauffeur = await calculatePrice({ serviceType: 'chauffeur', vehicleCategory: 'gmc', durationType: 'full_day' });
    assert.strictEqual(disabledCity.customQuoteRequired, true);
    assert.strictEqual(disabledCity.price, null);
    assert.strictEqual(stillActiveChauffeur.price, 1400);

    // 5. Disabling all Chauffeur rules returns quote-only for Chauffeur, while City Transfer remains priced
    mockDbConnected([
      {
        _id: '507f1f77bcf86cd799439062',
        serviceType: 'chauffeur',
        vehicleCategory: 'gmc',
        durationType: 'full_day',
        pricingMode: 'fixed',
        price: 1400,
        active: false,
      },
    ], { configuredServices: ['chauffeur'] });
    const disabledChauffeur = await calculatePrice({ serviceType: 'chauffeur', vehicleCategory: 'gmc', durationType: 'full_day' });
    const stillActiveCity = await calculatePrice({ serviceType: 'city_transfer', vehicleCategory: 'gmc' });
    assert.strictEqual(disabledChauffeur.customQuoteRequired, true);
    assert.strictEqual(disabledChauffeur.price, null);
    assert.strictEqual(stillActiveCity.price, 240);

    // 6. Deleting all rules for city_transfer does NOT affect chauffeur
    mockDbConnected([], { configuredServices: ['city_transfer'] });
    const deletedCity = await calculatePrice({ serviceType: 'city_transfer', vehicleCategory: 'gmc' });
    const chauffeurAfterCityDelete = await calculatePrice({ serviceType: 'chauffeur', vehicleCategory: 'gmc', durationType: 'full_day' });
    assert.strictEqual(deletedCity.customQuoteRequired, true);
    assert.strictEqual(deletedCity.price, null);
    assert.strictEqual(chauffeurAfterCityDelete.price, 1400);

    // 7. Existing airport & Bahrain directional rates remain unchanged
    const bhrToRuh = await calculatePrice({
      serviceType: 'airport_transfer',
      origin: 'Bahrain',
      destination: 'Riyadh',
      vehicleCategory: 'gmc',
    });
    const ruhToBhr = await calculatePrice({
      serviceType: 'airport_transfer',
      origin: 'Riyadh',
      destination: 'Bahrain',
      vehicleCategory: 'gmc',
    });
    assert.strictEqual(bhrToRuh.price, 1800);
    assert.strictEqual(bhrToRuh.taxIncluded, true);
    assert.strictEqual(ruhToBhr.price, 1500);
    assert.notStrictEqual(bhrToRuh.price, ruhToBhr.price);
  });

  await check('15. Backend booking creation validates vehicle existence & availability (including quote-only bookings) while preserving legacy payloads without carId', async () => {
    const origBookingFind = Booking.find;
    try {
      mockDbConnected([], { configuredServices: [] });
      Booking.findOne = async () => null;
      Booking.find = () => makeChainQuery([]);
      Booking.prototype.save = async function saveStub() { return this; };

      const basePayload = {
        serviceType: 'airport_transfer',
        origin: 'Bahrain',
        destination: 'Riyadh',
        vehicleCategory: 'gmc',
        vehicleName: 'GMC Yukon',
        pickupDateTime: futureDateISO(),
        customer: { name: 'Guest', email: 'guest@example.com', mobile: '+966551234567' },
      };

      // 1. Existing available vehicle succeeds
      Car.findOne = () => ({ select: () => ({ lean: async () => ({ id: 10, available: true, name: 'GMC Yukon', category: 'gmc' }) }) });
      const okRes = await createBookingFromPayload({ ...basePayload, vehicle: { carId: 10, name: 'GMC Yukon' } });
      assert.strictEqual(okRes.booking.quotedPrice, 1800);

      // 2. Disabled vehicle is rejected (400)
      Car.findOne = () => ({ select: () => ({ lean: async () => ({ id: 10, available: false, name: 'GMC Yukon', category: 'gmc' }) }) });
      await assert.rejects(
        () => createBookingFromPayload({ ...basePayload, vehicle: { carId: 10, name: 'GMC Yukon' } }),
        (err) => err.statusCode === 400 && /unavailable/i.test(err.message)
      );

      // 3. Deleted/nonexistent vehicle is rejected (400)
      Car.findOne = () => ({ select: () => ({ lean: async () => null }) });
      await assert.rejects(
        () => createBookingFromPayload({ ...basePayload, vehicle: { carId: 9999, name: 'Ghost Car' } }),
        (err) => err.statusCode === 400 && /does not exist/i.test(err.message)
      );

      // 4. Quote-only booking using a disabled vehicle MUST STILL be rejected (cannot bypass)
      Car.findOne = () => ({ select: () => ({ lean: async () => ({ id: 10, available: false, name: 'GMC Yukon', category: 'gmc' }) }) });
      await assert.rejects(
        () => createBookingFromPayload({
          ...basePayload,
          origin: 'Taif Airport',
          destination: 'Riyadh',
          vehicle: { carId: 10, name: 'GMC Yukon' },
        }),
        (err) => err.statusCode === 400 && /unavailable/i.test(err.message)
      );

      // 5. Legacy booking payload without carId continues to work
      const legacyRes = await createBookingFromPayload(basePayload);
      assert.strictEqual(legacyRes.booking.quotedPrice, 1800);
    } finally {
      Booking.find = origBookingFind;
    }
  });

  await check('16. Custom vehicles auto-generate deterministic category slug without overwriting explicit category or colliding with unrelated vehicles', async () => {
    const origCarSave = Car.prototype.save;
    try {
      Car.prototype.save = async function saveStub() { return this; };

      // 1. Omitted category -> deterministic slug from name
      Car.findOne = (query) => {
        if (!query) return { sort: async () => ({ id: 14 }) };
        return { select: () => ({ lean: async () => null }) };
      };
      const res1 = makeMockRes();
      await carController.addCar({
        body: {
          name: 'Toyota Prado VIP',
          price: 'SAR 900',
          type: 'Luxury SUV',
          seats: '6 passengers',
          luggage: '4 Bags',
          img: '/images/car/prado.webp',
        },
      }, res1);
      assert.strictEqual(res1.statusCode, 201);
      assert.strictEqual(res1.body.car.category, 'toyota_prado_vip');

      // 2. Conflicting slug on another vehicle -> appends _nextId
      Car.findOne = (query) => {
        if (!query) return { sort: async () => ({ id: 15 }) };
        return { select: () => ({ lean: async () => ({ id: 15, category: 'toyota_prado_vip' }) }) };
      };
      const res2 = makeMockRes();
      await carController.addCar({
        body: {
          name: 'Toyota Prado VIP',
          price: 'SAR 950',
          type: 'Luxury SUV',
          seats: '6 passengers',
          luggage: '4 Bags',
          img: '/images/car/prado2.webp',
        },
      }, res2);
      assert.strictEqual(res2.statusCode, 201);
      assert.strictEqual(res2.body.car.category, 'toyota_prado_vip_16');

      // 3. Explicitly supplied category is preserved
      Car.findOne = (query) => {
        if (!query) return { sort: async () => ({ id: 16 }) };
        return { select: () => ({ lean: async () => null }) };
      };
      const res3 = makeMockRes();
      await carController.addCar({
        body: {
          name: 'Cadillac Escalade',
          category: 'escalade_vip',
          price: 'SAR 1500',
          type: 'Full-Size SUV',
          seats: '7 passengers',
          luggage: '5 Bags',
          img: '/images/car/escalade.webp',
        },
      }, res3);
      assert.strictEqual(res3.statusCode, 201);
      assert.strictEqual(res3.body.car.category, 'escalade_vip');
    } finally {
      Car.prototype.save = origCarSave;
    }
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
