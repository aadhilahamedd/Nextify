const PricingRule = require('../models/PricingRule');
const {
  GCC_CATEGORIES,
  normalizeServiceType,
  normalizeRoute,
} = require('../utils/vehicleCategories');

const DEFAULT_CURRENCY = 'SAR';

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

async function findAirportRule(airport, vehicleCategory, vehicleName) {
  const rules = await PricingRule.find({ serviceType: 'airport_transfer', active: true });
  const airportNorm = (airport || '').toLowerCase();
  return rules.find((rule) => {
    const airportMatch =
      !rule.airports?.length ||
      rule.airports.some((a) => airportNorm.includes(a.toLowerCase()) || a.toLowerCase().includes(airportNorm));
    return airportMatch && matchVehicleCategory(rule, vehicleCategory, vehicleName);
  });
}

async function findCityRule(vehicleCategory, vehicleName) {
  const rules = await PricingRule.find({ serviceType: 'city_transfer', active: true, origin: 'Riyadh' });
  return rules.find((r) => matchVehicleCategory(r, vehicleCategory, vehicleName));
}

async function findChauffeurRule(vehicleCategory, vehicleName, durationType) {
  const rules = await PricingRule.find({ serviceType: 'chauffeur', active: true, durationType });
  return rules.find((r) => matchVehicleCategory(r, vehicleCategory, vehicleName));
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

  return rules.find((r) => matchVehicleCategory(r, vehicleCategory, vehicleName));
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

  const vCat = vehicleCategory || vehicle?.category || '';
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
      if (!rule) return customQuote('No fixed city transfer rate for this vehicle.');
      return fixedQuote(rule, { serviceType, origin: 'Riyadh', maxDistanceKm: 20 });
    }

    case 'chauffeur': {
      if (!durationType || !['half_day', 'full_day'].includes(durationType)) {
        throw new Error('Duration must be half_day or full_day');
      }
      if (!vCat && !vName) return customQuote('Please select a vehicle.');
      const rule = await findChauffeurRule(vCat, vName, durationType);
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
        return customQuote('GCC transfers only support GMC Yukon, GMC Tahoe, and Chevrolet Suburban.');
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
    if (!summary[rule.serviceType]) {
      summary[rule.serviceType] = { fromPrice: rule.price, currency: rule.currency, count: 0 };
    }
    summary[rule.serviceType].fromPrice = Math.min(summary[rule.serviceType].fromPrice, rule.price);
    summary[rule.serviceType].count += 1;
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
