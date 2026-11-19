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

    // Public submissions are always pending — never honor client-supplied approved flags.
    void req.body?.approved;

    const review = await Review.create({
      name: name.slice(0, 80),
      role: role.slice(0, 80),
      quote: quote.slice(0, 280),
      rating: Math.round(rating),
      approved: false,
    });

    return success(res, 201, 'Review submitted for moderation', {
      review: {
        id: review._id,
        name: review.name,
        role: review.role,
        quote: review.quote,
        rating: review.rating,
        approved: false,
      },
    });
  } catch (err) {
    return error(res, 500, 'Failed to save review');
  }
};

exports.listAdminReviews = async (req, res) => {
  try {
    const status = String(req.query.status || 'pending').toLowerCase();
    const filter =
      status === 'approved'
        ? { approved: true }
        : status === 'all'
          ? {}
          : { approved: false };

    const reviews = await Review.find(filter).sort({ createdAt: -1 }).limit(100);
    return success(res, 200, 'Admin reviews', { reviews });
  } catch (err) {
    return error(res, 500, 'Failed to load reviews');
  }
};

exports.approveReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true },
    );
    if (!review) {
      return error(res, 404, 'Review not found');
    }
    return success(res, 200, 'Review approved', { review });
  } catch (err) {
    return error(res, 500, 'Failed to approve review');
  }
};

exports.rejectReview = async (req, res) => {
  try {
    const deleted = await Review.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return error(res, 404, 'Review not found');
    }
    return success(res, 200, 'Review rejected', { id: deleted._id });
  } catch (err) {
    return error(res, 500, 'Failed to reject review');
  }
};
