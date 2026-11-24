const mongoose = require('mongoose');
const Payment = require('../../models/Payment');
const Booking = require('../../models/Booking');
const { retrievePayment } = require('./moyasarClient');
const {
  assertMoyasarCredentials,
  assertPaymentMode,
  assertWebhookMode,
  moyasarMode,
  webhookSecretAccepted,
} = require('./moyasarConfig');
const { classifyVerification } = require('./paymentDecision');
const { frontendBaseUrl } = require('../../config/publicUrls');

function toHalalas(amountSar) {
  return Math.round(Number(amountSar) * 100);
}

function publishableKey() {
  assertMoyasarCredentials({ force: true });
  return process.env.MOYASAR_PUBLISHABLE_KEY;
}

function getCheckoutConfig(payment, booking) {
  return {
    provider: 'moyasar',
    publishableKey: publishableKey(),
    amount: payment.amount,
    amountHalalas: toHalalas(payment.amount),
    currency: payment.currency || 'SAR',
    description: `NEXTIFY ${booking.bookingNumber}`,
    callbackUrl: `${frontendBaseUrl()}/payment-result`,
    metadata: {
      booking_number: String(booking.bookingNumber),
      payment_id: String(payment._id),
    },
  };
}

const PROTECTED_RESTORE_STATUSES = new Set(['PAID', 'REFUNDED', 'NOT_REQUIRED']);

async function restoreBookingAfterPaymentCreateFailure(previousBooking) {
  const prevPaymentStatus = previousBooking?.paymentStatus;
  const prevBookingStatus = previousBooking?.bookingStatus;
  if (!prevPaymentStatus || !prevBookingStatus) return;
  if (prevPaymentStatus === 'PENDING' && prevBookingStatus === 'PAYMENT_PENDING') return;
  if (PROTECTED_RESTORE_STATUSES.has(String(prevPaymentStatus).toUpperCase())) return;

  try {
    const openAttempt = await Payment.findOne({
      booking: previousBooking._id,
      provider: 'moyasar',
      status: 'PENDING',
    });
    if (openAttempt) return;

    await Booking.updateOne(
      {
        _id: previousBooking._id,
        paymentStatus: 'PENDING',
        bookingStatus: 'PAYMENT_PENDING',
      },
      {
        $set: {
          paymentStatus: prevPaymentStatus,
          bookingStatus: prevBookingStatus,
        },
      }
    );
  } catch (recoveryErr) {
    console.error('[payments] failed to restore booking status after Payment.create error', {
      bookingId: String(previousBooking._id),
      errorCode: recoveryErr?.code || null,
      errorName: recoveryErr?.name || 'Error',
    });
  }
}

async function createPayment({ booking, amount, currency = 'SAR' }) {
  const previousBooking = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      customQuoteRequired: { $ne: true },
      paymentStatus: { $nin: ['PAID', 'paid', 'REFUNDED', 'refunded', 'NOT_REQUIRED', 'not_required'] },
      'pricing.breakdown.quoteStatus': { $nin: ['rate_on_request', 'long_distance'] },
      $or: [
        { bookingStatus: { $nin: ['CANCELLED', 'cancelled'] } },
        { paymentStatus: { $in: ['FAILED', 'failed'] } },
      ],
    },
    {
      $set: {
        paymentStatus: 'PENDING',
        bookingStatus: 'PAYMENT_PENDING',
      },
    },
    { new: false }
  );
  if (!previousBooking) {
    const latest = await Booking.findById(booking._id);
    const latestStatus = String(latest?.paymentStatus || '').toUpperCase();
    if (latestStatus === 'PAID') {
      throw httpError(409, 'Booking already paid');
    }
    if (latestStatus === 'REFUNDED') {
      throw httpError(409, 'Booking has been refunded and is not eligible for checkout');
    }
    throw httpError(409, 'This booking is not eligible for checkout');
  }

  let payment;
  try {
    payment = await Payment.create({
      booking: previousBooking._id,
      bookingNumber: previousBooking.bookingNumber,
      amount,
      currency,
      provider: 'moyasar',
      status: 'PENDING',
      providerReference: '',
      metadata: {
        amountHalalas: toHalalas(amount),
        env: process.env.MOYASAR_ENV || 'test',
      },
    });
  } catch (err) {
    // Concurrent checkout: reuse the single open empty-ref PENDING attempt.
    if (err?.code === 11000) {
      payment = await Payment.findOne({
        booking: previousBooking._id,
        provider: 'moyasar',
        status: 'PENDING',
        providerReference: '',
      }).sort({ createdAt: -1 });
      if (!payment) throw err;
    } else {
      await restoreBookingAfterPaymentCreateFailure(previousBooking);
      throw err;
    }
  }

  return payment;
}

function getCanonicalOwnerId(localPayment) {
  if (!localPayment) return '';
  if (localPayment.metadata?.ownedByPaymentId) {
    return String(localPayment.metadata.ownedByPaymentId);
  }
  return localPayment._id != null ? String(localPayment._id) : '';
}

function assertMoyasarOwnership(localPayment, moyasarPayment) {
  const metadata = moyasarPayment?.metadata || {};
  const metaPaymentId = metadata.payment_id != null ? String(metadata.payment_id) : '';
  const metaBookingNumber = metadata.booking_number != null ? String(metadata.booking_number) : '';

  if (!metaPaymentId || !metaBookingNumber) {
    throw httpError(409, 'Moyasar payment metadata is missing payment_id or booking_number');
  }
  const canonicalOwnerId = getCanonicalOwnerId(localPayment);
  const directId = localPayment?._id != null ? String(localPayment._id) : '';
  if (metaPaymentId !== directId && metaPaymentId !== canonicalOwnerId) {
    throw httpError(409, 'Moyasar payment does not belong to this payment attempt');
  }
  if (metaBookingNumber !== String(localPayment.bookingNumber)) {
    throw httpError(409, 'Moyasar payment does not belong to this booking');
  }

  assertAmountMatch(localPayment, moyasarPayment);
  assertPaymentMode(moyasarPayment);
  const expectedMode = moyasarMode();
  const localEnv = String(localPayment?.metadata?.env || '').trim().toLowerCase();
  if (!localEnv || (localEnv !== 'test' && localEnv !== 'live')) {
    throw httpError(409, 'Local payment environment metadata is missing or invalid');
  }
  if (localEnv !== expectedMode) {
    throw httpError(409, 'Local payment environment does not match server MOYASAR_ENV');
  }
}

async function findLocalPayment(moyasarPayment) {
  const metadata = moyasarPayment?.metadata || {};
  const incomingId = moyasarPayment?.id ? String(moyasarPayment.id) : '';
  let byRef = null;
  let byId = null;
  let rejectedMetadataMatch = null;

  // 1) Exact Moyasar id already attached to an attempt (preferred).
  if (incomingId) {
    byRef = await Payment.findOne({ providerReference: incomingId, provider: 'moyasar' });
    if (byRef) return byRef;
  }

  // 2) Server-issued checkout metadata — require both payment_id and booking_number.
  if (metadata.payment_id && metadata.booking_number) {
    byId = await Payment.findById(metadata.payment_id);
    if (byId) {
      const ref = String(byId.providerReference || '');
      const providerOk = byId.provider === 'moyasar';
      const refOk = !ref || ref === incomingId;
      const bookingMeta = String(metadata.booking_number) === String(byId.bookingNumber);
      if (providerOk && refOk && bookingMeta) return byId;
      rejectedMetadataMatch = {
        providerOk,
        refOk,
        bookingMeta,
        localProvider: byId.provider || null,
        localReferencePresent: Boolean(ref),
        localBookingNumberMatches: bookingMeta,
      };
    }
  }

  // Temporary, PII-free diagnostics for staging webhook investigation.
  // Never log webhook secrets, customer details, or the raw Moyasar payload.
  if (incomingId || metadata.payment_id || metadata.booking_number) {
    console.error('[payments][payment-lookup-diagnostic] local payment lookup miss', {
      incomingMoyasarId: incomingId || null,
      metadataPaymentIdPresent: Boolean(metadata.payment_id),
      metadataBookingNumberPresent: Boolean(metadata.booking_number),
      providerReferenceLookupFound: Boolean(byRef),
      metadataIdLookupFound: Boolean(byId),
      rejectedMetadataMatch,
      modelDatabase: Payment.db?.name || null,
      modelCollection: Payment.collection?.name || null,
      modelConnectionState: Payment.db?.readyState ?? null,
      defaultConnectionDatabase: mongoose.connection?.name || null,
      defaultConnectionState: mongoose.connection?.readyState ?? null,
    });
  }
  return null;
}

function mapMoyasarStatus(status) {
  switch (String(status || '').toLowerCase()) {
    case 'paid':
    case 'captured':
      return 'PAID';
    case 'failed':
      return 'FAILED';
    case 'refunded':
      return 'REFUNDED';
    case 'voided':
    case 'abandoned':
      return 'CANCELLED';
    default:
      return 'PENDING';
  }
}

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function assertAmountMatch(localPayment, moyasarPayment) {
  const localAmount = Number(localPayment?.amount);
  if (!Number.isFinite(localAmount) || localAmount <= 0) {
    throw httpError(409, 'Local payment amount is invalid');
  }
  const expectedHalalas = Math.round(localAmount * 100);
  if (!Number.isSafeInteger(expectedHalalas) || expectedHalalas <= 0) {
    throw httpError(409, 'Local payment amount is invalid');
  }
  // Must be whole halalas (≤2 decimal places). Tolerance absorbs IEEE754 noise for values like 250.01.
  if (Math.abs(localAmount * 100 - expectedHalalas) > 1e-6) {
    throw httpError(409, 'Local payment amount is invalid');
  }

  const expectedCurrency = String(localPayment?.currency || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(expectedCurrency)) {
    throw httpError(409, 'Local payment currency is invalid');
  }

  if (moyasarPayment?.amount == null || moyasarPayment.amount === '') {
    throw httpError(409, 'Moyasar payment amount is missing');
  }
  const actualAmount = Number(moyasarPayment.amount);
  if (!Number.isFinite(actualAmount) || !Number.isSafeInteger(actualAmount) || actualAmount <= 0) {
    throw httpError(409, 'Moyasar payment amount is invalid');
  }

  const actualCurrencyRaw = moyasarPayment?.currency;
  if (actualCurrencyRaw == null || String(actualCurrencyRaw).trim() === '') {
    throw httpError(409, 'Moyasar payment currency is missing');
  }
  const actualCurrency = String(actualCurrencyRaw).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(actualCurrency)) {
    throw httpError(409, 'Moyasar payment currency is invalid');
  }

  if (actualCurrency !== expectedCurrency) {
    throw httpError(409, 'Payment currency mismatch');
  }
  if (actualAmount !== expectedHalalas) {
    throw httpError(409, 'Payment amount mismatch');
  }
}

const DUPLICATE_CHARGE_MESSAGE = 'This booking is already paid. A second successful Moyasar charge was not applied. Refund that extra charge in the Moyasar dashboard.';
const REFUNDED_BOOKING_CHARGE_MESSAGE = 'This booking was already refunded. A later Moyasar charge was not applied and requires manual review or refund in the Moyasar dashboard.';

let allowOfflineUnitTestNoSession = false;

function _setAllowOfflineUnitTestTransactions(enabled) {
  allowOfflineUnitTestNoSession = Boolean(enabled);
}

async function recordChargeOnRefundedBooking(localPayment, moyasarPayment) {
  const extraId = String(moyasarPayment?.id || '');
  const update = {
    $set: {
      'metadata.moyasarStatus': moyasarPayment?.status,
      'metadata.manualInterventionRequired': true,
      'metadata.manualIntervention': 'refund_charge_on_refunded_booking',
    },
  };
  if (extraId) {
    update.$addToSet = { 'metadata.lateChargeOnRefundedBookingIds': extraId };
    update.$set['metadata.moyasarPaymentId'] = extraId;
    if (!localPayment.providerReference) {
      update.$set.providerReference = extraId;
    }
  }
  await Payment.updateOne(
    { _id: localPayment._id, status: { $ne: 'PAID' } },
    update
  );
  console.error('[payments] Moyasar charge received for an already-refunded booking', {
    bookingNumber: localPayment.bookingNumber,
    paymentId: String(localPayment._id),
    moyasarPaymentId: extraId || null,
  });
}

async function rememberDuplicateCharge(localPayment, moyasarPayment) {
  const extraId = String(moyasarPayment.id || '');
  if (!extraId) return;
  await Payment.updateOne(
    { _id: localPayment._id },
    {
      $addToSet: { 'metadata.duplicateChargeIds': extraId },
      $set: {
        'metadata.manualInterventionRequired': true,
        'metadata.manualIntervention': 'refund_extra_moyasar_charge',
      },
    }
  );
  console.error('[payments] extra Moyasar charge needs a manual refund', {
    bookingNumber: localPayment.bookingNumber,
    keptReference: localPayment.providerReference || null,
    extraPaymentId: extraId,
  });
}

function duplicateResult(localPayment, booking, moyasarPayment) {
  return {
    payment: localPayment,
    booking,
    moyasarStatus: moyasarPayment?.status,
    mappedStatus: 'PAID',
    reused: true,
    duplicateCharge: true,
    manualInterventionRequired: true,
    message: DUPLICATE_CHARGE_MESSAGE,
  };
}

async function bookingAlreadyPaidByOther(localPayment, incomingId) {
  const other = await Payment.findOne({
    booking: localPayment.booking,
    provider: 'moyasar',
    status: 'PAID',
    _id: { $ne: localPayment._id },
    providerReference: { $nin: [incomingId, '', null] },
  });
  return other;
}

function isTransactionUnsupportedError(err) {
  const msg = String(err?.message || '');
  return (
    err?.code === 20
    || err?.codeName === 'IllegalOperation'
    || /Transaction numbers are only allowed on a replica set/i.test(msg)
  );
}

/**
 * Runs critical Payment+Booking reconciliation inside a MongoDB transaction.
 * Fails closed with HTTP 503 whenever MongoDB is disconnected or transactions are unsupported,
 * in BOTH production and non-production servers. A no-session path is permitted ONLY when
 * explicitly opted in by offline unit tests outside production.
 */
async function runPaymentTransaction(work) {
  const isProd = process.env.NODE_ENV === 'production';
  const isConnected = mongoose.connection?.readyState === 1;
  const hasCustomStartSession =
    typeof mongoose.startSession === 'function'
    && mongoose.startSession._isTestMock === true;

  if (!isConnected && !hasCustomStartSession) {
    if (!isProd && allowOfflineUnitTestNoSession === true) {
      return work(null);
    }
    throw httpError(503, 'Database transactions are required for payment reconciliation');
  }

  let session;
  try {
    session = await mongoose.startSession();
  } catch (err) {
    throw httpError(503, 'Database transactions are required for payment reconciliation');
  }

  try {
    let outcome;
    await session.withTransaction(async () => {
      outcome = await work(session);
    });
    return outcome;
  } catch (err) {
    if (isTransactionUnsupportedError(err)) {
      throw httpError(503, 'MongoDB replica set transactions are required for payment reconciliation');
    }
    throw err;
  } finally {
    if (session && typeof session.endSession === 'function') {
      try {
        await session.endSession();
      } catch {
        // Ignore endSession cleanup errors so the primary result/error is preserved.
      }
    }
  }
}

function withSession(session, extra = {}) {
  return session ? { ...extra, session } : extra;
}

async function reconcilePaidBooking(bookingId, session = null) {
  const confirmed = await Booking.findOneAndUpdate(
    { _id: bookingId, paymentStatus: { $nin: ['PAID', 'REFUNDED'] } },
    {
      $set: {
        paymentStatus: 'PAID',
        bookingStatus: 'CONFIRMED',
        checkoutTokenHash: '',
        checkoutTokenExpiresAt: null,
      },
    },
    withSession(session, { new: true })
  );
  return confirmed || Booking.findById(bookingId, null, withSession(session));
}

async function verifyPayment(moyasarPaymentId) {
  assertMoyasarCredentials({ force: true });
  const moyasarPayment = await retrievePayment(moyasarPaymentId);
  if (moyasarPayment?.id != null && String(moyasarPayment.id) !== String(moyasarPaymentId)) {
    throw httpError(409, 'Moyasar payment id mismatch');
  }

  // Enforce TEST/LIVE mode before any local Payment or Booking lookup or state change.
  assertPaymentMode(moyasarPayment);

  const localPayment = await findLocalPayment(moyasarPayment);

  if (!localPayment || localPayment.provider !== 'moyasar') {
    throw httpError(404, 'Payment does not belong to a Nextify booking');
  }

  // Enforce full ownership (metadata payment_id & booking_number, amount, currency, TEST/LIVE mode)
  // even when matched by providerReference, before any Booking lookup or state change.
  assertMoyasarOwnership(localPayment, moyasarPayment);

  const booking = await Booking.findById(localPayment.booking);
  if (!booking) throw httpError(404, 'Booking not found for payment');

  const incomingId = String(moyasarPayment.id || moyasarPaymentId);
  const mapped = mapMoyasarStatus(moyasarPayment.status);
  const paidOther = await bookingAlreadyPaidByOther(localPayment, incomingId);
  const decision = classifyVerification({
    localStatus: localPayment.status,
    localReference: localPayment.providerReference || '',
    incomingId,
    mappedStatus: mapped,
    bookingAlreadyPaid: booking.paymentStatus === 'PAID' || Boolean(paidOther),
  });

  console.log('[payments] Moyasar verification', {
    moyasarId: incomingId,
    status: moyasarPayment.status,
    bookingNumber: localPayment.bookingNumber,
    action: decision.action,
  });

  if (decision.action === 'duplicate_charge') {
    await rememberDuplicateCharge(paidOther || localPayment, moyasarPayment);
    const freshBooking = await Booking.findById(localPayment.booking);
    return duplicateResult(paidOther || localPayment, freshBooking, moyasarPayment);
  }

  if (decision.action === 'idempotent_paid' || decision.action === 'ignore_unpay') {
    if (decision.action === 'ignore_unpay' && localPayment.status !== 'PAID') {
      await Payment.updateOne(
        { _id: localPayment._id, status: { $ne: 'PAID' } },
        {
          $set: {
            status: mapped === 'FAILED' ? 'FAILED' : (mapped === 'CANCELLED' ? 'CANCELLED' : localPayment.status),
            'metadata.moyasarStatus': moyasarPayment.status,
            'metadata.moyasarPaymentId': incomingId,
          },
        }
      );
      const freshBooking = await Booking.findById(localPayment.booking);
      const staysPaid = localPayment.status === 'PAID' || freshBooking?.paymentStatus === 'PAID';
      return {
        payment: await Payment.findById(localPayment._id),
        booking: freshBooking,
        moyasarStatus: moyasarPayment.status,
        mappedStatus: staysPaid ? 'PAID' : mapped,
        reused: true,
        duplicateCharge: false,
        manualInterventionRequired: false,
      };
    }

    if (decision.action === 'idempotent_paid') {
      const txResult = await runPaymentTransaction(async (session) => {
        const sOpt = withSession(session);
        const curPayment = await Payment.findById(localPayment._id, null, sOpt);
        const curBooking = await Booking.findById(localPayment.booking, null, sOpt);
        let freshBooking = curBooking;
        if (
          curPayment?.status === 'PAID'
          && curPayment.providerReference === incomingId
          && curBooking?.paymentStatus !== 'PAID'
          && curBooking?.paymentStatus !== 'REFUNDED'
        ) {
          freshBooking = await reconcilePaidBooking(curBooking._id, session);
        }
        return { payment: curPayment, booking: freshBooking };
      });
      const staysPaid = txResult.payment?.status === 'PAID' || txResult.booking?.paymentStatus === 'PAID';
      return {
        payment: txResult.payment,
        booking: txResult.booking,
        moyasarStatus: moyasarPayment.status,
        mappedStatus: staysPaid ? 'PAID' : mapped,
        reused: true,
        duplicateCharge: false,
        manualInterventionRequired: false,
      };
    }

    const freshBooking = await Booking.findById(localPayment.booking);
    const staysPaid = localPayment.status === 'PAID' || freshBooking?.paymentStatus === 'PAID';
    return {
      payment: await Payment.findById(localPayment._id),
      booking: freshBooking,
      moyasarStatus: moyasarPayment.status,
      mappedStatus: staysPaid ? 'PAID' : mapped,
      reused: true,
      duplicateCharge: false,
      manualInterventionRequired: false,
    };
  }

  if (decision.action === 'idempotent_failed' || decision.action === 'idempotent_cancelled') {
    if (
      !paidOther
      && booking.paymentStatus !== 'PAID'
      && booking.paymentStatus !== 'REFUNDED'
      && booking.paymentStatus !== 'FAILED'
    ) {
      // Repair booking if a previous DB failure left Payment FAILED/CANCELLED while Booking stayed PENDING.
      await Booking.updateOne(
        { _id: booking._id, paymentStatus: { $nin: ['PAID', 'REFUNDED'] } },
        {
          $set: {
            paymentStatus: 'FAILED',
            bookingStatus: 'CANCELLED',
          },
        }
      );
    }
    const freshBooking = await Booking.findById(localPayment.booking);
    return {
      payment: localPayment,
      booking: freshBooking,
      moyasarStatus: moyasarPayment.status,
      mappedStatus: localPayment.status,
      reused: true,
      duplicateCharge: false,
      manualInterventionRequired: false,
    };
  }

  if (decision.action === 'mark_paid') {
    let txResult;
    try {
      txResult = await runPaymentTransaction(async (session) => {
        const sOpt = withSession(session);
        // Re-read fresh state inside the transaction so retries never act on stale data.
        const curPayment = await Payment.findById(localPayment._id, null, sOpt);
        const curBooking = await Booking.findById(localPayment.booking, null, sOpt);
        if (!curPayment || !curBooking) {
          throw httpError(404, 'Payment or booking not found during confirmation');
        }

        // Never mark a Payment PAID or confirm a Booking that has already been REFUNDED.
        if (String(curBooking.paymentStatus || '').toUpperCase() === 'REFUNDED') {
          return {
            kind: 'paid_after_refund',
            payment: curPayment,
            booking: curBooking,
          };
        }

        const otherPaid = await Payment.findOne(
          {
            booking: curBooking._id,
            provider: 'moyasar',
            status: 'PAID',
            _id: { $ne: curPayment._id },
            providerReference: { $nin: [incomingId, '', null] },
          },
          null,
          sOpt
        );

        const freshDecision = classifyVerification({
          localStatus: curPayment.status,
          localReference: curPayment.providerReference || '',
          incomingId,
          mappedStatus: mapped,
          bookingAlreadyPaid: curBooking.paymentStatus === 'PAID' || Boolean(otherPaid),
        });

        if (freshDecision.action === 'duplicate_charge') {
          return {
            kind: 'duplicate_charge',
            duplicateTarget: otherPaid || curPayment,
            booking: curBooking,
          };
        }

        if (freshDecision.action === 'idempotent_paid') {
          const reconciledBooking = curBooking.paymentStatus !== 'PAID' && curBooking.paymentStatus !== 'REFUNDED'
            ? await reconcilePaidBooking(curBooking._id, session)
            : curBooking;
          return {
            kind: 'idempotent_paid',
            payment: curPayment,
            booking: reconciledBooking,
          };
        }

        const claimed = await Payment.findOneAndUpdate(
          { _id: curPayment._id, status: { $ne: 'PAID' } },
          {
            $set: {
              status: 'PAID',
              providerReference: incomingId,
              'metadata.moyasarStatus': moyasarPayment.status,
              'metadata.moyasarPaymentId': incomingId,
            },
          },
          withSession(session, { new: true })
        );

        if (!claimed) {
          const current = await Payment.findById(curPayment._id, null, sOpt);
          if (current?.status === 'PAID' && current.providerReference === incomingId) {
            const reconciledBooking = curBooking.paymentStatus !== 'PAID' && curBooking.paymentStatus !== 'REFUNDED'
              ? await reconcilePaidBooking(current.booking, session)
              : curBooking;
            return { kind: 'idempotent_paid', payment: current, booking: reconciledBooking };
          }
          if (current?.status === 'PAID') {
            return { kind: 'duplicate_charge', duplicateTarget: current, booking: curBooking };
          }
          throw httpError(409, 'Payment could not be confirmed');
        }

        // Write to the shared Booking document inside the same transaction so concurrent
        // mark_paid and mark_refunded operations serialize via MongoDB write conflicts.
        const confirmed = await Booking.findOneAndUpdate(
          { _id: curBooking._id, paymentStatus: { $nin: ['PAID', 'REFUNDED'] } },
          {
            $set: {
              paymentStatus: 'PAID',
              bookingStatus: 'CONFIRMED',
              checkoutTokenHash: '',
              checkoutTokenExpiresAt: null,
            },
          },
          withSession(session, { new: true })
        );
        const freshBooking = confirmed || await Booking.findById(curBooking._id, null, sOpt);
        if (!confirmed && freshBooking?.paymentStatus === 'PAID') {
          const other = await Payment.findOne(
            {
              booking: curBooking._id,
              _id: { $ne: claimed._id },
              status: 'PAID',
            },
            null,
            sOpt
          );
          if (other && other.providerReference !== incomingId) {
            await Payment.updateOne(
              { _id: claimed._id, providerReference: incomingId, status: 'PAID' },
              { $set: { status: 'PENDING', providerReference: '' } },
              sOpt
            );
            return { kind: 'duplicate_charge', duplicateTarget: other, booking: freshBooking };
          }
        }

        return { kind: 'marked_paid', payment: claimed, booking: freshBooking };
      });
    } catch (err) {
      if (err.code === 11000) {
        throw httpError(409, 'This Moyasar payment is already linked to another booking');
      }
      throw err;
    }

    if (txResult.kind === 'paid_after_refund') {
      await recordChargeOnRefundedBooking(txResult.payment, moyasarPayment);
      return {
        payment: (await Payment.findById(txResult.payment._id)) || txResult.payment,
        booking: txResult.booking,
        moyasarStatus: moyasarPayment.status,
        mappedStatus: 'REFUNDED',
        reused: true,
        duplicateCharge: false,
        paidAfterRefund: true,
        manualInterventionRequired: true,
        message: REFUNDED_BOOKING_CHARGE_MESSAGE,
      };
    }

    if (txResult.kind === 'duplicate_charge') {
      await rememberDuplicateCharge(txResult.duplicateTarget, moyasarPayment);
      return duplicateResult(txResult.duplicateTarget, txResult.booking, moyasarPayment);
    }

    return {
      payment: txResult.payment,
      booking: txResult.booking,
      moyasarStatus: moyasarPayment.status,
      mappedStatus: 'PAID',
      reused: txResult.kind === 'idempotent_paid',
      duplicateCharge: false,
      manualInterventionRequired: false,
    };
  }

  if (decision.action === 'mark_failed' || decision.action === 'mark_cancelled') {
    const nextStatus = decision.action === 'mark_failed' ? 'FAILED' : 'CANCELLED';
    const updated = await Payment.findOneAndUpdate(
      { _id: localPayment._id, status: { $nin: ['PAID', 'REFUNDED'] } },
      {
        $set: {
          status: nextStatus,
          providerReference: localPayment.providerReference || incomingId,
          'metadata.moyasarStatus': moyasarPayment.status,
          'metadata.moyasarPaymentId': incomingId,
        },
      },
      { new: true }
    );
    if (!updated) {
      const current = await Payment.findById(localPayment._id);
      return {
        payment: current,
        booking: await Booking.findById(localPayment.booking),
        moyasarStatus: moyasarPayment.status,
        mappedStatus: current?.status === 'PAID' ? 'PAID' : nextStatus,
        reused: true,
      };
    }
    await Booking.updateOne(
      { _id: booking._id, paymentStatus: { $nin: ['PAID', 'REFUNDED'] } },
      {
        $set: {
          paymentStatus: 'FAILED',
          bookingStatus: 'CANCELLED',
        },
      }
    );
    return {
      payment: updated,
      booking: await Booking.findById(booking._id),
      moyasarStatus: moyasarPayment.status,
      mappedStatus: nextStatus,
      reused: false,
    };
  }

  if (decision.action === 'mark_refunded') {
    const txResult = await runPaymentTransaction(async (session) => {
      const sOpt = withSession(session);
      const updated = await Payment.findOneAndUpdate(
        { _id: localPayment._id, providerReference: incomingId, status: 'PAID' },
        { $set: { status: 'REFUNDED', 'metadata.moyasarStatus': moyasarPayment.status } },
        withSession(session, { new: true })
      );
      const current = updated || await Payment.findById(localPayment._id, null, sOpt);
      if (updated || (current?.status === 'REFUNDED' && current.providerReference === incomingId)) {
        // Re-check competing PAID payments and update the shared Booking inside the same transaction.
        const stillFundedByOther = await Payment.findOne(
          {
            booking: booking._id,
            status: 'PAID',
            _id: { $ne: localPayment._id },
          },
          null,
          sOpt
        );
        if (!stillFundedByOther) {
          await Booking.updateOne(
            { _id: booking._id, paymentStatus: 'PAID' },
            { $set: { paymentStatus: 'REFUNDED' } },
            sOpt
          );
        } else {
          // Touch Booking inside the transaction so concurrent mark_paid/mark_refunded serialize on Booking.
          await Booking.updateOne(
            { _id: booking._id, paymentStatus: 'PAID' },
            { $set: { paymentStatus: 'PAID' } },
            sOpt
          );
        }
      }
      const freshBooking = await Booking.findById(booking._id, null, sOpt);
      return { payment: current, booking: freshBooking, reused: !updated };
    });

    return {
      payment: txResult.payment,
      booking: txResult.booking,
      moyasarStatus: moyasarPayment.status,
      mappedStatus: txResult.payment?.status || 'REFUNDED',
      reused: txResult.reused,
    };
  }

  await Payment.updateOne(
    { _id: localPayment._id, status: { $ne: 'PAID' } },
    { $set: { 'metadata.moyasarStatus': moyasarPayment.status, 'metadata.moyasarPaymentId': incomingId } }
  );
  return {
    payment: await Payment.findById(localPayment._id),
    booking,
    moyasarStatus: moyasarPayment.status,
    mappedStatus: mapped,
    reused: false,
  };
}

async function handleWebhook(payload) {
  if (!webhookSecretAccepted(payload?.secret_token, payload?.live)) {
    throw httpError(401, 'Invalid webhook');
  }

  if (payload?.type === 'webhook_verification') {
    const rawCode = payload?.data?.verification_code;
    const code = typeof rawCode === 'string' || typeof rawCode === 'number'
      ? String(rawCode).trim()
      : '';
    console.log('[payments] Moyasar webhook verification event accepted. This process does not register the webhook.');
    if (
      process.env.MOYASAR_LOG_WEBHOOK_VERIFICATION_CODE === 'true'
      && /^\d{6}$/.test(code)
    ) {
      console.log('[payments] Moyasar dashboard verification code:', code);
    }
    return { verification: true, mappedStatus: 'IGNORED' };
  }

  assertWebhookMode(payload);

  if (payload?.type && !String(payload.type).startsWith('payment_')) {
    console.log('[payments] Moyasar webhook ignored', { type: payload.type });
    return { ignored: true, mappedStatus: 'IGNORED' };
  }

  const moyasarId = payload?.data?.id;
  if (!moyasarId) throw httpError(400, 'Webhook payment id is missing');
  return verifyPayment(moyasarId);
}

async function attachReference(localPaymentId, moyasarPaymentId) {
  assertMoyasarCredentials({ force: true });
  const payment = await Payment.findById(localPaymentId);
  if (!payment) throw httpError(404, 'Payment not found');
  if (payment.provider !== 'moyasar') throw httpError(400, 'Not a Moyasar payment');

  // Idempotent: same Moyasar id already on this attempt.
  if (payment.providerReference === moyasarPaymentId) return payment;

  // Ownership, mode, amount and currency are established ONLY via Moyasar server retrieve.
  const moyasarPayment = await retrievePayment(moyasarPaymentId);
  if (String(moyasarPayment?.id || '') !== String(moyasarPaymentId)) {
    throw httpError(409, 'Moyasar payment id mismatch');
  }
  assertMoyasarOwnership(payment, moyasarPayment);

  if (payment.status === 'PAID' && payment.providerReference && payment.providerReference !== moyasarPaymentId) {
    if (mapMoyasarStatus(moyasarPayment.status) === 'PAID') {
      await rememberDuplicateCharge(payment, moyasarPayment);
      const err = httpError(409, DUPLICATE_CHARGE_MESSAGE);
      err.manualInterventionRequired = true;
      throw err;
    }
    throw httpError(409, 'This booking is already paid');
  }

  // Another local attempt already owns this Moyasar id.
  const existingAttempt = await Payment.findOne({ provider: 'moyasar', providerReference: moyasarPaymentId });
  if (existingAttempt) {
    if (String(existingAttempt._id) === String(payment._id)) return existingAttempt;
    throw httpError(409, 'This Moyasar payment is already linked to another payment attempt');
  }

  // Immutable history: never overwrite a different providerReference on this attempt.
  // Card retry against the same local checkout id creates a new attempt for the same booking
  // while preserving the canonical root owner across multi-hop retries (P0 -> P1 -> P2 -> P3).
  if (payment.providerReference && payment.providerReference !== moyasarPaymentId) {
    const rootOwnerId = getCanonicalOwnerId(payment);
    try {
      return await Payment.create({
        booking: payment.booking,
        bookingNumber: payment.bookingNumber,
        amount: payment.amount,
        currency: payment.currency,
        provider: 'moyasar',
        providerReference: moyasarPaymentId,
        status: 'PENDING',
        metadata: {
          ...(payment.metadata || {}),
          moyasarPaymentId,
          retryOf: payment._id,
          ownedByPaymentId: rootOwnerId,
        },
      });
    } catch (err) {
      if (err.code === 11000) {
        const found = await Payment.findOne({ provider: 'moyasar', providerReference: moyasarPaymentId });
        if (found) {
          const sameProvider = found.provider === 'moyasar';
          const sameBookingId = String(found.booking) === String(payment.booking);
          const sameBookingNumber = String(found.bookingNumber) === String(payment.bookingNumber);
          const sameOwnerChain = getCanonicalOwnerId(found) === rootOwnerId;
          if (sameProvider && sameBookingId && sameBookingNumber && sameOwnerChain) {
            assertMoyasarOwnership(found, moyasarPayment);
            return found;
          }
          throw httpError(409, 'This Moyasar payment is already linked to another payment attempt');
        }
        throw httpError(409, 'Could not create a new payment attempt for this Moyasar id');
      }
      throw err;
    }
  }

  try {
    const updated = await Payment.findOneAndUpdate(
      {
        _id: payment._id,
        status: { $ne: 'PAID' },
        $or: [
          { providerReference: { $in: ['', null] } },
          { providerReference: { $exists: false } },
          { providerReference: moyasarPaymentId },
        ],
      },
      { $set: { providerReference: moyasarPaymentId, 'metadata.moyasarPaymentId': moyasarPaymentId } },
      { new: true }
    );
    if (!updated) {
      const current = await Payment.findById(payment._id);
      if (current?.providerReference === moyasarPaymentId) return current;
      if (current?.status === 'PAID') {
        if (mapMoyasarStatus(moyasarPayment.status) === 'PAID') {
          await rememberDuplicateCharge(current, moyasarPayment);
          const err = httpError(409, DUPLICATE_CHARGE_MESSAGE);
          err.manualInterventionRequired = true;
          throw err;
        }
        throw httpError(409, 'This booking is already paid');
      }
      throw httpError(409, 'Payment reference is already set');
    }
    return updated;
  } catch (err) {
    if (err.code === 11000) {
      throw httpError(409, 'This Moyasar payment is already linked to another booking');
    }
    throw err;
  }
}

module.exports = {
  createPayment,
  retrievePayment,
  verifyPayment,
  handleWebhook,
  getCheckoutConfig,
  attachReference,
  findLocalPayment,
  assertMoyasarOwnership,
  assertAmountMatch,
  toHalalas,
  _setAllowOfflineUnitTestTransactions,
};
