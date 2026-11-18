const Payment = require('../models/Payment');

/** Exact definition required for concurrent open-checkout protection. */
const OPEN_CHECKOUT_INDEX = {
  name: 'uniq_open_checkout_attempt',
  key: { booking: 1, provider: 1 },
  unique: true,
  partialFilterExpression: {
    status: 'PENDING',
    providerReference: '',
  },
};

function keysEqual(a, b) {
  const aKeys = Object.keys(a || {});
  const bKeys = Object.keys(b || {});
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => Number(a[k]) === Number(b[k]));
}

function partialFilterEqual(a, b) {
  if (!a || !b) return false;
  return (
    String(a.status) === String(b.status)
    && String(a.providerReference) === String(b.providerReference)
    && Object.keys(a).length === Object.keys(b).length
  );
}

function describeIndex(spec) {
  return JSON.stringify({
    name: spec?.name,
    key: spec?.key,
    unique: Boolean(spec?.unique),
    partialFilterExpression: spec?.partialFilterExpression || null,
  });
}

function findOpenCheckoutIndex(indexes) {
  return (indexes || []).find(
    (idx) =>
      idx.name === OPEN_CHECKOUT_INDEX.name
      || keysEqual(idx.key, OPEN_CHECKOUT_INDEX.key)
  );
}

function openCheckoutIndexMatches(spec) {
  if (!spec) return false;
  if (spec.name && spec.name !== OPEN_CHECKOUT_INDEX.name) return false;
  if (!keysEqual(spec.key, OPEN_CHECKOUT_INDEX.key)) return false;
  if (!spec.unique) return false;
  if (!partialFilterEqual(spec.partialFilterExpression, OPEN_CHECKOUT_INDEX.partialFilterExpression)) {
    return false;
  }
  return true;
}

function indexConflictError(existing) {
  const err = new Error(
    `Payment index "${OPEN_CHECKOUT_INDEX.name}" exists but does not match the required definition. `
      + `Found ${describeIndex(existing)}; required ${describeIndex(OPEN_CHECKOUT_INDEX)}. `
      + 'Fix or recreate this index manually before starting the server.'
  );
  err.code = 'PAYMENT_INDEX_DEFINITION_MISMATCH';
  return err;
}

function duplicateDataError(cause) {
  const err = new Error(
    'Cannot create uniq_open_checkout_attempt: existing Payment documents violate the unique open-checkout constraint '
      + '(multiple PENDING rows with empty providerReference for the same booking+provider). '
      + 'Run `node scripts/reportOpenCheckoutDuplicates.js`, resolve duplicates manually, then restart. '
      + `MongoDB detail: ${cause?.message || cause}`
  );
  err.code = 'PAYMENT_INDEX_DUPLICATE_DATA';
  err.cause = cause;
  return err;
}

/**
 * Ensure uniq_open_checkout_attempt exists with the exact schema definition.
 * Idempotent: if the correct index is already present, does nothing.
 * Does not modify Payment documents.
 */
async function ensureOpenCheckoutAttemptIndex(paymentModel = Payment) {
  const collection = paymentModel.collection;
  if (!collection || typeof collection.indexes !== 'function') {
    const err = new Error('Payment collection is not available for index readiness');
    err.code = 'PAYMENT_INDEX_COLLECTION_UNAVAILABLE';
    throw err;
  }

  const before = await collection.indexes();
  const existing = findOpenCheckoutIndex(before);

  if (existing) {
    if (!openCheckoutIndexMatches(existing)) {
      throw indexConflictError(existing);
    }
    return {
      created: false,
      verified: true,
      name: OPEN_CHECKOUT_INDEX.name,
      index: existing,
    };
  }

  try {
    await collection.createIndex(OPEN_CHECKOUT_INDEX.key, {
      name: OPEN_CHECKOUT_INDEX.name,
      unique: OPEN_CHECKOUT_INDEX.unique,
      partialFilterExpression: OPEN_CHECKOUT_INDEX.partialFilterExpression,
    });
  } catch (err) {
    if (err.code === 11000 || err.code === 85 /* IndexOptionsConflict */ || err.codeName === 'DuplicateKey') {
      throw duplicateDataError(err);
    }
    // Index already built concurrently (e.g. Mongoose autoIndex) with same options.
    if (err.code === 68 || /already exists/i.test(String(err.message || ''))) {
      const raced = findOpenCheckoutIndex(await collection.indexes());
      if (openCheckoutIndexMatches(raced)) {
        return {
          created: false,
          verified: true,
          name: OPEN_CHECKOUT_INDEX.name,
          index: raced,
        };
      }
      throw indexConflictError(raced || { name: OPEN_CHECKOUT_INDEX.name });
    }
    const wrapped = new Error(`Failed to create ${OPEN_CHECKOUT_INDEX.name}: ${err.message}`);
    wrapped.code = 'PAYMENT_INDEX_CREATE_FAILED';
    wrapped.cause = err;
    throw wrapped;
  }

  const after = await collection.indexes();
  const created = findOpenCheckoutIndex(after);
  if (!openCheckoutIndexMatches(created)) {
    throw new Error(
      `Created ${OPEN_CHECKOUT_INDEX.name} but post-create verification failed. Found ${describeIndex(created)}`
    );
  }

  return {
    created: true,
    verified: true,
    name: OPEN_CHECKOUT_INDEX.name,
    index: created,
  };
}

module.exports = {
  OPEN_CHECKOUT_INDEX,
  ensureOpenCheckoutAttemptIndex,
  openCheckoutIndexMatches,
  findOpenCheckoutIndex,
  keysEqual,
  partialFilterEqual,
};
