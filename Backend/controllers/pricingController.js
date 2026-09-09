const PricingRule = require('../models/PricingRule');
const { calculatePrice, getPublicPricingSummary, getRulesByService } = require('../services/pricingService');
const { success, error } = require('../utils/apiResponse');

exports.calculatePrice = async (req, res) => {
  try {
    const quote = await calculatePrice(req.body);
    return success(res, 200, quote.customQuoteRequired ? quote.message : 'Price calculated', { quote });
  } catch (err) {
    return error(res, 400, err.message);
  }
};

exports.getPricing = async (req, res, next) => {
  try {
    const { serviceType, search } = req.query;
    const filter = { active: true };
    if (serviceType) filter.serviceType = serviceType;
    if (search) {
      filter.$or = [
        { displayLabel: { $regex: search, $options: 'i' } },
        { vehicleCategory: { $regex: search, $options: 'i' } },
        { origin: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } },
      ];
    }
    const rules = await PricingRule.find(filter).sort({ serviceType: 1, price: 1 });
    return success(res, 200, 'Pricing rules fetched', { rules });
  } catch (err) {
    next(err);
  }
};

exports.getPricingSummary = async (req, res, next) => {
  try {
    const summary = await getPublicPricingSummary();
    return success(res, 200, 'Pricing summary', { summary });
  } catch (err) {
    next(err);
  }
};

exports.getPricingById = async (req, res, next) => {
  try {
    const rule = await PricingRule.findById(req.params.id);
    if (!rule) return error(res, 404, 'Pricing rule not found');
    return success(res, 200, 'Pricing rule fetched', { rule });
  } catch (err) {
    next(err);
  }
};

exports.getPricingRules = exports.getPricing;

exports.createPricingRule = async (req, res, next) => {
  try {
    const rule = await PricingRule.create(req.body);
    return success(res, 201, 'Pricing rule created', { rule });
  } catch (err) {
    next(err);
  }
};

exports.updatePricingRule = async (req, res, next) => {
  try {
    const rule = await PricingRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) return error(res, 404, 'Pricing rule not found');
    return success(res, 200, 'Pricing rule updated', { rule });
  } catch (err) {
    next(err);
  }
};

exports.deletePricingRule = async (req, res, next) => {
  try {
    const rule = await PricingRule.findByIdAndDelete(req.params.id);
    if (!rule) return error(res, 404, 'Pricing rule not found');
    return success(res, 200, 'Pricing rule deleted', { rule });
  } catch (err) {
    next(err);
  }
};
