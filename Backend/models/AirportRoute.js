const mongoose = require('mongoose');

const airportRouteSchema = new mongoose.Schema(
  {
    airport: { type: String, required: true, trim: true, index: true },
    destinationZone: { type: String, required: true, trim: true, index: true },
    vehicleName: { type: String, required: true, trim: true },
    vehicleCarId: { type: Number, default: null },
    price: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

airportRouteSchema.index({ airport: 1, destinationZone: 1, vehicleName: 1 });

module.exports = mongoose.model('AirportRoute', airportRouteSchema);
