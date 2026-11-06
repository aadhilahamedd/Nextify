const GCC_CATEGORIES = ['gmc', 'gmc_yukon', 'gmc_tahoe', 'chevrolet_suburban'];

const GCC_LABELS = {
  gmc: 'GMC Yukon',
  gmc_yukon: 'GMC Yukon',
  gmc_tahoe: 'GMC Tahoe',
  chevrolet_suburban: 'Chevrolet Suburban',
};

const SERVICE_VEHICLE_OPTIONS = {
  airport_transfer: [
    { category: 'gmc', label: 'GMC Yukon' },
    { category: 'bmw_5', label: 'BMW 5 Series' },
    { category: 'bmw_7', label: 'BMW 7 Series' },
    { category: 'ford_taurus', label: 'Ford Taurus' },
    { category: 'lexus_es', label: 'Lexus ES 350' },
    { category: 'mercedes_e', label: 'Mercedes-Benz E-Class' },
    { category: 'mercedes_s', label: 'Mercedes-Benz S-Class' },
    { category: 'mercedes_vito', label: 'Mercedes-Benz Vito' },
    { category: 'mercedes_sprinter', label: 'Mercedes-Benz Sprinter' },
    { category: 'mercedes_v_class', label: 'Mercedes-Benz V-Class' },
    { category: 'toyota_hiace', label: 'Toyota Hiace' },
    { category: 'mercedes_coach', label: 'Mercedes-Benz Coach Bus' },
    { category: 'toyota_coaster', label: 'Toyota Coaster' },
  ],
  city_transfer: [
    { category: 'gmc', label: 'GMC Yukon' },
    { category: 'ford_taurus', label: 'Ford Taurus' },
    { category: 'lexus_es', label: 'Lexus ES 350' },
  ],
  chauffeur: [
    { category: 'gmc', label: 'GMC Yukon' },
    { category: 'bmw_5', label: 'BMW 5 Series' },
    { category: 'bmw_7', label: 'BMW 7 Series' },
    { category: 'ford_taurus', label: 'Ford Taurus' },
    { category: 'lexus_es', label: 'Lexus ES 350' },
    { category: 'mercedes_e', label: 'Mercedes-Benz E-Class' },
    { category: 'mercedes_s', label: 'Mercedes-Benz S-Class' },
    { category: 'mercedes_vito', label: 'Mercedes-Benz Vito' },
    { category: 'mercedes_sprinter', label: 'Mercedes-Benz Sprinter' },
    { category: 'mercedes_v_class', label: 'Mercedes-Benz V-Class' },
    { category: 'toyota_hiace', label: 'Toyota Hiace' },
    { category: 'mercedes_coach', label: 'Mercedes-Benz Coach Bus' },
    { category: 'toyota_coaster', label: 'Toyota Coaster' },
  ],
  intercity_transfer: [
    { category: 'gmc', label: 'GMC Yukon / SUV' },
    { category: 'bmw_5', label: 'BMW 5 Series' },
    { category: 'bmw_7', label: 'BMW 7 Series' },
    { category: 'ford_taurus', label: 'Ford Taurus' },
    { category: 'lexus_es', label: 'Lexus ES 350' },
    { category: 'mercedes_e', label: 'Mercedes-Benz E-Class' },
    { category: 'mercedes_s', label: 'Mercedes-Benz S-Class' },
    { category: 'mercedes_vito', label: 'Mercedes-Benz Vito Tourer' },
    { category: 'mercedes_sprinter', label: 'Mercedes-Benz Sprinter' },
    { category: 'mercedes_v_class', label: 'Mercedes-Benz V-Class' },
    { category: 'toyota_hiace', label: 'Toyota Hiace' },
    { category: 'mercedes_coach', label: 'Mercedes-Benz Coach Bus' },
    { category: 'toyota_coaster', label: 'Toyota Coaster' },
  ],
  gcc_transfer: [
    { category: 'gmc', label: 'GMC Yukon' },
    { category: 'ford_taurus', label: 'Ford Taurus' },
    { category: 'lexus_es', label: 'Lexus ES 350' },
    { category: 'bmw_5', label: 'BMW 5 Series' },
    { category: 'bmw_7', label: 'BMW 7 Series' },
    { category: 'mercedes_e', label: 'Mercedes-Benz E-Class' },
    { category: 'mercedes_s', label: 'Mercedes-Benz S-Class' },
    { category: 'mercedes_vito', label: 'Mercedes-Benz Vito Tourer' },
    { category: 'mercedes_sprinter', label: 'Mercedes-Benz Sprinter' },
    { category: 'mercedes_v_class', label: 'Mercedes-Benz V-Class' },
    { category: 'toyota_hiace', label: 'Toyota Hiace' },
    { category: 'toyota_coaster', label: 'Toyota Coaster' },
    { category: 'mercedes_coach', label: 'Mercedes-Benz Coach Bus' },
  ],
};

const INTERCITY_ROUTES = [
  { id: 'dammam', origin: 'Riyadh', destination: 'Dammam', label: 'Riyadh ↔ Dammam' },
  { id: 'khobar', origin: 'Riyadh', destination: 'Al Khobar', label: 'Riyadh ↔ Al Khobar' },
  { id: 'jubail', origin: 'Riyadh', destination: 'Jubail', label: 'Riyadh ↔ Jubail' },
  { id: 'salwa', origin: 'Riyadh', destination: 'Salwa', label: 'Riyadh ↔ Salwa' },
  { id: 'batha', origin: 'Riyadh', destination: 'Batha', label: 'Riyadh ↔ Batha' },
  { id: 'jeddah', origin: 'Riyadh', destination: 'Jeddah', label: 'Riyadh ↔ Jeddah' },
  { id: 'madinah', origin: 'Riyadh', destination: 'Madinah', label: 'Riyadh ↔ Madinah' },
  { id: 'abha', origin: 'Riyadh', destination: 'Abha', label: 'Riyadh ↔ Abha' },
  { id: 'jizan', origin: 'Riyadh', destination: 'Jizan', label: 'Riyadh ↔ Jizan' },
  { id: 'tabuk', origin: 'Riyadh', destination: 'Tabuk', label: 'Riyadh ↔ Tabuk' },
];

const GCC_ROUTES = [
  { id: 'bahrain', destination: 'Bahrain', label: 'Riyadh → Bahrain' },
  { id: 'qatar', destination: 'Qatar', label: 'Riyadh → Qatar' },
  { id: 'abu_dhabi', destination: 'Abu Dhabi', label: 'Riyadh → Abu Dhabi' },
  { id: 'dubai', destination: 'Dubai', label: 'Riyadh → Dubai' },
  { id: 'kuwait', destination: 'Kuwait', label: 'Riyadh → Kuwait' },
];

function normalizeServiceType(type) {
  const map = {
    AIRPORT_TRANSFER: 'airport_transfer',
    airport: 'airport_transfer',
    airportTransfer: 'airport_transfer',
    POINT_TO_POINT: 'city_transfer',
    pointToPoint: 'city_transfer',
    city: 'city_transfer',
    HOURLY: 'chauffeur',
    hourly: 'chauffeur',
    chauffeur: 'chauffeur',
    intercity: 'intercity_transfer',
    INTERCITY_TRANSFER: 'intercity_transfer',
    gcc: 'gcc_transfer',
    GCC_TRANSFER: 'gcc_transfer',
  };
  return map[type] || type;
}

const PLACE_ALIASES = [
  { canonical: 'Riyadh', names: ['riyadh'] },
  { canonical: 'Khobar', names: ['khobar'] },
  { canonical: 'Jubail', names: ['jubail', 'jubayl'] },
  { canonical: 'Jeddah', names: ['jeddah', 'jiddah', 'jedda'] },
  { canonical: 'Dammam', names: ['dammam'] },
  { canonical: 'Madinah', names: ['madinah', 'medina'] },
  { canonical: 'Jizan', names: ['jizan', 'jazan', 'gizan'] },
  { canonical: 'Abha', names: ['abha'] },
  { canonical: 'Tabuk', names: ['tabuk'] },
  { canonical: 'Salwa', names: ['salwa'] },
  { canonical: 'Batha', names: ['batha'] },
  { canonical: 'Dubai', names: ['dubai'] },
  { canonical: 'Abu Dhabi', names: ['abu dhabi', 'abudhabi'] },
  { canonical: 'Bahrain', names: ['bahrain'] },
  { canonical: 'Qatar', names: ['qatar', 'doha'] },
  { canonical: 'Kuwait', names: ['kuwait'] },
  { canonical: 'Oman', names: ['oman', 'muscat'] },
];

function canonicalPlace(value) {
  const n = String(value || '').trim().toLowerCase();
  if (!n) return '';
  const match = PLACE_ALIASES.find((place) => place.names.some((name) => n.includes(name)));
  return match ? match.canonical : String(value || '').trim();
}

function samePlace(a, b) {
  const left = canonicalPlace(a);
  const right = canonicalPlace(b);
  if (!left || !right) return false;
  return left === right;
}

function routesMatch(originA, destinationA, originB, destinationB) {
  return (
    (samePlace(originA, originB) && samePlace(destinationA, destinationB))
    || (samePlace(originA, destinationB) && samePlace(destinationA, originB))
  );
}

function normalizeRoute(origin, destination) {
  return {
    origin: canonicalPlace(origin) || String(origin || '').trim(),
    destination: canonicalPlace(destination) || String(destination || '').trim(),
  };
}

module.exports = {
  GCC_CATEGORIES,
  SERVICE_VEHICLE_OPTIONS,
  INTERCITY_ROUTES,
  GCC_ROUTES,
  normalizeServiceType,
  normalizeRoute,
  canonicalPlace,
  samePlace,
  routesMatch,
};
