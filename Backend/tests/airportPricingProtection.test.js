/**
 * Airport Transfer Approved Pricing & Custom Quotation Backend Protection Tests
 * Run: node Backend/tests/airportPricingProtection.test.js
 * Uses in-memory stubs only (no MongoDB connection, no external network calls).
 */
const assert = require('assert');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { calculatePrice } = require('../services/pricingService');
const { createBookingFromPayload } = require('../services/bookingCreateService');
const paymentController = require('../controllers/paymentController');
const paymentService = require('../services/paymentService');

const results = [];

async function check(name, fn) {
  const origBookingFindOne = Booking.findOne;
  const origBookingFindById = Booking.findById;
  const origBookingSave = Booking.prototype.save;
  const origPaymentCreate = Payment.create;
  const origPaymentFindOne = Payment.findOne;
  const origUserFindById = User.findById;
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`ok ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`fail ${name} — ${err.message}`);
  } finally {
    Booking.findOne = origBookingFindOne;
    Booking.findById = origBookingFindById;
    Booking.prototype.save = origBookingSave;
    Payment.create = origPaymentCreate;
    Payment.findOne = origPaymentFindOne;
    User.findById = origUserFindById;
  }
}

function makeQuery(doc) {
  return {
    select() {
      return {
        lean: async () => doc,
        then(resolve, reject) {
          return Promise.resolve(doc).then(resolve, reject);
        },
      };
    },
    lean: async () => doc,
    then(resolve, reject) {
      return Promise.resolve(doc).then(resolve, reject);
    },
  };
}

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

async function run() {
  await check('1. Approved airport fixed route returns exact configured price and ignores client-supplied price', async () => {
    const quote = await calculatePrice({
      serviceType: 'airport_transfer',
      origin: 'Jeddah Airport',
      destination: 'Makkah',
      vehicleCategory: 'gmc',
      quotedPrice: 1,
      totalAmount: 1,
    });
    assert.strictEqual(quote.price, 800);
    assert.strictEqual(quote.totalAmount, 800);
    assert.strictEqual(quote.currency, 'SAR');
    assert.strictEqual(quote.customQuoteRequired, false);
    assert.strictEqual(quote.payable, true);
    assert.strictEqual(quote.pricingType, 'airport_fixed_route');

    const sedanQuote = await calculatePrice({
      serviceType: 'airport_transfer',
      origin: 'King Khalid International Airport',
      destination: 'Madinah',
      vehicleCategory: 'ford_taurus',
    });
    assert.strictEqual(sedanQuote.price, 2500);
    assert.strictEqual(sedanQuote.currency, 'SAR');
    assert.strictEqual(sedanQuote.customQuoteRequired, false);
  });

  await check('2. Unapproved airport routes return no price and require custom quotation', async () => {
    const unapprovedRoutes = [
      { origin: 'King Khalid International Airport', destination: 'Riyadh', vehicleCategory: 'gmc' },
      { origin: 'King Khalid International Airport', destination: 'Olaya', vehicleCategory: 'ford_taurus' },
      { origin: 'Jeddah Airport', destination: 'Jeddah Corniche', vehicleCategory: 'lexus_es' },
      { origin: 'King Khalid International Airport', destination: 'Al Malqa', vehicleCategory: 'gmc' },
    ];
    for (const payload of unapprovedRoutes) {
      const quote = await calculatePrice({ serviceType: 'airport_transfer', ...payload });
      assert.strictEqual(quote.price, null, `${payload.origin} -> ${payload.destination} must have null price`);
      assert.strictEqual(quote.totalAmount, null);
      assert.strictEqual(quote.customQuoteRequired, true);
      assert.strictEqual(quote.payable, false);
      assert.strictEqual(quote.quoteStatus, 'rate_on_request');
      assert.strictEqual(quote.message, 'Price on request');
    }
  });

  await check('3. Taif and other unpriced locations never receive invented fallback prices', async () => {
    const unpricedLocations = [
      { origin: 'Taif Airport', destination: 'Riyadh', vehicleCategory: 'gmc' },
      { origin: 'Jeddah Airport', destination: 'Taif', vehicleCategory: 'ford_taurus' },
      { origin: 'Abha Airport', destination: 'Abha', vehicleCategory: 'lexus_es' },
      { origin: 'Tabuk Airport', destination: 'Riyadh', vehicleCategory: 'gmc' },
      { origin: 'Taif', destination: 'Makkah', vehicleCategory: 'gmc' },
    ];
    for (const payload of unpricedLocations) {
      const quote = await calculatePrice({ serviceType: 'airport_transfer', ...payload });
      assert.strictEqual(quote.price, null, `${payload.origin} -> ${payload.destination} must not get a fallback price`);
      assert.strictEqual(quote.customQuoteRequired, true);
      assert.strictEqual(quote.payable, false);
      assert.strictEqual(quote.quoteStatus, 'rate_on_request');
    }
  });

  await check('4. Custom pickup and destination are preserved verbatim and saved as quotation-required booking', async () => {
    Booking.findOne = async () => null;
    let savedDoc = null;
    Booking.prototype.save = async function () {
      savedDoc = this;
      return this;
    };

    const result = await createBookingFromPayload({
      serviceType: 'airport_transfer',
      vehicleCategory: 'gmc',
      vehicleName: 'GMC Yukon',
      quotedPrice: 50,
      totalAmount: 50,
      origin: 'Al Hada Resort, Taif',
      destination: 'Private Villa, Al Shafa',
      pickupPlace: { kind: 'custom', address: 'Al Hada Resort, Taif', nameEn: 'Al Hada Resort, Taif' },
      dropoffPlace: { kind: 'custom', address: 'Private Villa, Al Shafa', nameEn: 'Private Villa, Al Shafa' },
      travelDate: '2026-12-25',
      travelTime: '14:30',
      passengers: 3,
      luggage: 2,
      customer: { name: 'Custom Guest', email: 'custom-guest@example.com', mobile: '0555992937' },
    });

    assert.ok(savedDoc, 'booking must be saved');
    assert.strictEqual(result.checkoutToken, null, 'custom quote booking must not receive a checkout token');
    assert.strictEqual(result.quote.price, null);
    assert.strictEqual(result.quote.customQuoteRequired, true);
    assert.strictEqual(savedDoc.customQuoteRequired, true);
    assert.strictEqual(savedDoc.pricingType, 'custom_quote');
    assert.strictEqual(savedDoc.quotedPrice, null);
    assert.strictEqual(savedDoc.pricing.totalAmount, 0);
    assert.strictEqual(savedDoc.paymentStatus, 'NOT_REQUIRED');
    assert.strictEqual(savedDoc.bookingStatus, 'PENDING');
    assert.strictEqual(savedDoc.origin, 'Al Hada Resort, Taif');
    assert.strictEqual(savedDoc.pickup.address, 'Al Hada Resort, Taif');
    assert.strictEqual(savedDoc.destinationText, 'Private Villa, Al Shafa');
    assert.strictEqual(savedDoc.destination.address, 'Private Villa, Al Shafa');
  });

  await check('5. Unapproved airport route booking cannot create a Moyasar checkout via paymentController or paymentService', async () => {
    Booking.findOne = async () => null;
    Booking.prototype.save = async function () {
      return this;
    };

    const created = await createBookingFromPayload({
      serviceType: 'airport_transfer',
      vehicleCategory: 'ford_taurus',
      vehicleName: 'Ford Taurus',
      origin: 'Taif Airport',
      destination: 'Riyadh',
      travelDate: '2026-12-26',
      travelTime: '10:00',
      customer: { name: 'Taif Guest', email: 'taif@example.com', mobile: '0555992937' },
    });

    const bookingDoc = created.booking;
    let paymentCreateCalled = false;
    Payment.create = async () => {
      paymentCreateCalled = true;
      throw new Error('Payment.create must not be called for unapproved airport route');
    };
    Payment.findOne = () => ({ sort: async () => null });
    Booking.findById = () => makeQuery(bookingDoc);
    User.findById = () => makeQuery({ _id: '507f191e810c19729de86099', role: 'admin' });

    // Direct controller call even with a DB-verified admin JWT must be rejected with 400
    const res = makeMockRes();
    let nextErr = null;
    await paymentController.createPayment(
      {
        body: { bookingId: String(bookingDoc._id) },
        headers: {},
        user: { userId: '507f191e810c19729de86099', role: 'admin' },
      },
      res,
      (err) => { nextErr = err; }
    );
    assert.strictEqual(nextErr, null);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(paymentCreateCalled, false);

    // Direct service call must also fail with 400
    let serviceErr = null;
    try {
      await paymentService.createOrReuseCheckout(bookingDoc);
    } catch (err) {
      serviceErr = err;
    }
    assert.ok(serviceErr && serviceErr.statusCode === 400);
    assert.strictEqual(paymentCreateCalled, false);
  });

  await check('6. Existing non-airport pricing (city, chauffeur, intercity, gcc) remains intact', async () => {
    const cityQuote = await calculatePrice({
      serviceType: 'city_transfer',
      vehicleCategory: 'gmc',
      origin: 'Riyadh',
      destination: 'Olaya',
    });
    assert.strictEqual(cityQuote.price, 240);
    assert.strictEqual(cityQuote.customQuoteRequired, false);

    const chauffeurQuote = await calculatePrice({
      serviceType: 'chauffeur',
      vehicleCategory: 'ford_taurus',
      durationType: 'half_day',
    });
    assert.strictEqual(chauffeurQuote.price, 700);
    assert.strictEqual(chauffeurQuote.customQuoteRequired, false);

    const intercityQuote = await calculatePrice({
      serviceType: 'intercity_transfer',
      vehicleCategory: 'gmc',
      origin: 'Riyadh',
      destination: 'Jeddah',
    });
    assert.strictEqual(intercityQuote.price, 3500);
    assert.strictEqual(intercityQuote.customQuoteRequired, false);

    const gccQuote = await calculatePrice({
      serviceType: 'gcc_transfer',
      vehicleCategory: 'gmc',
      origin: 'Riyadh',
      destination: 'Bahrain',
    });
    assert.strictEqual(gccQuote.price, 1900);
    assert.strictEqual(gccQuote.customQuoteRequired, false);
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\nResults: ${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
