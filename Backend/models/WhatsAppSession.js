const mongoose = require('mongoose');

const bookingDraftSchema = new mongoose.Schema(
  {
    serviceType: { type: String, default: '' },
    airport: { type: String, default: '' },
    origin: { type: String, default: '' },
    destination: { type: String, default: '' },
    vehicleCategory: { type: String, default: '' },
    vehicleName: { type: String, default: '' },
    durationType: { type: String, default: '' },
    date: { type: String, default: '' },
    time: { type: String, default: '' },
    passengers: { type: Number, default: 1 },
    luggage: { type: Number, default: 0 },
    distanceKm: { type: Number, default: null },
    customerName: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    customerMobile: { type: String, default: '' },
    specialRequests: { type: String, default: '' },
    price: { type: Number, default: null },
    currency: { type: String, default: 'SAR' },
    customQuoteRequired: { type: Boolean, default: false },
    quoteMessage: { type: String, default: '' },
  },
  { _id: false }
);

const whatsAppSessionSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, index: true, unique: true },
    currentStep: { type: String, default: 'WELCOME', index: true },
    stepHistory: { type: [String], default: [] },
    bookingDraft: { type: bookingDraftSchema, default: () => ({}) },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAYMENT', 'COMPLETED', 'CANCELLED'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WhatsAppSession', whatsAppSessionSchema);
