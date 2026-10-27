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
    image: '/images/cars/gmc-yukon-xl-at4.webp',
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
    image: '/images/cars/bmw-5-series.webp',
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
    image: '/images/cars/bmw-7-series.webp',
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
    image: '/images/cars/ford-taurus.webp',
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
    image: '/images/cars/lexus-es-350.webp',
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
    image: '/images/cars/mercedes-e-class.webp',
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
    image: '/images/cars/mercedes-s-class.webp',
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
    image: '/images/cars/mercedes-evito-tourer.webp',
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
    image: '/images/cars/mercedes-sprinter.webp',
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
    image: '/images/cars/mercedes-v-class.webp',
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
    image: '/images/cars/toyota-hiace.webp',
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
    image: '/images/cars/mercedes-coach-bus.webp',
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
    image: '/images/cars/toyota-coaster.webp',
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
