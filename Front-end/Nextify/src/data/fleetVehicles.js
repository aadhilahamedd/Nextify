import { citySlabForDistance } from '../utils/distanceSlabs';
import { matchAirportFixedRoute, quoteAirportFixedRoute } from './airportFixedRoutes';
import { findAirport } from './saudiAirports';

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
    city: 140,
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
    city: null,
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
    city: null,
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
    city: 120,
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
    city: 120,
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
    city: null,
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
    city: null,
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
    city: null,
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
    city: null,
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
    city: null,
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
    city: null,
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
    city: null,
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
    city: null,
    half: 800,
    full: 1500,
  },
];

export function findFleetVehicle(carOrName) {
  const name = String(carOrName?.name || carOrName?.label || carOrName || '').toLowerCase();
  const category = String(carOrName?.category || carOrName?.vehicleCategory || '').toLowerCase();
  if (category) {
    const byCategory = FLEET_VEHICLES.find((v) => v.category === category);
    if (byCategory) return byCategory;
  }
  if (!name) return null;
  return FLEET_VEHICLES.find((v) => v.names.some((token) => name.includes(token))) || null;
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

export function getVehiclesForService(serviceType, fleetClass = 'All', durationType) {
  if (serviceType === 'intercity_transfer') {
    return vehiclesInOrder(INTERCITY_INQUIRY_CATEGORIES, fleetClass);
  }
  if (serviceType === 'gcc_transfer') {
    return vehiclesInOrder(GCC_INQUIRY_CATEGORIES, fleetClass);
  }
  const list = FLEET_VEHICLES.filter((v) => {
    if (serviceType === 'city_transfer') return v.city != null;
    if (serviceType === 'chauffeur' && durationType === 'half_day') return v.half != null;
    if (serviceType === 'chauffeur' && durationType === 'full_day') return v.full != null;
    return true;
  });
  if (!fleetClass || fleetClass === 'All') return list;
  return list.filter((v) => v.fleetClass === fleetClass);
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
  distanceKm,
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
      const fixedRoute = matchAirportFixedRoute(pickupPlace || origin || airport, dropoffPlace || destination);
      if (fixedRoute) {
        const matched = quoteAirportFixedRoute(fixedRoute, vehicle.category, {
          airport: airport || origin,
          vehicleCategory: vehicle.category,
          vehicleName: vehicle.label,
          displayLabel: vehicle.label,
        });
        if (matched.customQuoteRequired) {
          return customOfficialQuote(matched.message, matched);
        }
        return officialQuote(vehicle, matched.price, matched);
      }
      const pickupAirport = findAirport(pickupPlace) || findAirport(origin) || findAirport(airport);
      const dropoffAirport = findAirport(dropoffPlace) || findAirport(destination);
      if (destination && !pickupAirport && !dropoffAirport) {
        return customOfficialQuote('Rate on Request', {
          serviceType,
          quoteStatus: 'rate_on_request',
          origin: origin || airport,
          destination,
          pricingModel: 'airport_transfer',
        });
      }
      if (vehicle.airport == null) {
        return customOfficialQuote('No fixed airport transfer rate for this vehicle. Custom quote required.', {
          serviceType,
          airport: airport || origin,
          pricingModel: 'airport_transfer',
        });
      }
      return officialQuote(vehicle, vehicle.airport, {
        serviceType,
        airport: pickupAirport?.nameEn || dropoffAirport?.nameEn || airport || origin,
        pricingType: 'airport_base',
        pricingModel: 'airport_transfer',
      });
    }
    case 'city_transfer': {
      const km = Number(distanceKm);
      const slab = citySlabForDistance(Number.isFinite(km) && km > 0 ? km : 20);
      if (slab.kind === 'long_distance') {
        return customOfficialQuote('Long Distance / Custom Quote', {
          serviceType,
          quoteStatus: 'long_distance',
          origin: 'Riyadh',
          slabLabel: slab.label,
          distanceKm: slab.distanceKm,
          pricingModel: 'city_transfer',
        });
      }
      if (vehicle.city == null) {
        return customOfficialQuote('City transfer is not available for this vehicle.', {
          serviceType,
          origin: 'Riyadh',
          slabLabel: slab.label,
          distanceKm: slab.distanceKm,
          pricingModel: 'city_transfer',
        });
      }
      if (slab.kind === 'slab' && slab.maxKm > 20) {
        return customOfficialQuote(`No configured City Transfer rate for the ${slab.label} slab. Rate on Request.`, {
          serviceType,
          quoteStatus: 'rate_on_request',
          origin: 'Riyadh',
          slabLabel: slab.label,
          distanceKm: slab.distanceKm,
          pricingModel: 'city_transfer',
        });
      }
      return officialQuote(vehicle, vehicle.city, {
        serviceType,
        origin: 'Riyadh',
        pricingType: 'city_distance',
        pricingModel: 'city_transfer',
        slabLabel: slab.label,
        distanceKm: slab.distanceKm,
        maxDistanceKm: 20,
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
      if (returnTrip || !destination || !origin) {
        return customOfficialQuote('Rate on Request', {
          serviceType,
          quoteStatus: 'rate_on_request',
          origin,
          destination,
          pricingModel: 'intercity_fixed',
        });
      }
      const configured = lookupIntercityPrice(vehicle, origin, destination);
      if (configured == null) {
        return customOfficialQuote('Rate on Request', {
          serviceType,
          quoteStatus: 'rate_on_request',
          origin,
          destination,
          pricingModel: 'intercity_fixed',
        });
      }
      return officialQuote(vehicle, configured, {
        serviceType,
        origin: origin || 'Riyadh',
        destination,
        pricingType: 'intercity_fixed',
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
