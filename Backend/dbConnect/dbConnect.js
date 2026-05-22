const mongoose = require('mongoose');
const connectionString = process.env.connectionString;

if (!connectionString) {
  console.error('ERROR: connectionString not found in .env file');
  process.exit(1);
}

mongoose.connect(connectionString).then(res => {
  console.log("✅ Successfully connected to MongoDB!");
}).catch(err => {
  console.error("❌ MongoDB connection failed:", err.message);
  process.exit(1);
});                                               