/**
 * Read-only diagnostic: report duplicate open PENDING payment attempts
 * (status PENDING + providerReference '') grouped by booking + provider.
 *
 * Usage: node scripts/reportOpenCheckoutDuplicates.js
 * Does not modify any data. Does not print connection secrets.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.connectionString;
  if (!uri) {
    console.error('MONGODB_URI (or legacy connectionString) is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 20000,
  });

  const Payment = require('../models/Payment');

  const groups = await Payment.aggregate([
    {
      $match: {
        status: 'PENDING',
        providerReference: '',
      },
    },
    {
      $group: {
        _id: { booking: '$booking', provider: '$provider' },
        count: { $sum: 1 },
        paymentIds: { $push: '$_id' },
        bookingNumbers: { $addToSet: '$bookingNumber' },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ]);

  if (!groups.length) {
    console.log('No duplicate open PENDING checkout attempts found.');
  } else {
    console.log(`Found ${groups.length} booking+provider group(s) with duplicate open PENDING attempts:`);
    for (const g of groups) {
      console.log(
        JSON.stringify({
          booking: String(g._id.booking),
          provider: g._id.provider,
          count: g.count,
          bookingNumbers: g.bookingNumbers,
          paymentIds: g.paymentIds.map(String),
        })
      );
    }
  }

  // Also report whether the required index is present (read-only).
  const indexes = await Payment.collection.indexes();
  const openIdx = indexes.find((i) => i.name === 'uniq_open_checkout_attempt');
  console.log(
    openIdx
      ? `Index uniq_open_checkout_attempt is present (unique=${Boolean(openIdx.unique)}).`
      : 'Index uniq_open_checkout_attempt is MISSING.'
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Diagnostic failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
