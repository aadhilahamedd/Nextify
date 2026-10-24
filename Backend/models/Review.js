const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    role: { type: String, default: '', trim: true, maxlength: 80 },
    quote: { type: String, required: true, trim: true, maxlength: 280 },
    rating: { type: Number, required: true, min: 1, max: 5, default: 5 },
    approved: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);
