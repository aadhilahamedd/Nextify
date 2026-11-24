/**
 * Stage 3B — WhatsApp Guest Checkout Security Tests
 * Run: node Backend/tests/whatsappCheckout.test.js
 * Uses in-memory stubs only (no MongoDB connection, no WhatsApp/Moyasar network calls).
 */
const assert = require('assert');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const WhatsAppSession = require('../models/WhatsAppSession');
const paymentService = require('../services/paymentService');
const whatsappService = require('../services/whatsapp/whatsappService');
const whatsappConfig = require('../config/whatsappConfig');
const whatsappBookingService = require('../services/whatsapp/whatsappBookingService');
const whatsappConversationService = require('../services/whatsapp/whatsappConversationService');
const {
  authorizeBookingCheckout,
  buildCheckoutPaymentUrl,
  generateCheckoutToken,
  hashCheckoutToken,
  rotateBookingCheckoutToken,
  verifyCheckoutToken,
} = require('../utils/checkoutToken');
const { phonesMatch } = require('../utils/phoneMatch');

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

function parsePaymentUrl(urlStr) {
  const parsed = new URL(urlStr);
  const bookingId = parsed.searchParams.get('bookingId');
  const queryCt = parsed.searchParams.get('ct') || parsed.searchParams.get('token');
  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const fragmentToken = hashParams.get('ct');
  return { parsed, bookingId, queryCt, fragmentToken };
}

const results = [];

async function check(name, fn) {
  const origBookingFindById = Booking.findById;
  const origBookingFindOne = Booking.findOne;
  const origBookingFindOneAndUpdate = Booking.findOneAndUpdate;
  const origBookingSave = Booking.prototype.save;
  const origPaymentCreate = Payment.create;
  const origPaymentFindOne = Payment.findOne;
  const origSessionFindOne = WhatsAppSession.findOne;
  const origSessionCreate = WhatsAppSession.create;
  const origSessionFindOneAndUpdate = WhatsAppSession.findOneAndUpdate;
  const origSessionUpdateOne = WhatsAppSession.updateOne;
  const origFetch = global.fetch;
  const origAccessToken = whatsappConfig.accessToken;
  const origPhoneNumberId = whatsappConfig.phoneNumberId;

  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`ok ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`fail ${name} — ${err.message}`);
  } finally {
    Booking.findById = origBookingFindById;
    Booking.findOne = origBookingFindOne;
    Booking.findOneAndUpdate = origBookingFindOneAndUpdate;
    Booking.prototype.save = origBookingSave;
    Payment.create = origPaymentCreate;
    Payment.findOne = origPaymentFindOne;
    WhatsAppSession.findOne = origSessionFindOne;
    WhatsAppSession.create = origSessionCreate;
    WhatsAppSession.findOneAndUpdate = origSessionFindOneAndUpdate;
    WhatsAppSession.updateOne = origSessionUpdateOne;
    global.fetch = origFetch;
    whatsappConfig.accessToken = origAccessToken;
    whatsappConfig.phoneNumberId = origPhoneNumberId;
  }
}

async function run() {
  const ID_A = '507f191e810c19729de860a1';
  const SESSION_ID = '507f191e810c19729de860f9';
  const PAY_ID = '507f191e810c19729de860e1';

  // 1. Initial WhatsApp booking sends valid fragment token matching stored hash (never query param)
  await check('1. Initial WhatsApp booking sends valid fragment token matching stored hash', async () => {
    let savedBooking = null;
    Booking.findOne = async () => null;
    Booking.prototype.save = async function saveStub() {
      savedBooking = this;
      return this;
    };
    Booking.findById = () => makeQuery(savedBooking);
    Booking.findOneAndUpdate = async (filter, update) => {
      Object.assign(savedBooking, update.$set);
      return savedBooking;
    };
    Payment.findOne = () => ({ sort: async () => null, then: (r) => Promise.resolve(null).then(r) });
    Payment.create = async (doc) => ({ _id: PAY_ID, ...doc });

    const session = {
      _id: SESSION_ID,
      phoneNumber: '966555992937',
      bookingDraft: {
        serviceType: 'airport_transfer',
        airport: 'King Abdulaziz International Airport',
        origin: 'King Abdulaziz International Airport',
        destination: 'Makkah',
        vehicleCategory: 'ford_taurus',
        vehicleName: 'Ford Taurus',
        date: '2026-12-20',
        time: '15:00',
        passengers: 2,
        luggage: 1,
        customerName: 'WA Guest',
        customerEmail: 'wa@example.com',
        customerMobile: '966555992937',
      },
      async save() { return this; },
    };

    const result = await whatsappBookingService.confirmSessionBooking(session);
    assert.ok(result.paymentUrl, 'paymentUrl must be returned');
    const { bookingId, queryCt, fragmentToken } = parsePaymentUrl(result.paymentUrl);
    assert.strictEqual(bookingId, String(savedBooking._id));
    assert.strictEqual(queryCt, null, 'token must never appear in query params');
    assert.ok(fragmentToken && fragmentToken.length >= 43);
    assert.strictEqual(savedBooking.checkoutTokenHash, hashCheckoutToken(fragmentToken));
    assert.strictEqual(
      verifyCheckoutToken(fragmentToken, savedBooking.checkoutTokenHash, savedBooking.checkoutTokenExpiresAt),
      true,
    );
  });

  // 2. Custom-quote WhatsApp booking produces no payment link and no checkout token
  await check('2. Custom-quote WhatsApp booking does not receive a payment link or token', async () => {
    let savedBooking = null;
    Booking.findOne = async () => null;
    Booking.prototype.save = async function saveStub() {
      savedBooking = this;
      return this;
    };

    const session = {
      _id: SESSION_ID,
      phoneNumber: '966555992937',
      bookingDraft: {
        serviceType: 'chauffeur',
        origin: 'Riyadh',
        destination: 'Riyadh',
        vehicleCategory: 'mercedes_s',
        vehicleName: 'Mercedes S-Class',
        durationType: 'half_day',
        date: '2026-12-20',
        time: '15:00',
        passengers: 2,
        customerName: 'WA Custom Quote',
        customerEmail: 'cq@example.com',
        customerMobile: '966555992937',
      },
      async save() { return this; },
    };

    const result = await whatsappBookingService.confirmSessionBooking(session);
    assert.strictEqual(result.quote.customQuoteRequired, true);
    assert.strictEqual(result.paymentUrl, null);
    assert.strictEqual(savedBooking.checkoutTokenHash, '');
    assert.strictEqual(savedBooking.checkoutTokenExpiresAt, null);
  });

  // 3. Matching Saudi phone (local 05 vs international 9665) permits retry & rotates token
  await check('3. Matching Saudi phone permits retry and rotates checkout token', async () => {
    const oldIssued = generateCheckoutToken();
    const bookingDoc = {
      _id: ID_A,
      bookingNumber: 'NX-WA-RETRY',
      customer: { name: 'Guest', email: 'g@example.com', mobile: '0555992937' },
      paymentStatus: 'FAILED',
      bookingStatus: 'CANCELLED',
      customQuoteRequired: false,
      pricing: { totalAmount: 180, currency: 'SAR', breakdown: { quoteStatus: 'priced' } },
      checkoutTokenHash: oldIssued.tokenHash,
      checkoutTokenExpiresAt: oldIssued.expiresAt,
      async save() { return this; },
    };

    Booking.findById = () => makeQuery(bookingDoc);
    Booking.findOneAndUpdate = async (filter, update) => {
      if (filter['customer.mobile'] !== undefined) {
        assert.strictEqual(filter['customer.mobile'], '0555992937');
      }
      Object.assign(bookingDoc, update.$set);
      return bookingDoc;
    };
    WhatsAppSession.findOneAndUpdate = async (filter, update) => ({
      _id: SESSION_ID,
      bookingId: ID_A,
      lastPaymentLinkSentAt: update.$set.lastPaymentLinkSentAt,
    });
    WhatsAppSession.updateOne = async () => ({ modifiedCount: 1 });
    Payment.findOne = () => ({ sort: async () => null, then: (r) => Promise.resolve(null).then(r) });
    Payment.create = async (doc) => ({ _id: PAY_ID, ...doc });

    const session = {
      _id: SESSION_ID,
      phoneNumber: '+966 55 599-2937',
      bookingId: ID_A,
      lastPaymentLinkSentAt: null,
    };

    const retry = await whatsappBookingService.retrySessionPayment(session);
    assert.strictEqual(retry.ok, true);
    const { bookingId, queryCt, fragmentToken } = parsePaymentUrl(retry.paymentUrl);
    assert.strictEqual(bookingId, ID_A);
    assert.strictEqual(queryCt, null);
    assert.notStrictEqual(fragmentToken, oldIssued.rawToken);
    assert.strictEqual(bookingDoc.checkoutTokenHash, hashCheckoutToken(fragmentToken));

    // Old token fails immediately; new token succeeds
    const authOld = await authorizeBookingCheckout(
      { headers: { 'x-checkout-token': oldIssued.rawToken } },
      bookingDoc,
    );
    assert.strictEqual(authOld.authorized, false);
    assert.strictEqual(authOld.statusCode, 403);

    const authNew = await authorizeBookingCheckout(
      { headers: { 'x-checkout-token': fragmentToken } },
      bookingDoc,
    );
    assert.strictEqual(authNew.authorized, true);
  });

  // 4. Mismatched phone cannot rotate a token
  await check('4. Mismatched phone is rejected and does not rotate checkout token', async () => {
    const oldIssued = generateCheckoutToken();
    const bookingDoc = {
      _id: ID_A,
      bookingNumber: 'NX-WA-MISMATCH',
      customer: { name: 'Victim', email: 'v@example.com', mobile: '966555992937' },
      paymentStatus: 'FAILED',
      bookingStatus: 'CANCELLED',
      customQuoteRequired: false,
      checkoutTokenHash: oldIssued.tokenHash,
      checkoutTokenExpiresAt: oldIssued.expiresAt,
    };

    let updateCalled = false;
    Booking.findById = () => makeQuery(bookingDoc);
    Booking.findOneAndUpdate = async () => {
      updateCalled = true;
      return bookingDoc;
    };

    const retry = await whatsappBookingService.retrySessionPayment({
      _id: SESSION_ID,
      phoneNumber: '966555000111',
      bookingId: ID_A,
    });
    assert.strictEqual(retry.ok, false);
    assert.strictEqual(retry.reason, 'phone_mismatch');
    assert.strictEqual(updateCalled, false);
    assert.strictEqual(bookingDoc.checkoutTokenHash, oldIssued.tokenHash);
  });

  // 5. Expired token can be refreshed via verified WhatsApp retry
  await check('5. Expired token is refreshed through verified WhatsApp retry', async () => {
    const expiredIssued = generateCheckoutToken({ now: Date.now() - 10_000, ttlMs: 1000 });
    assert.strictEqual(
      verifyCheckoutToken(expiredIssued.rawToken, expiredIssued.tokenHash, expiredIssued.expiresAt),
      false,
    );

    const bookingDoc = {
      _id: ID_A,
      bookingNumber: 'NX-WA-EXP',
      customer: { mobile: '966555992937' },
      paymentStatus: 'PENDING',
      bookingStatus: 'PAYMENT_PENDING',
      customQuoteRequired: false,
      pricing: { totalAmount: 180, currency: 'SAR', breakdown: { quoteStatus: 'priced' } },
      checkoutTokenHash: expiredIssued.tokenHash,
      checkoutTokenExpiresAt: expiredIssued.expiresAt,
      async save() { return this; },
    };

    Booking.findById = () => makeQuery(bookingDoc);
    Booking.findOneAndUpdate = async (filter, update) => {
      Object.assign(bookingDoc, update.$set);
      return bookingDoc;
    };
    WhatsAppSession.findOneAndUpdate = async (filter, update) => ({
      _id: SESSION_ID,
      bookingId: ID_A,
      lastPaymentLinkSentAt: update.$set.lastPaymentLinkSentAt,
    });
    WhatsAppSession.updateOne = async () => ({ modifiedCount: 1 });
    Payment.findOne = () => ({ sort: async () => null, then: (r) => Promise.resolve(null).then(r) });
    Payment.create = async (doc) => ({ _id: PAY_ID, ...doc });

    const retry = await whatsappBookingService.retrySessionPayment({
      _id: SESSION_ID,
      phoneNumber: '966555992937',
      bookingId: ID_A,
    });
    assert.strictEqual(retry.ok, true);
    const { fragmentToken } = parsePaymentUrl(retry.paymentUrl);
    assert.strictEqual(
      verifyCheckoutToken(fragmentToken, bookingDoc.checkoutTokenHash, bookingDoc.checkoutTokenExpiresAt),
      true,
    );
  });

  // 6. PAID, manually cancelled, and custom-quote bookings cannot retry or rotate
  await check('6. PAID, manually cancelled, and custom-quote bookings cannot rotate token', async () => {
    const scenarios = [
      {
        label: 'PAID',
        doc: {
          _id: ID_A,
          bookingNumber: 'NX-PAID',
          customer: { mobile: '966555992937' },
          paymentStatus: 'PAID',
          bookingStatus: 'CONFIRMED',
          customQuoteRequired: false,
          checkoutTokenHash: '',
          checkoutTokenExpiresAt: null,
        },
        expectedReason: 'already_paid',
      },
      {
        label: 'manually cancelled',
        doc: {
          _id: ID_A,
          bookingNumber: 'NX-CANCEL',
          customer: { mobile: '966555992937' },
          paymentStatus: 'PENDING',
          bookingStatus: 'CANCELLED',
          customQuoteRequired: false,
          checkoutTokenHash: '',
          checkoutTokenExpiresAt: null,
        },
        expectedReason: 'cancelled',
      },
      {
        label: 'custom quote',
        doc: {
          _id: ID_A,
          bookingNumber: 'NX-CQ',
          customer: { mobile: '966555992937' },
          paymentStatus: 'NOT_REQUIRED',
          bookingStatus: 'PENDING',
          customQuoteRequired: true,
          checkoutTokenHash: '',
          checkoutTokenExpiresAt: null,
        },
        expectedReason: 'not_payable',
      },
    ];

    for (const s of scenarios) {
      let updateCalled = false;
      Booking.findById = () => makeQuery(s.doc);
      Booking.findOneAndUpdate = async () => {
        updateCalled = true;
        return s.doc;
      };

      const res = await whatsappBookingService.retrySessionPayment({
        _id: SESSION_ID,
        phoneNumber: '966555992937',
        bookingId: ID_A,
      });
      assert.strictEqual(res.ok, false, `${s.label} must fail`);
      assert.strictEqual(res.reason, s.expectedReason, `${s.label} reason mismatch`);
      assert.strictEqual(updateCalled, false, `${s.label} must not update DB`);
      assert.strictEqual(s.doc.checkoutTokenHash, '');
    }
  });

  // 7. Concurrent PAID confirmation and retry cannot restore a checkout token
  await check('7. Concurrent PAID confirmation during retry cannot restore checkout token', async () => {
    const bookingDoc = {
      _id: ID_A,
      bookingNumber: 'NX-RACE-PAID',
      customer: { mobile: '966555992937' },
      paymentStatus: 'PENDING',
      bookingStatus: 'PAYMENT_PENDING',
      customQuoteRequired: false,
      checkoutTokenHash: '',
      checkoutTokenExpiresAt: null,
    };

    let readCount = 0;
    Booking.findById = () => {
      readCount += 1;
      if (readCount === 1) {
        // First read sees PENDING
        return makeQuery({ ...bookingDoc });
      }
      // Second read (after atomic update fails) sees PAID
      return makeQuery({ ...bookingDoc, paymentStatus: 'PAID', bookingStatus: 'CONFIRMED' });
    };

    // Simulate atomic filter rejecting because paymentStatus became PAID concurrently
    Booking.findOneAndUpdate = async (filter) => {
      assert.deepStrictEqual(filter.paymentStatus, { $nin: ['PAID', 'paid', 'REFUNDED', 'refunded', 'NOT_REQUIRED', 'not_required'] });
      assert.deepStrictEqual(filter['pricing.breakdown.quoteStatus'], { $nin: ['rate_on_request', 'long_distance'] });
      bookingDoc.paymentStatus = 'PAID';
      bookingDoc.bookingStatus = 'CONFIRMED';
      bookingDoc.checkoutTokenHash = '';
      bookingDoc.checkoutTokenExpiresAt = null;
      return null;
    };

    const rotated = await rotateBookingCheckoutToken(ID_A, { verifiedPhone: '966555992937' });
    assert.strictEqual(rotated.ok, false);
    assert.strictEqual(rotated.reason, 'already_paid');
    assert.strictEqual(bookingDoc.checkoutTokenHash, '');
    assert.strictEqual(bookingDoc.checkoutTokenExpiresAt, null);
  });

  // 8. Concurrent retry requests do not double-rotate or invalidate the link already sent
  await check('8. Concurrent retry requests respect atomic cooldown and preserve first link', async () => {
    const bookingDoc = {
      _id: ID_A,
      bookingNumber: 'NX-CONC-RETRY',
      customer: { mobile: '966555992937' },
      paymentStatus: 'FAILED',
      bookingStatus: 'CANCELLED',
      customQuoteRequired: false,
      pricing: { totalAmount: 180, currency: 'SAR', breakdown: { quoteStatus: 'priced' } },
      checkoutTokenHash: '',
      checkoutTokenExpiresAt: null,
      async save() { return this; },
    };

    let sessionLastSent = null;
    let rotateCount = 0;

    Booking.findById = () => makeQuery(bookingDoc);
    Booking.findOneAndUpdate = async (filter, update) => {
      if (update.$set?.checkoutTokenHash) rotateCount += 1;
      Object.assign(bookingDoc, update.$set);
      return bookingDoc;
    };
    WhatsAppSession.findOneAndUpdate = async (filter, update) => {
      // Atomic in-memory check matching the $or cooldown filter
      const cutoff = filter.$or[2].lastPaymentLinkSentAt.$lte;
      if (sessionLastSent && sessionLastSent > cutoff) {
        return null;
      }
      sessionLastSent = update.$set.lastPaymentLinkSentAt;
      return { _id: SESSION_ID, bookingId: ID_A, lastPaymentLinkSentAt: sessionLastSent };
    };
    WhatsAppSession.updateOne = async () => ({ modifiedCount: 1 });
    Payment.findOne = () => ({ sort: async () => null, then: (r) => Promise.resolve(null).then(r) });
    Payment.create = async (doc) => ({ _id: PAY_ID, ...doc });

    const now = Date.now();
    const session = { _id: SESSION_ID, phoneNumber: '966555992937', bookingId: ID_A, lastPaymentLinkSentAt: null };

    const [r1, r2] = await Promise.all([
      whatsappBookingService.retrySessionPayment(session, { now, cooldownMs: 15_000 }),
      whatsappBookingService.retrySessionPayment(session, { now: now + 500, cooldownMs: 15_000 }),
    ]);

    const okResults = [r1, r2].filter((r) => r.ok);
    const cooldownResults = [r1, r2].filter((r) => !r.ok && r.reason === 'cooldown');
    assert.strictEqual(okResults.length, 1);
    assert.strictEqual(cooldownResults.length, 1);
    assert.strictEqual(rotateCount, 1);

    const { fragmentToken } = parsePaymentUrl(okResults[0].paymentUrl);
    assert.strictEqual(bookingDoc.checkoutTokenHash, hashCheckoutToken(fragmentToken));
  });

  // 9. Duplicate Meta webhook message delivery does not create duplicate bookings & uses preview_url: false
  await check('9. Duplicate Meta messageId is deduplicated and payment links set preview_url: false', async () => {
    const extracted = whatsappService.extractIncomingMessages({
      entry: [{
        changes: [{
          value: {
            contacts: [{ wa_id: '966555992937', profile: { name: 'Guest' } }],
            messages: [{
              id: 'wamid.HBgMOTY2NTU1OTkyOTM3',
              from: '966555992937',
              type: 'interactive',
              interactive: { button_reply: { id: 'confirm:yes', title: 'Confirm booking' } },
            }],
          },
        }],
      }],
    });
    assert.strictEqual(extracted.length, 1);
    assert.strictEqual(extracted[0].messageId, 'wamid.HBgMOTY2NTU1OTkyOTM3');

    whatsappConfig.accessToken = 'test_wa_token';
    whatsappConfig.phoneNumberId = '123456789';

    const sentGraphPayloads = [];
    global.fetch = async (url, opts) => {
      sentGraphPayloads.push(JSON.parse(opts.body));
      return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'out_1' }] }) };
    };

    const processedIds = new Set();
    const pendingIds = new Map();
    const createdBookingIds = new Set();
    let savedBooking = null;

    const sessionState = {
      _id: SESSION_ID,
      phoneNumber: '966555992937',
      currentStep: 'CONFIRMATION',
      status: 'ACTIVE',
      processedMessageIds: [],
      pendingMessages: [],
      bookingId: null,
      bookingDraft: {
        serviceType: 'airport_transfer',
        airport: 'King Abdulaziz International Airport',
        origin: 'King Abdulaziz International Airport',
        destination: 'Makkah',
        vehicleCategory: 'ford_taurus',
        vehicleName: 'Ford Taurus',
        date: '2026-12-20',
        time: '15:00',
        passengers: 1,
        luggage: 1,
        customerName: 'Dup Test',
        customerEmail: 'dup@example.com',
        customerMobile: '966555992937',
      },
      async save() { return this; },
    };

    WhatsAppSession.findOne = async () => sessionState;
    WhatsAppSession.findOneAndUpdate = async (filter, update) => {
      // Inbound message claim
      if (filter.processedMessageIds) {
        const msgId = filter.processedMessageIds.$ne;
        if (processedIds.has(msgId) || pendingIds.has(msgId)) return null;
        pendingIds.set(msgId, new Date());
        return sessionState;
      }
      // M1 atomic CONFIRMATION -> CONFIRMING lock
      if (filter.currentStep === 'CONFIRMATION') {
        if (sessionState.currentStep !== 'CONFIRMATION') return null;
        sessionState.currentStep = update.$set.currentStep;
        return sessionState;
      }
      return sessionState;
    };
    WhatsAppSession.updateOne = async (filter, update) => {
      if (update.$push?.processedMessageIds) {
        const id = update.$push.processedMessageIds.$each[0];
        pendingIds.delete(id);
        processedIds.add(id);
      } else if (update.$pull?.pendingMessages) {
        pendingIds.delete(update.$pull.pendingMessages.id);
      }
      return { modifiedCount: 1 };
    };
    Booking.findOne = async () => null;
    Booking.prototype.save = async function saveStub() {
      createdBookingIds.add(String(this._id));
      savedBooking = this;
      return this;
    };
    Booking.findById = () => makeQuery(savedBooking);
    Booking.findOneAndUpdate = async (filter, update) => {
      Object.assign(savedBooking, update.$set);
      return savedBooking;
    };
    Payment.findOne = () => ({ sort: async () => null, then: (r) => Promise.resolve(null).then(r) });
    Payment.create = async (doc) => ({ _id: PAY_ID, ...doc });

    const [r1, r2] = await Promise.all([
      whatsappConversationService.handleIncoming(extracted[0]),
      whatsappConversationService.handleIncoming(extracted[0]),
    ]);

    assert.strictEqual(createdBookingIds.size, 1, 'simultaneous duplicate webhook must not create a second booking');
    assert.ok(
      (r1 && r1.duplicate) || (r2 && r2.duplicate),
      'one of the simultaneous duplicate webhooks must be rejected as duplicate',
    );
    assert.strictEqual(sentGraphPayloads.length, 1);
    assert.strictEqual(sentGraphPayloads[0].text.preview_url, false, 'payment link message must disable preview_url');
    assert.ok(sentGraphPayloads[0].text.body.includes('#ct='));
    assert.ok(!sentGraphPayloads[0].text.body.includes('&ct='));
  });

  // 10. Saudi phone matching utility (no suffix-only matching)
  await check('10. Shared phoneMatch handles Saudi formats without suffix-only matching', () => {
    assert.strictEqual(phonesMatch('0555992937', '966555992937'), true);
    assert.strictEqual(phonesMatch('+966 55 599-2937', '0555992937'), true);
    assert.strictEqual(phonesMatch('555992937', '966555992937'), true);
    assert.strictEqual(phonesMatch('966555992937', '111555992937'), false);
    assert.strictEqual(phonesMatch('0555992937', '55992937'), false);
    assert.strictEqual(phonesMatch('', '966555992937'), false);

    // URL builder rejects invalid inputs
    assert.throws(() => buildCheckoutPaymentUrl('https://www.nextifylimo.com', 'bad-id', 'tok_1234567890abcdef'));
    assert.throws(() => buildCheckoutPaymentUrl('https://www.nextifylimo.com', ID_A, 'short'));
  });

  // 11. M1: Two concurrent distinct confirm:yes message IDs create exactly one booking
  await check('11. M1: Two concurrent distinct confirm:yes message IDs create exactly one booking', async () => {
    whatsappConfig.accessToken = 'test_wa_token';
    whatsappConfig.phoneNumberId = '123456789';
    global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ messages: [{ id: 'out_m1' }] }) });

    const createdBookingIds = new Set();
    let savedBooking = null;
    const processedIds = new Set();
    const pendingIds = new Map();

    const sessionState = {
      _id: SESSION_ID,
      phoneNumber: '966555992937',
      currentStep: 'CONFIRMATION',
      status: 'ACTIVE',
      bookingId: null,
      bookingDraft: {
        serviceType: 'airport_transfer',
        airport: 'King Abdulaziz International Airport',
        origin: 'King Abdulaziz International Airport',
        destination: 'Makkah',
        vehicleCategory: 'ford_taurus',
        vehicleName: 'Ford Taurus',
        date: '2026-12-20',
        time: '15:00',
        passengers: 1,
        luggage: 0,
        customerName: 'Double Tap User',
        customerEmail: 'tap@example.com',
        customerMobile: '966555992937',
      },
      async save() { return this; },
    };

    WhatsAppSession.findOne = async () => sessionState;
    WhatsAppSession.findOneAndUpdate = async (filter, update) => {
      if (filter.processedMessageIds) {
        const msgId = filter.processedMessageIds.$ne;
        if (processedIds.has(msgId) || pendingIds.has(msgId)) return null;
        pendingIds.set(msgId, new Date());
        return sessionState;
      }
      if (filter.currentStep === 'CONFIRMATION') {
        if (sessionState.currentStep !== 'CONFIRMATION') return null;
        sessionState.currentStep = update.$set.currentStep;
        return sessionState;
      }
      return sessionState;
    };
    WhatsAppSession.updateOne = async () => ({ modifiedCount: 1 });
    Booking.findOne = async () => null;
    Booking.prototype.save = async function saveStub() {
      createdBookingIds.add(String(this._id));
      savedBooking = this;
      return this;
    };
    Booking.findById = () => makeQuery(savedBooking);
    Booking.findOneAndUpdate = async (filter, update) => {
      Object.assign(savedBooking, update.$set);
      return savedBooking;
    };
    Payment.findOne = () => ({ sort: async () => null, then: (r) => Promise.resolve(null).then(r) });
    Payment.create = async (doc) => ({ _id: PAY_ID, ...doc });

    await Promise.all([
      whatsappConversationService.handleIncoming({
        messageId: 'wamid.confirm.tap.1',
        from: '966555992937',
        name: 'Double Tap User',
        buttonId: 'confirm:yes',
      }),
      whatsappConversationService.handleIncoming({
        messageId: 'wamid.confirm.tap.2',
        from: '966555992937',
        name: 'Double Tap User',
        buttonId: 'confirm:yes',
      }),
    ]);

    assert.strictEqual(createdBookingIds.size, 1, 'exactly one booking must be created across two distinct confirm taps');
    assert.strictEqual(sessionState.currentStep, 'PAYMENT');
  });

  // 12. M2: Stale pending message claim recovers after crash window (atomic pipeline replacement)
  await check('12. M2: Stale pending webhook claim can be reclaimed after stale window', async () => {
    const t0 = Date.now();
    let pending = [];
    const processed = new Set();

    WhatsAppSession.findOneAndUpdate = async (filter, update) => {
      const msgId = filter.processedMessageIds.$ne;
      const staleCutoff = filter.pendingMessages.$not.$elemMatch.claimedAt.$gt;
      if (processed.has(msgId)) return null;
      const activeClaim = pending.find((p) => p.id === msgId && p.claimedAt > staleCutoff);
      if (activeClaim) return null;
      assert.ok(Array.isArray(update), 'claimInboundMessage must use atomic pipeline update');
      const concatArgs = update[0].$set.pendingMessages.$slice[0].$concatArrays;
      const newEntry = concatArgs[1][0];
      // Simulate $filter ($ne id) + $concatArrays + $slice(-20)
      pending = [...pending.filter((p) => p.id !== msgId), newEntry].slice(-20);
      return { phoneNumber: '966555992937', pendingMessages: pending };
    };

    const first = await whatsappConversationService._test.claimInboundMessage('966555992937', 'wamid.crash.1', { now: t0, staleMs: 60_000 });
    assert.strictEqual(first.claimed, true);
    assert.strictEqual(pending.filter((p) => p.id === 'wamid.crash.1').length, 1);

    // While active (10s later), duplicate is rejected
    const activeDup = await whatsappConversationService._test.claimInboundMessage('966555992937', 'wamid.crash.1', { now: t0 + 10_000, staleMs: 60_000 });
    assert.strictEqual(activeDup.claimed, false);

    // After stale window (65s later, simulating crash recovery), message is reclaimed & replaced (still only 1 entry)
    const recovered = await whatsappConversationService._test.claimInboundMessage('966555992937', 'wamid.crash.1', { now: t0 + 65_000, staleMs: 60_000 });
    assert.strictEqual(recovered.claimed, true);
    assert.strictEqual(pending.filter((p) => p.id === 'wamid.crash.1').length, 1);
    assert.strictEqual(pending[0].claimToken, recovered.claimToken);
  });

  // 13. M3: Cooldown is conditionally rolled back on rotation failure and on WhatsApp delivery failure
  await check('13. M3: Cooldown rolls back conditionally on rotation failure and delivery failure (without restoring old token)', async () => {
    const oldIssued = generateCheckoutToken();
    const bookingDoc = {
      _id: ID_A,
      bookingNumber: 'NX-M3-ROLLBACK',
      customer: { mobile: '966555992937' },
      paymentStatus: 'FAILED',
      bookingStatus: 'CANCELLED',
      customQuoteRequired: false,
      pricing: { totalAmount: 180, currency: 'SAR', breakdown: { quoteStatus: 'priced' } },
      checkoutTokenHash: oldIssued.tokenHash,
      checkoutTokenExpiresAt: oldIssued.expiresAt,
      async save() { return this; },
    };

    // Part A: Cooldown claimed, then token rotation fails (ineligible) -> cooldown rolled back
    let sessionLastSent = null;
    const rollbackUpdates = [];
    Booking.findById = () => makeQuery(bookingDoc);
    Booking.findOneAndUpdate = async () => null; // simulate rotation failure
    WhatsAppSession.findOneAndUpdate = async (filter, update) => {
      sessionLastSent = update.$set.lastPaymentLinkSentAt;
      return { _id: SESSION_ID, bookingId: ID_A, lastPaymentLinkSentAt: sessionLastSent };
    };
    WhatsAppSession.updateOne = async (filter, update) => {
      rollbackUpdates.push({ filter, update });
      if (filter.lastPaymentLinkSentAt && sessionLastSent && filter.lastPaymentLinkSentAt.getTime() === sessionLastSent.getTime()) {
        sessionLastSent = update.$set.lastPaymentLinkSentAt;
      }
      return { modifiedCount: 1 };
    };

    const failedRot = await whatsappBookingService.retrySessionPayment(
      { _id: SESSION_ID, phoneNumber: '966555992937', bookingId: ID_A, lastPaymentLinkSentAt: null },
      { now: Date.now(), cooldownMs: 15_000 },
    );
    assert.strictEqual(failedRot.ok, false);
    assert.strictEqual(sessionLastSent, null, 'cooldown must roll back when rotation fails');
    assert.ok(rollbackUpdates.some((u) => u.filter.lastPaymentLinkSentAt instanceof Date));

    // Part B: Delivery (sendText) fails after rotation -> cooldown rolls back, new token is NOT reverted to old token
    whatsappConfig.accessToken = 'test_wa_token';
    whatsappConfig.phoneNumberId = '123456789';
    const sentPayloads = [];
    global.fetch = async (url, opts) => {
      sentPayloads.push(JSON.parse(opts.body));
      return { ok: false, status: 502, json: async () => ({ error: { message: 'Graph outage' } }) };
    };

    const sessionObj = {
      _id: SESSION_ID,
      phoneNumber: '966555992937',
      bookingId: ID_A,
      currentStep: 'PAYMENT',
      lastPaymentLinkSentAt: null,
      bookingDraft: { customerMobile: '966555992937' },
    };
    WhatsAppSession.findOne = async () => sessionObj;
    WhatsAppSession.findOneAndUpdate = async (filter, update) => {
      if (filter.processedMessageIds) return sessionObj;
      sessionLastSent = update.$set.lastPaymentLinkSentAt;
      return { ...sessionObj, lastPaymentLinkSentAt: sessionLastSent };
    };
    Booking.findOneAndUpdate = async (filter, update) => {
      Object.assign(bookingDoc, update.$set);
      return bookingDoc;
    };
    Payment.findOne = () => ({ sort: async () => null, then: (r) => Promise.resolve(null).then(r) });
    Payment.create = async (doc) => ({ _id: PAY_ID, ...doc });

    let deliveryErr = null;
    try {
      await whatsappConversationService.handleIncoming({
        messageId: 'wamid.retry.deliver.fail',
        from: '966555992937',
        buttonId: 'pay:retry',
      });
    } catch (err) {
      deliveryErr = err;
    }

    assert.ok(deliveryErr, 'delivery failure must propagate');
    assert.strictEqual(sentPayloads.length, 1);
    assert.strictEqual(sentPayloads[0].text.preview_url, false, 'pay:retry link must disable preview_url');
    assert.strictEqual(sessionLastSent, null, 'cooldown must roll back when WhatsApp delivery fails');
    assert.notStrictEqual(bookingDoc.checkoutTokenHash, oldIssued.tokenHash, 'old token must never be restored');
  });

    // 14. L1: Concurrent session creation handles E11000 by re-fetching existing session
  await check('14. L1: getSession recovers cleanly from E11000 duplicate-key race', async () => {
    const existingSession = {
      _id: SESSION_ID,
      phoneNumber: '966555992937',
      currentStep: 'WELCOME',
      bookingDraft: { customerMobile: '966555992937' },
    };
    let findCalls = 0;
    WhatsAppSession.findOne = async () => {
      findCalls += 1;
      return findCalls === 1 ? null : existingSession;
    };
    WhatsAppSession.create = async () => {
      const dupErr = new Error('E11000 duplicate key error');
      dupErr.code = 11000;
      throw dupErr;
    };

    const resolved = await whatsappConversationService._test.getSession('966555992937', 'Guest');
    assert.strictEqual(resolved, existingSession);
    assert.strictEqual(findCalls, 2);
  });

  // 15. Fix 2: Retry delivery ambiguity — Meta HTTP rejection rolls back cooldown, transport errors & success retain cooldown
  await check('15. Fix 2: Definite Meta rejection rolls back cooldown; timeout, ECONNRESET, and success retain cooldown (never restoring old token)', async () => {
    whatsappConfig.accessToken = 'test_wa_token';
    whatsappConfig.phoneNumberId = '123456789';

    const scenarios = [
      {
        label: 'timeout',
        fetchImpl: async () => {
          const e = new Error('The operation was aborted due to timeout');
          e.name = 'AbortError';
          throw e;
        },
        expectThrow: true,
        expectCooldownRetained: true,
      },
      {
        label: 'connection reset',
        fetchImpl: async () => {
          const e = new Error('read ECONNRESET');
          e.code = 'ECONNRESET';
          throw e;
        },
        expectThrow: true,
        expectCooldownRetained: true,
      },
      {
        label: 'definite Meta 400 rejection',
        fetchImpl: async () => ({
          ok: false,
          status: 400,
          json: async () => ({ error: { message: 'Invalid recipient' } }),
        }),
        expectThrow: true,
        expectCooldownRetained: false,
      },
      {
        label: 'successful delivery',
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ messages: [{ id: 'out_ok' }] }),
        }),
        expectThrow: false,
        expectCooldownRetained: true,
      },
    ];

    for (const s of scenarios) {
      const oldIssued = generateCheckoutToken();
      const bookingDoc = {
        _id: ID_A,
        bookingNumber: 'NX-F2-AMBIG',
        customer: { mobile: '966555992937' },
        paymentStatus: 'FAILED',
        bookingStatus: 'CANCELLED',
        customQuoteRequired: false,
        pricing: { totalAmount: 180, currency: 'SAR', breakdown: { quoteStatus: 'priced' } },
        checkoutTokenHash: oldIssued.tokenHash,
        checkoutTokenExpiresAt: oldIssued.expiresAt,
      };
      let sessionLastSent = null;
      const sessionObj = {
        _id: SESSION_ID,
        phoneNumber: '966555992937',
        bookingId: ID_A,
        currentStep: 'PAYMENT',
        lastPaymentLinkSentAt: null,
        bookingDraft: { customerMobile: '966555992937' },
      };

      global.fetch = s.fetchImpl;
      Booking.findById = () => makeQuery(bookingDoc);
      Booking.findOneAndUpdate = async (filter, update) => {
        Object.assign(bookingDoc, update.$set);
        return bookingDoc;
      };
      Payment.findOne = () => ({ sort: async () => null, then: (r) => Promise.resolve(null).then(r) });
      Payment.create = async (doc) => ({ _id: PAY_ID, ...doc });
      WhatsAppSession.findOne = async () => sessionObj;
      WhatsAppSession.findOneAndUpdate = async (filter, update) => {
        if (filter.processedMessageIds) return sessionObj;
        sessionLastSent = update.$set.lastPaymentLinkSentAt;
        return { ...sessionObj, lastPaymentLinkSentAt: sessionLastSent };
      };
      WhatsAppSession.updateOne = async (filter, update) => {
        if (filter.lastPaymentLinkSentAt && sessionLastSent && filter.lastPaymentLinkSentAt.getTime() === sessionLastSent.getTime()) {
          sessionLastSent = update.$set.lastPaymentLinkSentAt;
        }
        return { modifiedCount: 1 };
      };

      let caught = null;
      try {
        await whatsappConversationService.handleIncoming({
          messageId: `wamid.f2.${s.label.replace(/\s+/g, '_')}`,
          from: '966555992937',
          buttonId: 'pay:retry',
        });
      } catch (err) {
        caught = err;
      }

      assert.strictEqual(Boolean(caught), s.expectThrow, `${s.label} throw mismatch`);
      if (s.expectCooldownRetained) {
        assert.ok(sessionLastSent instanceof Date, `${s.label} must retain cooldown`);
      } else {
        assert.strictEqual(sessionLastSent, null, `${s.label} must roll back cooldown`);
        assert.strictEqual(caught.metaRejected, true);
      }
      assert.notStrictEqual(bookingDoc.checkoutTokenHash, oldIssued.tokenHash, `${s.label} must never restore old token`);
    }
  });

  // 16. Fix 3 + 3D.2 Fix 1: Atomic stale-claim replacement & per-claim ownership token
  await check('16. Fix 3 + 3D.2: Atomic stale-claim replacement leaves single entry and blocks old claimToken', async () => {
    const t0 = Date.now();
    let pending = [];
    const processed = new Set();

    WhatsAppSession.findOneAndUpdate = async (filter, update) => {
      const msgId = filter.processedMessageIds.$ne;
      const staleCutoff = filter.pendingMessages.$not.$elemMatch.claimedAt.$gt;
      if (processed.has(msgId)) return null;
      if (pending.some((p) => p.id === msgId && p.claimedAt > staleCutoff)) return null;
      assert.ok(Array.isArray(update), 'must use atomic pipeline update to replace stale claim');
      const newEntry = update[0].$set.pendingMessages.$slice[0].$concatArrays[1][0];
      pending = [...pending.filter((p) => p.id !== msgId), newEntry].slice(-20);
      return { phoneNumber: '966555992937', pendingMessages: pending };
    };

    WhatsAppSession.updateOne = async (filter, update) => {
      const match = filter.pendingMessages?.$elemMatch;
      if (!match) return { modifiedCount: 0 };
      const idx = pending.findIndex((p) => p.id === match.id && p.claimToken === match.claimToken);
      if (idx === -1) return { modifiedCount: 0 };
      pending.splice(idx, 1);
      if (update.$push?.processedMessageIds) {
        processed.add(update.$push.processedMessageIds.$each[0]);
      }
      return { modifiedCount: 1 };
    };

    const { claimInboundMessage, completeInboundMessage, releaseInboundMessage } = whatsappConversationService._test;

    // 1) Handler 1 claims and releases its own claim
    const c1 = await claimInboundMessage('966555992937', 'wamid.f3.own', { now: t0, staleMs: 60_000 });
    assert.strictEqual(c1.claimed, true);
    assert.ok(c1.claimToken.length >= 32);
    assert.strictEqual(await releaseInboundMessage('966555992937', 'wamid.f3.own', c1.claimToken), true);
    assert.strictEqual(pending.length, 0);

    // 2) Handler A claims, stalls >60s, Handler B reclaims -> stale entry is atomically replaced (not appended)
    const cA = await claimInboundMessage('966555992937', 'wamid.f3.stale', { now: t0, staleMs: 60_000 });
    assert.strictEqual(cA.claimed, true);
    const premature = await claimInboundMessage('966555992937', 'wamid.f3.stale', { now: t0 + 30_000, staleMs: 60_000 });
    assert.strictEqual(premature.claimed, false, 'active claim must not be reclaimed prematurely');

    const cB = await claimInboundMessage('966555992937', 'wamid.f3.stale', { now: t0 + 65_000, staleMs: 60_000 });
    assert.strictEqual(cB.claimed, true);
    assert.notStrictEqual(cB.claimToken, cA.claimToken);
    assert.strictEqual(
      pending.filter((p) => p.id === 'wamid.f3.stale').length,
      1,
      'exactly one pending entry must exist after reclamation',
    );

    // 3) Old claimToken from Handler A cannot release or complete Handler B's reclaimed message
    assert.strictEqual(await releaseInboundMessage('966555992937', 'wamid.f3.stale', cA.claimToken), false);
    assert.strictEqual(await completeInboundMessage('966555992937', 'wamid.f3.stale', cA.claimToken), false);
    assert.strictEqual(pending.length, 1, 'B claim must remain active');
    assert.strictEqual(processed.has('wamid.f3.stale'), false);

    // 4) Handler B completes its own claim cleanly
    assert.strictEqual(await completeInboundMessage('966555992937', 'wamid.f3.stale', cB.claimToken), true);
    assert.strictEqual(pending.length, 0);
    assert.strictEqual(processed.has('wamid.f3.stale'), true);

    // 5) Subsequent duplicate is rejected
    const dup = await claimInboundMessage('966555992937', 'wamid.f3.stale', { now: t0 + 130_000, staleMs: 60_000 });
    assert.strictEqual(dup.claimed, false);
  });

  // 17. 3D.2 Fix 2: Legacy WhatsAppSession entries without claimToken remain backward-compatible
  await check('17. 3D.2 Fix 2: Legacy pendingMessages entries without claimToken validate, coexist, and reclaim cleanly', async () => {
    const t0 = Date.now();
    // Construct a real Mongoose WhatsAppSession document containing a legacy entry (no claimToken) + a new entry
    const legacySession = new WhatsAppSession({
      phoneNumber: '966555992937',
      currentStep: 'DESTINATION_TEXT',
      pendingMessages: [
        { id: 'wamid.legacy.1', claimedAt: new Date(t0 - 120_000) },
        { id: 'wamid.new.1', claimToken: 'abcdef1234567890abcdef1234567890', claimedAt: new Date(t0) },
      ],
    });
    const validationErr = legacySession.validateSync();
    assert.strictEqual(validationErr, undefined, 'legacy pendingMessages entry without claimToken must pass schema validation');
    assert.strictEqual(legacySession.pendingMessages[0].claimToken, '');

    // Empty or missing claimToken must NEVER authorize complete or release
    const { claimInboundMessage, completeInboundMessage, releaseInboundMessage } = whatsappConversationService._test;
    assert.strictEqual(await completeInboundMessage('966555992937', 'wamid.legacy.1', ''), false);
    assert.strictEqual(await completeInboundMessage('966555992937', 'wamid.legacy.1', undefined), false);
    assert.strictEqual(await releaseInboundMessage('966555992937', 'wamid.legacy.1', ''), false);
    assert.strictEqual(await releaseInboundMessage('966555992937', 'wamid.legacy.1', null), false);

    // Legacy stale entry can be safely reclaimed after stale threshold and replaced with a tokenized claim
    let pending = legacySession.pendingMessages.map((p) => p.toObject());
    WhatsAppSession.findOneAndUpdate = async (filter, update) => {
      const msgId = filter.processedMessageIds.$ne;
      const staleCutoff = filter.pendingMessages.$not.$elemMatch.claimedAt.$gt;
      if (pending.some((p) => p.id === msgId && p.claimedAt > staleCutoff)) return null;
      const newEntry = update[0].$set.pendingMessages.$slice[0].$concatArrays[1][0];
      pending = [...pending.filter((p) => p.id !== msgId), newEntry].slice(-20);
      return { phoneNumber: '966555992937', pendingMessages: pending };
    };

    const reclaimed = await claimInboundMessage('966555992937', 'wamid.legacy.1', { now: t0, staleMs: 60_000 });
    assert.strictEqual(reclaimed.claimed, true);
    assert.ok(reclaimed.claimToken.length >= 32);
    const matches = pending.filter((p) => p.id === 'wamid.legacy.1');
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].claimToken, reclaimed.claimToken);
  });

  // 18. REFUNDED bookings cannot receive a newly rotated checkout token (direct + concurrent guard)
  await check('18. REFUNDED bookings cannot receive a newly rotated checkout token', async () => {
    for (const status of ['REFUNDED', 'refunded']) {
      let updateCalled = false;
      const doc = {
        _id: ID_A,
        bookingNumber: `NX-${status}`,
        customer: { mobile: '966555992937' },
        paymentStatus: status,
        bookingStatus: 'CONFIRMED',
        customQuoteRequired: false,
        checkoutTokenHash: '',
        checkoutTokenExpiresAt: null,
      };
      Booking.findById = () => makeQuery(doc);
      Booking.findOneAndUpdate = async () => {
        updateCalled = true;
        return doc;
      };

      const res = await rotateBookingCheckoutToken(ID_A, { verifiedPhone: '966555992937' });
      assert.strictEqual(res.ok, false, `${status} must fail`);
      assert.strictEqual(res.reason, 'ineligible', `${status} must return ineligible`);
      assert.strictEqual(res.checkoutToken, undefined, `${status} must not issue a token`);
      assert.strictEqual(updateCalled, false, `${status} must not attempt DB update`);
      assert.strictEqual(doc.checkoutTokenHash, '');
    }

    // Concurrent transition to REFUNDED between initial lookup and atomic update
    let findCalls = 0;
    let capturedFilter = null;
    Booking.findById = () => {
      findCalls += 1;
      return makeQuery({
        _id: ID_A,
        bookingNumber: 'NX-RACE-REFUNDED',
        customer: { mobile: '966555992937' },
        paymentStatus: findCalls === 1 ? 'PENDING' : 'REFUNDED',
        bookingStatus: 'CONFIRMED',
        customQuoteRequired: false,
        checkoutTokenHash: '',
        checkoutTokenExpiresAt: null,
      });
    };
    Booking.findOneAndUpdate = async (filter) => {
      capturedFilter = filter;
      return null;
    };

    const raceRes = await rotateBookingCheckoutToken(ID_A, { verifiedPhone: '966555992937' });
    assert.strictEqual(raceRes.ok, false);
    assert.strictEqual(raceRes.reason, 'ineligible');
    assert.strictEqual(raceRes.checkoutToken, undefined);
    assert.ok(capturedFilter && capturedFilter.paymentStatus && Array.isArray(capturedFilter.paymentStatus.$nin));
    assert.ok(capturedFilter.paymentStatus.$nin.includes('REFUNDED'));
    assert.ok(capturedFilter.paymentStatus.$nin.includes('refunded'));
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\nResults: ${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
