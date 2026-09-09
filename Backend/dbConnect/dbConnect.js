const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || process.env.connectionString;

if (!uri) {
  console.error('ERROR: MONGODB_URI (or legacy connectionString) not found in environment');
  process.exit(1);
}

mongoose
  .connect(uri)
  .then(async () => {
    console.log('✅ Successfully connected to MongoDB!');
    const { seedDefaults } = require('../services/seedService');
    await seedDefaults();
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
