/**
 * One-time SAFE cleanup for three known duplicate open Moyasar checkout attempts.
 *
 * Default: DRY RUN (no writes).
 * Apply:   node scripts/cleanupDuplicateOpenCheckouts.js --apply
 *
 * Does not delete records. Does not modify bookings or kept payments.
 * Never prints MongoDB URI or credentials. Refuses LIVE / production apply.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');

/** Fixed allowlist — do not expand without a new review. */
const GROUPS = [
  {
    bookingId: '6ab0d695c5059eeaf467a904',
    keepPaymentId: '6ab0d695c5059eeaf467a905',
    cancelPaymentId: '6ab0d695c5059eeaf467a906',
  },
  {
    bookingId: '6adcdfb97e3666ce668a7927',
    keepPaymentId: '6adcdfb97e3666ce668a7928',
    cancelPaymentId: '6adcdfb97e3666ce668a7929',
  },
  {
    bookingId: '6ade056de653ad5f7ceb9028',
    keepPaymentId: '6ade056de653ad5f7ceb9029',
    cancelPaymentId: '6ade056de653ad5f7ceb902a',
  },
];

const CLEANUP_REASON =
  'one_time_duplicate_open_checkout_cleanup_keep_oldest_empty_ref_pending';

function assertTestEnvironment(uri) {
  const moyasarEnv = String(process.env.MOYASAR_ENV || 'test').trim().toLowerCase();
  const nodeEnv = String(process.env.NODE_ENV || '').trim().toLowerCase();
  const provider = String(process.env.PAYMENT_PROVIDER || '').trim().toLowerCase();
  const u = String(uri || '').toLowerCase();

  const liveSignals = [];
  if (moyasarEnv === 'live') liveSignals.push('MOYASAR_ENV=live');
  if (nodeEnv === 'production' && APPLY) {
    // Allow dry-run inspection anywhere; block apply when NODE_ENV=production.
    liveSignals.push('NODE_ENV=production');
  }
  if ((process.env.MOYASAR_SECRET_KEY || '').startsWith('sk_live_')) {
    liveSignals.push('MOYASAR_SECRET_KEY uses live prefix');
  }
  if ((process.env.MOYASAR_PUBLISHABLE_KEY || '').startsWith('pk_live_')) {
    liveSignals.push('MOYASAR_PUBLISHABLE_KEY uses live prefix');
  }

  if (APPLY && liveSignals.length) {
    throw new Error(
      `Apply mode refused: environment looks LIVE/production (${liveSignals.join('; ')}). `
        + 'This cleanup is TEST-only.'
    );
  }

  if (APPLY && moyasarEnv !== 'test') {
    throw new Error(`Apply mode refused: MOYASAR_ENV must be test (got "${moyasarEnv || '(empty)'}").`);
  }

  // Shared TEST DB used by this project is remote + MOYASAR_ENV=test (not localhost).
  const isLocalHost = /localhost|127\.0\.0\.1/.test(u);
  const envLabel = isLocalHost
    ? 'local development MongoDB'
    : (moyasarEnv === 'test' ? 'shared TEST MongoDB (remote, MOYASAR_ENV=test)' : `MongoDB with MOYASAR_ENV=${moyasarEnv}`);

  return {
    envLabel,
    moyasarEnv,
    nodeEnv: nodeEnv || '(unset)',
    provider: provider || '(unset)',
    applyAllowed: liveSignals.length === 0 && moyasarEnv === 'test',
  };
}

function refIsEmpty(ref) {
  return ref === '' || ref === null || ref === undefined;
}

function summarizePayment(doc) {
  return {
    paymentId: String(doc._id),
    booking: String(doc.booking),
    bookingNumber: doc.bookingNumber,
    provider: doc.provider,
    status: doc.status,
    providerReference: refIsEmpty(doc.providerReference) ? '(empty)' : '(populated)',
    amount: doc.amount,
    currency: doc.currency,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    retryOf: doc.metadata?.retryOf ? String(doc.metadata.retryOf) : null,
  };
}

function fail(message) {
  const err = new Error(message);
  err.code = 'CLEANUP_REFUSED';
  throw err;
}

async function loadAndValidateGroup(Booking, Payment, group) {
  const booking = await Booking.findById(group.bookingId)
    .select('_id bookingNumber paymentStatus bookingStatus')
    .lean();
  if (!booking) fail(`Booking ${group.bookingId} not found`);

  const paymentStatus = String(booking.paymentStatus || '').toUpperCase();
  if (paymentStatus === 'PAID') {
    fail(`Booking ${group.bookingId} is PAID — refusing cleanup`);
  }

  const keep = await Payment.findById(group.keepPaymentId).lean();
  const dup = await Payment.findById(group.cancelPaymentId).lean();
  if (!keep) fail(`Keep payment ${group.keepPaymentId} not found`);
  if (!dup) fail(`Duplicate payment ${group.cancelPaymentId} not found`);

  for (const [label, doc, expectedId] of [
    ['keep', keep, group.keepPaymentId],
    ['cancel', dup, group.cancelPaymentId],
  ]) {
    if (String(doc._id) !== expectedId) fail(`${label} payment id mismatch`);
    if (String(doc.booking) !== group.bookingId) {
      fail(`${label} payment ${doc._id} booking mismatch (expected ${group.bookingId})`);
    }
    if (doc.provider !== 'moyasar') {
      fail(`${label} payment ${doc._id} provider is "${doc.provider}", expected moyasar`);
    }
    if (doc.status !== 'PENDING') {
      fail(`${label} payment ${doc._id} status is "${doc.status}", expected PENDING`);
    }
    if (!refIsEmpty(doc.providerReference)) {
      fail(`${label} payment ${doc._id} has a populated providerReference — refusing`);
    }
  }

  const keepTime = new Date(keep.createdAt).getTime();
  const dupTime = new Date(dup.createdAt).getTime();
  if (!(keepTime <= dupTime)) {
    fail(
      `Keep payment ${keep._id} is not older than duplicate ${dup._id} `
        + `(keep=${keep.createdAt}, dup=${dup.createdAt})`
    );
  }

  // Enum sanity: CANCELLED must remain valid on the Payment schema.
  const statusEnum = Payment.schema.path('status').enumValues;
  if (!statusEnum.includes('CANCELLED')) {
    fail('Payment.status enum does not include CANCELLED');
  }

  return { booking, keep, dup };
}

async function verifyOneOpenPending(Payment, bookingId) {
  const open = await Payment.find({
    booking: bookingId,
    provider: 'moyasar',
    status: 'PENDING',
    providerReference: '',
  })
    .select('_id')
    .lean();
  return open.map((p) => String(p._id));
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.connectionString;
  if (!uri) {
    console.error('MongoDB connection is not configured.');
    process.exit(1);
  }

  const env = assertTestEnvironment(uri);
  console.log('Mode:', APPLY ? 'APPLY (writes enabled)' : 'DRY RUN (no writes)');
  console.log('Database environment:', env.envLabel);
  console.log('MOYASAR_ENV:', env.moyasarEnv, '| NODE_ENV:', env.nodeEnv, '| PAYMENT_PROVIDER:', env.provider);
  console.log('');

  if (APPLY && !env.applyAllowed) {
    fail('Apply mode is not allowed in this environment');
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 20000,
  });

  const Payment = require('../models/Payment');
  const Booking = require('../models/Booking');

  const statusEnum = Payment.schema.path('status').enumValues;
  if (!statusEnum.includes('CANCELLED')) {
    fail('Payment.status enum does not include CANCELLED');
  }
  console.log('Payment.status enum includes CANCELLED: yes');
  console.log('');

  const plan = [];
  for (const group of GROUPS) {
    const { booking, keep, dup } = await loadAndValidateGroup(Booking, Payment, group);
    plan.push({
      bookingId: String(booking._id),
      bookingNumber: booking.bookingNumber,
      bookingStatus: booking.bookingStatus,
      bookingPaymentStatus: booking.paymentStatus,
      keep: summarizePayment(keep),
      cancel: summarizePayment(dup),
      proposedChange: {
        paymentId: String(dup._id),
        fromStatus: dup.status,
        toStatus: 'CANCELLED',
        metadata: {
          cleanupReason: CLEANUP_REASON,
          cleanupAt: '<timestamp on apply>',
          cleanupKeptPaymentId: String(keep._id),
        },
        bookingFieldsTouched: false,
        keepPaymentTouched: false,
        deleted: false,
      },
    });
  }

  console.log('=== Proposed cleanup (6 payments across 3 groups) ===');
  for (const item of plan) {
    console.log(JSON.stringify(item, null, 2));
    console.log('---');
  }

  if (!APPLY) {
    console.log('Dry run complete. No database records were modified.');
    console.log('To apply: node scripts/cleanupDuplicateOpenCheckouts.js --apply');
    await mongoose.disconnect();
    return;
  }

  const now = new Date();

  // Final pre-write re-check, then one guarded updateOne per designated duplicate.
  for (const group of GROUPS) {
    await loadAndValidateGroup(Booking, Payment, group);

    const updated = await Payment.updateOne(
      {
        _id: group.cancelPaymentId,
        booking: group.bookingId,
        provider: 'moyasar',
        status: 'PENDING',
        providerReference: '',
      },
      {
        $set: {
          status: 'CANCELLED',
          'metadata.cleanupReason': CLEANUP_REASON,
          'metadata.cleanupAt': now,
          'metadata.cleanupKeptPaymentId': group.keepPaymentId,
        },
      }
    );

    if (updated.matchedCount !== 1 || updated.modifiedCount !== 1) {
      fail(
        `Expected to modify payment ${group.cancelPaymentId} exactly once `
          + `(matched=${updated.matchedCount}, modified=${updated.modifiedCount}).`
      );
    }
  }

  console.log('Apply complete. Verifying one open empty-ref PENDING per booking/provider...');
  for (const group of GROUPS) {
    const openIds = await verifyOneOpenPending(Payment, group.bookingId);
    if (openIds.length !== 1 || openIds[0] !== group.keepPaymentId) {
      fail(
        `Post-apply verification failed for booking ${group.bookingId}: `
          + `open empty-ref PENDING ids=${JSON.stringify(openIds)}, expected [${group.keepPaymentId}]`
      );
    }
    console.log(
      `OK booking ${group.bookingId}: exactly one open PENDING empty-ref payment ${openIds[0]}`
    );
  }

  console.log('');
  console.log('Cleanup applied successfully. Bookings and kept payments were not modified.');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Cleanup refused or failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
