const GCC_CATEGORIES = ['gmc_yukon', 'gmc_tahoe', 'chevrolet_suburban'];

const GCC_LABELS = {
  gmc_yukon: 'GMC Yukon',
  gmc_tahoe: 'GMC Tahoe',
  chevrolet_suburban: 'Chevrolet Suburban',
};

const SERVICE_VEHICLE_OPTIONS = {
  airport_transfer: [
    { category: 'sedan', label: 'Sedan' },
    { category: 'ford_taurus', label: 'Ford Taurus' },
    { category: 'prado_fortuner', label: 'Prado / Fortuner' },
    { category: 'gmc_yukon', label: 'GMC Yukon / Tahoe / Chevrolet Suburban' },
    { category: 'mini_van', label: 'Mini Van / Toyota Coaster' },
    { category: 'mercedes_v_class', label: 'Mercedes V-Class' },
  ],
  city_transfer: [
    { category: 'sedan', label: 'Sedan' },
    { category: 'prado_fortuner', label: 'Prado / Fortuner' },
    { category: 'gmc_yukon', label: 'GMC Yukon' },
  ],
  chauffeur: [
    { category: 'sedan', label: 'Sedan' },
    { category: 'prado_fortuner', label: 'Prado / Fortuner' },
    { category: 'gmc_yukon', label: 'GMC Yukon' },
  ],
  intercity_transfer: [
    { category: 'sedan', label: 'Sedan' },
    { category: 'prado_fortuner', label: 'Prado / Fortuner' },
    { category: 'mini_suv', label: 'Mini SUV' },
    { category: 'gmc_yukon', label: 'GMC Yukon' },
    { category: 'chevrolet_suburban', label: 'Chevrolet Suburban' },
  ],
  gcc_transfer: GCC_CATEGORIES.map((c) => ({ category: c, label: GCC_LABELS[c] })),
};

const INTERCITY_ROUTES = [
  { id: 'riyadh_khobar', origin: 'Riyadh', destination: 'Khobar', label: 'Riyadh ↔ Khobar' },
  { id: 'riyadh_jubail', origin: 'Riyadh', destination: 'Jubail', label: 'Riyadh ↔ Jubail' },
  { id: 'riyadh_jeddah', origin: 'Riyadh', destination: 'Jeddah', label: 'Riyadh ↔ Jeddah' },
];

const GCC_ROUTES = [
  { id: 'dubai', destination: 'Dubai', label: 'Riyadh → Dubai' },
  { id: 'abu_dhabi', destination: 'Abu Dhabi', label: 'Riyadh → Abu Dhabi' },
  { id: 'bahrain', destination: 'Bahrain', label: 'Riyadh → Bahrain' },
  { id: 'qatar', destination: 'Qatar', label: 'Riyadh → Qatar' },
  { id: 'oman', destination: 'Oman', label: 'Riyadh → Oman' },
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

function normalizeRoute(origin, destination) {
  const o = (origin || '').trim();
  const d = (destination || '').trim();
  const swap = (a, b) =>
    (o.toLowerCase().includes(a) && d.toLowerCase().includes(b)) ||
    (o.toLowerCase().includes(b) && d.toLowerCase().includes(a));
  if (swap('riyadh', 'khobar')) return { origin: 'Riyadh', destination: 'Khobar' };
  if (swap('riyadh', 'jubail')) return { origin: 'Riyadh', destination: 'Jubail' };
  if (swap('riyadh', 'jeddah')) return { origin: 'Riyadh', destination: 'Jeddah' };
  return { origin: o, destination: d };
}

module.exports = {
  GCC_CATEGORIES,
  SERVICE_VEHICLE_OPTIONS,
  INTERCITY_ROUTES,
  GCC_ROUTES,
  normalizeServiceType,
  normalizeRoute,
};
