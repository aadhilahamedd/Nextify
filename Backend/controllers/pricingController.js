const PricingRule = require('../models/PricingRule');
const Settings = require('../models/Settings');
const { SERVICE_TYPES, PRICING_MODES } = PricingRule;
const { calculatePrice, getPublicPricingSummary, normalizeVehicleCat } = require('../services/pricingService');
const { normalizeServiceType } = require('../utils/vehicleCategories');
const { resolveFixedRouteLocation } = require('../data/airportFixedRoutes');
const { parseOptionalPositiveUsd } = require('../utils/currency');
const { success, error } = require('../utils/apiResponse');

const CHAUFFEUR_DURATIONS = ['hourly', 'half_day', 'full_day'];

function normalizeLocationId(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const known = resolveFixedRouteLocation(raw);
  if (known?.id) return known.id;
  return raw
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validatePricingPayload(body = {}, existing = null) {
  const rawService = body.serviceType !== undefined ? body.serviceType : existing?.serviceType;
  const serviceType = normalizeServiceType(rawService);
  if (!serviceType || !SERVICE_TYPES.includes(serviceType)) {
    return { valid: false, status: 400, message: `Invalid serviceType. Must be one of: ${SERVICE_TYPES.join(', ')}` };
  }

  const pricingMode = body.pricingMode !== undefined
    ? String(body.pricingMode || '').trim()
    : (existing?.pricingMode || 'fixed');
  if (!PRICING_MODES.includes(pricingMode)) {
    return { valid: false, status: 400, message: `Invalid pricingMode. Must be one of: ${PRICING_MODES.join(', ')}` };
  }

  const vehicleApplicability = body.vehicleApplicability !== undefined
    ? String(body.vehicleApplicability || 'specific').trim()
    : (existing?.vehicleApplicability || 'specific');
  if (!['specific', 'all'].includes(vehicleApplicability)) {
    return { valid: false, status: 400, message: 'vehicleApplicability must be "specific" or "all"' };
  }

  const rawVehicleCategory = body.vehicleCategory !== undefined ? body.vehicleCategory : existing?.vehicleCategory;
  const rawVehicleId = body.vehicleId !== undefined ? body.vehicleId : existing?.vehicleId;
  const vehicleCategory = String(rawVehicleCategory || rawVehicleId || '').trim();
  const vehicleId = String(rawVehicleId || rawVehicleCategory || '').trim();
  const vehicleCarIdRaw = body.vehicleCarId !== undefined ? body.vehicleCarId : existing?.vehicleCarId;
  const vehicleCarId = vehicleCarIdRaw !== '' && vehicleCarIdRaw != null && Number.isFinite(Number(vehicleCarIdRaw))
    ? Number(vehicleCarIdRaw)
    : null;

  if (vehicleApplicability !== 'all' && !vehicleCategory && !vehicleId) {
    return { valid: false, status: 400, message: 'Vehicle selection is required for specific-vehicle pricing rules.' };
  }

  const origin = String(body.origin !== undefined ? body.origin : (existing?.origin || '')).trim();
  const destination = String(body.destination !== undefined ? body.destination : (existing?.destination || '')).trim();
  const originId = body.originId !== undefined && String(body.originId).trim()
    ? String(body.originId).trim()
    : normalizeLocationId(origin);
  const destinationId = body.destinationId !== undefined && String(body.destinationId).trim()
    ? String(body.destinationId).trim()
    : normalizeLocationId(destination);

  if (serviceType === 'airport_transfer') {
    if (!origin || !destination) {
      return { valid: false, status: 400, message: 'Pickup and drop-off locations are required for Airport Transfer pricing.' };
    }
    if (originId && destinationId && originId === destinationId) {
      return { valid: false, status: 400, message: 'Pickup and drop-off locations cannot be identical.' };
    }
  }

  const durationType = String(body.durationType !== undefined ? body.durationType : (existing?.durationType || '')).trim();
  if (serviceType === 'chauffeur') {
    if (!CHAUFFEUR_DURATIONS.includes(durationType)) {
      return { valid: false, status: 400, message: 'Hourly Chauffeur rules require durationType: hourly, half_day, or full_day.' };
    }
  } else if (durationType && !CHAUFFEUR_DURATIONS.includes(durationType)) {
    return { valid: false, status: 400, message: 'Invalid durationType.' };
  }

  let price = null;
  let priceUsd = null;
  if (pricingMode === 'fixed') {
    const rawPrice = body.price !== undefined ? body.price : existing?.price;
    const numericPrice = typeof rawPrice === 'string' && rawPrice.trim() === '' ? NaN : Number(rawPrice);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return { valid: false, status: 400, message: 'Fixed price must be a positive finite SAR amount.' };
    }
    price = numericPrice;

    const rawUsd = body.priceUsd !== undefined ? body.priceUsd : existing?.priceUsd;
    const usdCheck = parseOptionalPositiveUsd(rawUsd);
    if (!usdCheck.valid) {
      return { valid: false, status: 400, message: usdCheck.message };
    }
    priceUsd = usdCheck.value;
  }

  const active = body.active !== undefined ? Boolean(body.active) : (existing ? Boolean(existing.active) : true);
  const allowReverse = body.allowReverse !== undefined
    ? Boolean(body.allowReverse)
    : (existing ? Boolean(existing.allowReverse) : false);
  const taxIncluded = body.taxIncluded !== undefined
    ? Boolean(body.taxIncluded)
    : (existing ? Boolean(existing.taxIncluded) : false);

  const vehicleNames = body.vehicleNames !== undefined
    ? (Array.isArray(body.vehicleNames)
      ? body.vehicleNames.map((n) => String(n || '').trim()).filter(Boolean)
      : String(body.vehicleNames || '').split(',').map((n) => n.trim()).filter(Boolean))
    : (existing?.vehicleNames || []);

  const payload = {
    serviceType,
    routeType: String(body.routeType !== undefined ? body.routeType : (existing?.routeType || 'fixed')).trim() || 'fixed',
    origin,
    originId,
    destination,
    destinationId,
    airports: Array.isArray(body.airports) ? body.airports : (existing?.airports || []),
    vehicleId,
    vehicleCarId,
    vehicleCategory,
    vehicleNames,
    vehicleApplicability,
    allowedVehicleCategories: Array.isArray(body.allowedVehicleCategories)
      ? body.allowedVehicleCategories
      : (existing?.allowedVehicleCategories || []),
    durationType: serviceType === 'chauffeur' ? durationType : '',
    minDistanceKm: body.minDistanceKm !== undefined ? body.minDistanceKm : (existing?.minDistanceKm ?? null),
    maxDistanceKm: body.maxDistanceKm !== undefined ? body.maxDistanceKm : (existing?.maxDistanceKm ?? null),
    baseDistanceKm: body.baseDistanceKm !== undefined ? body.baseDistanceKm : (existing?.baseDistanceKm ?? null),
    extraKmIncrement: body.extraKmIncrement !== undefined ? body.extraKmIncrement : (existing?.extraKmIncrement ?? null),
    pricingMode,
    price,
    priceUsd,
    currency: String(body.currency || existing?.currency || 'SAR').trim().toUpperCase() || 'SAR',
    allowReverse,
    taxIncluded,
    active,
    notes: String(body.notes !== undefined ? body.notes : (existing?.notes || '')).trim(),
    displayLabel: String(body.displayLabel !== undefined ? body.displayLabel : (existing?.displayLabel || '')).trim(),
  };

  return { valid: true, payload };
}

function sameVehicleKey(a, b) {
  if (a.vehicleApplicability === 'all' && b.vehicleApplicability === 'all') return true;
  if (a.vehicleApplicability === 'all' || b.vehicleApplicability === 'all') return false;
  const catA = normalizeVehicleCat(a.vehicleCategory || a.vehicleId);
  const catB = normalizeVehicleCat(b.vehicleCategory || b.vehicleId);
  return Boolean(catA && catB && catA === catB);
}

function sameDirectionalRoute(a, b) {
  const originA = a.originId || normalizeLocationId(a.origin);
  const originB = b.originId || normalizeLocationId(b.origin);
  const destA = a.destinationId || normalizeLocationId(a.destination);
  const destB = b.destinationId || normalizeLocationId(b.destination);
  return originA === originB && destA === destB;
}

async function findDuplicateActiveRule(payload, excludeId = null) {
  if (!payload.active) return null;
  const candidates = await PricingRule.find({
    active: true,
    serviceType: payload.serviceType,
  }).lean();

  for (const item of candidates) {
    if (excludeId && String(item._id) === String(excludeId)) continue;
    if (!sameVehicleKey(item, payload)) continue;
    if (payload.serviceType === 'chauffeur') {
      if (String(item.durationType || '') === String(payload.durationType || '')) {
        return item;
      }
      continue;
    }
    if (sameDirectionalRoute(item, payload)) {
      return item;
    }
  }
  return null;
}

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
    if (serviceType) filter.serviceType = normalizeServiceType(serviceType);
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        { displayLabel: rx },
        { vehicleCategory: rx },
        { vehicleId: rx },
        { origin: rx },
        { destination: rx },
      ];
    }
    const rules = await PricingRule.find(filter).sort({ serviceType: 1, price: 1 });
    return success(res, 200, 'Pricing rules fetched', { rules });
  } catch (err) {
    next(err);
  }
};

exports.getAdminPricingRules = async (req, res, next) => {
  try {
    const {
      serviceType,
      vehicleCategory,
      vehicleId,
      location,
      pricingMode,
      active,
      search,
    } = req.query;

    const filter = {};
    const andClauses = [];

    if (serviceType) filter.serviceType = normalizeServiceType(serviceType);
    if (pricingMode && PRICING_MODES.includes(pricingMode)) filter.pricingMode = pricingMode;
    if (active === 'true') filter.active = true;
    if (active === 'false') filter.active = false;

    const vehFilter = String(vehicleCategory || vehicleId || '').trim();
    if (vehFilter) {
      const normalizedVeh = normalizeVehicleCat(vehFilter);
      andClauses.push({
        $or: [
          { vehicleCategory: vehFilter },
          { vehicleCategory: normalizedVeh },
          { vehicleId: vehFilter },
          { vehicleId: normalizedVeh },
        ],
      });
    }

    if (location) {
      const rx = new RegExp(escapeRegex(location), 'i');
      andClauses.push({
        $or: [{ origin: rx }, { destination: rx }, { originId: rx }, { destinationId: rx }],
      });
    }

    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      andClauses.push({
        $or: [
          { displayLabel: rx },
          { vehicleCategory: rx },
          { vehicleId: rx },
          { origin: rx },
          { destination: rx },
          { notes: rx },
        ],
      });
    }

    if (andClauses.length) {
      filter.$and = andClauses;
    }

    const rules = await PricingRule.find(filter).sort({ serviceType: 1, updatedAt: -1, price: 1 });
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

exports.getPricingRules = exports.getAdminPricingRules;

async function markPricingConfigured(serviceType) {
  const st = normalizeServiceType(serviceType);
  if (!st) return;
  try {
    if (typeof Settings.findOneAndUpdate === 'function') {
      await Settings.findOneAndUpdate(
        { key: `pricingConfigured:${st}` },
        { value: true },
        { upsert: true }
      );
    }
  } catch {
    /* non-fatal when running offline unit stubs */
  }
}

exports.createPricingRule = async (req, res, next) => {
  try {
    const validation = validatePricingPayload(req.body);
    if (!validation.valid) {
      return error(res, validation.status, validation.message);
    }

    const duplicate = await findDuplicateActiveRule(validation.payload);
    if (duplicate) {
      return error(
        res,
        409,
        'An active pricing record already exists for this vehicle, service, and directional route.'
      );
    }

    const rule = await PricingRule.create(validation.payload);
    await markPricingConfigured(validation.payload.serviceType);
    return success(res, 201, 'Pricing rule created', { rule });
  } catch (err) {
    next(err);
  }
};

exports.updatePricingRule = async (req, res, next) => {
  try {
    const existing = await PricingRule.findById(req.params.id);
    if (!existing) return error(res, 404, 'Pricing rule not found');

    const validation = validatePricingPayload(req.body, existing);
    if (!validation.valid) {
      return error(res, validation.status, validation.message);
    }

    const duplicate = await findDuplicateActiveRule(validation.payload, existing._id);
    if (duplicate) {
      return error(
        res,
        409,
        'An active pricing record already exists for this vehicle, service, and directional route.'
      );
    }

    Object.assign(existing, validation.payload);
    await existing.save();
    await markPricingConfigured(validation.payload.serviceType);
    return success(res, 200, 'Pricing rule updated', { rule: existing });
  } catch (err) {
    next(err);
  }
};

exports.deletePricingRule = async (req, res, next) => {
  try {
    const rule = await PricingRule.findByIdAndDelete(req.params.id);
    if (!rule) return error(res, 404, 'Pricing rule not found');
    await markPricingConfigured(rule.serviceType);
    return success(res, 200, 'Pricing rule deleted', { rule });
  } catch (err) {
    next(err);
  }
};

exports.normalizeLocationId = normalizeLocationId;
exports.validatePricingPayload = validatePricingPayload;
