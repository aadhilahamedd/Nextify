/**
 * Booking Timezone, 60-Minute Advance Booking & Intercity VAT Pricing Tests
 * Run: node Backend/tests/bookingTimezoneAndIntercityVat.test.js
 * Uses in-memory stubs (no live MongoDB or external API calls).
 */
const assert = require('assert');
const Booking = require('../models/Booking');
const {
  DEFAULT_BOOKING_TIMEZONE,
  isValidIanaTimeZone,
  zonedLocalToUtc,
  resolveAndValidateBookingSchedule,
} = require('../utils/bookingTimezone');
const { calculatePrice } = require('../services/pricingService');
const { createBookingFromPayload } = require('../services/bookingCreateService');

const results = [];

async function check(name, fn) {
  const origFindOne = Booking.findOne;
  const origSave = Booking.prototype.save;
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`ok ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`fail ${name} — ${err.message}`);
  } finally {
    Booking.findOne = origFindOne;
    Booking.prototype.save = origSave;
  }
}

async function run() {
  // === Part 1: Booking Timezone & 60-Minute Advance Validation ===

  await check('1. Booking exactly 60 minutes in the future is accepted; 59 minutes and past are rejected', async () => {
    // Server now: 2026-12-01 08:00:00 Asia/Riyadh (= 05:00:00Z)
    const now = new Date('2026-12-01T05:00:00.000Z');

    const exact60 = resolveAndValidateBookingSchedule(
      { travelDate: '2026-12-01', travelTime: '09:00', bookingTimezone: 'Asia/Riyadh' },
      { now }
    );
    assert.strictEqual(exact60.bookingTimezone, 'Asia/Riyadh');
    assert.strictEqual(exact60.pickupDateTime.toISOString(), '2026-12-01T06:00:00.000Z');

    assert.throws(
      () => resolveAndValidateBookingSchedule(
        { travelDate: '2026-12-01', travelTime: '08:59', bookingTimezone: 'Asia/Riyadh' },
        { now }
      ),
      (err) => err.statusCode === 400 && /60 minutes/i.test(err.message)
    );

    assert.throws(
      () => resolveAndValidateBookingSchedule(
        { travelDate: '2026-12-01', travelTime: '07:55', bookingTimezone: 'Asia/Riyadh' },
        { now }
      ),
      (err) => err.statusCode === 400 && /past/i.test(err.message)
    );
  });

  await check('2. Across-midnight, next-day, month-end, and year-end bookings are handled accurately', async () => {
    // 2026-12-31 23:30 Asia/Riyadh (= 2026-12-31T20:30:00Z)
    const now = new Date('2026-12-31T20:30:00.000Z');

    // 00:29 next year is only 59 minutes ahead -> rejected
    assert.throws(
      () => resolveAndValidateBookingSchedule(
        { travelDate: '2027-01-01', travelTime: '00:29', bookingTimezone: 'Asia/Riyadh' },
        { now }
      ),
      (err) => err.statusCode === 400 && /60 minutes/i.test(err.message)
    );

    // 00:30 next year is exactly 60 minutes ahead -> accepted
    const valid = resolveAndValidateBookingSchedule(
      { travelDate: '2027-01-01', travelTime: '00:30', bookingTimezone: 'Asia/Riyadh' },
      { now }
    );
    assert.strictEqual(valid.pickupDateTime.toISOString(), '2026-12-31T21:30:00.000Z');
  });

  await check('3. Default timezone is Asia/Riyadh; UK (GMT/BST DST) and India (Asia/Kolkata) convert accurately', async () => {
    // Default when omitted -> Asia/Riyadh
    const nowWinter = new Date('2026-12-10T05:00:00.000Z');
    const defaultRes = resolveAndValidateBookingSchedule(
      { travelDate: '2026-12-10', travelTime: '10:00' },
      { now: nowWinter }
    );
    assert.strictEqual(defaultRes.bookingTimezone, DEFAULT_BOOKING_TIMEZONE);
    assert.strictEqual(defaultRes.pickupDateTime.toISOString(), '2026-12-10T07:00:00.000Z');

    // UK winter (GMT = UTC+0)
    const ukWinter = zonedLocalToUtc('2026-12-10', '10:00', 'Europe/London');
    assert.strictEqual(ukWinter.toISOString(), '2026-12-10T10:00:00.000Z');

    // UK summer (BST = UTC+1 during DST)
    const ukSummer = zonedLocalToUtc('2026-07-10', '10:00', 'Europe/London');
    assert.strictEqual(ukSummer.toISOString(), '2026-07-10T09:00:00.000Z');

    // UK nonexistent spring-forward DST local time (2026-03-29 01:30 does not exist)
    assert.throws(
      () => zonedLocalToUtc('2026-03-29', '01:30', 'Europe/London'),
      (err) => err.statusCode === 400 && /daylight saving/i.test(err.message)
    );

    // UK ambiguous fall-back DST local time without explicit UTC disambiguator
    assert.throws(
      () => zonedLocalToUtc('2026-10-25', '01:30', 'Europe/London'),
      (err) => err.statusCode === 400 && /ambiguous/i.test(err.message)
    );

    // India (Asia/Kolkata = UTC+5:30)
    const indiaUtc = zonedLocalToUtc('2026-12-10', '14:30', 'Asia/Kolkata');
    assert.strictEqual(indiaUtc.toISOString(), '2026-12-10T09:00:00.000Z');
  });

  await check('4. Invalid timezones and fixed-offset strings are rejected', async () => {
    for (const badTz of ['Mars/Olympus', 'UTC+3', '+03:00', 'GMT+5:30', 'NotATimezone']) {
      assert.strictEqual(isValidIanaTimeZone(badTz), false, `${badTz} must be rejected`);
      assert.throws(
        () => resolveAndValidateBookingSchedule({
          travelDate: '2026-12-20',
          travelTime: '15:00',
          bookingTimezone: badTz,
        }),
        (err) => err.statusCode === 400
      );
    }
  });

  await check('5. Changing timezone preserves instant and cannot bypass 60-minute rule in direct backend calls', async () => {
    // Server now: 2026-12-10T05:00:00Z (= 08:00 Riyadh, = 10:30 Kolkata, = 05:00 London)
    const now = new Date('2026-12-10T05:00:00.000Z');

    // 11:15 Asia/Kolkata = 05:45Z (only 45 min ahead) -> MUST be rejected even with fake client currentTime
    await assert.rejects(
      () => createBookingFromPayload(
        {
          serviceType: 'city_transfer',
          vehicleCategory: 'gmc',
          origin: 'Riyadh',
          destination: 'Olaya',
          travelDate: '2026-12-10',
          travelTime: '11:15',
          bookingTimezone: 'Asia/Kolkata',
          currentTime: '2020-01-01T00:00:00.000Z',
          customer: { name: 'Direct API Test', email: 'test@example.com', mobile: '0555992937' },
        },
        { now }
      ),
      (err) => err.statusCode === 400 && /60 minutes/i.test(err.message)
    );
  });

  // === Part 2: Intercity Fixed Routes & 15% VAT ===

  await check('6. Riyadh ↔ Bahrain and Riyadh ↔ Dammam return exact base, 15% VAT, and total (no double VAT)', async () => {
    const rb = await calculatePrice({
      serviceType: 'intercity_transfer',
      origin: 'Riyadh',
      destination: 'Bahrain',
      vehicleCategory: 'gmc',
    });
    assert.strictEqual(rb.customQuoteRequired, false);
    assert.strictEqual(rb.basePrice, 1600);
    assert.strictEqual(rb.vatPercent, 15);
    assert.strictEqual(rb.vatAmount, 240);
    assert.strictEqual(rb.totalAmount, 1840);
    assert.strictEqual(rb.price, 1840);
    assert.strictEqual(rb.taxIncluded, true);

    const br = await calculatePrice({
      serviceType: 'intercity_transfer',
      origin: 'Bahrain',
      destination: 'Riyadh',
      vehicleCategory: 'ford_taurus',
    });
    assert.strictEqual(br.customQuoteRequired, false);
    assert.strictEqual(br.basePrice, 1600);
    assert.strictEqual(br.vatPercent, 15);
    assert.strictEqual(br.vatAmount, 240);
    assert.strictEqual(br.totalAmount, 1840);
    assert.strictEqual(br.price, 1840);

    const rd = await calculatePrice({
      serviceType: 'intercity_transfer',
      origin: 'Riyadh',
      destination: 'Dammam',
      vehicleCategory: 'gmc',
    });
    assert.strictEqual(rd.customQuoteRequired, false);
    assert.strictEqual(rd.basePrice, 1000);
    assert.strictEqual(rd.vatPercent, 15);
    assert.strictEqual(rd.vatAmount, 150);
    assert.strictEqual(rd.totalAmount, 1150);
    assert.strictEqual(rd.price, 1150);
    assert.strictEqual(rd.taxIncluded, true);

    const dr = await calculatePrice({
      serviceType: 'intercity_transfer',
      origin: 'Dammam',
      destination: 'Riyadh',
      vehicleCategory: 'lexus_es',
    });
    assert.strictEqual(dr.customQuoteRequired, false);
    assert.strictEqual(dr.basePrice, 1000);
    assert.strictEqual(dr.vatPercent, 15);
    assert.strictEqual(dr.vatAmount, 150);
    assert.strictEqual(dr.totalAmount, 1150);
    assert.strictEqual(dr.price, 1150);
  });

  await check('7. All other intercity routes remain WhatsApp-only with no price (never zero)', async () => {
    const otherRoutes = [
      ['Riyadh', 'Jeddah'],
      ['Riyadh', 'Al Khobar'],
      ['Riyadh', 'Jubail'],
      ['Riyadh', 'Madinah'],
      ['Riyadh', 'Abha'],
      ['Dammam', 'Jeddah'],
      ['Bahrain', 'Dammam'],
    ];

    for (const [origin, destination] of otherRoutes) {
      const q = await calculatePrice({
        serviceType: 'intercity_transfer',
        origin,
        destination,
        vehicleCategory: 'gmc',
      });
      assert.strictEqual(q.customQuoteRequired, true, `${origin} → ${destination} must require custom quote`);
      assert.strictEqual(q.price, null, `${origin} → ${destination} must not return a price`);
      assert.strictEqual(q.totalAmount, null, `${origin} → ${destination} must not return a totalAmount`);
      assert.strictEqual(q.quoteStatus, 'rate_on_request');
    }
  });

  await check('8. Booking creation persists UTC instant, bookingTimezone, and VAT snapshot while ignoring client-supplied prices', async () => {
    Booking.findOne = async () => null;
    Booking.prototype.save = async function saveStub() { return this; };

    const now = new Date('2026-12-10T05:00:00.000Z');
    const result = await createBookingFromPayload(
      {
        serviceType: 'intercity_transfer',
        origin: 'Riyadh',
        destination: 'Dammam',
        vehicleCategory: 'gmc',
        vehicleName: 'GMC Yukon',
        // Client tries to tamper with prices — must be ignored
        quotedPrice: 1,
        basePrice: 1,
        vatAmount: 0,
        totalAmount: 1,
        travelDate: '2026-12-10',
        travelTime: '14:30',
        bookingTimezone: 'Asia/Kolkata',
        customer: { name: 'VAT Test Guest', email: 'guest@example.com', mobile: '0555992937' },
      },
      { now }
    );

    assert.strictEqual(result.booking.bookingTimezone, 'Asia/Kolkata');
    assert.strictEqual(result.booking.schedule.pickupDateTime.toISOString(), '2026-12-10T09:00:00.000Z');
    assert.strictEqual(result.booking.quotedPrice, 1150);
    assert.strictEqual(result.booking.pricing.basePrice, 1000);
    assert.strictEqual(result.booking.pricing.vatPercent, 15);
    assert.strictEqual(result.booking.pricing.vatAmount, 150);
    assert.strictEqual(result.booking.pricing.totalAmount, 1150);
    assert.strictEqual(result.booking.pricing.breakdown.basePrice, 1000);
    assert.strictEqual(result.booking.pricing.breakdown.vatPercent, 15);
    assert.strictEqual(result.booking.pricing.breakdown.vatAmount, 150);
    assert.strictEqual(result.booking.pricing.breakdown.totalAmount, 1150);
    assert.strictEqual(result.booking.pricing.breakdown.taxIncluded, true);
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
