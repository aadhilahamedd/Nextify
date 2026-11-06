const { calculateDrivingRoute, searchPlaces, reverseGeocode } = require('../services/mapsService');
const { SAUDI_AIRPORTS } = require('../data/saudiAirports');
const { success, error } = require('../utils/apiResponse');

exports.calculateRoute = async (req, res) => {
  try {
    const pickup = req.body.pickup || req.body.origin;
    const destination = req.body.destination || req.body.dropoff;
    if (!pickup || !destination) {
      return error(res, 400, 'Pickup and drop-off locations are required');
    }
    const route = await calculateDrivingRoute(pickup, destination);
    return success(res, 200, route.success ? 'Route calculated' : (route.message || 'Distance unavailable'), { route });
  } catch (err) {
    return error(res, 400, err.message || 'Failed to calculate route');
  }
};

exports.listAirports = async (_req, res) => {
  return success(res, 200, 'Saudi airports', { airports: SAUDI_AIRPORTS });
};

exports.searchPlaces = async (req, res) => {
  try {
    const query = String(req.query.q || req.body?.q || '').trim();
    const lang = String(req.query.lang || req.body?.lang || 'en');
    const places = await searchPlaces(query, lang);
    return success(res, 200, 'Places', { places });
  } catch (err) {
    return error(res, 400, err.message || 'Place search failed');
  }
};

exports.reverseGeocode = async (req, res) => {
  try {
    const lat = req.query.lat ?? req.body?.lat;
    const lng = req.query.lng ?? req.body?.lng;
    const lang = String(req.query.lang || req.body?.lang || 'en');
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return error(res, 400, 'Latitude and longitude are required');
    }
    const place = await reverseGeocode(lat, lng, lang);
    if (!place) {
      return error(res, 404, 'Could not resolve that map location');
    }
    return success(res, 200, 'Place', { place });
  } catch (err) {
    return error(res, 400, err.message || 'Reverse geocode failed');
  }
};
