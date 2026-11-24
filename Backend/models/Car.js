const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: String,
    required: true,
    trim: true
  },
  priceUsd: {
    type: String,
    trim: true,
    default: '',
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  seats: {
    type: String,
    required: true,
    trim: true
  },
  luggage: {
    type: String,
    required: true,
    trim: true
  },
  img: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    trim: true,
    default: '',
  },
  model: {
    type: String,
    trim: true,
    default: '',
  },
  category: {
    type: String,
    trim: true,
    default: '',
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  images: {
    type: [String],
    default: [],
  },
  available: {
    type: Boolean,
    default: true,
    index: true,
  },
  displayOrder: {
    type: Number,
    default: 0,
    index: true,
  }
}, {
  timestamps: true,
  id: false,
});

module.exports = mongoose.model('Car', carSchema);
