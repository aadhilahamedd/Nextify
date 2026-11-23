/**
 * Payment Safety & Failure Handling Test Suite
 * Run: node Backend/tests/paymentSafety.test.js
 */
const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { classifyVerification } = require('../services/paymentProviders/paymentDecision');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Driver = require('../models/Driver');
const bookingController = require('../controllers/bookingController');
const moyasarPaymentProvider = require('../services/paymentProviders/moyasarPaymentProvider');
moyasarPaymentProvider._setAllowOfflineUnitTestTransactions(true);
const paymentService = require('../services/paymentService');

function createMockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

async function runAllTests() {
  const results = [];

  async function check(name, fn) {
    try {
      await fn();
      results.push({ name, ok: true });
      console.log(`ok ${name}`);
    } catch (err) {
      results.push({ name, ok: false, error: err.message });
      console.log(`fail ${name} — ${err.message}`);
    }
  }

  // 1. Failed payment: maps to mark_failed, verifies schema enum compliance
  await check('1. Failed payment: classified as mark_failed and satisfies schema enums', () => {
    const decision = classifyVerification({
      localStatus: 'PENDING',
      localReference: '',
      incomingId: 'pay_fail_123',
      mappedStatus: 'FAILED',
      bookingAlreadyPaid: false,
    });
    assert.strictEqual(decision.action, 'mark_failed');
    assert.strictEqual(decision.confirmBooking, false);

    // Schema enum validation
    const paymentStatusEnum = Payment.schema.path('status').enumValues;
    assert.ok(paymentStatusEnum.includes('FAILED'), 'Payment.status enum must include FAILED');

    const bookingPaymentStatusEnum = Booking.schema.path('paymentStatus').enumValues;
    assert.ok(bookingPaymentStatusEnum.includes('FAILED'), 'Booking.paymentStatus enum must include FAILED');

    const bookingStatusEnum = Booking.schema.path('bookingStatus').enumValues;
    assert.ok(bookingStatusEnum.includes('CANCELLED'), 'Booking.bookingStatus enum must include CANCELLED');
  });

  // 2. Cancelled payment: maps to mark_cancelled, verifies schema enum compliance
  await check('2. Cancelled payment: classified as mark_cancelled and satisfies schema enums', () => {
    const decision = classifyVerification({
      localStatus: 'PENDING',
      localReference: '',
      incomingId: 'pay_cancel_456',
      mappedStatus: 'CANCELLED',
      bookingAlreadyPaid: false,
    });
    assert.strictEqual(decision.action, 'mark_cancelled');
    assert.strictEqual(decision.confirmBooking, false);

    const paymentStatusEnum = Payment.schema.path('status').enumValues;
    assert.ok(paymentStatusEnum.includes('CANCELLED'), 'Payment.status enum must include CANCELLED');
  });

  // 3. Successful payment: only server-verified PAID confirms booking
  await check('3. Successful payment: only server-verified PAID confirms booking', () => {
    const decision = classifyVerification({
      localStatus: 'PENDING',
      localReference: '',
      incomingId: 'pay_success_789',
      mappedStatus: 'PAID',
      bookingAlreadyPaid: false,
    });
    assert.strictEqual(decision.action, 'mark_paid');
    assert.strictEqual(decision.confirmBooking, true);

    for (const status of ['FAILED', 'CANCELLED', 'PENDING', 'REFUNDED']) {
      const nonPaid = classifyVerification({
        localStatus: 'PENDING',
        localReference: '',
        incomingId: 'pay_test',
        mappedStatus: status,
        bookingAlreadyPaid: false,
      });
      assert.strictEqual(nonPaid.confirmBooking, false, `Status ${status} must never confirm booking`);
    }
  });

  // 4. Network timeout / unknown status: preserves PENDING / PAYMENT_PENDING
  await check('4. Network timeout / unknown status: classified as pending without confirming booking', () => {
    const decision = classifyVerification({
      localStatus: 'PENDING',
      localReference: '',
      incomingId: 'pay_in_flight',
      mappedStatus: 'PENDING',
      bookingAlreadyPaid: false,
    });
    assert.strictEqual(decision.action, 'pending');
    assert.strictEqual(decision.confirmBooking, false);
  });

  // 5. Duplicate failure webhook: returns idempotent_failed to suppress duplicate notifications
  await check('5. Duplicate failure webhook: classified as idempotent_failed to prevent duplicate notifications', () => {
    const first = classifyVerification({
      localStatus: 'PENDING',
      localReference: '',
      incomingId: 'pay_fail_dup',
      mappedStatus: 'FAILED',
      bookingAlreadyPaid: false,
    });
    assert.strictEqual(first.action, 'mark_failed');

    const duplicateSameRef = classifyVerification({
      localStatus: 'FAILED',
      localReference: 'pay_fail_dup',
      incomingId: 'pay_fail_dup',
      mappedStatus: 'FAILED',
      bookingAlreadyPaid: false,
    });
    assert.strictEqual(duplicateSameRef.action, 'idempotent_failed');
    assert.strictEqual(duplicateSameRef.confirmBooking, false);

    const duplicateEmptyRef = classifyVerification({
      localStatus: 'FAILED',
      localReference: '',
      incomingId: 'pay_fail_dup',
      mappedStatus: 'FAILED',
      bookingAlreadyPaid: false,
    });
    assert.strictEqual(duplicateEmptyRef.action, 'idempotent_failed');
  });

  // 6. Delayed failure webhook after success: ignore_unpay protects confirmed booking
  await check('6. Delayed failure webhook after success: ignore_unpay protects confirmed booking', () => {
    const decision = classifyVerification({
      localStatus: 'PAID',
      localReference: 'pay_success_1',
      incomingId: 'pay_fail_delayed',
      mappedStatus: 'FAILED',
      bookingAlreadyPaid: true,
    });
    assert.strictEqual(decision.action, 'ignore_unpay');
    assert.strictEqual(decision.confirmBooking, false);
  });

  // 7. Driver assignment with unpaid booking is rejected
  await check('7. Driver assignment with unpaid booking: blocked with HTTP 400', async () => {
    const originalFindById = Booking.findById;
    try {
      // Case 7A: Booking paymentStatus is FAILED
      Booking.findById = async () => ({
        _id: '507f191e810c19729de860e1',
        bookingStatus: 'CANCELLED',
        paymentStatus: 'FAILED',
        customQuoteRequired: false,
        schedule: { pickupDateTime: new Date(Date.now() + 86400000) },
      });

      const resA = createMockRes();
      await bookingController.assignDriver(
        { params: { id: '507f191e810c19729de860e1' }, body: { driverId: '507f191e810c19729de860d1' } },
        resA,
        () => {}
      );
      assert.strictEqual(resA.statusCode, 400);

      // Case 7B: Booking paymentStatus is PENDING
      Booking.findById = async () => ({
        _id: '507f191e810c19729de860e2',
        bookingStatus: 'PAYMENT_PENDING',
        paymentStatus: 'PENDING',
        customQuoteRequired: false,
        schedule: { pickupDateTime: new Date(Date.now() + 86400000) },
      });

      const resB = createMockRes();
      await bookingController.assignDriver(
        { params: { id: '507f191e810c19729de860e2' }, body: { driverId: '507f191e810c19729de860d1' } },
        resB,
        () => {}
      );
      assert.strictEqual(resB.statusCode, 400);
      assert.ok(resB.body?.message?.includes('unpaid'), 'Must reject assignment on unpaid booking');
    } finally {
      Booking.findById = originalFindById;
    }
  });

  // 8. Legitimate NOT_REQUIRED and custom-quote bookings allow driver assignment
  await check('8. Legitimate NOT_REQUIRED and custom-quote bookings: driver assignment permitted', async () => {
    const originalBookingFindById = Booking.findById;
    const originalDriverFindById = Driver.findById;
    const originalDriverUpdate = Driver.findByIdAndUpdate;
    const originalBookingFind = Booking.find;

    try {
      Driver.findById = async () => ({
        _id: '507f191e810c19729de860ee',
        name: 'Test Chauffeur',
        phone: '+966500000000',
        active: true,
        status: 'AVAILABLE',
      });
      Driver.findByIdAndUpdate = async () => ({});
      Booking.find = async () => [];

      // Case 8A: approved custom-quote exemption (CONFIRMED + NOT_REQUIRED + customQuoteRequired)
      let savedA = false;
      const validIdA = '507f191e810c19729de860ea';
      const mockDocA = {
        _id: validIdA,
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'NOT_REQUIRED',
        customQuoteRequired: true,
        schedule: { pickupDateTime: new Date(Date.now() + 86400000) },
        save: async function () { savedA = true; },
        toObject: () => ({ _id: validIdA, bookingStatus: 'DRIVER_ASSIGNED' }),
      };
      Booking.findById = () => ({
        populate: async () => mockDocA,
        then: (resolve) => resolve(mockDocA),
      });

      const resA = createMockRes();
      await bookingController.assignDriver(
        { params: { id: validIdA }, body: { driverId: '507f191e810c19729de860ee' } },
        resA,
        (err) => { if (err) throw err; }
      );
      assert.strictEqual(resA.statusCode, 200, resA.body?.message || 'Must allow NOT_REQUIRED');
      assert.strictEqual(savedA, true);

      // Case 8B: customQuoteRequired === true
      let savedB = false;
      const validIdB = '507f191e810c19729de860eb';
      const mockDocB = {
        _id: validIdB,
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'NOT_REQUIRED',
        customQuoteRequired: true,
        schedule: { pickupDateTime: new Date(Date.now() + 86400000) },
        save: async function () { savedB = true; },
        toObject: () => ({ _id: validIdB, bookingStatus: 'DRIVER_ASSIGNED' }),
      };
      Booking.findById = () => ({
        populate: async () => mockDocB,
        then: (resolve) => resolve(mockDocB),
      });

      const resB = createMockRes();
      await bookingController.assignDriver(
        { params: { id: validIdB }, body: { driverId: '507f191e810c19729de860ee' } },
        resB,
        (err) => { if (err) throw err; }
      );
      assert.strictEqual(resB.statusCode, 200, resB.body?.message || 'Must allow custom quote');
      assert.strictEqual(savedB, true);
    } finally {
      Booking.findById = originalBookingFindById;
      Driver.findById = originalDriverFindById;
      Driver.findByIdAndUpdate = originalDriverUpdate;
      Booking.find = originalBookingFind;
    }
  });

  // 9. Payment retry after failed attempt: attachReference creates separate attempt without 409
  await check('9. Payment retry after failed attempt: attachReference creates separate attempt without 409', async () => {
    const originalPaymentFindById = Payment.findById;
    const originalPaymentFindOne = Payment.findOne;
    const originalPaymentCreate = Payment.create;
    const originalFetch = global.fetch;

    try {
      const existingAttempt = {
        _id: 'payment_attempt_1',
        booking: 'booking_123',
        bookingNumber: 'NX-1001',
        amount: 250,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: 'pay_failed_first',
        status: 'FAILED',
        metadata: { env: 'test' },
      };

      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'pay_retry_second',
          status: 'initiated',
          amount: 25000,
          currency: 'SAR',
          live: false,
          metadata: { payment_id: 'payment_attempt_1', booking_number: 'NX-1001' },
        }),
      });

      Payment.findById = async () => existingAttempt;
      Payment.findOne = async () => null;

      let createdAttempt = null;
      Payment.create = async (doc) => {
        createdAttempt = { ...doc, _id: 'payment_attempt_2' };
        return createdAttempt;
      };

      const attached = await moyasarPaymentProvider.attachReference('payment_attempt_1', 'pay_retry_second');

      assert.ok(attached, 'Must return a payment attempt');
      assert.strictEqual(attached.providerReference, 'pay_retry_second', 'New attempt gets new reference');
      assert.strictEqual(attached.bookingNumber, 'NX-1001', 'Belongs to same booking');
      assert.strictEqual(createdAttempt.metadata.retryOf, 'payment_attempt_1', 'Tracks previous attempt');
      assert.strictEqual(existingAttempt.providerReference, 'pay_failed_first', 'Attempt 1 reference preserved');
    } finally {
      Payment.findById = originalPaymentFindById;
      Payment.findOne = originalPaymentFindOne;
      Payment.create = originalPaymentCreate;
      global.fetch = originalFetch;
    }
  });

  // 10. Duplicate successful payment: flags duplicate_charge with manual intervention
  await check('10. Duplicate successful payment: flags duplicate_charge with manual intervention', () => {
    const decision = classifyVerification({
      localStatus: 'PAID',
      localReference: 'pay_charge_one',
      incomingId: 'pay_charge_two',
      mappedStatus: 'PAID',
      bookingAlreadyPaid: true,
    });
    assert.strictEqual(decision.action, 'duplicate_charge');
    assert.strictEqual(decision.confirmBooking, false);
    assert.strictEqual(decision.manualInterventionRequired, true);
  });

  // 11. Unapproved custom quote alone is blocked from driver assignment
  await check('11. Unapproved custom quote alone: blocked from driver assignment', async () => {
    const originalFindById = Booking.findById;
    try {
      Booking.findById = async () => ({
        _id: '507f191e810c19729de860ec',
        bookingStatus: 'PENDING', // Customer submitted, not approved yet
        paymentStatus: 'NOT_REQUIRED',
        customQuoteRequired: true,
        schedule: { pickupDateTime: new Date(Date.now() + 86400000) },
      });

      const res = createMockRes();
      await bookingController.assignDriver(
        { params: { id: '507f191e810c19729de860ec' }, body: { driverId: '507f191e810c19729de860d1' } },
        res,
        () => {}
      );
      assert.strictEqual(res.statusCode, 400);
      assert.ok(
        res.body?.message?.includes('unpaid') || res.body?.message?.includes('exemption'),
        'Must block unapproved custom quote'
      );
    } finally {
      Booking.findById = originalFindById;
    }
  });

  // 12. Delayed webhook from old attempt does not modify newer attempt or reverse successful booking
  await check('12. Delayed webhook from old attempt: does not modify newer attempt or reverse successful booking', async () => {
    const originalPaymentFindOne = Payment.findOne;
    const originalPaymentFindById = Payment.findById;
    const originalPaymentUpdateOne = Payment.updateOne;
    const originalBookingFindById = Booking.findById;
    const moyasarClient = require('../services/paymentProviders/moyasarClient');
    const originalRetrieve = moyasarClient.retrievePayment;
    const originalFetch = global.fetch;

    try {
      const attempt1 = {
        _id: 'attempt_old_1',
        booking: 'booking_999',
        bookingNumber: 'NX-999',
        amount: 250,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: 'pay_old_fail',
        status: 'PENDING',
        metadata: { env: 'test' },
      };

      const attempt2 = {
        _id: 'attempt_new_2',
        booking: 'booking_999',
        bookingNumber: 'NX-999',
        amount: 250,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: 'pay_new_paid',
        status: 'PAID',
      };

      const confirmedBooking = {
        _id: 'booking_999',
        bookingNumber: 'NX-999',
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
      };

      global.fetch = async (url) => {
        if (url.includes('pay_old_fail')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'pay_old_fail',
              status: 'failed',
              amount: 25000,
              currency: 'SAR',
              live: false,
              metadata: { payment_id: 'attempt_old_1', booking_number: 'NX-999' },
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({ message: 'Not found' }) };
      };

      // Mock Payment.findOne:
      // When finding local payment for pay_old_fail -> returns attempt1
      // When bookingAlreadyPaidByOther queries for another PAID payment -> returns attempt2
      Payment.findOne = async (query) => {
        if (query.providerReference === 'pay_old_fail') return attempt1;
        if (query.status === 'PAID' && query._id?.$ne === 'attempt_old_1') return attempt2;
        return null;
      };

      Payment.findById = async (id) => {
        if (id === 'attempt_old_1') return attempt1;
        if (id === 'attempt_new_2') return attempt2;
        return null;
      };

      Booking.findById = async () => confirmedBooking;

      let oldAttemptUpdatedStatus = null;
      Payment.updateOne = async (filter, update) => {
        if (filter._id === 'attempt_old_1') {
          oldAttemptUpdatedStatus = update.$set.status;
          attempt1.status = oldAttemptUpdatedStatus;
        }
      };

      // Process delayed webhook for old attempt
      const result = await moyasarPaymentProvider.verifyPayment('pay_old_fail');

      // Assertions
      assert.strictEqual(result.reused, true, 'Must flag reused to suppress notifications');
      assert.strictEqual(result.booking.paymentStatus, 'PAID', 'Booking must stay PAID');
      assert.strictEqual(result.booking.bookingStatus, 'CONFIRMED', 'Booking must stay CONFIRMED');
      assert.strictEqual(attempt2.status, 'PAID', 'Newer attempt must stay PAID');
      assert.strictEqual(oldAttemptUpdatedStatus, 'FAILED', 'Old attempt status accurately recorded as FAILED');
    } finally {
      Payment.findOne = originalPaymentFindOne;
      Payment.findById = originalPaymentFindById;
      Payment.updateOne = originalPaymentUpdateOne;
      Booking.findById = originalBookingFindById;
      global.fetch = originalFetch;
    }
  });

  // 13. Refunds: preserve trip status and do not reverse completed bookings
  await check('13. Refunds: update paymentStatus to REFUNDED without reversing completed bookings', async () => {
    const originalPaymentFindOne = Payment.findOne;
    const originalPaymentFindById = Payment.findById;
    const originalPaymentFindOneAndUpdate = Payment.findOneAndUpdate;
    const originalBookingFindById = Booking.findById;
    const originalBookingUpdateOne = Booking.updateOne;
    const moyasarClient = require('../services/paymentProviders/moyasarClient');
    const originalRetrieve = moyasarClient.retrievePayment;
    const originalFetch = global.fetch;

    try {
      const paidAttempt = {
        _id: 'attempt_paid_1',
        booking: 'booking_trip_done',
        bookingNumber: 'NX-888',
        amount: 300,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: 'pay_refund_test',
        status: 'PAID',
        metadata: { env: 'test' },
      };

      const completedBooking = {
        _id: 'booking_trip_done',
        bookingNumber: 'NX-888',
        bookingStatus: 'COMPLETED', // Ride already occurred
        paymentStatus: 'PAID',
      };

      global.fetch = async (url) => {
        if (url.includes('pay_refund_test')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'pay_refund_test',
              status: 'refunded',
              amount: 30000,
              currency: 'SAR',
              live: false,
              metadata: { payment_id: 'attempt_paid_1', booking_number: 'NX-888' },
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({ message: 'Not found' }) };
      };

      Payment.findOne = async (query) => {
        if (query?.providerReference === 'pay_refund_test') return paidAttempt;
        return null;
      };
      Payment.findById = async () => ({ ...paidAttempt, status: 'REFUNDED' });
      Booking.findById = async () => completedBooking;

      let bookingUpdatedFields = null;
      Booking.updateOne = async (filter, update) => {
        bookingUpdatedFields = update.$set;
        if (update.$set.paymentStatus) completedBooking.paymentStatus = update.$set.paymentStatus;
      };

      Payment.findOneAndUpdate = async (filter, update) => ({
        ...paidAttempt,
        status: update.$set.status,
      });

      const result = await moyasarPaymentProvider.verifyPayment('pay_refund_test');

      assert.strictEqual(result.payment.status, 'REFUNDED');
      assert.strictEqual(result.booking.paymentStatus, 'REFUNDED');
      assert.strictEqual(result.booking.bookingStatus, 'COMPLETED', 'Completed booking must NOT be reversed to CANCELLED');
      assert.strictEqual(bookingUpdatedFields?.bookingStatus, undefined, 'Must not touch bookingStatus on refund');
    } finally {
      Payment.findOne = originalPaymentFindOne;
      Payment.findById = originalPaymentFindById;
      Payment.findOneAndUpdate = originalPaymentFindOneAndUpdate;
      Booking.findById = originalBookingFindById;
      Booking.updateOne = originalBookingUpdateOne;
      global.fetch = originalFetch;
    }
  });

  // 14. Public pay endpoint excludes sensitive booking fields
  await check('14. Public pay endpoint excludes customer PII, driver and admin fields', async () => {
    const { generateCheckoutToken } = require('../utils/checkoutToken');
    const originalFindById = Booking.findById;
    try {
      const issued = generateCheckoutToken();
      const leanDoc = {
        _id: '507f191e810c19729de860f1',
        bookingNumber: 'NX-PAY-1',
        serviceType: 'airport_transfer',
        vehicle: { name: 'GMC Yukon', type: 'SUV' },
        vehicleName: 'GMC Yukon',
        quotedPrice: 250,
        pricing: {
          totalAmount: 250,
          currency: 'SAR',
          breakdown: { pricingType: 'airport', quoteStatus: 'priced', message: 'ok' },
        },
        paymentStatus: 'PENDING',
        bookingStatus: 'PAYMENT_PENDING',
        customQuoteRequired: false,
        checkoutTokenHash: issued.tokenHash,
        checkoutTokenExpiresAt: issued.expiresAt,
        customer: { name: 'Secret Name', email: 'secret@example.com', mobile: '0555123456' },
        driver: { name: 'Hidden Driver', phone: '0555000000' },
        specialRequests: 'VIP note',
      };

      Booking.findById = () => ({
        select() {
          return {
            lean: async () => leanDoc,
          };
        },
      });

      const res = createMockRes();
      await bookingController.getPublicPayBooking(
        { params: { id: leanDoc._id }, headers: { 'x-checkout-token': issued.rawToken } },
        res,
        (err) => { if (err) throw err; }
      );

      assert.strictEqual(res.statusCode, 200);
      const payload = res.body?.data?.booking;
      assert.ok(payload);
      assert.strictEqual(payload._id, leanDoc._id);
      assert.strictEqual(payload.bookingNumber, 'NX-PAY-1');
      assert.strictEqual(payload.pricing.totalAmount, 250);
      assert.strictEqual(payload.customer, undefined);
      assert.strictEqual(payload.driver, undefined);
      assert.strictEqual(payload.specialRequests, undefined);
      assert.strictEqual(payload.email, undefined);
      assert.strictEqual(payload.mobile, undefined);
      const raw = JSON.stringify(payload);
      assert.ok(!raw.includes('Secret Name'));
      assert.ok(!raw.includes('secret@example.com'));
      assert.ok(!raw.includes('Hidden Driver'));
      assert.ok(!raw.includes('VIP note'));
    } finally {
      Booking.findById = originalFindById;
    }
  });

  // 15. Failed payment retry preserves booking id and creates a separate attempt
  await check('15. Failed payment retry preserves booking id and creates a separate payment attempt', async () => {
    const originalPaymentFindById = Payment.findById;
    const originalPaymentFindOne = Payment.findOne;
    const originalPaymentCreate = Payment.create;
    const originalFetch = global.fetch;

    try {
      const bookingId = '507f191e810c19729de860f2';
      const failedAttempt = {
        _id: 'pay_local_failed',
        booking: bookingId,
        bookingNumber: 'NX-RETRY-1',
        amount: 180,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: 'pay_old_moyasar',
        status: 'FAILED',
        metadata: { env: 'test' },
      };

      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'pay_new_moyasar',
          status: 'initiated',
          amount: 18000,
          currency: 'SAR',
          live: false,
          metadata: { payment_id: 'pay_local_failed', booking_number: 'NX-RETRY-1' },
        }),
      });

      Payment.findById = async () => failedAttempt;
      Payment.findOne = async () => null;

      let created = null;
      Payment.create = async (doc) => {
        created = { ...doc, _id: 'pay_local_retry' };
        return created;
      };

      const attached = await moyasarPaymentProvider.attachReference('pay_local_failed', 'pay_new_moyasar');
      assert.strictEqual(String(attached.booking), bookingId, 'Same booking id');
      assert.strictEqual(attached.providerReference, 'pay_new_moyasar');
      assert.notStrictEqual(attached._id, failedAttempt._id, 'Separate payment attempt');
      assert.strictEqual(created.metadata.retryOf, 'pay_local_failed');
      assert.strictEqual(failedAttempt.providerReference, 'pay_old_moyasar', 'Old Moyasar id preserved');
    } finally {
      Payment.findById = originalPaymentFindById;
      Payment.findOne = originalPaymentFindOne;
      Payment.create = originalPaymentCreate;
      global.fetch = originalFetch;
    }
  });

  // 16. Admin cannot manually mark payment PAID
  await check('16. Admin cannot manually mark a Moyasar booking paymentStatus PAID', async () => {
    const originalFindById = Booking.findById;
    try {
      const doc = {
        _id: '507f191e810c19729de860f3',
        paymentStatus: 'PENDING',
        bookingStatus: 'PAYMENT_PENDING',
        specialRequests: '',
        save: async () => {
          throw new Error('save must not run when PAID is rejected');
        },
        toPublicJSON() { return this; },
      };
      Booking.findById = async () => doc;

      const res = createMockRes();
      await bookingController.updateBooking(
        { params: { id: doc._id }, body: { paymentStatus: 'PAID', bookingStatus: 'CONFIRMED' } },
        res,
        (err) => { if (err) throw err; }
      );
      assert.strictEqual(res.statusCode, 400);
      assert.ok(String(res.body?.message || '').includes('verified payment'));
      assert.strictEqual(doc.paymentStatus, 'PENDING');
    } finally {
      Booking.findById = originalFindById;
    }
  });

  // 17. Approved custom-quote workflow still works (CONFIRMED + NOT_REQUIRED)
  await check('17. Approved custom-quote workflow: CONFIRMED + NOT_REQUIRED still allowed', async () => {
    const originalFindById = Booking.findById;
    try {
      let saved = false;
      const doc = {
        _id: '507f191e810c19729de860f4',
        paymentStatus: 'NOT_REQUIRED',
        bookingStatus: 'PENDING',
        customQuoteRequired: true,
        specialRequests: '',
        save: async function save() { saved = true; },
        toPublicJSON() {
          return {
            _id: this._id,
            paymentStatus: this.paymentStatus,
            bookingStatus: this.bookingStatus,
          };
        },
      };
      Booking.findById = async () => doc;

      const res = createMockRes();
      await bookingController.updateBooking(
        { params: { id: doc._id }, body: { bookingStatus: 'CONFIRMED', paymentStatus: 'NOT_REQUIRED' } },
        res,
        (err) => { if (err) throw err; }
      );
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(saved, true);
      assert.strictEqual(doc.bookingStatus, 'CONFIRMED');
      assert.strictEqual(doc.paymentStatus, 'NOT_REQUIRED');
    } finally {
      Booking.findById = originalFindById;
    }
  });

  // 18. Cancelled booking checkout reopens PAYMENT_PENDING when reusing empty-ref attempt
  await check('18. Cancelled booking checkout state is consistent when reusing empty-ref pending payment', async () => {
    const originalPaymentFindOne = Payment.findOne;
    const originalBookingFindById = Booking.findById;
    const originalBookingFindOneAndUpdate = Booking.findOneAndUpdate;

    try {
      const bookingId = '507f191e810c19729de860f5';
      let atomicReopened = false;
      const bookingDoc = {
        _id: bookingId,
        bookingNumber: 'NX-CO-1',
        bookingStatus: 'CANCELLED',
        paymentStatus: 'FAILED',
        customQuoteRequired: false,
        pricing: { totalAmount: 200, currency: 'SAR', breakdown: { quoteStatus: 'priced' } },
      };

      const emptyPending = {
        _id: 'pay_empty_pending',
        booking: bookingId,
        bookingNumber: 'NX-CO-1',
        amount: 200,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: '',
        status: 'PENDING',
      };

      Payment.findOne = (query) => {
        const result = query.status === 'PAID'
          ? null
          : (query.status === 'PENDING' ? emptyPending : null);
        return {
          sort: async () => result,
          then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
        };
      };

      Booking.findOneAndUpdate = async (filter, update) => {
        assert.deepStrictEqual(filter.paymentStatus, { $nin: ['PAID', 'paid', 'REFUNDED', 'refunded', 'NOT_REQUIRED', 'not_required'] });
        atomicReopened = true;
        Object.assign(bookingDoc, update.$set);
        return bookingDoc;
      };

      Booking.findById = async () => ({
        ...bookingDoc,
      });

      const result = await paymentService.createOrReuseCheckout(bookingDoc);
      assert.strictEqual(atomicReopened, true, 'Must atomically reopen cancelled booking for checkout');
      assert.strictEqual(bookingDoc.bookingStatus, 'PAYMENT_PENDING');
      assert.strictEqual(bookingDoc.paymentStatus, 'PENDING');
      assert.strictEqual(result.payment._id, 'pay_empty_pending');
      assert.ok(String(result.paymentUrl).includes(bookingId));
    } finally {
      Payment.findOne = originalPaymentFindOne;
      Booking.findById = originalBookingFindById;
      Booking.findOneAndUpdate = originalBookingFindOneAndUpdate;
    }
  });

  await check('18b. H1 regression: concurrent PAID transition during createOrReuseCheckout is never overwritten', async () => {
    const originalPaymentFindOne = Payment.findOne;
    const originalBookingFindById = Booking.findById;
    const originalBookingFindOneAndUpdate = Booking.findOneAndUpdate;

    try {
      const bookingId = '507f191e810c19729de860f6';
      const staleBookingDoc = {
        _id: bookingId,
        bookingNumber: 'NX-H1-RACE',
        bookingStatus: 'CANCELLED',
        paymentStatus: 'FAILED',
        customQuoteRequired: false,
        pricing: { totalAmount: 200, currency: 'SAR', breakdown: { quoteStatus: 'priced' } },
      };
      const dbBookingState = {
        ...staleBookingDoc,
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        checkoutTokenHash: '',
        checkoutTokenExpiresAt: null,
      };
      const emptyPending = {
        _id: 'pay_h1_pending',
        booking: bookingId,
        bookingNumber: 'NX-H1-RACE',
        amount: 200,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: '',
        status: 'PENDING',
      };

      Payment.findOne = (query) => {
        const result = query.status === 'PAID'
          ? null
          : (query.status === 'PENDING' ? emptyPending : null);
        return {
          sort: async () => result,
          then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
        };
      };

      // Simulate DB rejecting the atomic reopen because booking concurrently became PAID.
      Booking.findOneAndUpdate = async (filter) => {
        assert.deepStrictEqual(filter.paymentStatus, { $nin: ['PAID', 'paid', 'REFUNDED', 'refunded', 'NOT_REQUIRED', 'not_required'] });
        return null;
      };
      Booking.findById = async () => ({ ...dbBookingState });

      let caught = null;
      try {
        await paymentService.createOrReuseCheckout(staleBookingDoc);
      } catch (err) {
        caught = err;
      }
      assert.ok(caught, 'Must reject checkout when booking concurrently became PAID');
      assert.strictEqual(caught.statusCode, 409);
      assert.match(caught.message, /already paid/i);
      assert.strictEqual(dbBookingState.paymentStatus, 'PAID');
      assert.strictEqual(dbBookingState.bookingStatus, 'CONFIRMED');
      assert.strictEqual(dbBookingState.checkoutTokenHash, '');
    } finally {
      Payment.findOne = originalPaymentFindOne;
      Booking.findById = originalBookingFindById;
      Booking.findOneAndUpdate = originalBookingFindOneAndUpdate;
    }
  });

  await check('18c. Fix 1 regression: both moyasar and mock createPayment use atomic Booking.findOneAndUpdate and never call booking.save()', async () => {
    const moyasarProvider = require('../services/paymentProviders/moyasarPaymentProvider');
    const mockProvider = require('../services/paymentProviders/mockPaymentProvider');
    const origBookingFindOneAndUpdate = Booking.findOneAndUpdate;
    const origBookingFindById = Booking.findById;
    const origPaymentCreate = Payment.create;

    try {
      for (const [label, provider] of [['moyasar', moyasarProvider], ['mock', mockProvider]]) {
        // 1) Eligible booking starts payment without calling booking.save()
        let saveCalled = false;
        let paymentCreateCalls = 0;
        const eligibleBooking = {
          _id: '507f191e810c19729de860f7',
          bookingNumber: `NX-F1-OK-${label}`,
          paymentStatus: 'FAILED',
          bookingStatus: 'CANCELLED',
          customQuoteRequired: false,
          save: async () => { saveCalled = true; },
        };
        Booking.findOneAndUpdate = async (filter, update) => {
          assert.deepStrictEqual(filter.paymentStatus, { $nin: ['PAID', 'paid', 'REFUNDED', 'refunded', 'NOT_REQUIRED', 'not_required'] });
          return { ...eligibleBooking, ...update.$set };
        };
        Payment.create = async (doc) => {
          paymentCreateCalls += 1;
          return { _id: `pay_${label}_ok`, ...doc };
        };

        const created = await provider.createPayment({ booking: eligibleBooking, amount: 200, currency: 'SAR' });
        assert.strictEqual(created._id, `pay_${label}_ok`);
        assert.strictEqual(paymentCreateCalls, 1);
        assert.strictEqual(saveCalled, false, `${label} createPayment must never call booking.save()`);

        // 2) Concurrent PAID confirmation between read and atomic update throws 409, creates no payment, preserves PAID + cleared token
        let concurrentSaveCalled = false;
        let concurrentPaymentCreated = false;
        const staleBooking = {
          _id: '507f191e810c19729de860f8',
          bookingNumber: `NX-F1-PAID-${label}`,
          paymentStatus: 'FAILED',
          bookingStatus: 'CANCELLED',
          customQuoteRequired: false,
          save: async () => { concurrentSaveCalled = true; },
        };
        const dbPaidBooking = {
          ...staleBooking,
          paymentStatus: 'PAID',
          bookingStatus: 'CONFIRMED',
          checkoutTokenHash: '',
          checkoutTokenExpiresAt: null,
        };
        Booking.findOneAndUpdate = async () => null;
        Booking.findById = async () => ({ ...dbPaidBooking });
        Payment.create = async () => {
          concurrentPaymentCreated = true;
          throw new Error('Payment.create must not run when atomic booking guard fails');
        };

        let caught = null;
        try {
          await provider.createPayment({ booking: staleBooking, amount: 200, currency: 'SAR' });
        } catch (err) {
          caught = err;
        }
        assert.ok(caught, `${label} must throw 409 when booking concurrently became PAID`);
        assert.strictEqual(caught.statusCode, 409);
        assert.match(caught.message, /already paid/i);
        assert.strictEqual(concurrentPaymentCreated, false);
        assert.strictEqual(concurrentSaveCalled, false);
        assert.strictEqual(dbPaidBooking.paymentStatus, 'PAID');
        assert.strictEqual(dbPaidBooking.bookingStatus, 'CONFIRMED');
        assert.strictEqual(dbPaidBooking.checkoutTokenHash, '');
      }
    } finally {
      Booking.findOneAndUpdate = origBookingFindOneAndUpdate;
      Booking.findById = origBookingFindById;
      Payment.create = origPaymentCreate;
    }
  });

  await check('18d. 3D.2 Fix 3: createOrReuseCheckout cleans up newly created orphaned empty-ref PENDING payment if booking became PAID', async () => {
    const origPaymentFindOne = Payment.findOne;
    const origPaymentCreate = Payment.create;
    const origPaymentDeleteOne = Payment.deleteOne;
    const origBookingFindOneAndUpdate = Booking.findOneAndUpdate;
    const origBookingFindById = Booking.findById;

    try {
      const bookingId = '507f191e810c19729de860fa';
      const bookingDoc = {
        _id: bookingId,
        bookingNumber: 'NX-ORPHAN-1',
        bookingStatus: 'PAYMENT_PENDING',
        paymentStatus: 'PENDING',
        customQuoteRequired: false,
        pricing: { totalAmount: 200, currency: 'SAR', breakdown: { quoteStatus: 'priced' } },
      };

      const deleteFilters = [];
      Payment.findOne = () => ({ sort: async () => null, then: (r) => Promise.resolve(null).then(r) });
      Booking.findOneAndUpdate = async () => ({ ...bookingDoc });
      Payment.create = async (doc) => ({ _id: 'pay_fresh_orphan', ...doc });
      // Booking becomes PAID between Payment.create and Booking.findById reread
      Booking.findById = async () => ({ ...bookingDoc, paymentStatus: 'PAID', bookingStatus: 'CONFIRMED' });
      Payment.deleteOne = async (filter) => {
        deleteFilters.push(filter);
        return { deletedCount: 1 };
      };

      let err1 = null;
      try {
        await paymentService.createOrReuseCheckout(bookingDoc);
      } catch (e) {
        err1 = e;
      }
      assert.ok(err1);
      assert.strictEqual(err1.statusCode, 409);
      assert.match(err1.message, /already paid/i);
      assert.strictEqual(deleteFilters.length, 1);
      assert.deepStrictEqual(deleteFilters[0], {
        _id: 'pay_fresh_orphan',
        status: 'PENDING',
        providerReference: '',
      });

      // Even if cleanup throws, the 409 Booking already paid error must not be masked
      Payment.deleteOne = async () => {
        throw new Error('transient delete failure');
      };
      let err2 = null;
      try {
        await paymentService.createOrReuseCheckout(bookingDoc);
      } catch (e) {
        err2 = e;
      }
      assert.ok(err2);
      assert.strictEqual(err2.statusCode, 409);
      assert.match(err2.message, /already paid/i);
    } finally {
      Payment.findOne = origPaymentFindOne;
      Payment.create = origPaymentCreate;
      Payment.deleteOne = origPaymentDeleteOne;
      Booking.findOneAndUpdate = origBookingFindOneAndUpdate;
      Booking.findById = origBookingFindById;
    }
  });

  // 19. Unknown webhook attempt cannot update another payment via booking_number fallback
  await check('19. Unknown webhook attempt cannot attach via booking_number empty-ref fallback', async () => {
    const originalPaymentFindOne = Payment.findOne;
    const originalPaymentFindById = Payment.findById;
    try {
      let findOneQueries = [];
      Payment.findOne = async (query) => {
        findOneQueries.push(query);
        if (query.providerReference === 'pay_unknown') return null;
        // Would previously return a wrong empty PENDING attempt for booking_number.
        if (query.bookingNumber === 'NX-OTHER') {
          return {
            _id: 'wrong_empty_pending',
            bookingNumber: 'NX-OTHER',
            provider: 'moyasar',
            providerReference: '',
            status: 'PENDING',
          };
        }
        return null;
      };
      Payment.findById = async () => null;

      const matched = await moyasarPaymentProvider.findLocalPayment({
        id: 'pay_unknown',
        metadata: { booking_number: 'NX-OTHER' },
      });
      assert.strictEqual(matched, null, 'Must fail closed without matching empty PENDING');
      assert.ok(
        findOneQueries.every((q) => q.bookingNumber === undefined),
        'Must not query by booking_number alone'
      );
    } finally {
      Payment.findOne = originalPaymentFindOne;
      Payment.findById = originalPaymentFindById;
    }
  });

  // 20. Existing ignore_unpay and duplicate_charge protections still hold
  await check('20. Existing successful and failed webhook protections still work', () => {
    assert.strictEqual(classifyVerification({
      localStatus: 'PAID',
      localReference: 'pay_ok',
      incomingId: 'pay_fail_late',
      mappedStatus: 'FAILED',
      bookingAlreadyPaid: true,
    }).action, 'ignore_unpay');

    assert.strictEqual(classifyVerification({
      localStatus: 'PAID',
      localReference: 'pay_ok',
      incomingId: 'pay_second',
      mappedStatus: 'PAID',
      bookingAlreadyPaid: true,
    }).action, 'duplicate_charge');

    assert.strictEqual(classifyVerification({
      localStatus: 'FAILED',
      localReference: 'pay_fail',
      incomingId: 'pay_fail',
      mappedStatus: 'FAILED',
      bookingAlreadyPaid: false,
    }).action, 'idempotent_failed');
  });

  const { toPaymentConfirmationBooking } = require('../utils/checkoutBooking');
  const paymentController = require('../controllers/paymentController');

  function mockMoyasarRetrieve(payloadById) {
    const originalFetch = global.fetch;
    global.fetch = async (url) => {
      const id = String(url).split('/payments/')[1]?.split('?')[0];
      const body = payloadById[id];
      if (!body) {
        return { ok: false, status: 404, json: async () => ({ message: 'Not found' }) };
      }
      return { ok: true, status: 200, json: async () => body };
    };
    return () => { global.fetch = originalFetch; };
  }

  // 21. Attach: correct metadata and payment
  await check('21. Attach reference: correct Moyasar metadata and payment succeeds', async () => {
    const restoreFetch = mockMoyasarRetrieve({
      pay_own_ok: {
        id: 'pay_own_ok',
        status: 'paid',
        amount: 25000,
        currency: 'SAR',
        live: false,
        metadata: { payment_id: 'pay_local_a', booking_number: 'NX-OWN-1' },
      },
    });
    const originalFindById = Payment.findById;
    const originalFindOne = Payment.findOne;
    const originalFindOneAndUpdate = Payment.findOneAndUpdate;
    try {
      const local = {
        _id: 'pay_local_a',
        booking: 'booking_a',
        bookingNumber: 'NX-OWN-1',
        amount: 250,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: '',
        status: 'PENDING',
        metadata: { env: 'test' },
      };
      Payment.findById = async () => local;
      Payment.findOne = async () => null;
      Payment.findOneAndUpdate = async () => ({ ...local, providerReference: 'pay_own_ok' });
      const attached = await moyasarPaymentProvider.attachReference('pay_local_a', 'pay_own_ok');
      assert.strictEqual(attached.providerReference, 'pay_own_ok');
    } finally {
      Payment.findById = originalFindById;
      Payment.findOne = originalFindOne;
      Payment.findOneAndUpdate = originalFindOneAndUpdate;
      restoreFetch();
    }
  });

  // 22. Attach: wrong local payment id in metadata
  await check('22. Attach reference: wrong local payment id is rejected', async () => {
    const restoreFetch = mockMoyasarRetrieve({
      pay_wrong_local: {
        id: 'pay_wrong_local',
        status: 'paid',
        amount: 25000,
        currency: 'SAR',
        live: false,
        metadata: { payment_id: 'other_local', booking_number: 'NX-OWN-1' },
      },
    });
    const originalFindById = Payment.findById;
    try {
      Payment.findById = async () => ({
        _id: 'pay_local_a',
        bookingNumber: 'NX-OWN-1',
        amount: 250,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: '',
        status: 'PENDING',
      });
      let threw = false;
      try {
        await moyasarPaymentProvider.attachReference('pay_local_a', 'pay_wrong_local');
      } catch (err) {
        threw = true;
        assert.strictEqual(err.statusCode, 409);
        assert.ok(String(err.message).includes('payment attempt'));
      }
      assert.ok(threw, 'Must reject mismatched payment_id');
    } finally {
      Payment.findById = originalFindById;
      restoreFetch();
    }
  });

  // 23. Attach: wrong booking number
  await check('23. Attach reference: wrong booking number is rejected', async () => {
    const restoreFetch = mockMoyasarRetrieve({
      pay_wrong_booking: {
        id: 'pay_wrong_booking',
        status: 'paid',
        amount: 25000,
        currency: 'SAR',
        live: false,
        metadata: { payment_id: 'pay_local_a', booking_number: 'NX-OTHER' },
      },
    });
    const originalFindById = Payment.findById;
    try {
      Payment.findById = async () => ({
        _id: 'pay_local_a',
        bookingNumber: 'NX-OWN-1',
        amount: 250,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: '',
        status: 'PENDING',
      });
      await assert.rejects(
        () => moyasarPaymentProvider.attachReference('pay_local_a', 'pay_wrong_booking'),
        (err) => err.statusCode === 409 && /booking/i.test(err.message)
      );
    } finally {
      Payment.findById = originalFindById;
      restoreFetch();
    }
  });

  // 24. Attach: missing metadata
  await check('24. Attach reference: missing metadata is rejected', async () => {
    const restoreFetch = mockMoyasarRetrieve({
      pay_no_meta: {
        id: 'pay_no_meta',
        status: 'paid',
        amount: 25000,
        currency: 'SAR',
        live: false,
        metadata: {},
      },
    });
    const originalFindById = Payment.findById;
    try {
      Payment.findById = async () => ({
        _id: 'pay_local_a',
        bookingNumber: 'NX-OWN-1',
        amount: 250,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: '',
        status: 'PENDING',
      });
      await assert.rejects(
        () => moyasarPaymentProvider.attachReference('pay_local_a', 'pay_no_meta'),
        (err) => err.statusCode === 409 && /metadata/i.test(err.message)
      );
    } finally {
      Payment.findById = originalFindById;
      restoreFetch();
    }
  });

  // 25. Attach: same amount different booking
  await check('25. Attach reference: same amount different booking is rejected', async () => {
    const restoreFetch = mockMoyasarRetrieve({
      pay_same_amount: {
        id: 'pay_same_amount',
        status: 'paid',
        amount: 25000,
        currency: 'SAR',
        live: false,
        metadata: { payment_id: 'victim_payment', booking_number: 'NX-VICTIM' },
      },
    });
    const originalFindById = Payment.findById;
    const originalFindOne = Payment.findOne;
    const originalFindOneAndUpdate = Payment.findOneAndUpdate;
    let updated = false;
    try {
      Payment.findById = async () => ({
        _id: 'attacker_payment',
        booking: 'attacker_booking',
        bookingNumber: 'NX-ATTACKER',
        amount: 250,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: '',
        status: 'PENDING',
      });
      Payment.findOne = async () => null;
      Payment.findOneAndUpdate = async () => { updated = true; return {}; };
      await assert.rejects(
        () => moyasarPaymentProvider.attachReference('attacker_payment', 'pay_same_amount'),
        (err) => err.statusCode === 409
      );
      assert.strictEqual(updated, false, 'Must not write any payment reference');
    } finally {
      Payment.findById = originalFindById;
      Payment.findOne = originalFindOne;
      Payment.findOneAndUpdate = originalFindOneAndUpdate;
      restoreFetch();
    }
  });

  // 26. Attach: amount/currency mismatch
  await check('26. Attach reference: amount or currency mismatch is rejected', async () => {
    const restoreFetch = mockMoyasarRetrieve({
      pay_bad_amount: {
        id: 'pay_bad_amount',
        status: 'paid',
        amount: 99900,
        currency: 'SAR',
        live: false,
        metadata: { payment_id: 'pay_local_a', booking_number: 'NX-OWN-1' },
      },
    });
    const originalFindById = Payment.findById;
    try {
      Payment.findById = async () => ({
        _id: 'pay_local_a',
        bookingNumber: 'NX-OWN-1',
        amount: 250,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: '',
        status: 'PENDING',
      });
      await assert.rejects(
        () => moyasarPaymentProvider.attachReference('pay_local_a', 'pay_bad_amount'),
        (err) => err.statusCode === 409 && /amount/i.test(err.message)
      );
    } finally {
      Payment.findById = originalFindById;
      restoreFetch();
    }
  });

  // 27. Attach: already-attached same reference is idempotent
  await check('27. Attach reference: already-attached same Moyasar id is idempotent', async () => {
    const originalFindById = Payment.findById;
    const originalFetch = global.fetch;
    let fetchedMoyasar = false;
    try {
      const local = {
        _id: 'pay_local_a',
        bookingNumber: 'NX-OWN-1',
        amount: 250,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: 'pay_idem',
        status: 'PENDING',
      };
      Payment.findById = async () => local;
      global.fetch = async () => {
        fetchedMoyasar = true;
        return { ok: true, status: 200, json: async () => ({ id: 'pay_idem' }) };
      };
      const attached = await moyasarPaymentProvider.attachReference('pay_local_a', 'pay_idem');
      assert.strictEqual(attached.providerReference, 'pay_idem');
      assert.strictEqual(fetchedMoyasar, false, 'Idempotent path must not call Moyasar');
    } finally {
      Payment.findById = originalFindById;
      global.fetch = originalFetch;
    }
  });

  // 28. Attach: old attempt cannot bind to a different open attempt
  await check('28. Attach reference: refuses linking when Moyasar id already on another attempt', async () => {
    const restoreFetch = mockMoyasarRetrieve({
      pay_taken: {
        id: 'pay_taken',
        status: 'paid',
        amount: 25000,
        currency: 'SAR',
        live: false,
        metadata: { payment_id: 'pay_local_new', booking_number: 'NX-OWN-1' },
      },
    });
    const originalFindById = Payment.findById;
    const originalFindOne = Payment.findOne;
    try {
      Payment.findById = async () => ({
        _id: 'pay_local_new',
        booking: 'booking_a',
        bookingNumber: 'NX-OWN-1',
        amount: 250,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: '',
        status: 'PENDING',
        metadata: { env: 'test' },
      });
      Payment.findOne = async () => ({
        _id: 'pay_local_old',
        booking: 'booking_a',
        bookingNumber: 'NX-OWN-1',
        providerReference: 'pay_taken',
        provider: 'moyasar',
      });
      await assert.rejects(
        () => moyasarPaymentProvider.attachReference('pay_local_new', 'pay_taken'),
        (err) => err.statusCode === 409 && /already linked/i.test(err.message)
      );
    } finally {
      Payment.findById = originalFindById;
      Payment.findOne = originalFindOne;
      restoreFetch();
    }
  });

  // 29. Verify response excludes sensitive fields
  await check('29. Verify payment confirmation projection excludes customer PII', () => {
    const slim = toPaymentConfirmationBooking(
      {
        _id: 'b1',
        bookingNumber: 'NX-V',
        serviceType: 'airport_transfer',
        vehicle: { name: 'GMC' },
        paymentStatus: 'PAID',
        bookingStatus: 'CONFIRMED',
        customer: { name: 'Secret', email: 's@x.com', mobile: '0555' },
        specialRequests: 'VIP',
        driver: { name: 'Driver' },
        pickup: { address: 'Secret St' },
      },
      { amount: 180, currency: 'SAR' }
    );
    const raw = JSON.stringify(slim);
    assert.strictEqual(slim.bookingNumber, 'NX-V');
    assert.strictEqual(slim.pricing.totalAmount, 180);
    assert.strictEqual(slim.customer, undefined);
    assert.strictEqual(slim.driver, undefined);
    assert.strictEqual(slim.specialRequests, undefined);
    assert.strictEqual(slim.pickup, undefined);
    assert.ok(!raw.includes('Secret'));
    assert.ok(!raw.includes('s@x.com'));
    assert.ok(!raw.includes('VIP'));
  });

  // 30. Ordinary booking cannot set NOT_REQUIRED
  await check('30. Ordinary booking cannot set paymentStatus NOT_REQUIRED', async () => {
    const originalFindById = Booking.findById;
    try {
      const doc = {
        _id: '507f191e810c19729de860f6',
        paymentStatus: 'PENDING',
        bookingStatus: 'PAYMENT_PENDING',
        customQuoteRequired: false,
        save: async () => { throw new Error('must not save'); },
      };
      Booking.findById = async () => doc;
      const res = createMockRes();
      await bookingController.updateBooking(
        { params: { id: doc._id }, body: { paymentStatus: 'NOT_REQUIRED', bookingStatus: 'CONFIRMED' } },
        res,
        (err) => { if (err) throw err; }
      );
      assert.strictEqual(res.statusCode, 400);
      assert.ok(String(res.body?.message || '').includes('custom-quote'));
    } finally {
      Booking.findById = originalFindById;
    }
  });

  // 31. Ordinary CONFIRMED + NOT_REQUIRED blocked for driver assignment
  await check('31. Driver assignment blocked for forged CONFIRMED + NOT_REQUIRED without customQuoteRequired', async () => {
    const originalFindById = Booking.findById;
    try {
      Booking.findById = async () => ({
        _id: '507f191e810c19729de860f7',
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'NOT_REQUIRED',
        customQuoteRequired: false,
        schedule: { pickupDateTime: new Date(Date.now() + 86400000) },
      });
      const res = createMockRes();
      await bookingController.assignDriver(
        { params: { id: '507f191e810c19729de860f7' }, body: { driverId: '507f191e810c19729de860d1' } },
        res,
        () => {}
      );
      assert.strictEqual(res.statusCode, 400);
    } finally {
      Booking.findById = originalFindById;
    }
  });

  // 32. Already-paid booking allows driver assignment
  await check('32. Driver assignment allowed for PAID booking', async () => {
    const originalBookingFindById = Booking.findById;
    const originalDriverFindById = Driver.findById;
    const originalDriverUpdate = Driver.findByIdAndUpdate;
    const originalBookingFind = Booking.find;
    try {
      Driver.findById = async () => ({ _id: '507f191e810c19729de860ee', active: true, status: 'AVAILABLE' });
      Driver.findByIdAndUpdate = async () => ({});
      Booking.find = async () => [];
      let saved = false;
      const mockDoc = {
        _id: '507f191e810c19729de860f8',
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        customQuoteRequired: false,
        schedule: { pickupDateTime: new Date(Date.now() + 86400000) },
        save: async function () { saved = true; },
        toObject: () => ({ _id: '507f191e810c19729de860f8', bookingStatus: 'DRIVER_ASSIGNED' }),
      };
      Booking.findById = () => ({
        populate: async () => mockDoc,
        then: (resolve) => resolve(mockDoc),
      });
      const res = createMockRes();
      await bookingController.assignDriver(
        { params: { id: mockDoc._id }, body: { driverId: '507f191e810c19729de860ee' } },
        res,
        (err) => { if (err) throw err; }
      );
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(saved, true);
    } finally {
      Booking.findById = originalBookingFindById;
      Driver.findById = originalDriverFindById;
      Driver.findByIdAndUpdate = originalDriverUpdate;
      Booking.find = originalBookingFind;
    }
  });

  // 33. Concurrent checkout: schema unique open-attempt index + 11000 reuse
  await check('33. Concurrent checkout: open-attempt unique index and duplicate-key reuse', async () => {
    const originalPaymentCreate = Payment.create;
    const originalPaymentFindOne = Payment.findOne;
    const originalBookingFindOneAndUpdate = Booking.findOneAndUpdate;
    try {
      const indexes = Payment.schema.indexes();
      const openIdx = indexes.find((entry) => entry[1]?.name === 'uniq_open_checkout_attempt');
      assert.ok(openIdx, 'uniq_open_checkout_attempt index must exist');
      assert.strictEqual(openIdx[1].unique, true);
      assert.strictEqual(openIdx[1].partialFilterExpression.status, 'PENDING');
      assert.strictEqual(openIdx[1].partialFilterExpression.providerReference, '');

      const bookingDoc = {
        _id: '507f191e810c19729de860f9',
        bookingNumber: 'NX-CONC',
        paymentStatus: 'PENDING',
        bookingStatus: 'PAYMENT_PENDING',
        save: async () => { throw new Error('must not call booking.save'); },
      };
      const openAttempt = {
        _id: 'open_pending',
        booking: bookingDoc._id,
        bookingNumber: 'NX-CONC',
        amount: 200,
        currency: 'SAR',
        provider: 'moyasar',
        providerReference: '',
        status: 'PENDING',
      };

      Booking.findOneAndUpdate = async (filter, update) => ({ ...bookingDoc, ...update.$set });
      Payment.create = async () => {
        const err = new Error('E11000 duplicate key');
        err.code = 11000;
        throw err;
      };
      Payment.findOne = (query) => {
        const match =
          query.booking === bookingDoc._id
          && query.status === 'PENDING'
          && (query.providerReference === '' || query.provider === 'moyasar');
        const result = match ? openAttempt : null;
        return {
          sort: async () => result,
          then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
        };
      };

      const recovered = await moyasarPaymentProvider.createPayment({
        booking: bookingDoc,
        amount: 200,
        currency: 'SAR',
      });
      assert.strictEqual(recovered._id, 'open_pending');
      assert.strictEqual(bookingDoc.bookingStatus, 'PAYMENT_PENDING');
    } finally {
      Payment.create = originalPaymentCreate;
      Payment.findOne = originalPaymentFindOne;
      Booking.findOneAndUpdate = originalBookingFindOneAndUpdate;
    }
  });

  // 34. Verify controller response uses slim projection
  await check('34. verifyPayment controller response omits sensitive booking fields', async () => {
    const originalVerify = paymentService.verifyPayment;
    try {
      paymentService.verifyPayment = async () => ({
        payment: {
          _id: 'p1',
          booking: 'b1',
          bookingNumber: 'NX-SLIM',
          amount: 180,
          currency: 'SAR',
          provider: 'moyasar',
          providerReference: 'pay_x',
          status: 'PAID',
        },
        booking: {
          _id: 'b1',
          bookingNumber: 'NX-SLIM',
          serviceType: 'airport_transfer',
          vehicle: { name: 'GMC' },
          paymentStatus: 'PAID',
          bookingStatus: 'CONFIRMED',
          customer: { name: 'Hidden', email: 'h@x.com', mobile: '0555' },
          specialRequests: 'note',
          toPublicJSON() { return this; },
        },
        mappedStatus: 'PAID',
        reused: false,
        duplicateCharge: false,
        manualInterventionRequired: false,
      });
      const res = createMockRes();
      await paymentController.verifyPayment(
        { params: { id: 'pay_x' } },
        res,
        (err) => { if (err) throw err; }
      );
      assert.strictEqual(res.statusCode, 200);
      const booking = res.body?.data?.booking;
      const raw = JSON.stringify(booking);
      assert.strictEqual(booking.bookingNumber, 'NX-SLIM');
      assert.ok(!raw.includes('Hidden'));
      assert.ok(!raw.includes('h@x.com'));
      assert.ok(!raw.includes('note'));
      assert.strictEqual(booking.customer, undefined);
    } finally {
      paymentService.verifyPayment = originalVerify;
    }
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\nResults: ${results.length - failed.length} passed, ${failed.length} failed\n`);
  process.exit(failed.length ? 1 : 0);
}

runAllTests();
