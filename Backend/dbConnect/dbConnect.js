const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || process.env.connectionString;

if (!uri) {
  console.error('ERROR: MONGODB_URI (or legacy connectionString) not found in environment');
  process.exit(1);
}

mongoose
  .connect(uri, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 20000,
    maxPoolSize: 10,
  })
  .then(async () => {
    console.log('✅ Successfully connected to MongoDB!');
    try {
      const { seedDefaults } = require('../services/seedService');
      await Promise.race([
        seedDefaults(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('seed-timeout')), 12000)),
      ]);
    } catch (err) {
      console.error('Seed skipped:', err.message);
    }
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
  });
