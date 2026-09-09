const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    languages: { type: [String], default: ['Arabic', 'English'] },
    licenseNumber: { type: String, required: true, trim: true, unique: true },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ASSIGNED', 'ON_TRIP', 'OFFLINE'],
      default: 'AVAILABLE',
      index: true,
    },
    active: { type: Boolean, default: true, index: true },
    profileImage: { type: String, default: '' },
    assignedVehicle: {
      carId: { type: Number, default: null },
      name: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Driver', driverSchema);
