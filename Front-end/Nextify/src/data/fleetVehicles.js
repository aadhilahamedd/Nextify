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
    label: 'GMC',
    names: ['gmc', 'yukon', 'tahoe', 'suburban'],
    fleetClass: FLEET_CLASS.SUV,
    image: '/images/car/gmc-suv.webp',
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

export function getVehiclesForService(serviceType, fleetClass = 'All', durationType) {
  const list = FLEET_VEHICLES.filter((v) => {
    if (serviceType === 'city_transfer') return v.city != null;
    if (serviceType === 'gcc_transfer') return v.gcc === true;
    if (serviceType === 'intercity_transfer') return Boolean(v.intercity);
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

const INTERCITY_PRICES = {
  sedan: { Khobar: 1000, Jubail: 900, Jeddah: 2200 },
  gmc: { Khobar: 1400, Jubail: 1400, Jeddah: 3500 },
};

const GCC_PRICES = {
  Dubai: 4800,
  'Abu Dhabi': 4000,
  Bahrain: 1900,
  Qatar: 3500,
  Oman: 6800,
};

function officialQuote(vehicle, price) {
  return {
    success: true,
    price,
    totalAmount: price,
    currency: 'SAR',
    pricingType: 'fixed',
    customQuoteRequired: false,
    vehicleCategory: vehicle.category,
    displayLabel: vehicle.label,
    message: null,
  };
}

function customOfficialQuote(message) {
  return {
    success: true,
    price: null,
    totalAmount: null,
    currency: 'SAR',
    pricingType: 'custom_quote',
    customQuoteRequired: true,
    message,
  };
}

export function getOfficialQuote({
  serviceType,
  vehicleCategory,
  vehicleName,
  destination,
  origin,
  durationType,
  distanceKm,
} = {}) {
  const vehicle = findFleetVehicle({ category: vehicleCategory, name: vehicleName });
  if (!vehicle) return customOfficialQuote('Please select a vehicle.');

  switch (serviceType) {
    case 'airport_transfer':
      return vehicle.airport != null
        ? officialQuote(vehicle, vehicle.airport)
        : customOfficialQuote('No fixed airport transfer rate for this vehicle. Custom quote required.');
    case 'city_transfer':
      if (Number(distanceKm) > 20) {
        return customOfficialQuote('Trips above 20 KM may require a custom quote.');
      }
      return vehicle.city != null
        ? officialQuote(vehicle, vehicle.city)
        : customOfficialQuote('City transfer is not available for this vehicle.');
    case 'chauffeur':
      if (durationType === 'half_day') {
        return vehicle.half != null
          ? officialQuote(vehicle, vehicle.half)
          : customOfficialQuote('This vehicle is available for full day service only.');
      }
      if (durationType === 'full_day') {
        return vehicle.full != null
          ? officialQuote(vehicle, vehicle.full)
          : customOfficialQuote('No chauffeur rate for this vehicle and duration. Custom quote required.');
      }
      return customOfficialQuote('Please select a duration.');
    case 'intercity_transfer': {
      const table = INTERCITY_PRICES[vehicle.intercity];
      const dest = String(destination || '').trim();
      const originName = String(origin || '').trim();
      const matchedDest = Object.keys(table || {}).find((city) => {
        const both = `${originName} ${dest}`.toLowerCase();
        return both.includes(city.toLowerCase());
      });
      const price = matchedDest ? table[matchedDest] : table?.[dest];
      return price != null
        ? officialQuote(vehicle, price)
        : customOfficialQuote('This intercity route is not supported or requires a custom quote.');
    }
    case 'gcc_transfer':
      if (!vehicle.gcc) return customOfficialQuote('GCC transfers only support GMC.');
      const gccKey = Object.keys(GCC_PRICES).find((city) =>
        String(destination || '').toLowerCase().includes(city.toLowerCase()),
      );
      return gccKey
        ? officialQuote(vehicle, GCC_PRICES[gccKey])
        : customOfficialQuote('This GCC route requires a custom quote.');
    default:
      return customOfficialQuote('Unsupported service type.');
  }
}
