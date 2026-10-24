const Review = require('../models/Review');
const { success, error } = require('../utils/apiResponse');

exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ approved: true }).sort({ createdAt: -1 }).limit(12);
    return success(res, 200, 'Reviews', { reviews });
  } catch (err) {
    return error(res, 500, 'Failed to load reviews');
  }
};

exports.createReview = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const quote = String(req.body?.quote || '').trim();
    const role = String(req.body?.role || '').trim();
    const rating = Number(req.body?.rating);

    if (!name || !quote) {
      return error(res, 400, 'Name and review are required.');
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return error(res, 400, 'Rating must be between 1 and 5.');
    }

    const review = await Review.create({
      name: name.slice(0, 80),
      role: role.slice(0, 80),
      quote: quote.slice(0, 280),
      rating: Math.round(rating),
    });

    return success(res, 201, 'Review added', { review });
  } catch (err) {
    return error(res, 500, 'Failed to save review');
  }
};
