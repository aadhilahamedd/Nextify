/**
 * WhatsApp Booking Flow & Strict Approved Airport Pricing Frontend Tests
 * Run: node Front-end/Nextify/tests/whatsappAirportBooking.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { describe } from 'node:test';

import { TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR } from '../src/utils/paymentMode.js';
import { getOfficialQuote } from '../src/data/fleetVehicles.js';
import {
  FEATURED_AIRPORT_IDS,
  FEATURED_CITY_IDS,
  searchTransferLocations,
} from '../src/data/transferLocations.js';
import {
  COMPANY_WHATSAPP_NUMBER,
  buildWhatsAppConfirmationMessage,
  getWhatsAppUrl,
} from '../src/utils/whatsapp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_ROOT = path.resolve(__dirname, '../src');

describe('WhatsApp booking switch and airport pricing rules', () => {
  test('customer checkout switch is set to WhatsApp booking assistance', () => {
    assert.equal(TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR, true);
  });

  test('approved airport fixed routes return exact published prices', () => {
    const jeddahMakkahGmc = getOfficialQuote({
      serviceType: 'airport_transfer',
      origin: 'Jeddah Airport',
      destination: 'Makkah',
      vehicleCategory: 'gmc',
    });
    assert.equal(jeddahMakkahGmc.price, 800);
    assert.equal(jeddahMakkahGmc.currency, 'SAR');
    assert.equal(jeddahMakkahGmc.customQuoteRequired, false);

    const riyadhMadinahSedan = getOfficialQuote({
      serviceType: 'airport_transfer',
      origin: 'King Khalid International Airport',
      destination: 'Madinah',
      vehicleCategory: 'ford_taurus',
    });
    assert.equal(riyadhMadinahSedan.price, 2500);
    assert.equal(riyadhMadinahSedan.customQuoteRequired, false);
  });

  test('unapproved airport routes, Taif, and custom locations display no price (Price on request)', () => {
    const cases = [
      { origin: 'Taif Airport', destination: 'Riyadh', vehicleCategory: 'gmc' },
      { origin: 'Jeddah Airport', destination: 'Taif', vehicleCategory: 'ford_taurus' },
      { origin: 'King Khalid International Airport', destination: 'Olaya', vehicleCategory: 'gmc' },
      { origin: 'King Khalid International Airport', destination: 'Riyadh', vehicleCategory: 'ford_taurus' },
      {
        origin: 'Al Hada Resort, Taif',
        destination: 'Makkah',
        pickupPlace: { kind: 'custom', address: 'Al Hada Resort, Taif', nameEn: 'Al Hada Resort, Taif' },
        vehicleCategory: 'gmc',
      },
      {
        origin: 'Jeddah Airport',
        destination: 'My Custom Hotel',
        dropoffPlace: { kind: 'custom', address: 'My Custom Hotel', nameEn: 'My Custom Hotel' },
        vehicleCategory: 'gmc',
      },
    ];

    for (const payload of cases) {
      const quote = getOfficialQuote({ serviceType: 'airport_transfer', ...payload });
      assert.equal(quote.price, null, `${payload.origin} -> ${payload.destination} must have no price`);
      assert.equal(quote.customQuoteRequired, true);
      assert.equal(quote.quoteStatus, 'rate_on_request');
      assert.equal(quote.message, 'Price on request');
    }
  });

  test('transfer location dropdown lists only approved airports and cities (never Taif/Abha/Tabuk)', () => {
    assert.ok(!FEATURED_AIRPORT_IDS.includes('taif-airport'));
    assert.ok(!FEATURED_AIRPORT_IDS.includes('abha-airport'));
    assert.ok(!FEATURED_AIRPORT_IDS.includes('tabuk-airport'));
    assert.ok(!FEATURED_CITY_IDS.includes('taif'));
    assert.ok(!FEATURED_CITY_IDS.includes('abha'));
    assert.ok(!FEATURED_CITY_IDS.includes('tabuk'));

    const taifSearch = searchTransferLocations('Taif');
    assert.equal(taifSearch.airports.length, 0);
    assert.equal(taifSearch.cities.length, 0);
  });

  test('WhatsApp message includes booking summary, custom location, Price on request, and no secrets/tokens', () => {
    const msg = buildWhatsAppConfirmationMessage({
      booking: {
        bookingNumber: 'NX-TEST-9001',
        serviceType: 'airport_transfer',
        customQuoteRequired: true,
        paymentStatus: 'NOT_REQUIRED',
        bookingStatus: 'PENDING',
        checkoutToken: 'SHOULD_NEVER_APPEAR_TOKEN',
        pickup: { address: 'Al Hada Resort, Taif' },
        destination: { address: 'Jeddah Corniche Villa' },
        schedule: { pickupDateTime: '2026-12-25T14:30:00.000Z' },
        vehicle: { name: 'GMC Yukon' },
        trip: { passengerCount: 4, luggageCount: 3 },
        customer: { name: 'Test Guest', mobile: '0555992937', email: 'guest@example.com' },
      },
      form: {
        serviceType: 'airport_transfer',
        pickupPlace: { kind: 'custom', address: 'Al Hada Resort, Taif', nameEn: 'Al Hada Resort, Taif' },
        dropoffPlace: { kind: 'custom', address: 'Jeddah Corniche Villa', nameEn: 'Jeddah Corniche Villa' },
        travelDate: '2026-12-25',
        travelTime: '14:30',
        passengers: 4,
        luggage: 3,
        vehicleName: 'GMC Yukon',
        customer: { name: 'Test Guest', mobile: '0555992937', email: 'guest@example.com' },
      },
      quote: { price: null, customQuoteRequired: true, message: 'Price on request' },
    });

    assert.ok(msg.includes('NX-TEST-9001'));
    assert.ok(msg.includes('Airport Transfer'));
    assert.ok(msg.includes('Al Hada Resort, Taif'));
    assert.ok(msg.includes('Jeddah Corniche Villa'));
    assert.ok(msg.includes('GMC Yukon'));
    assert.ok(msg.includes('Test Guest'));
    assert.ok(msg.includes('Price: Price on request'));
    assert.ok(!msg.includes('SHOULD_NEVER_APPEAR_TOKEN'));
    assert.ok(!msg.includes('checkoutToken'));

    const url = getWhatsAppUrl(COMPANY_WHATSAPP_NUMBER, msg);
    assert.ok(url.startsWith(`https://wa.me/${COMPANY_WHATSAPP_NUMBER}?text=`));
    assert.ok(url.includes(encodeURIComponent('NX-TEST-9001')));
  });

  test('BookingWizard saves booking before opening WhatsApp, blocks Moyasar checkout, and guards duplicate submits', () => {
    const wizardSrc = fs.readFileSync(path.join(SRC_ROOT, 'components/booking/BookingWizard.jsx'), 'utf8');
    const createIdx = wizardSrc.indexOf('await createBookingAPI(payload)');
    const openWaIdx = wizardSrc.indexOf('openCompanyWhatsApp(message');
    assert.ok(createIdx > 0, 'BookingWizard must call createBookingAPI');
    assert.ok(openWaIdx > createIdx, 'WhatsApp must only open after createBookingAPI succeeds');
    assert.ok(wizardSrc.includes('submittingRef.current'), 'Duplicate submissions must be prevented');
    assert.ok(!wizardSrc.includes('createPaymentAPI'), 'BookingWizard must not invoke Moyasar createPaymentAPI');
  });
});
