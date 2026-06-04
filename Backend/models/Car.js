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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Car', carSchema);
