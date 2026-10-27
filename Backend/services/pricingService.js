const PricingRule = require('../models/PricingRule');
const {
  GCC_CATEGORIES,
  normalizeServiceType,
  normalizeRoute,
} = require('../utils/vehicleCategories');

const DEFAULT_CURRENCY = 'SAR';

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

function customQuote(message) {
  return {
    success: true,
    price: null,
    currency: DEFAULT_CURRENCY,
    pricingType: 'custom_quote',
    customQuoteRequired: true,
    message: message || 'This journey requires a custom quotation.',
    totalAmount: null,
  };
}

function fixedQuote(rule, extra = {}) {
  return {
    success: true,
    price: rule.price,
    currency: rule.currency || DEFAULT_CURRENCY,
    pricingType: 'fixed',
    customQuoteRequired: false,
    pricingRuleId: rule._id,
    vehicleCategory: rule.vehicleCategory,
    displayLabel: rule.displayLabel,
    totalAmount: rule.price,
    message: null,
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
  return rule.airports.some((a) => airportNorm.includes(a.toLowerCase()) || a.toLowerCase().includes(airportNorm));
}

function pickRule(rules, vehicleCategory, vehicleName, extraMatch = () => true) {
  const vCat = normalizeVehicleCat(vehicleCategory);
  const exact = rules.find((rule) => extraMatch(rule) && vCat && rule.vehicleCategory === vCat);
  if (exact) return exact;
  return rules.find((rule) => extraMatch(rule) && matchVehicleCategory(rule, vehicleCategory, vehicleName));
}

async function findAirportRule(airport, vehicleCategory, vehicleName) {
  const rules = await PricingRule.find({ serviceType: 'airport_transfer', active: true });
  return pickRule(rules, vehicleCategory, vehicleName, (rule) => airportMatches(rule, airport));
}

async function findCityRule(vehicleCategory, vehicleName) {
  const rules = await PricingRule.find({ serviceType: 'city_transfer', active: true, origin: 'Riyadh' });
  return pickRule(rules, vehicleCategory, vehicleName);
}

async function findChauffeurRule(vehicleCategory, vehicleName, durationType) {
  const rules = await PricingRule.find({ serviceType: 'chauffeur', active: true, durationType });
  return pickRule(rules, vehicleCategory, vehicleName);
}

async function findIntercityRule(origin, destination, vehicleCategory, vehicleName) {
  const route = normalizeRoute(origin, destination);
  const rules = await PricingRule.find({
    serviceType: 'intercity_transfer',
    active: true,
    origin: route.origin,
    destination: route.destination,
  });
  if (!rules.length) return null;

  const allRule = rules.find((r) => r.vehicleApplicability === 'all');
  if (allRule) return allRule;

  return pickRule(rules, vehicleCategory, vehicleName);
}

async function findGccRule(destination, vehicleCategory) {
  const destNorm = (destination || '').toLowerCase();
  const rule = await PricingRule.findOne({
    serviceType: 'gcc_transfer',
    active: true,
    destination: { $regex: new RegExp(destNorm, 'i') },
  });
  if (!rule) return null;
  if (!GCC_CATEGORIES.includes(vehicleCategory)) return 'invalid_vehicle';
  if (rule.allowedVehicleCategories?.length && !rule.allowedVehicleCategories.includes(vehicleCategory)) {
    return 'invalid_vehicle';
  }
  return rule;
}

async function calculatePrice(payload) {
  const serviceType = normalizeServiceType(payload.serviceType);
  const {
    vehicleCategory,
    vehicle,
    vehicleName,
    airport,
    origin,
    destination,
    durationType,
    distanceKm,
  } = payload;

  const vCat = normalizeVehicleCat(vehicleCategory || vehicle?.category || '');
  const vName = vehicleName || vehicle?.name || vehicle?.label || '';

  if (!serviceType) {
    throw new Error('Service type is required');
  }

  switch (serviceType) {
    case 'airport_transfer': {
      if (!vCat && !vName) return customQuote('Please select a vehicle.');
      const rule = await findAirportRule(airport || origin, vCat, vName);
      if (!rule) return customQuote('No fixed airport transfer rate for this vehicle. Custom quote required.');
      return fixedQuote(rule, { serviceType, airport: airport || origin });
    }

    case 'city_transfer': {
      const km = Number(distanceKm);
      if (km > 20) {
        return customQuote('Trips above 20 KM may require a custom quote.');
      }
      if (!vCat && !vName) return customQuote('Please select a vehicle.');
      const rule = await findCityRule(vCat, vName);
      if (!rule) return customQuote('City transfer is not available for this vehicle.');
      return fixedQuote(rule, { serviceType, origin: 'Riyadh', maxDistanceKm: 20 });
    }

    case 'chauffeur': {
      if (!durationType || !['half_day', 'full_day'].includes(durationType)) {
        throw new Error('Duration must be half_day or full_day');
      }
      if (!vCat && !vName) return customQuote('Please select a vehicle.');
      const rule = await findChauffeurRule(vCat, vName, durationType);
      if (!rule && durationType === 'half_day') {
        return customQuote('This vehicle is available for full day service only.');
      }
      if (!rule) return customQuote('No chauffeur rate for this vehicle and duration. Custom quote required.');
      return fixedQuote(rule, { serviceType, durationType });
    }

    case 'intercity_transfer': {
      const route = normalizeRoute(origin, destination);
      if (!route.origin || !route.destination) {
        return customQuote('Please select a supported intercity route.');
      }
      const rule = await findIntercityRule(route.origin, route.destination, vCat, vName);
      if (!rule) {
        return customQuote('This intercity route is not supported or requires a custom quote.');
      }
      if (rule.vehicleApplicability !== 'all' && !vCat && !vName) {
        return customQuote('Please select a vehicle for this intercity route.');
      }
      return fixedQuote(rule, { serviceType, origin: route.origin, destination: route.destination });
    }

    case 'gcc_transfer': {
      if (!destination) return customQuote('Please select a GCC destination.');
      if (!vCat) return customQuote('Please select a GCC vehicle.');
      const result = await findGccRule(destination, vCat);
      if (result === 'invalid_vehicle') {
        return customQuote('GCC transfers only support GMC.');
      }
      if (!result) return customQuote('This GCC route requires a custom quote.');
      return fixedQuote(result, { serviceType, origin: 'Riyadh', destination: result.destination });
    }

    default:
      return customQuote('Unsupported service type.');
  }
}

async function getPublicPricingSummary() {
  const rules = await PricingRule.find({ active: true }).sort({ serviceType: 1, price: 1 });
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
  return PricingRule.find({ active: true, ...(st ? { serviceType: st } : {}) }).sort({ price: 1 });
}

module.exports = {
  calculatePrice,
  getPublicPricingSummary,
  getRulesByService,
  normalizeServiceType,
};
