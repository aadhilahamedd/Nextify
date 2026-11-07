/**
 * Airport Transfer fixed routes.
 * Prices override the normal airport vehicle-base fare.
 * Reverse directions use the same price unless a separate reverse route is added.
 * Add a new route by appending one object to AIRPORT_FIXED_ROUTES.
 */

const { neighbourhoodLocationsForRoutes } = require('./cityNeighbourhoods');

const GMC_CATEGORIES = ['gmc', 'gmc_yukon', 'gmc_tahoe', 'chevrolet_suburban'];
const SEDAN_CATEGORIES = ['ford_taurus', 'lexus_es'];

const LOCATIONS = [
  {
    id: 'jeddah_airport',
    kind: 'airport',
    label: 'Jeddah Airport',
    displayLabel: 'King Abdulaziz International Airport – Jeddah',
    iata: ['JED'],
    ident: ['OEJN'],
    cityHubId: 'jeddah',
    airportIds: ['jeddah-airport'],
    aliases: [
      'jeddah airport',
      'jeddah intl',
      'jeddah international',
      'jeddah international airport',
      'king abdulaziz international airport',
      'king abdulaziz airport',
      'kaia',
      'jed',
      'oejn',
      'jeddah-airport',
      'مطار جدة',
      'مطار الملك عبدالعزيز',
      'مطار الملك عبدالعزيز الدولي',
    ],
  },
  {
    id: 'al_qassim_airport',
    kind: 'airport',
    label: 'Al Qassim Airport',
    displayLabel: 'Prince Naif bin Abdulaziz International Airport – Al Qassim',
    iata: ['ELQ'],
    ident: ['OEGS'],
    airportIds: ['gassim-airport'],
    aliases: [
      'al qassim airport',
      'qassim airport',
      'gassim airport',
      'al gassim airport',
      'prince naif bin abdulaziz international airport',
      'prince naif bin abdulaziz airport',
      'elq',
      'oegs',
      'gassim-airport',
      'مطار القصيم',
      'مطار الامير نايف بن عبدالعزيز',
      'مطار الأمير نايف بن عبدالعزيز',
    ],
  },
  {
    id: 'riyadh',
    kind: 'city',
    label: 'Riyadh',
    displayLabel: 'Riyadh',
    destIds: ['riyadh'],
    airportHubId: 'riyadh_airport',
    aliases: ['riyadh', 'ar riyadh', 'riad', 'الرياض'],
  },
  {
    id: 'riyadh_airport',
    kind: 'airport',
    cityHubId: 'riyadh',
    label: 'Riyadh Airport',
    displayLabel: 'King Khalid International Airport – Riyadh',
    iata: ['RUH'],
    ident: ['OERK'],
    airportIds: ['riyadh-airport'],
    aliases: [
      'riyadh airport',
      'king khalid international airport',
      'king khalid airport',
      'kkia',
      'ruh',
      'oerk',
      'riyadh-airport',
      'مطار الرياض',
      'مطار الملك خالد',
      'مطار الملك خالد الدولي',
    ],
  },
  {
    id: 'dammam_airport',
    kind: 'airport',
    cityHubId: 'dammam',
    label: 'Dammam Airport',
    displayLabel: 'King Fahd International Airport – Dammam',
    iata: ['DMM'],
    ident: ['OEDF'],
    airportIds: ['dammam-airport'],
    aliases: [
      'dammam airport',
      'king fahd international airport',
      'king fahd airport',
      'kfia',
      'dmm',
      'oedf',
      'dammam-airport',
      'مطار الدمام',
      'مطار الملك فهد',
      'مطار الملك فهد الدولي',
    ],
  },
  {
    id: 'madinah_airport',
    kind: 'airport',
    cityHubId: 'madinah',
    label: 'Madinah Airport',
    displayLabel: 'Prince Mohammad Bin Abdulaziz Airport – Madinah',
    iata: ['MED'],
    ident: ['OEMA'],
    airportIds: ['medina-airport'],
    aliases: [
      'madinah airport',
      'medina airport',
      'prince mohammad bin abdulaziz airport',
      'prince mohammad bin abdulaziz international airport',
      'med',
      'oema',
      'medina-airport',
      'مطار المدينة',
      'مطار الامير محمد بن عبدالعزيز',
      'مطار الأمير محمد بن عبدالعزيز',
    ],
  },
  {
    id: 'makkah',
    kind: 'city',
    label: 'Makkah',
    displayLabel: 'Makkah',
    destIds: ['mecca'],
    aliases: ['makkah', 'mecca', 'maka', 'makka', 'makkah al mukarramah', 'مكة', 'مكة المكرمة'],
  },
  {
    id: 'madinah',
    kind: 'city',
    label: 'Madinah',
    displayLabel: 'Madinah',
    destIds: ['medina'],
    airportHubId: 'madinah_airport',
    aliases: ['madinah', 'medina', 'al madinah', 'المدينة', 'المدينة المنورة'],
  },
  {
    id: 'dammam',
    kind: 'city',
    label: 'Dammam',
    displayLabel: 'Dammam',
    destIds: ['dammam'],
    airportHubId: 'dammam_airport',
    aliases: ['dammam', 'ad dammam', 'الدمام'],
  },
  {
    id: 'khobar',
    kind: 'city',
    label: 'Al Khobar',
    displayLabel: 'Al Khobar',
    destIds: ['khobar'],
    aliases: ['khobar', 'al khobar', 'al-khobar', 'alkhobar', 'الخبر'],
  },
  {
    id: 'jeddah',
    kind: 'city',
    label: 'Jeddah',
    displayLabel: 'Jeddah',
    destIds: ['jeddah'],
    airportHubId: 'jeddah_airport',
    aliases: ['jeddah', 'jiddah', 'jedda', 'jeda', 'جدة', 'جده'],
  },
  {
    id: 'bahrain',
    kind: 'city',
    label: 'Bahrain',
    displayLabel: 'Bahrain',
    destIds: ['bahrain'],
    aliases: ['bahrain', 'manama', 'kingdom of bahrain', 'البحرين'],
  },
  ...neighbourhoodLocationsForRoutes(),
];

const AIRPORT_FIXED_ROUTES = [
  { id: 'jeddah_airport_makkah', originId: 'jeddah_airport', destinationId: 'makkah', distanceKm: 90, gmc: 800, sedan: 600 },
  { id: 'jeddah_airport_madinah', originId: 'jeddah_airport', destinationId: 'madinah', distanceKm: 394, gmc: 1000, sedan: 800 },
  { id: 'makkah_madinah', originId: 'makkah', destinationId: 'madinah', distanceKm: 437, gmc: 1000, sedan: 800 },
  { id: 'riyadh_al_qassim_airport', originId: 'riyadh', destinationId: 'al_qassim_airport', distanceKm: 370, gmc: 1000, sedan: 800 },
  { id: 'riyadh_dammam', originId: 'riyadh', destinationId: 'dammam', distanceKm: 430, gmc: 1300, sedan: 1100 },
  { id: 'riyadh_khobar', originId: 'riyadh', destinationId: 'khobar', distanceKm: 430, gmc: 1300, sedan: 1100 },
  { id: 'riyadh_bahrain', originId: 'riyadh', destinationId: 'bahrain', distanceKm: 480, gmc: 1500, sedan: 1300 },
  { id: 'riyadh_jeddah', originId: 'riyadh', destinationId: 'jeddah', distanceKm: 980, gmc: 3200, sedan: 2500 },
  { id: 'riyadh_makkah', originId: 'riyadh', destinationId: 'makkah', distanceKm: 850, gmc: 3000, sedan: 2500 },
  { id: 'riyadh_madinah', originId: 'riyadh', destinationId: 'madinah', distanceKm: 850, gmc: 2900, sedan: 2500 },
];

const LOCATION_BY_ID = Object.fromEntries(LOCATIONS.map((loc) => [loc.id, loc]));

function normalizeLocationText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/^ال/, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeAirportText(text) {
  return /\b(airport|intl|international|aerodrome|مطار)\b/.test(text) || /^[a-z]{3}$/.test(text);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function locationTexts(value) {
  if (value == null || value === '') return [];
  if (typeof value === 'object') {
    const fields = [
      value.id,
      value.iata,
      value.ident,
      value.nameEn,
      value.nameAr,
      value.address,
      value.label,
      value.cityEn,
      ...(Array.isArray(value.aliases) ? value.aliases : []),
    ];
    if (value.kind === 'airport' && value.cityEn) {
      // City name on an airport object is not a city pickup.
      return fields
        .filter((field) => field && field !== value.cityEn && field !== value.cityAr)
        .map(normalizeLocationText)
        .filter(Boolean);
    }
    return fields.map(normalizeLocationText).filter(Boolean);
  }
  return [normalizeLocationText(value)].filter(Boolean);
}

function airportTextMatches(text, location) {
  return location.aliases.some((alias) => {
    const needle = normalizeLocationText(alias);
    if (!needle || !text) return false;
    if (text === needle) return true;
    if (needle.length < 5) return false;
    return text.includes(needle);
  });
}

function cityTextMatches(text, location) {
  if (looksLikeAirportText(text)) return false;
  return location.aliases.some((alias) => {
    const needle = normalizeLocationText(alias);
    if (!needle || !text) return false;
    if (text === needle) return true;
    return new RegExp(`(?:^|\\s)${escapeRegExp(needle)}(?:\\s|$)`).test(text);
  });
}

function objectMatchesLocation(value, location) {
  if (!value || typeof value !== 'object') return false;
  if (location.iata?.includes(String(value.iata || '').toUpperCase())) return true;
  if (location.ident?.includes(String(value.ident || '').toUpperCase())) return true;
  if (location.airportIds?.includes(value.id)) return true;
  if (location.destIds?.includes(value.id)) return true;
  if (value.id === location.id) return true;
  return false;
}

function resolveFixedRouteLocation(value) {
  if (value == null || value === '') return null;

  if (typeof value === 'object') {
    const direct = LOCATIONS.find((location) => objectMatchesLocation(value, location));
    if (direct) return direct;
    if (value.kind === 'airport' || value.iata || value.ident) {
      // A known airport that is not one of the configured route airports.
      return null;
    }
  }

  const texts = locationTexts(value);
  if (!texts.length) return null;

  const airports = LOCATIONS.filter((location) => location.kind === 'airport');
  for (const location of airports) {
    if (texts.some((text) => airportTextMatches(text, location))) return location;
  }

  if (texts.some(looksLikeAirportText)) return null;

  const neighbourhoods = LOCATIONS.filter((location) => location.kind === 'neighbourhood');
  for (const location of neighbourhoods) {
    if (texts.some((text) => cityTextMatches(text, location))) return location;
  }

  const cities = LOCATIONS.filter((location) => location.kind === 'city');
  for (const location of cities) {
    if (texts.some((text) => cityTextMatches(text, location))) return location;
  }
  return null;
}

function locationDisplayLabel(location) {
  return location?.displayLabel || location?.label || location?.id || '';
}

function decorateMatchedRoute(route, pickupLoc, dropoffLoc, reversed = false) {
  return {
    ...route,
    reversed,
    originLabel: locationDisplayLabel(pickupLoc),
    destinationLabel: locationDisplayLabel(dropoffLoc),
  };
}

function locationCandidates(value) {
  const loc = resolveFixedRouteLocation(value);
  if (!loc) return [];
  const list = [loc];
  const seen = new Set([loc.id]);
  const add = (id) => {
    const next = LOCATION_BY_ID[id];
    if (!next || seen.has(next.id)) return;
    seen.add(next.id);
    list.push(next);
  };
  if (loc.cityHubId) add(loc.cityHubId);
  if (loc.airportHubId) add(loc.airportHubId);
  const city = loc.cityHubId ? LOCATION_BY_ID[loc.cityHubId] : (loc.kind === 'city' ? loc : null);
  if (city?.airportHubId) add(city.airportHubId);
  return list;
}

function sameLocationSet(left, right) {
  const leftIds = new Set(left.map((item) => item.id));
  return right.some((item) => leftIds.has(item.id));
}

function matchAirportFixedRoute(pickup, dropoff) {
  const origins = locationCandidates(pickup);
  const destinations = locationCandidates(dropoff);
  if (!origins.length || !destinations.length || sameLocationSet(origins, destinations)) return null;
  const pickupLoc = origins[0];
  const dropoffLoc = destinations[0];
  for (const origin of origins) {
    for (const destination of destinations) {
      const forward = AIRPORT_FIXED_ROUTES.find(
        (item) => item.originId === origin.id && item.destinationId === destination.id,
      );
      if (forward) return decorateMatchedRoute(forward, pickupLoc, dropoffLoc, false);
    }
  }
  for (const origin of origins) {
    for (const destination of destinations) {
      const reverse = AIRPORT_FIXED_ROUTES.find(
        (item) => item.originId === destination.id && item.destinationId === origin.id,
      );
      if (reverse) return decorateMatchedRoute(reverse, pickupLoc, dropoffLoc, true);
    }
  }
  return null;
}

function normalizeFixedRouteVehicle(category) {
  const cat = String(category || '').trim().toLowerCase();
  if (cat === 'gmc_yukon' || cat === 'gmc_tahoe' || cat === 'chevrolet_suburban') return 'gmc';
  return cat;
}

function isGmcFixedRouteVehicle(category) {
  return GMC_CATEGORIES.includes(normalizeFixedRouteVehicle(category));
}

function isSedanFixedRouteVehicle(category) {
  return SEDAN_CATEGORIES.includes(normalizeFixedRouteVehicle(category));
}

function fixedRoutePriceForVehicle(route, vehicleCategory, vehicleName = '') {
  if (!route) return null;
  const cat = normalizeFixedRouteVehicle(vehicleCategory);
  if (isGmcFixedRouteVehicle(cat)) return route.gmc;
  if (isSedanFixedRouteVehicle(cat)) return route.sedan;
  const name = String(vehicleName || vehicleCategory || '').toLowerCase();
  if (/\bgmc\b|yukon|tahoe|suburban/.test(name)) return route.gmc;
  if (/\btaurus\b|\blexus\b/.test(name)) return route.sedan;
  return null;
}

function quoteAirportFixedRoute(route, vehicleCategory, extra = {}) {
  if (!route) return null;
  const price = fixedRoutePriceForVehicle(route, vehicleCategory, extra.displayLabel || extra.vehicleName);
  const origin = LOCATION_BY_ID[route.originId];
  const destination = LOCATION_BY_ID[route.destinationId];
  const labeled = {
    ...route,
    originLabel: route.originLabel || locationDisplayLabel(origin),
    destinationLabel: route.destinationLabel || locationDisplayLabel(destination),
  };
  const base = {
    ...extra,
    routeId: labeled.id,
    originId: labeled.originId,
    destinationId: labeled.destinationId,
    originLabel: labeled.originLabel,
    destinationLabel: labeled.destinationLabel,
    distanceKm: labeled.distanceKm,
    distanceApproximate: true,
    routeType: 'fixed',
    pricingType: 'airport_fixed_route',
    pricingModel: 'airport_fixed_route',
    serviceType: 'airport_transfer',
    displayLabel: extra.displayLabel || extra.vehicleName || labeled.displayLabel,
  };
  if (price == null) {
    return {
      ...base,
      price: null,
      totalAmount: null,
      customQuoteRequired: true,
      payable: false,
      quoteStatus: 'rate_on_request',
      message: 'Rate on Request',
    };
  }
  return {
    ...base,
    price,
    totalAmount: price,
    customQuoteRequired: false,
    payable: true,
    quoteStatus: 'priced',
    message: 'Airport Transfer — Fixed Route',
  };
}

module.exports = {
  AIRPORT_FIXED_ROUTES,
  LOCATIONS,
  GMC_CATEGORIES,
  SEDAN_CATEGORIES,
  resolveFixedRouteLocation,
  matchAirportFixedRoute,
  fixedRoutePriceForVehicle,
  quoteAirportFixedRoute,
  isGmcFixedRouteVehicle,
  isSedanFixedRouteVehicle,
};
