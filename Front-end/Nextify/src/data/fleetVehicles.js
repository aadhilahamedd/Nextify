import { matchAirportFixedRoute, quoteAirportFixedRoute } from './airportFixedRoutes.js';

export const FLEET_CLASS = {
  FIRST: 'First class',
  BUSINESS: 'Business class',
  SUV: 'SUV',
  SEDAN: 'Sedan',
  VAN: 'Van',
  COACHES: 'Coaches',
};

export const FLEET_VEHICLES = [
  {
    category: 'gmc',
    label: 'GMC Yukon',
    names: ['gmc', 'yukon', 'tahoe', 'suburban'],
    fleetClass: FLEET_CLASS.SUV,
    image: '/images/car/GMC Yukon.png?v=12',
    airport: 240,
    city: 240,
    half: 800,
    full: 1400,
    intercity: 'gmc',
    gcc: true,
  },
  {
    category: 'bmw_5',
    label: 'BMW 5 Series',
    names: ['5 series', 'bmw 5'],
    fleetClass: FLEET_CLASS.BUSINESS,
    image: '/images/car/bmw-5-series.webp',
    airport: 800,
    city: 800,
    half: null,
    full: 2800,
  },
  {
    category: 'bmw_7',
    label: 'BMW 7 Series',
    names: ['7 series', 'bmw 7'],
    fleetClass: FLEET_CLASS.FIRST,
    image: '/images/car/bmw-7-series.webp',
    airport: 1000,
    city: 1000,
    half: null,
    full: 3000,
  },
  {
    category: 'ford_taurus',
    label: 'Ford Taurus',
    names: ['taurus'],
    fleetClass: FLEET_CLASS.SEDAN,
    image: '/images/car/ford-taurus.webp',
    airport: 180,
    city: 180,
    half: 700,
    full: 1200,
    intercity: 'sedan',
  },
  {
    category: 'lexus_es',
    label: 'Lexus ES 350',
    names: ['lexus', 'es 350'],
    fleetClass: FLEET_CLASS.SEDAN,
    image: '/images/car/lexus-es-350.webp',
    airport: 180,
    city: 180,
    half: 700,
    full: 1200,
    intercity: 'sedan',
  },
  {
    category: 'mercedes_e',
    label: 'Mercedes-Benz E-Class',
    names: ['e-class', 'e class'],
    fleetClass: FLEET_CLASS.BUSINESS,
    image: '/images/car/mercedes-e-class.webp',
    airport: 1000,
    city: 1000,
    half: null,
    full: 3000,
  },
  {
    category: 'mercedes_s',
    label: 'Mercedes-Benz S-Class',
    names: ['s-class', 's class'],
    fleetClass: FLEET_CLASS.FIRST,
    image: '/images/car/mercedes-s-class.webp',
    airport: 1000,
    city: 1000,
    half: null,
    full: 3000,
  },
  {
    category: 'mercedes_vito',
    label: 'Mercedes-Benz Vito',
    names: ['evito', 'vito'],
    fleetClass: FLEET_CLASS.VAN,
    image: '/images/car/mercedes-evito-tourer.webp',
    airport: 900,
    city: 900,
    half: null,
    full: 2200,
  },
  {
    category: 'mercedes_sprinter',
    label: 'Mercedes-Benz Sprinter',
    names: ['sprinter'],
    fleetClass: FLEET_CLASS.VAN,
    image: '/images/car/mercedes-sprinter.webp',
    airport: 1200,
    city: 1200,
    half: null,
    full: 2800,
  },
  {
    category: 'mercedes_v_class',
    label: 'Mercedes-Benz V-Class',
    names: ['v-class', 'v class'],
    fleetClass: FLEET_CLASS.VAN,
    image: '/images/car/mercedes-v-class.webp',
    airport: 1200,
    city: 1200,
    half: null,
    full: 2500,
  },
  {
    category: 'toyota_hiace',
    label: 'Toyota Hiace',
    names: ['hiace'],
    fleetClass: FLEET_CLASS.VAN,
    image: '/images/car/toyota-hiace.webp',
    airport: 600,
    city: 600,
    half: 700,
    full: 1200,
  },
  {
    category: 'mercedes_coach',
    label: 'Mercedes-Benz Coach Bus',
    names: ['coach'],
    fleetClass: FLEET_CLASS.COACHES,
    image: '/images/car/mercedes-coach-bus.webp',
    airport: 1500,
    city: 1500,
    half: null,
    full: 3000,
    fullDayNote: true,
  },
  {
    category: 'toyota_coaster',
    label: 'Toyota Coaster',
    names: ['coaster'],
    fleetClass: FLEET_CLASS.COACHES,
    image: '/images/car/toyota-coaster.webp',
    airport: 600,
    city: 600,
    half: 800,
    full: 1500,
  },
];

export const VEHICLE_CATEGORY_ALIASES = {
  gmc_yukon: 'gmc',
  gmc_tahoe: 'gmc',
  chevrolet_suburban: 'gmc',
  mini_van: 'toyota_hiace',
};

export function normalizeVehicleCategory(category) {
  const normalized = String(category || '').trim().toLowerCase();
  return VEHICLE_CATEGORY_ALIASES[normalized] || normalized;
}

export function findFleetVehicle(carOrName) {
  const name = String(carOrName?.name || carOrName?.label || carOrName || '').toLowerCase();
  const rawCategory = String(carOrName?.category || carOrName?.vehicleCategory || '').toLowerCase();
  const category = normalizeVehicleCategory(rawCategory);
  if (category) {
    const byCategory = FLEET_VEHICLES.find((v) => v.category === category);
    if (byCategory) return byCategory;
  }
  if (!name) return null;
  return FLEET_VEHICLES.find((v) => v.names.some((token) => name.includes(token))) || null;
}

function inferFleetClassFromCar(car) {
  const type = String(car?.type || '').toLowerCase();
  const name = String(car?.name || '').toLowerCase();
  if (type.includes('suv') || name.includes('gmc') || name.includes('yukon') || name.includes('tahoe') || name.includes('suburban')) return FLEET_CLASS.SUV;
  if (type.includes('coach') || type.includes('bus') || type.includes('mini bus') || name.includes('coaster')) return FLEET_CLASS.COACHES;
  if (type.includes('van') || type.includes('minivan') || name.includes('hiace') || name.includes('sprinter') || name.includes('v-class') || name.includes('vito')) return FLEET_CLASS.VAN;
  if (name.includes('s-class') || name.includes('7 series')) return FLEET_CLASS.FIRST;
  if (name.includes('e-class') || name.includes('5 series')) return FLEET_CLASS.BUSINESS;
  return FLEET_CLASS.SEDAN;
}

export function toCategorySlug(value, fallbackId) {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || `vehicle_${fallbackId ?? 'custom'}`;
}

export function buildManagedFleetVehicles(apiCars, resolveImage = (car) => car?.img || '') {
  if (!Array.isArray(apiCars)) return null;
  const available = apiCars
    .filter((car) => car && car.available !== false)
    .sort((a, b) => {
      const orderA = Number.isFinite(Number(a.displayOrder)) ? Number(a.displayOrder) : 0;
      const orderB = Number.isFinite(Number(b.displayOrder)) ? Number(b.displayOrder) : 0;
      if (orderA !== orderB) return orderA - orderB;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });

  const seenCategories = new Set();
  const mapped = [];
  for (const car of available) {
    const base = findFleetVehicle({ category: car.category, name: car.name });
    const rawCat = car.category || base?.category || toCategorySlug(car.name, car.id);
    const category = normalizeVehicleCategory(rawCat);
    if (seenCategories.has(category)) continue;
    seenCategories.add(category);

    mapped.push({
      ...(base || {}),
      carId: car.id ?? null,
      category,
      label: car.name || base?.label || category,
      names: base?.names || [String(car.name || '').toLowerCase()].filter(Boolean),
      fleetClass: base?.fleetClass || inferFleetClassFromCar(car),
      image: resolveImage(car) || base?.image || car.img || '',
      seats: car.seats || '',
      luggage: car.luggage || '',
      description: car.description || '',
      isCustom: !base,
    });
  }
  return mapped;
}

export function filterManagedVehiclesForService(managedVehicles, serviceType, fleetClass = 'All', durationType) {
  if (!Array.isArray(managedVehicles)) {
    return getVehiclesForService(serviceType, fleetClass, durationType);
  }
  const list = managedVehicles.filter((v) => {
    if (serviceType === 'chauffeur' && durationType === 'half_day') {
      return v.isCustom || v.half != null;
    }
    if (serviceType === 'chauffeur' && durationType === 'full_day') {
      return v.isCustom || v.full != null;
    }
    return true;
  });
  if (!fleetClass || fleetClass === 'All') return sortVehiclesByPriority(list);
  return sortVehiclesByPriority(list.filter((v) => v.fleetClass === fleetClass));
}

export function getFleetClass(car) {
  return findFleetVehicle(car)?.fleetClass || null;
}

export const INTERCITY_INQUIRY_CATEGORIES = [
  'gmc',
  'bmw_5',
  'bmw_7',
  'ford_taurus',
  'lexus_es',
  'mercedes_e',
  'mercedes_s',
  'mercedes_vito',
  'mercedes_sprinter',
  'mercedes_v_class',
  'toyota_hiace',
  'mercedes_coach',
  'toyota_coaster',
];

export const GCC_INQUIRY_CATEGORIES = [...INTERCITY_INQUIRY_CATEGORIES];

function vehiclesInOrder(categories, fleetClass = 'All') {
  const byCategory = Object.fromEntries(FLEET_VEHICLES.map((v) => [v.category, v]));
  const list = categories.map((category) => byCategory[category]).filter(Boolean);
  if (!fleetClass || fleetClass === 'All') return list;
  return list.filter((v) => v.fleetClass === fleetClass);
}

/**
 * Customer-facing priority: GMC (0) → Sedan (1) → everything else (2).
 * Uses category/fleet-class data (and the car `type` for admin-created vehicles); display
 * names are only a last-resort fallback when no category data exists.
 */
export function getVehiclePriorityRank(vehicle) {
  const base = findFleetVehicle({
    category: vehicle?.category || vehicle?.vehicleCategory,
    name: vehicle?.name || vehicle?.label,
  });
  const category = normalizeVehicleCategory(vehicle?.category || vehicle?.vehicleCategory || base?.category);
  if (category === 'gmc') return 0;
  const fleetClass = vehicle?.fleetClass || base?.fleetClass || inferFleetClassFromCar(vehicle);
  if (fleetClass === FLEET_CLASS.SEDAN) return 1;
  return 2;
}

/** Stable sort by GMC → Sedan → other; never hides or removes vehicles. */
export function sortVehiclesByPriority(list = []) {
  return list
    .map((item, index) => ({ item, index, rank: getVehiclePriorityRank(item) }))
    .sort((a, b) => (a.rank - b.rank) || (a.index - b.index))
    .map((entry) => entry.item);
}

export function getVehiclesForService(serviceType, fleetClass = 'All', durationType) {
  if (serviceType === 'intercity_transfer') {
    return sortVehiclesByPriority(vehiclesInOrder(INTERCITY_INQUIRY_CATEGORIES, fleetClass));
  }
  if (serviceType === 'gcc_transfer') {
    return sortVehiclesByPriority(vehiclesInOrder(GCC_INQUIRY_CATEGORIES, fleetClass));
  }
  const list = FLEET_VEHICLES.filter((v) => {
    if (serviceType === 'chauffeur' && durationType === 'half_day') return v.half != null;
    if (serviceType === 'chauffeur' && durationType === 'full_day') return v.full != null;
    return true;
  });
  if (!fleetClass || fleetClass === 'All') return sortVehiclesByPriority(list);
  return sortVehiclesByPriority(list.filter((v) => v.fleetClass === fleetClass));
}

export function getVehicleImageByCategory(category) {
  return FLEET_VEHICLES.find((v) => v.category === category)?.image || '';
}

/** Official configured intercity rates. Unlisted vehicle/route pairs are Rate on Request. */
export const INTERCITY_PRICES = {
  sedan: { Khobar: 1000, Jubail: 900, Jeddah: 2200 },
  gmc: { Khobar: 1400, Jubail: 1400, Jeddah: 3500 },
};

/** Official configured GCC rates. Unlisted vehicle/route pairs are Rate on Request. */
export const GCC_PRICES = {
  Dubai: 4800,
  'Abu Dhabi': 4000,
  Bahrain: 1900,
  Qatar: 3500,
  Oman: 6800,
};

export function getServiceFromPrice(serviceType) {
  const nums = (values) => {
    const list = values.filter((value) => value != null && Number.isFinite(Number(value))).map(Number);
    return list.length ? Math.min(...list) : null;
  };
  switch (serviceType) {
    case 'airport_transfer':
      return nums(FLEET_VEHICLES.map((vehicle) => vehicle.airport));
    case 'city_transfer':
      return nums(FLEET_VEHICLES.map((vehicle) => vehicle.city ?? vehicle.airport));
    case 'chauffeur':
      return nums(FLEET_VEHICLES.flatMap((vehicle) => [vehicle.half, vehicle.full]));
    case 'intercity_transfer':
      return nums(Object.values(INTERCITY_PRICES).flatMap((table) => Object.values(table)));
    case 'gcc_transfer':
      return nums(Object.values(GCC_PRICES));
    default:
      return null;
  }
}

function officialQuote(vehicle, price, extra = {}) {
  return {
    success: true,
    price,
    totalAmount: price,
    currency: 'SAR',
    pricingType: extra.pricingType || 'fixed',
    customQuoteRequired: false,
    payable: true,
    quoteStatus: extra.quoteStatus || 'priced',
    vehicleCategory: vehicle.category,
    displayLabel: vehicle.label,
    message: extra.message || null,
    ...extra,
  };
}

function customOfficialQuote(message, extra = {}) {
  return {
    success: true,
    price: null,
    totalAmount: null,
    currency: 'SAR',
    pricingType: 'custom_quote',
    customQuoteRequired: true,
    payable: false,
    quoteStatus: extra.quoteStatus || 'custom_quote',
    message,
    ...extra,
  };
}

function hasPlace(value, name) {
  return String(value || '').toLowerCase().includes(String(name || '').toLowerCase());
}

function lookupIntercityPrice(vehicle, origin, destination) {
  const table = INTERCITY_PRICES[vehicle.intercity];
  if (!table) return null;
  const ends = [origin, destination];
  if (!ends.some((end) => hasPlace(end, 'riyadh'))) return null;
  if (ends.some((end) => hasPlace(end, 'khobar'))) return table.Khobar;
  if (ends.some((end) => hasPlace(end, 'jubail'))) return table.Jubail;
  if (ends.some((end) => hasPlace(end, 'jeddah'))) return table.Jeddah;
  return null;
}

function lookupGccPrice(vehicle, origin, destination) {
  if (!vehicle.gcc) return null;
  const ends = [origin, destination];
  const match = Object.entries(GCC_PRICES).find(([city]) => ends.some((end) => hasPlace(end, city)));
  if (!match) return null;
  const other = ends.find((end) => !hasPlace(end, match[0]));
  if (other && !hasPlace(other, 'riyadh')) return null;
  return match[1];
}

export function getOfficialQuote({
  serviceType,
  vehicleCategory,
  vehicleName,
  durationType,
  origin,
  destination,
  airport,
  pickupPlace,
  dropoffPlace,
  returnTrip,
} = {}) {
  const vehicle = findFleetVehicle({ category: vehicleCategory, name: vehicleName });
  if (!vehicle) return customOfficialQuote('Please select a vehicle.');

  switch (serviceType) {
    case 'airport_transfer': {
      const pickupValue = pickupPlace || origin || airport;
      const dropoffValue = dropoffPlace || destination;
      if (!pickupValue || !dropoffValue) {
        return customOfficialQuote('Price on request', {
          serviceType,
          quoteStatus: 'rate_on_request',
          origin: origin || airport || '',
          destination: destination || '',
          pricingModel: 'airport_transfer',
        });
      }
      const fixedRoute = matchAirportFixedRoute(pickupValue, dropoffValue);
      if (fixedRoute) {
        const matched = quoteAirportFixedRoute(fixedRoute, vehicle.category, {
          airport: airport || origin,
          vehicleCategory: vehicle.category,
          vehicleName: vehicle.label,
          displayLabel: vehicle.label,
        });
        if (matched.customQuoteRequired) {
          return customOfficialQuote('Price on request', {
            ...matched,
            message: 'Price on request',
          });
        }
        return officialQuote(vehicle, matched.price, matched);
      }
      // No generic fallback pricing for airport transfers: unapproved routes require a custom quotation.
      return customOfficialQuote('Price on request', {
        serviceType,
        quoteStatus: 'rate_on_request',
        origin: origin || airport || '',
        destination: destination || '',
        pricingModel: 'airport_transfer',
      });
    }
    case 'city_transfer': {
      const cityPrice = vehicle.city ?? vehicle.airport;
      if (cityPrice == null) {
        return customOfficialQuote('City transfer is not available for this vehicle.', {
          serviceType,
          origin: 'Riyadh',
          pricingModel: 'city_transfer',
        });
      }
      return officialQuote(vehicle, cityPrice, {
        serviceType,
        origin: 'Riyadh',
        pricingType: 'city_base',
        pricingModel: 'city_transfer',
      });
    }
    case 'chauffeur':
      if (durationType === 'half_day') {
        return vehicle.half != null
          ? officialQuote(vehicle, vehicle.half, { serviceType, durationType, pricingModel: 'chauffeur' })
          : customOfficialQuote('This vehicle is available for full day service only.');
      }
      if (durationType === 'full_day') {
        return vehicle.full != null
          ? officialQuote(vehicle, vehicle.full, { serviceType, durationType, pricingModel: 'chauffeur' })
          : customOfficialQuote('No chauffeur rate for this vehicle and duration. Custom quote required.');
      }
      return customOfficialQuote('Please select a duration.');
    case 'intercity_transfer': {
      // Intercity fixed prices (Riyadh ↔ Bahrain, Riyadh ↔ Dammam with 15% VAT) are calculated authoritatively on the backend.
      // All other intercity routes remain WhatsApp-assisted with no displayed price.
      return customOfficialQuote('Rate on Request', {
        serviceType,
        quoteStatus: 'rate_on_request',
        origin,
        destination,
        pricingModel: 'intercity_fixed',
      });
    }
    case 'gcc_transfer': {
      if (returnTrip || !destination) {
        return customOfficialQuote('Rate on Request', {
          serviceType,
          quoteStatus: 'rate_on_request',
          origin: origin || 'Riyadh',
          destination,
          pricingModel: 'gcc_fixed',
        });
      }
      const configured = lookupGccPrice(vehicle, origin || 'Riyadh', destination);
      if (configured == null) {
        return customOfficialQuote('Rate on Request', {
          serviceType,
          quoteStatus: 'rate_on_request',
          origin: origin || 'Riyadh',
          destination,
          pricingModel: 'gcc_fixed',
        });
      }
      return officialQuote(vehicle, configured, {
        serviceType,
        origin: origin || 'Riyadh',
        destination,
        pricingType: 'gcc_fixed',
        pricingModel: 'gcc_fixed',
      });
    }
    default:
      return customOfficialQuote('Unsupported service type.');
  }
}
