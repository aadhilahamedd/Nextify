const mongoose = require('mongoose');
const PricingRule = require('../models/PricingRule');
const Settings = require('../models/Settings');
const { APPROVED_RATES } = require('../seed/pricingSeed');
const {
  normalizeServiceType,
  normalizeRoute,
  samePlace,
  routesMatch,
  canonicalPlace,
} = require('../utils/vehicleCategories');
const {
  matchAirportFixedRoute,
  quoteAirportFixedRoute,
  resolveFixedRouteLocation,
  locationCandidates,
} = require('../data/airportFixedRoutes');

const DEFAULT_CURRENCY = 'SAR';
const RATE_ON_REQUEST = 'Rate on Request';
const PRICE_ON_REQUEST = 'Price on request';

const CATEGORY_ALIASES = {
  gmc_yukon: 'gmc',
  gmc_tahoe: 'gmc',
  chevrolet_suburban: 'gmc',
  mini_van: 'toyota_hiace',
};

function normalizeVehicleCat(category) {
  const cat = String(category || '').trim();
  return CATEGORY_ALIASES[cat] || cat;
}

function normalizeTextSlug(value) {
  const raw = typeof value === 'object' && value !== null
    ? (value.id || value.nameEn || value.address || value.label || '')
    : value;
  return String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function locationIdsForValue(value) {
  const ids = new Set();
  if (value == null || value === '') return ids;
  const candidates = locationCandidates(value);
  for (const loc of candidates) {
    if (loc?.id) ids.add(loc.id);
  }
  const slug = normalizeTextSlug(value);
  if (slug) ids.add(slug);
  const canonical = canonicalPlace(typeof value === 'string' ? value : (value?.nameEn || value?.address || ''));
  if (canonical) {
    const canonSlug = normalizeTextSlug(canonical);
    if (canonSlug) ids.add(canonSlug);
  }
  return ids;
}

function ruleLocationMatches(ruleText, ruleId, inputValue) {
  const inputIds = locationIdsForValue(inputValue);
  if (!inputIds.size) return false;
  const ruleIds = new Set();
  if (ruleId) {
    ruleIds.add(String(ruleId).trim().toLowerCase());
    for (const loc of locationCandidates(ruleId)) {
      if (loc?.id) ruleIds.add(loc.id);
    }
  }
  if (ruleText) {
    for (const id of locationIdsForValue(ruleText)) {
      ruleIds.add(id);
    }
  }
  for (const id of ruleIds) {
    if (inputIds.has(id)) return true;
  }
  return false;
}

function ruleMatchesDirectionalRoute(rule, pickupValue, dropoffValue) {
  const hasOrigin = Boolean(rule.originId || rule.origin);
  const hasDest = Boolean(rule.destinationId || rule.destination);
  if (!hasOrigin || !hasDest) return false;

  const forward = ruleLocationMatches(rule.origin, rule.originId, pickupValue)
    && ruleLocationMatches(rule.destination, rule.destinationId, dropoffValue);
  if (forward) return true;

  if (rule.allowReverse === true) {
    return ruleLocationMatches(rule.origin, rule.originId, dropoffValue)
      && ruleLocationMatches(rule.destination, rule.destinationId, pickupValue);
  }
  return false;
}

function customQuote(message, extra = {}) {
  return {
    success: true,
    price: null,
    currency: DEFAULT_CURRENCY,
    pricingType: 'custom_quote',
    customQuoteRequired: true,
    payable: false,
    quoteStatus: extra.quoteStatus || 'custom_quote',
    message: message || 'This journey requires a custom quotation.',
    totalAmount: null,
    ...extra,
  };
}

function rateOnRequest(message, extra = {}) {
  return customQuote(message || RATE_ON_REQUEST, {
    quoteStatus: 'rate_on_request',
    ...extra,
  });
}

function fixedQuote(rule, extra = {}) {
  return {
    success: true,
    price: rule.price,
    currency: rule.currency || DEFAULT_CURRENCY,
    pricingType: extra.pricingType || 'fixed',
    customQuoteRequired: false,
    payable: true,
    quoteStatus: extra.quoteStatus || 'priced',
    pricingRuleId: rule._id || null,
    pricingMode: rule.pricingMode || 'fixed',
    vehicleCategory: rule.vehicleCategory || rule.vehicleId || '',
    displayLabel: rule.displayLabel,
    totalAmount: extra.totalAmount != null ? extra.totalAmount : rule.price,
    message: extra.message || null,
    ...(rule.taxIncluded ? { taxIncluded: true } : {}),
    ...extra,
  };
}

function matchVehicleCategory(rule, vehicleCategory, vehicleName, vehicleId, vehicleCarId) {
  if (rule.vehicleApplicability === 'all') return true;

  const vCat = normalizeVehicleCat(vehicleCategory || vehicleId);
  const ruleCat = normalizeVehicleCat(rule.vehicleCategory || rule.vehicleId);
  const hasCarId = vehicleCarId !== '' && vehicleCarId != null && Number.isFinite(Number(vehicleCarId));
  const ruleHasCarId = rule.vehicleCarId !== '' && rule.vehicleCarId != null && Number.isFinite(Number(rule.vehicleCarId));

  // When a vehicle category is provided, it MUST match the rule's canonical category.
  // Never allow a matching vehicleCarId to override a conflicting vehicleCategory.
  if (vCat) {
    if (!ruleCat || ruleCat !== vCat) return false;
    if (hasCarId && ruleHasCarId && Number(vehicleCarId) !== Number(rule.vehicleCarId)) {
      return false;
    }
    return true;
  }

  // Fallback to vehicleCarId only when vehicleCategory is genuinely absent.
  if (hasCarId && ruleHasCarId) {
    return Number(vehicleCarId) === Number(rule.vehicleCarId);
  }

  if (vehicleName && rule.vehicleNames?.length) {
    const vn = vehicleName.toLowerCase();
    return rule.vehicleNames.some(
      (n) => vn === n.toLowerCase() || vn.includes(n.toLowerCase()) || n.toLowerCase().includes(vn)
    );
  }
  return false;
}

function hasConflictingCarId(rules, vehicleCategory, vehicleId, vehicleCarId) {
  const vCat = normalizeVehicleCat(vehicleCategory || vehicleId);
  const hasCarId = vehicleCarId !== '' && vehicleCarId != null && Number.isFinite(Number(vehicleCarId));
  if (!vCat || !hasCarId) return false;

  const numericId = Number(vehicleCarId);
  return rules.some((rule) => {
    if (rule.vehicleApplicability === 'all') return false;
    if (rule.vehicleCarId == null || Number(rule.vehicleCarId) !== numericId) return false;
    const ruleCat = normalizeVehicleCat(rule.vehicleCategory || rule.vehicleId);
    return Boolean(ruleCat && ruleCat !== vCat);
  });
}

function pickRule(rules, vehicleCategory, vehicleName, extraMatch = () => true, { vehicleId, vehicleCarId } = {}) {
  // Reject conflicting vehicle identifiers safely; never silently select a cheaper rule.
  if (hasConflictingCarId(rules, vehicleCategory, vehicleId, vehicleCarId)) {
    return null;
  }

  const vCat = normalizeVehicleCat(vehicleCategory || vehicleId);
  const hasCarId = vehicleCarId !== '' && vehicleCarId != null && Number.isFinite(Number(vehicleCarId));

  const exact = rules.find((rule) => {
    if (!extraMatch(rule)) return false;
    if (rule.vehicleApplicability === 'all') return false;
    const ruleCat = normalizeVehicleCat(rule.vehicleCategory || rule.vehicleId);
    const ruleHasCarId = rule.vehicleCarId !== '' && rule.vehicleCarId != null && Number.isFinite(Number(rule.vehicleCarId));

    if (vCat) {
      if (!ruleCat || ruleCat !== vCat) return false;
      if (hasCarId && ruleHasCarId && Number(vehicleCarId) !== Number(rule.vehicleCarId)) return false;
      return true;
    }
    if (hasCarId && ruleHasCarId) {
      return Number(vehicleCarId) === Number(rule.vehicleCarId);
    }
    return false;
  });
  if (exact) return exact;
  return rules.find((rule) => extraMatch(rule) && matchVehicleCategory(rule, vehicleCategory, vehicleName, vehicleId, vehicleCarId));
}

function approvedRules(serviceType, extra = () => true) {
  return APPROVED_RATES.filter((rule) => rule.serviceType === serviceType && extra(rule));
}

function findChauffeurRule(rules, vehicleCategory, vehicleName, durationType, ids = {}) {
  return pickRule(
    rules.filter((rule) => rule.durationType === durationType),
    vehicleCategory,
    vehicleName,
    () => true,
    ids,
  );
}

function findIntercityRule(rules, origin, destination, vehicleCategory, vehicleName, ids = {}) {
  const route = normalizeRoute(origin, destination);
  if (route.origin && route.destination && samePlace(route.origin, route.destination)) return null;
  const routeRules = rules.filter((rule) => {
    if (rule.allowReverse === false && rule._id) {
      return ruleMatchesDirectionalRoute(rule, origin, destination);
    }
    return routesMatch(rule.origin, rule.destination, origin, destination);
  });
  if (!routeRules.length) return null;
  const allRule = routeRules.find((r) => r.vehicleApplicability === 'all');
  if (allRule) return allRule;
  return pickRule(routeRules, vehicleCategory, vehicleName, () => true, ids);
}

function findGccRule(rules, destination, vehicleCategory) {
  const destNorm = (destination || '').toLowerCase();
  if (!destNorm) return null;
  const rule = rules.find((r) => String(r.destination || '').toLowerCase().includes(destNorm)
    || destNorm.includes(String(r.destination || '').toLowerCase()));
  if (!rule) return null;
  const vCat = normalizeVehicleCat(vehicleCategory);
  if (rule.allowedVehicleCategories?.length && vCat && !rule.allowedVehicleCategories.includes(vCat)) {
    return 'unconfigured_vehicle';
  }
  if (rule.vehicleCategory && vCat && rule.vehicleCategory !== vCat && !matchVehicleCategory(rule, vCat, '')) {
    return 'unconfigured_vehicle';
  }
  return rule;
}

async function getActiveDbRules(serviceType) {
  const st = normalizeServiceType(serviceType);
  if (!st) return [];
  try {
    if (mongoose.connection.readyState === 1) {
      const docs = await Promise.race([
        PricingRule.find({ active: true, serviceType: st }).sort({ updatedAt: -1, price: 1 }).maxTimeMS(800).lean().exec(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('mongo-timeout')), 900)),
      ]);
      if (Array.isArray(docs)) return docs;
    }
  } catch {
    /* fallback to approved static rules */
  }
  return [];
}

function quoteFromDbRule(rule, extra = {}) {
  if (!rule) return null;
  if (rule.pricingMode === 'whatsapp_assistant' || rule.price == null || !Number.isFinite(Number(rule.price)) || Number(rule.price) <= 0) {
    return rateOnRequest(PRICE_ON_REQUEST, {
      pricingRuleId: rule._id || null,
      pricingMode: 'whatsapp_assistant',
      ...extra,
    });
  }
  return fixedQuote(rule, extra);
}

async function calculateAirportPrice(payload = {}) {
  const {
    vehicleCategory,
    vehicleId,
    vehicleCarId,
    vehicle,
    vehicleName,
    airport,
    origin,
    destination,
    pickupPlace,
    dropoffPlace,
  } = payload;
  const vCat = normalizeVehicleCat(vehicleCategory || vehicleId || vehicle?.category || '');
  const vName = vehicleName || vehicle?.name || vehicle?.label || '';
  const vCarId = vehicleCarId ?? vehicle?.carId ?? null;
  const airportName = airport || origin;

  if (!vCat && !vName && vCarId == null) {
    return customQuote('Please select a vehicle.', { serviceType: 'airport_transfer' });
  }

  const pickupValue = pickupPlace || origin || airport;
  const dropoffValue = dropoffPlace || destination;
  if (!pickupValue || !dropoffValue) {
    return rateOnRequest(PRICE_ON_REQUEST, {
      serviceType: 'airport_transfer',
      origin: origin || airportName || '',
      destination: destination || '',
      pricingModel: 'airport_transfer',
    });
  }

  // 1. Check active admin-configured directional Airport Transfer rules in MongoDB.
  const dbRules = await getActiveDbRules('airport_transfer');
  const directionalDbRules = dbRules.filter(
    (rule) => (rule.origin || rule.originId) && (rule.destination || rule.destinationId)
  );
  const matchedDbRule = pickRule(
    directionalDbRules,
    vCat,
    vName,
    (rule) => ruleMatchesDirectionalRoute(rule, pickupValue, dropoffValue),
    { vehicleId: vehicleId || vCat, vehicleCarId: vCarId },
  );

  if (matchedDbRule) {
    const pickupLoc = resolveFixedRouteLocation(pickupValue);
    const dropoffLoc = resolveFixedRouteLocation(dropoffValue);
    const originLabel = pickupLoc?.displayLabel || matchedDbRule.origin || String(origin || airportName || '');
    const destinationLabel = dropoffLoc?.displayLabel || matchedDbRule.destination || String(destination || '');
    return quoteFromDbRule(matchedDbRule, {
      serviceType: 'airport_transfer',
      pricingType: matchedDbRule.pricingMode === 'whatsapp_assistant' ? 'custom_quote' : 'airport_fixed_route',
      pricingModel: 'airport_transfer',
      originId: matchedDbRule.originId || pickupLoc?.id || null,
      destinationId: matchedDbRule.destinationId || dropoffLoc?.id || null,
      originLabel,
      destinationLabel,
      origin: originLabel,
      destination: destinationLabel,
      routeType: 'fixed',
    });
  }

  // 2. Fallback to approved fixed routes (10 existing + 3 approved Bahrain one-way routes).
  const fixedRoute = matchAirportFixedRoute(pickupValue, dropoffValue);
  if (fixedRoute) {
    const matched = quoteAirportFixedRoute(fixedRoute, vCat || vName, {
      airport: airportName,
      vehicleCategory: vCat,
      vehicleName: vName,
      displayLabel: vName || vCat,
    });
    if (matched.customQuoteRequired) {
      return rateOnRequest(PRICE_ON_REQUEST, {
        ...matched,
        message: PRICE_ON_REQUEST,
      });
    }
    return {
      success: true,
      currency: DEFAULT_CURRENCY,
      ...matched,
    };
  }

  // 3. No generic fallback pricing for airport transfers: unapproved routes require a custom quotation.
  return rateOnRequest(PRICE_ON_REQUEST, {
    serviceType: 'airport_transfer',
    origin: origin || airportName || '',
    destination: destination || '',
    pricingModel: 'airport_transfer',
  });
}

async function calculateCityPrice(payload = {}) {
  const {
    vehicleCategory,
    vehicleId,
    vehicleCarId,
    vehicle,
    vehicleName,
    origin,
    destination,
    pickupPlace,
    dropoffPlace,
    distanceKm,
  } = payload;
  const vCat = normalizeVehicleCat(vehicleCategory || vehicleId || vehicle?.category || '');
  const vName = vehicleName || vehicle?.name || vehicle?.label || '';
  const vCarId = vehicleCarId ?? vehicle?.carId ?? null;
  const km = Number(distanceKm);

  if (!vCat && !vName && vCarId == null) {
    return customQuote('Please select a vehicle.', { serviceType: 'city_transfer' });
  }

  const rules = await getRulesByService('city_transfer');

  // 1. Check route-specific directional Point-to-Point rules first when origin & destination are provided.
  const pickupValue = pickupPlace || origin;
  const dropoffValue = dropoffPlace || destination;
  if (pickupValue && dropoffValue) {
    const routeSpecific = rules.filter((item) => Boolean(item.destination || item.destinationId));
    const matchedRouteRule = pickRule(
      routeSpecific,
      vCat,
      vName,
      (rule) => ruleMatchesDirectionalRoute(rule, pickupValue, dropoffValue),
      { vehicleId: vehicleId || vCat, vehicleCarId: vCarId },
    );
    if (matchedRouteRule) {
      return quoteFromDbRule(matchedRouteRule, {
        serviceType: 'city_transfer',
        origin: matchedRouteRule.origin || origin || '',
        destination: matchedRouteRule.destination || destination || '',
        originLabel: matchedRouteRule.origin || origin || '',
        destinationLabel: matchedRouteRule.destination || destination || '',
        pricingType: matchedRouteRule.pricingMode === 'whatsapp_assistant' ? 'custom_quote' : 'fixed',
        distanceKm: Number.isFinite(km) && km > 0 ? km : undefined,
        pricingModel: 'city_transfer',
      });
    }
  }

  // 2. Fallback to vehicle-level Point-to-Point base rule (without a specific destination).
  const vehicleLevelRules = rules.filter((item) => !item.destination && !item.destinationId);
  const rule = pickRule(
    vehicleLevelRules,
    vCat,
    vName,
    (item) => !item.origin || item.origin === 'Riyadh',
    { vehicleId: vehicleId || vCat, vehicleCarId: vCarId },
  );

  if (!rule) {
    return customQuote('City transfer is not available for this vehicle.', {
      serviceType: 'city_transfer',
      origin: origin || 'Riyadh',
      pricingModel: 'city_transfer',
    });
  }

  return quoteFromDbRule(rule, {
    serviceType: 'city_transfer',
    origin: rule.origin || 'Riyadh',
    pricingType: rule.pricingMode === 'whatsapp_assistant' ? 'custom_quote' : 'city_base',
    quoteStatus: rule.pricingMode === 'whatsapp_assistant' ? 'rate_on_request' : 'priced',
    distanceKm: Number.isFinite(km) && km > 0 ? km : undefined,
    pricingModel: 'city_transfer',
  });
}

async function calculateChauffeurPrice(payload = {}) {
  const {
    vehicleCategory,
    vehicleId,
    vehicleCarId,
    vehicle,
    vehicleName,
    durationType,
  } = payload;
  const vCat = normalizeVehicleCat(vehicleCategory || vehicleId || vehicle?.category || '');
  const vName = vehicleName || vehicle?.name || vehicle?.label || '';
  const vCarId = vehicleCarId ?? vehicle?.carId ?? null;

  if (!durationType || !['hourly', 'half_day', 'full_day'].includes(durationType)) {
    throw new Error('Duration must be hourly, half_day, or full_day');
  }
  if (!vCat && !vName && vCarId == null) {
    return customQuote('Please select a vehicle.', { serviceType: 'chauffeur' });
  }

  const rules = await getRulesByService('chauffeur');
  const rule = findChauffeurRule(rules, vCat, vName, durationType, { vehicleId: vehicleId || vCat, vehicleCarId: vCarId });
  if (!rule && durationType === 'half_day') {
    return customQuote('This vehicle is available for full day service only.', { serviceType: 'chauffeur', durationType });
  }
  if (!rule) {
    return customQuote('No chauffeur rate for this vehicle and duration. Custom quote required.', {
      serviceType: 'chauffeur',
      durationType,
    });
  }
  return quoteFromDbRule(rule, { serviceType: 'chauffeur', durationType, pricingModel: 'chauffeur' });
}

async function calculateIntercityPrice(payload = {}) {
  const {
    vehicleCategory,
    vehicleId,
    vehicleCarId,
    vehicle,
    vehicleName,
    origin,
    destination,
    returnTrip,
  } = payload;
  const vCat = normalizeVehicleCat(vehicleCategory || vehicleId || vehicle?.category || '');
  const vName = vehicleName || vehicle?.name || vehicle?.label || '';
  const vCarId = vehicleCarId ?? vehicle?.carId ?? null;
  const route = normalizeRoute(origin, destination);

  if (!route.origin || !route.destination) {
    return rateOnRequest('Please select a supported intercity route.', {
      serviceType: 'intercity_transfer',
      pricingModel: 'intercity_fixed',
    });
  }
  if (returnTrip) {
    return rateOnRequest(RATE_ON_REQUEST, {
      serviceType: 'intercity_transfer',
      origin: route.origin,
      destination: route.destination,
      pricingModel: 'intercity_fixed',
    });
  }

  const rules = await getRulesByService('intercity_transfer');
  const rule = findIntercityRule(rules, route.origin, route.destination, vCat, vName, { vehicleId: vehicleId || vCat, vehicleCarId: vCarId });
  if (!rule) {
    return rateOnRequest(RATE_ON_REQUEST, {
      serviceType: 'intercity_transfer',
      origin: route.origin,
      destination: route.destination,
      pricingModel: 'intercity_fixed',
    });
  }
  if (rule.vehicleApplicability !== 'all' && !vCat && !vName && vCarId == null) {
    return rateOnRequest('Please select a vehicle for this intercity route.', {
      serviceType: 'intercity_transfer',
      origin: route.origin,
      destination: route.destination,
      pricingModel: 'intercity_fixed',
    });
  }
  return quoteFromDbRule(rule, {
    serviceType: 'intercity_transfer',
    origin: route.origin,
    destination: route.destination,
    pricingType: rule.pricingMode === 'whatsapp_assistant' ? 'custom_quote' : 'intercity_fixed',
    pricingModel: 'intercity_fixed',
  });
}

async function calculateGccPrice(payload = {}) {
  const {
    vehicleCategory,
    vehicle,
    vehicleName,
    destination,
    returnTrip,
  } = payload;
  const vCat = normalizeVehicleCat(vehicleCategory || vehicle?.category || '');
  const vName = vehicleName || vehicle?.name || vehicle?.label || '';

  if (!destination) {
    return rateOnRequest('Please select a GCC destination.', {
      serviceType: 'gcc_transfer',
      pricingModel: 'gcc_fixed',
    });
  }
  if (!vCat && !vName) {
    return rateOnRequest('Please select a GCC vehicle.', {
      serviceType: 'gcc_transfer',
      destination,
      pricingModel: 'gcc_fixed',
    });
  }
  const originName = payload.origin || 'Riyadh';
  if (returnTrip) {
    return rateOnRequest(RATE_ON_REQUEST, {
      serviceType: 'gcc_transfer',
      origin: originName,
      destination,
      pricingModel: 'gcc_fixed',
    });
  }
  if (samePlace(originName, destination)) {
    return rateOnRequest(RATE_ON_REQUEST, {
      serviceType: 'gcc_transfer',
      origin: originName,
      destination,
      pricingModel: 'gcc_fixed',
    });
  }

  const rules = await getRulesByService('gcc_transfer');
  const gccEnd = [originName, destination].find((end) => (
    rules.some((rule) => samePlace(rule.destination, end) || String(rule.destination || '').toLowerCase().includes(String(end || '').toLowerCase()))
  ));
  const otherEnd = gccEnd === originName ? destination : originName;
  if (!gccEnd || !samePlace(otherEnd, 'Riyadh')) {
    return rateOnRequest(RATE_ON_REQUEST, {
      serviceType: 'gcc_transfer',
      origin: originName,
      destination,
      pricingModel: 'gcc_fixed',
    });
  }

  const result = findGccRule(rules, gccEnd, vCat);
  if (result === 'unconfigured_vehicle' || !result) {
    return rateOnRequest(RATE_ON_REQUEST, {
      serviceType: 'gcc_transfer',
      origin: originName,
      destination,
      pricingModel: 'gcc_fixed',
    });
  }
  return quoteFromDbRule(result, {
    serviceType: 'gcc_transfer',
    origin: originName,
    destination,
    pricingType: result.pricingMode === 'whatsapp_assistant' ? 'custom_quote' : 'gcc_fixed',
    pricingModel: 'gcc_fixed',
  });
}

async function calculatePrice(payload = {}) {
  const serviceType = normalizeServiceType(payload.serviceType);
  if (!serviceType) {
    throw new Error('Service type is required');
  }

  switch (serviceType) {
    case 'airport_transfer':
      return calculateAirportPrice(payload);
    case 'city_transfer':
      return calculateCityPrice(payload);
    case 'chauffeur':
      return calculateChauffeurPrice(payload);
    case 'intercity_transfer':
      return calculateIntercityPrice(payload);
    case 'gcc_transfer':
      return calculateGccPrice(payload);
    default:
      return customQuote('Unsupported service type.');
  }
}

async function getPublicPricingSummary() {
  let rules = APPROVED_RATES;
  try {
    if (mongoose.connection.readyState === 1) {
      const docs = await Promise.race([
        PricingRule.find({ active: true, pricingMode: { $ne: 'whatsapp_assistant' }, price: { $gt: 0 } })
          .sort({ serviceType: 1, price: 1 })
          .maxTimeMS(800)
          .lean()
          .exec(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('mongo-timeout')), 900)),
      ]);
      if (docs?.length) rules = docs;
    }
  } catch {
    rules = APPROVED_RATES;
  }
  const summary = {};
  for (const rule of rules) {
    if (rule.pricingMode === 'whatsapp_assistant' || rule.price == null) continue;
    const current = summary[rule.serviceType];
    if (!current) {
      summary[rule.serviceType] = {
        fromPrice: rule.price,
        fromPriceUsd: rule.priceUsd ?? null,
        currency: rule.currency,
        count: 1,
      };
      continue;
    }
    if (rule.price < current.fromPrice) {
      current.fromPrice = rule.price;
      current.fromPriceUsd = rule.priceUsd ?? null;
    }
    current.count += 1;
  }
  return summary;
}

async function isPricingDbConfigured(serviceType) {
  if (mongoose.connection.readyState !== 1) return false;
  const st = normalizeServiceType(serviceType);
  if (!st) return false;
  try {
    const totalForService = await Promise.race([
      PricingRule.countDocuments({ serviceType: st }).maxTimeMS(800),
      new Promise((_, reject) => setTimeout(() => reject(new Error('mongo-timeout')), 900)),
    ]);
    if (Number(totalForService) > 0) return true;

    const settingDoc = await Promise.race([
      Settings.findOne({ key: `pricingConfigured:${st}` }).maxTimeMS(800).lean(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('mongo-timeout')), 900)),
    ]);
    return Boolean(settingDoc);
  } catch {
    return false;
  }
}

async function getRulesByService(serviceType) {
  const st = normalizeServiceType(serviceType);
  const local = approvedRules(st || undefined).sort((a, b) => a.price - b.price);
  if (!st) {
    return [...APPROVED_RATES].sort((a, b) => a.price - b.price);
  }
  const docs = await getActiveDbRules(st);
  if (docs.length) return docs;

  // Distinguish an uninitialized/offline DB from a configured DB where rules were disabled/deleted.
  if (await isPricingDbConfigured(st)) {
    return [];
  }
  return local;
}

module.exports = {
  calculatePrice,
  calculateAirportPrice,
  calculateCityPrice,
  calculateChauffeurPrice,
  calculateIntercityPrice,
  calculateGccPrice,
  getPublicPricingSummary,
  getRulesByService,
  normalizeServiceType,
  normalizeVehicleCat,
};
