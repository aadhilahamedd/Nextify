const Payment = require('../../models/Payment');
const Booking = require('../../models/Booking');
const { retrievePayment } = require('./moyasarClient');
const { assertMoyasarCredentials, assertWebhookMode, webhookSecretAccepted } = require('./moyasarConfig');
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

async function createPayment({ booking, amount, currency = 'SAR' }) {
  let payment;
  try {
    payment = await Payment.create({
      booking: booking._id,
      bookingNumber: booking.bookingNumber,
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
    if (err.code === 11000) {
      payment = await Payment.findOne({
        booking: booking._id,
        provider: 'moyasar',
        status: 'PENDING',
        providerReference: '',
      }).sort({ createdAt: -1 });
      if (!payment) throw err;
    } else {
      throw err;
    }
  }

  booking.paymentStatus = 'PENDING';
  booking.bookingStatus = 'PAYMENT_PENDING';
  await booking.save();

  return payment;
}

function assertMoyasarOwnership(localPayment, moyasarPayment) {
  const metadata = moyasarPayment?.metadata || {};
  const metaPaymentId = metadata.payment_id != null ? String(metadata.payment_id) : '';
  const metaBookingNumber = metadata.booking_number != null ? String(metadata.booking_number) : '';

  if (!metaPaymentId || !metaBookingNumber) {
    throw httpError(409, 'Moyasar payment metadata is missing payment_id or booking_number');
  }
  if (metaPaymentId !== String(localPayment._id)) {
    throw httpError(409, 'Moyasar payment does not belong to this payment attempt');
  }
  if (metaBookingNumber !== String(localPayment.bookingNumber)) {
    throw httpError(409, 'Moyasar payment does not belong to this booking');
  }

  assertAmountMatch(localPayment, moyasarPayment);

  if (typeof moyasarPayment.live === 'boolean') {
    const expectLive = String(process.env.MOYASAR_ENV || 'test').trim().toLowerCase() === 'live';
    if (moyasarPayment.live !== expectLive) {
      throw httpError(409, 'Moyasar payment environment does not match server MOYASAR_ENV');
    }
  }
}

async function findLocalPayment(moyasarPayment) {
  const metadata = moyasarPayment?.metadata || {};
  const incomingId = moyasarPayment?.id ? String(moyasarPayment.id) : '';

  // 1) Exact Moyasar id already attached to an attempt (preferred).
  if (incomingId) {
    const byRef = await Payment.findOne({ providerReference: incomingId, provider: 'moyasar' });
    if (byRef) return byRef;
  }

  // 2) Server-issued checkout metadata — require both payment_id and booking_number.
  if (metadata.payment_id && metadata.booking_number) {
    const byId = await Payment.findById(metadata.payment_id);
    if (byId) {
      const ref = String(byId.providerReference || '');
      const providerOk = byId.provider === 'moyasar';
      const refOk = !ref || ref === incomingId;
      const bookingMeta = String(metadata.booking_number) === String(byId.bookingNumber);
      if (providerOk && refOk && bookingMeta) {
        return byId;
      }
      console.error('[payments] rejected payment_id metadata match', {
        moyasarId: incomingId || null,
        paymentId: String(metadata.payment_id),
        providerOk,
        refOk,
        bookingMeta,
        bookingNumber: byId.bookingNumber,
      });
    }
  }

  // Do not fall back to booking_number + empty providerReference.
  if (incomingId || metadata.payment_id || metadata.booking_number) {
    console.error('[payments] unmatched Moyasar payment; refusing unsafe booking_number fallback', {
      moyasarId: incomingId || null,
      paymentId: metadata.payment_id || null,
      bookingNumber: metadata.booking_number || null,
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
  const expectedHalalas = toHalalas(localPayment.amount);
  const expectedCurrency = (localPayment.currency || 'SAR').toUpperCase();
  const actualCurrency = String(moyasarPayment.currency || '').toUpperCase();
  const actualAmount = Number(moyasarPayment.amount);

  if (actualCurrency && actualCurrency !== expectedCurrency) {
    throw httpError(409, 'Payment currency mismatch');
  }
  if (Number.isFinite(actualAmount) && actualAmount !== expectedHalalas) {
    throw httpError(409, 'Payment amount mismatch');
  }
}

const DUPLICATE_CHARGE_MESSAGE = 'This booking is already paid. A second successful Moyasar charge was not applied. Refund that extra charge in the Moyasar dashboard.';

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

async function verifyPayment(moyasarPaymentId) {
  assertMoyasarCredentials({ force: true });
  const moyasarPayment = await retrievePayment(moyasarPaymentId);
  const localPayment = await findLocalPayment(moyasarPayment);

  if (!localPayment || localPayment.provider !== 'moyasar') {
    throw httpError(404, 'Payment does not belong to a Nextify booking');
  }

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

  if (decision.action !== 'duplicate_charge') {
    assertAmountMatch(localPayment, moyasarPayment);
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
    let claimed;
    try {
      claimed = await Payment.findOneAndUpdate(
        { _id: localPayment._id, status: { $ne: 'PAID' } },
        {
          $set: {
            status: 'PAID',
            providerReference: incomingId,
            'metadata.moyasarStatus': moyasarPayment.status,
            'metadata.moyasarPaymentId': incomingId,
          },
        },
        { new: true }
      );
    } catch (err) {
      if (err.code === 11000) {
        throw httpError(409, 'This Moyasar payment is already linked to another booking');
      }
      throw err;
    }

    if (!claimed) {
      const current = await Payment.findById(localPayment._id);
      if (current?.status === 'PAID' && current.providerReference === incomingId) {
        return {
          payment: current,
          booking: await Booking.findById(current.booking),
          moyasarStatus: moyasarPayment.status,
          mappedStatus: 'PAID',
          reused: true,
          duplicateCharge: false,
          manualInterventionRequired: false,
        };
      }
      if (current?.status === 'PAID') {
        await rememberDuplicateCharge(current, moyasarPayment);
        return duplicateResult(current, await Booking.findById(current.booking), moyasarPayment);
      }
      throw httpError(409, 'Payment could not be confirmed');
    }

    const confirmed = await Booking.findOneAndUpdate(
      { _id: booking._id, paymentStatus: { $ne: 'PAID' } },
      { $set: { paymentStatus: 'PAID', bookingStatus: 'CONFIRMED' } },
      { new: true }
    );
    const freshBooking = confirmed || await Booking.findById(booking._id);
    if (!confirmed && freshBooking?.paymentStatus === 'PAID') {
      const other = await Payment.findOne({
        booking: booking._id,
        _id: { $ne: claimed._id },
        status: 'PAID',
      });
      if (other && other.providerReference !== incomingId) {
        await Payment.updateOne(
          { _id: claimed._id, providerReference: incomingId, status: 'PAID' },
          { $set: { status: 'PENDING', providerReference: '' } }
        );
        await rememberDuplicateCharge(other, moyasarPayment);
        return duplicateResult(other, freshBooking, moyasarPayment);
      }
    }

    return {
      payment: claimed,
      booking: freshBooking,
      moyasarStatus: moyasarPayment.status,
      mappedStatus: 'PAID',
      reused: false,
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
      { _id: booking._id, paymentStatus: { $ne: 'PAID' } },
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
    const updated = await Payment.findOneAndUpdate(
      { _id: localPayment._id, providerReference: incomingId, status: 'PAID' },
      { $set: { status: 'REFUNDED', 'metadata.moyasarStatus': moyasarPayment.status } },
      { new: true }
    );
    if (updated) {
      await Booking.updateOne(
        { _id: booking._id, paymentStatus: 'PAID' },
        { $set: { paymentStatus: 'REFUNDED' } }
      );
    }
    const current = updated || await Payment.findById(localPayment._id);
    return {
      payment: current,
      booking: await Booking.findById(booking._id),
      moyasarStatus: moyasarPayment.status,
      mappedStatus: current?.status || 'REFUNDED',
      reused: !updated,
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
  if (!webhookSecretAccepted(payload?.secret_token)) {
    throw httpError(401, 'Invalid webhook');
  }
  assertWebhookMode(payload);

  if (payload?.type === 'webhook_verification') {
    const code = payload?.data?.verification_code;
    console.log('[payments] Moyasar webhook verification event accepted. This process does not register the webhook.');
    if (process.env.NODE_ENV !== 'production' && code) {
      console.log('[payments] Moyasar dashboard verification code:', code);
    }
    return { verification: true, mappedStatus: 'IGNORED' };
  }

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

  if (payment.status === 'PAID' && payment.providerReference && payment.providerReference !== moyasarPaymentId) {
    await rememberDuplicateCharge(payment, { id: moyasarPaymentId });
    const err = httpError(409, DUPLICATE_CHARGE_MESSAGE);
    err.manualInterventionRequired = true;
    throw err;
  }

  // Ownership is established only via Moyasar server retrieve + checkout metadata.
  const moyasarPayment = await retrievePayment(moyasarPaymentId);
  if (String(moyasarPayment.id || '') !== String(moyasarPaymentId)) {
    throw httpError(409, 'Moyasar payment id mismatch');
  }
  assertMoyasarOwnership(payment, moyasarPayment);

  // Another local attempt already owns this Moyasar id.
  const existingAttempt = await Payment.findOne({ provider: 'moyasar', providerReference: moyasarPaymentId });
  if (existingAttempt) {
    if (String(existingAttempt._id) === String(payment._id)) return existingAttempt;
    throw httpError(409, 'This Moyasar payment is already linked to another payment attempt');
  }

  // Immutable history: never overwrite a different providerReference on this attempt.
  // Card retry against the same local checkout id creates a new attempt for the same booking.
  if (payment.providerReference && payment.providerReference !== moyasarPaymentId) {
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
          ownedByPaymentId: String(payment._id),
        },
      });
    } catch (err) {
      if (err.code === 11000) {
        const found = await Payment.findOne({ provider: 'moyasar', providerReference: moyasarPaymentId });
        if (found) {
          if (String(found.booking) === String(payment.booking)) return found;
          throw httpError(409, 'This Moyasar payment is already linked to another booking');
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
  toHalalas,
};
