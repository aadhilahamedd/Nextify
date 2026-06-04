const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  mobile: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    default: ''
  },
  eventOther: {
    type: String,
    default: ''
  },
  serviceType: {
    type: String,
    enum: ['airport', 'pointToPoint', 'hourly'],
    required: true
  },
  flightNumber: {
    type: String,
    default: ''
  },
  arrivalDateTime: {
    type: Date,
    required: true
  },
  vehicle: {
    type: String,
    required: true
  },
  pickupLocation: {
    type: String,
    required: true
  },
  otherPickupLocation: {
    type: String,
    default: ''
  },
  dropoffLocation: {
    type: String,
    required: true
  },
  hours: {
    type: String,
    default: '5 HRS'
  },
  bookingStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
