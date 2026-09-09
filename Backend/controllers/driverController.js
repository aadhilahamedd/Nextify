const Driver = require('../models/Driver');
const { success, error } = require('../utils/apiResponse');

exports.getDrivers = async (req, res, next) => {
  try {
    const drivers = await Driver.find().sort({ name: 1 });
    return success(res, 200, 'Drivers fetched', { drivers });
  } catch (err) {
    next(err);
  }
};

exports.createDriver = async (req, res, next) => {
  try {
    const driver = await Driver.create(req.body);
    return success(res, 201, 'Driver created', { driver });
  } catch (err) {
    next(err);
  }
};

exports.updateDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!driver) return error(res, 404, 'Driver not found');
    return success(res, 200, 'Driver updated', { driver });
  } catch (err) {
    next(err);
  }
};

exports.deleteDriver = async (req, res, next) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) return error(res, 404, 'Driver not found');
    return success(res, 200, 'Driver deleted', { driver });
  } catch (err) {
    next(err);
  }
};
