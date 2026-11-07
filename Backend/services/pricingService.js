const mongoose = require('mongoose');
const PricingRule = require('../models/PricingRule');
const { APPROVED_RATES } = require('../seed/pricingSeed');
const {
  normalizeServiceType,
  normalizeRoute,
  samePlace,
  routesMatch,
  canonicalPlace,
} = require('../utils/vehicleCategories');
const {
  CITY_MAX_KM,
  CITY_MIN_KM,
  citySlabForDistance,
  ruleCoversCitySlab,
} = require('../utils/distanceSlabs');
const {
  matchAirportFixedRoute,
  quoteAirportFixedRoute,
} = require('../data/airportFixedRoutes');
const { findAirport } = require('../data/saudiAirports');

const DEFAULT_CURRENCY = 'SAR';
const RATE_ON_REQUEST = 'Rate on Request';
const LONG_DISTANCE_QUOTE = 'Long Distance / Custom Quote';

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
    pricingRuleId: rule._id,
    vehicleCategory: rule.vehicleCategory,
    displayLabel: rule.displayLabel,
    totalAmount: extra.totalAmount != null ? extra.totalAmount : rule.price,
    message: extra.message || null,
    ...extra,
  };
}

function matchVehicleCategory(rule, vehicleCategory, vehicleName) {
  if (rule.vehicleApplicability === 'all') return true;
  const vCat = normalizeVehicleCat(vehicleCategory);
  if (vCat && rule.vehicleCategory === vCat) return true;
  if (vehicleCategory && rule.vehicleCategory === vehicleCategory) return true;
  if (vehicleCategory && rule.vehicleNames?.length) {
    const catNorm = vehicleCategory.replace(/_/g, ' ').toLowerCase();
    const matchesName = rule.vehicleNames.some((n) => {
      const nn = n.toLowerCase();
      return nn.includes(catNorm) || catNorm.includes(nn) || (vehicleCategory === 'mini_suv' && nn.includes('mini suv'));
    });
    if (matchesName) return true;
  }
  if (vehicleName && rule.vehicleNames?.length) {
    const vn = vehicleName.toLowerCase();
    return rule.vehicleNames.some((n) => vn.includes(n.toLowerCase()) || n.toLowerCase().includes(vn));
  }
  return false;
}

function airportMatches(rule, airport) {
  const airportNorm = (airport || '').toLowerCase();
  if (!rule.airports?.length) return true;
  if (!airportNorm) return true;
  if (rule.airports.some((a) => airportNorm.includes(a.toLowerCase()) || a.toLowerCase().includes(airportNorm))) {
    return true;
  }
  // Existing vehicle rates apply at all Saudi airports, not only the original three hubs.
  return /airport|مطار/.test(airportNorm) || Boolean(canonicalPlace(airport));
}

function pickRule(rules, vehicleCategory, vehicleName, extraMatch = () => true) {
  const vCat = normalizeVehicleCat(vehicleCategory);
  const exact = rules.find((rule) => extraMatch(rule) && vCat && rule.vehicleCategory === vCat);
  if (exact) return exact;
  return rules.find((rule) => extraMatch(rule) && matchVehicleCategory(rule, vehicleCategory, vehicleName));
}

function approvedRules(serviceType, extra = () => true) {
  return APPROVED_RATES.filter((rule) => rule.serviceType === serviceType && extra(rule));
}

function findAirportRule(rules, airport, vehicleCategory, vehicleName) {
  return pickRule(rules, vehicleCategory, vehicleName, (rule) => airportMatches(rule, airport));
}

function findCityRulesForVehicle(rules, vehicleCategory, vehicleName) {
  return rules.filter(
    (rule) => (!rule.origin || rule.origin === 'Riyadh')
      && matchVehicleCategory(rule, vehicleCategory, vehicleName),
  );
}

function findCityRuleForSlab(rules, vehicleCategory, vehicleName, slab) {
  const matches = findCityRulesForVehicle(rules, vehicleCategory, vehicleName)
    .filter((rule) => ruleCoversCitySlab(rule, slab))
    .sort((a, b) => {
      const aMax = a.maxDistanceKm == null ? Number.POSITIVE_INFINITY : a.maxDistanceKm;
      const bMax = b.maxDistanceKm == null ? Number.POSITIVE_INFINITY : b.maxDistanceKm;
      return aMax - bMax;
    });
  return matches[0] || null;
}

function findChauffeurRule(rules, vehicleCategory, vehicleName, durationType) {
  return pickRule(
    rules.filter((rule) => rule.durationType === durationType),
    vehicleCategory,
    vehicleName,
  );
}

function findIntercityRule(rules, origin, destination, vehicleCategory, vehicleName) {
  const route = normalizeRoute(origin, destination);
  if (route.origin && route.destination && samePlace(route.origin, route.destination)) return null;
  const routeRules = rules.filter((rule) => routesMatch(rule.origin, rule.destination, origin, destination));
  if (!routeRules.length) return null;
  const allRule = routeRules.find((r) => r.vehicleApplicability === 'all');
  if (allRule) return allRule;
  return pickRule(routeRules, vehicleCategory, vehicleName);
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

async function calculateAirportPrice(payload = {}) {
  const {
    vehicleCategory,
    vehicle,
    vehicleName,
    airport,
    origin,
    destination,
    pickupPlace,
    dropoffPlace,
  } = payload;
  const vCat = normalizeVehicleCat(vehicleCategory || vehicle?.category || '');
  const vName = vehicleName || vehicle?.name || vehicle?.label || '';
  const airportName = airport || origin;

  if (!vCat && !vName) return customQuote('Please select a vehicle.', { serviceType: 'airport_transfer' });

  const pickupValue = pickupPlace || origin || airport;
  const dropoffValue = dropoffPlace || destination;
  const fixedRoute = matchAirportFixedRoute(pickupValue, dropoffValue);
  if (fixedRoute) {
    const matched = quoteAirportFixedRoute(fixedRoute, vCat || vName, {
      airport: airportName,
      vehicleCategory: vCat,
      vehicleName: vName,
      displayLabel: vName || vCat,
    });
    if (matched.customQuoteRequired) {
      return rateOnRequest(matched.message, matched);
    }
    return {
      success: true,
      currency: DEFAULT_CURRENCY,
      ...matched,
    };
  }

  const pickupAirport = findAirport(pickupPlace) || findAirport(origin) || findAirport(airport);
  const dropoffAirport = findAirport(dropoffPlace) || findAirport(destination);
  if (dropoffValue && !pickupAirport && !dropoffAirport) {
    return rateOnRequest('Rate on Request', {
      serviceType: 'airport_transfer',
      origin: origin || airportName,
      destination: destination || '',
      pricingModel: 'airport_transfer',
    });
  }

  const resolvedAirport = pickupAirport?.nameEn || dropoffAirport?.nameEn || airportName;
  const rules = await getRulesByService('airport_transfer');
  const rule = findAirportRule(rules, resolvedAirport, vCat, vName);
  if (!rule) {
    return customQuote('No fixed airport transfer rate for this vehicle. Custom quote required.', {
      serviceType: 'airport_transfer',
      airport: resolvedAirport,
      pricingModel: 'airport_transfer',
    });
  }

  return fixedQuote(rule, {
    serviceType: 'airport_transfer',
    airport: resolvedAirport,
    destination: destination || '',
    pricingType: 'airport_base',
    quoteStatus: 'priced',
    pricingModel: 'airport_transfer',
  });
}

async function calculateCityPrice(payload = {}) {
  const {
    vehicleCategory,
    vehicle,
    vehicleName,
    distanceKm,
  } = payload;
  const vCat = normalizeVehicleCat(vehicleCategory || vehicle?.category || '');
  const vName = vehicleName || vehicle?.name || vehicle?.label || '';

  if (!vCat && !vName) return customQuote('Please select a vehicle.', { serviceType: 'city_transfer' });

  const km = Number(distanceKm);
  const slab = citySlabForDistance(Number.isFinite(km) && km > 0 ? km : CITY_MIN_KM);
  const rules = await getRulesByService('city_transfer');
  const vehicleRules = findCityRulesForVehicle(rules, vCat, vName);

  if (slab.kind === 'invalid') {
    return customQuote('Please enter a valid City Transfer distance.', {
      serviceType: 'city_transfer',
      pricingModel: 'city_transfer',
    });
  }

  if (slab.kind === 'long_distance') {
    return customQuote(LONG_DISTANCE_QUOTE, {
      serviceType: 'city_transfer',
      quoteStatus: 'long_distance',
      origin: 'Riyadh',
      distanceKm: slab.distanceKm,
      slabLabel: slab.label,
      maxDistanceKm: CITY_MAX_KM,
      pricingModel: 'city_transfer',
    });
  }

  if (!vehicleRules.length) {
    return customQuote('City transfer is not available for this vehicle.', {
      serviceType: 'city_transfer',
      origin: 'Riyadh',
      distanceKm: slab.distanceKm,
      slabLabel: slab.label,
      pricingModel: 'city_transfer',
    });
  }

  const rule = findCityRuleForSlab(rules, vCat, vName, slab);
  if (!rule) {
    return rateOnRequest(
      `No configured City Transfer rate for the ${slab.label} slab. ${RATE_ON_REQUEST}.`,
      {
        serviceType: 'city_transfer',
        origin: 'Riyadh',
        distanceKm: slab.distanceKm,
        slabLabel: slab.label,
        minDistanceKm: slab.minKm,
        maxDistanceKm: slab.maxKm,
        pricingModel: 'city_transfer',
      },
    );
  }

  return fixedQuote(rule, {
    serviceType: 'city_transfer',
    origin: 'Riyadh',
    pricingType: 'city_distance',
    quoteStatus: 'priced',
    distanceKm: slab.distanceKm,
    slabLabel: slab.label,
    minDistanceKm: slab.minKm,
    maxDistanceKm: rule.maxDistanceKm ?? slab.maxKm,
    pricingModel: 'city_transfer',
  });
}

async function calculateChauffeurPrice(payload = {}) {
  const {
    vehicleCategory,
    vehicle,
    vehicleName,
    durationType,
  } = payload;
  const vCat = normalizeVehicleCat(vehicleCategory || vehicle?.category || '');
  const vName = vehicleName || vehicle?.name || vehicle?.label || '';

  if (!durationType || !['half_day', 'full_day'].includes(durationType)) {
    throw new Error('Duration must be half_day or full_day');
  }
  if (!vCat && !vName) return customQuote('Please select a vehicle.', { serviceType: 'chauffeur' });

  const rules = await getRulesByService('chauffeur');
  const rule = findChauffeurRule(rules, vCat, vName, durationType);
  if (!rule && durationType === 'half_day') {
    return customQuote('This vehicle is available for full day service only.', { serviceType: 'chauffeur', durationType });
  }
  if (!rule) {
    return customQuote('No chauffeur rate for this vehicle and duration. Custom quote required.', {
      serviceType: 'chauffeur',
      durationType,
    });
  }
  return fixedQuote(rule, { serviceType: 'chauffeur', durationType, pricingModel: 'chauffeur' });
}

async function calculateIntercityPrice(payload = {}) {
  const {
    vehicleCategory,
    vehicle,
    vehicleName,
    origin,
    destination,
    returnTrip,
  } = payload;
  const vCat = normalizeVehicleCat(vehicleCategory || vehicle?.category || '');
  const vName = vehicleName || vehicle?.name || vehicle?.label || '';
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
  const rule = findIntercityRule(rules, route.origin, route.destination, vCat, vName);
  if (!rule) {
    return rateOnRequest(RATE_ON_REQUEST, {
      serviceType: 'intercity_transfer',
      origin: route.origin,
      destination: route.destination,
      pricingModel: 'intercity_fixed',
    });
  }
  if (rule.vehicleApplicability !== 'all' && !vCat && !vName) {
    return rateOnRequest('Please select a vehicle for this intercity route.', {
      serviceType: 'intercity_transfer',
      origin: route.origin,
      destination: route.destination,
      pricingModel: 'intercity_fixed',
    });
  }
  return fixedQuote(rule, {
    serviceType: 'intercity_transfer',
    origin: route.origin,
    destination: route.destination,
    pricingType: 'intercity_fixed',
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
  return fixedQuote(result, {
    serviceType: 'gcc_transfer',
    origin: originName,
    destination,
    pricingType: 'gcc_fixed',
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
        PricingRule.find({ active: true }).sort({ serviceType: 1, price: 1 }).maxTimeMS(800).lean().exec(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('mongo-timeout')), 900)),
      ]);
      if (docs?.length) rules = docs;
    }
  } catch {
    rules = APPROVED_RATES;
  }
  const summary = {};
  for (const rule of rules) {
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

async function getRulesByService(serviceType) {
  const st = normalizeServiceType(serviceType);
  const local = approvedRules(st || undefined).sort((a, b) => a.price - b.price);
  if (!st) {
    return [...APPROVED_RATES].sort((a, b) => a.price - b.price);
  }
  try {
    if (mongoose.connection.readyState === 1) {
      const docs = await Promise.race([
        PricingRule.find({ active: true, serviceType: st }).sort({ price: 1 }).maxTimeMS(800).lean().exec(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('mongo-timeout')), 900)),
      ]);
      if (docs?.length) return docs;
    }
  } catch {
    /* use approved rates */
  }
  return local;
}

module.exports = {
  calculatePrice,
  calculateAirportPrice,
  calculateCityPrice,
  calculateIntercityPrice,
  calculateGccPrice,
  getPublicPricingSummary,
  getRulesByService,
  normalizeServiceType,
};
