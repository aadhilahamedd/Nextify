/**
 * Hotfix regression tests: Remove automatic vehicle time-slot booking restrictions
 * Run: node Backend/tests/vehicleTimeSlotHotfix.test.js
 * Uses in-memory stubs only (no MongoDB connection, no external network calls).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Car = require('../models/Car');
const { createBookingFromPayload } = require('../services/bookingCreateService');

const results = [];

function futureDateISO(hoursAhead = 48) {
  return new Date(Date.now() + hoursAhead * 3600 * 1000).toISOString();
}

async function check(name, fn) {
  const origBookingFindOne = Booking.findOne;
  const origBookingFind = Booking.find;
  const origBookingSave = Booking.prototype.save;
  const origCarFindOne = Car.findOne;
  const origReadyDesc = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');

  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`ok ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`fail ${name} — ${err.message}`);
  } finally {
    Booking.findOne = origBookingFindOne;
    Booking.find = origBookingFind;
    Booking.prototype.save = origBookingSave;
    Car.findOne = origCarFindOne;
    if (origReadyDesc) {
      Object.defineProperty(mongoose.connection, 'readyState', origReadyDesc);
    } else {
      delete mongoose.connection.readyState;
    }
  }
}

function stubDbConnected(carsById) {
  Object.defineProperty(mongoose.connection, 'readyState', {
    value: 1,
    configurable: true,
    writable: true,
  });
  Car.findOne = (query) => {
    const car = query?.id != null ? carsById[query.id] || null : null;
    return {
      select: () => ({
        lean: async () => car,
      }),
    };
  };
  Booking.findOne = async () => null;
  Booking.prototype.save = async function saveStub() {
    return this;
  };
}

async function run() {
  const cars = {
    10: { id: 10, available: true, name: 'GMC Yukon', category: 'gmc' },
    9: { id: 9, available: true, name: 'Ford Taurus', category: 'ford_taurus' },
    11: { id: 11, available: false, name: 'BMW 7 Series', category: 'bmw_7' },
  };

  await check('1. Same vehicle, same date and time — multiple customer bookings are all accepted (no 409 conflict)', async () => {
    stubDbConnected(cars);
    const sameTime = futureDateISO(72);

    // Simulate an already-confirmed overlapping booking for the exact same vehicle & time
    Booking.find = async () => [
      {
        _id: '507f1f77bcf86cd799439099',
        bookingNumber: 'NX-EXISTING-1',
        bookingStatus: 'CONFIRMED',
        vehicle: { carId: 10, name: 'GMC Yukon' },
        schedule: { pickupDateTime: new Date(sameTime) },
      },
    ];

    const first = await createBookingFromPayload({
      serviceType: 'airport_transfer',
      origin: 'Bahrain',
      destination: 'Riyadh',
      vehicleCategory: 'gmc',
      vehicleName: 'GMC Yukon',
      vehicle: { carId: 10, name: 'GMC Yukon' },
      pickupDateTime: sameTime,
      customer: { name: 'Customer One', email: 'c1@example.com', mobile: '+966551111111' },
    });

    const second = await createBookingFromPayload({
      serviceType: 'airport_transfer',
      origin: 'Bahrain',
      destination: 'Riyadh',
      vehicleCategory: 'gmc',
      vehicleName: 'GMC Yukon',
      vehicle: { carId: 10, name: 'GMC Yukon' },
      pickupDateTime: sameTime,
      customer: { name: 'Customer Two', email: 'c2@example.com', mobile: '+966552222222' },
    });

    assert.strictEqual(first.booking.quotedPrice, 1800);
    assert.strictEqual(second.booking.quotedPrice, 1800);
    assert.notStrictEqual(first.booking.bookingNumber, second.booking.bookingNumber);
  });

  await check('2. Same vehicle, different date and time — accepted', async () => {
    stubDbConnected(cars);

    const b1 = await createBookingFromPayload({
      serviceType: 'airport_transfer',
      origin: 'Riyadh',
      destination: 'Bahrain',
      vehicleCategory: 'gmc',
      vehicleName: 'GMC Yukon',
      vehicle: { carId: 10, name: 'GMC Yukon' },
      pickupDateTime: futureDateISO(48),
      customer: { name: 'Guest A', email: 'a@example.com', mobile: '+966553333333' },
    });

    const b2 = await createBookingFromPayload({
      serviceType: 'airport_transfer',
      origin: 'Riyadh',
      destination: 'Bahrain',
      vehicleCategory: 'gmc',
      vehicleName: 'GMC Yukon',
      vehicle: { carId: 10, name: 'GMC Yukon' },
      pickupDateTime: futureDateISO(96),
      customer: { name: 'Guest B', email: 'b@example.com', mobile: '+966554444444' },
    });

    assert.strictEqual(b1.booking.quotedPrice, 1500);
    assert.strictEqual(b2.booking.quotedPrice, 1500);
  });

  await check('3. Different vehicles, same date and time — accepted', async () => {
    stubDbConnected(cars);
    const sameTime = futureDateISO(60);

    const gmcBooking = await createBookingFromPayload({
      serviceType: 'airport_transfer',
      origin: 'Jeddah Airport',
      destination: 'Makkah',
      vehicleCategory: 'gmc',
      vehicleName: 'GMC Yukon',
      vehicle: { carId: 10, name: 'GMC Yukon' },
      pickupDateTime: sameTime,
      customer: { name: 'Guest GMC', email: 'gmc@example.com', mobile: '+966555555555' },
    });

    const sedanBooking = await createBookingFromPayload({
      serviceType: 'airport_transfer',
      origin: 'Jeddah Airport',
      destination: 'Makkah',
      vehicleCategory: 'ford_taurus',
      vehicleName: 'Ford Taurus',
      vehicle: { carId: 9, name: 'Ford Taurus' },
      pickupDateTime: sameTime,
      customer: { name: 'Guest Sedan', email: 'sedan@example.com', mobile: '+966556666666' },
    });

    assert.strictEqual(gmcBooking.booking.quotedPrice, 800);
    assert.strictEqual(sedanBooking.booking.quotedPrice, 600);
  });

  await check('4. Admin-disabled vehicle (available === false) is still rejected (400)', async () => {
    stubDbConnected(cars);
    await assert.rejects(
      () => createBookingFromPayload({
        serviceType: 'airport_transfer',
        origin: 'Jeddah Airport',
        destination: 'Makkah',
        vehicleCategory: 'bmw_7',
        vehicleName: 'BMW 7 Series',
        vehicle: { carId: 11, name: 'BMW 7 Series' },
        pickupDateTime: futureDateISO(72),
        customer: { name: 'Guest', email: 'guest@example.com', mobile: '+966557777777' },
      }),
      (err) => err.statusCode === 400 && /unavailable/i.test(err.message)
    );
  });

  await check('5. Nonexistent vehicle is still rejected (400)', async () => {
    stubDbConnected(cars);
    await assert.rejects(
      () => createBookingFromPayload({
        serviceType: 'airport_transfer',
        origin: 'Jeddah Airport',
        destination: 'Makkah',
        vehicleCategory: 'gmc',
        vehicleName: 'Ghost Car',
        vehicle: { carId: 9999, name: 'Ghost Car' },
        pickupDateTime: futureDateISO(72),
        customer: { name: 'Guest', email: 'guest@example.com', mobile: '+966558888888' },
      }),
      (err) => err.statusCode === 400 && /does not exist/i.test(err.message)
    );
  });

  await check('6. Quote-only booking still works without payment checkout', async () => {
    stubDbConnected(cars);
    const { booking, quote, checkoutToken } = await createBookingFromPayload({
      serviceType: 'airport_transfer',
      origin: 'Taif Airport',
      destination: 'Riyadh',
      vehicleCategory: 'gmc',
      vehicleName: 'GMC Yukon',
      vehicle: { carId: 10, name: 'GMC Yukon' },
      pickupDateTime: futureDateISO(72),
      customer: { name: 'Quote Guest', email: 'quote@example.com', mobile: '+966559999999' },
    });

    assert.strictEqual(quote.customQuoteRequired, true);
    assert.strictEqual(booking.customQuoteRequired, true);
    assert.strictEqual(booking.pricingType, 'custom_quote');
    assert.strictEqual(booking.paymentStatus, 'NOT_REQUIRED');
    assert.strictEqual(booking.bookingStatus, 'PENDING');
    assert.strictEqual(checkoutToken, null);
  });

  await check('7. WhatsApp booking flag stays enabled, BookingWizard saves before WhatsApp, and driver availability check remains in bookingController', async () => {
    const modeSrc = fs.readFileSync(
      path.join(__dirname, '../../Front-end/Nextify/src/utils/paymentMode.js'),
      'utf8'
    );
    assert.ok(modeSrc.includes('production_blocks_test_mode'));
    assert.ok(modeSrc.includes('TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR = CHECKOUT_CONFIG.useWhatsAppFallback'));

    const wizardSrc = fs.readFileSync(
      path.join(__dirname, '../../Front-end/Nextify/src/components/booking/BookingWizard.jsx'),
      'utf8'
    );
    const createIdx = wizardSrc.indexOf('await createBookingAPI(payload)');
    const openWaIdx = wizardSrc.indexOf('openCompanyWhatsApp(message');
    assert.ok(createIdx > 0 && openWaIdx > createIdx, 'Booking must be saved before opening WhatsApp');

    const controllerSrc = fs.readFileSync(
      path.join(__dirname, '../controllers/bookingController.js'),
      'utf8'
    );
    assert.ok(controllerSrc.includes('isDriverAvailable('), 'Driver availability check must remain intact');
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
