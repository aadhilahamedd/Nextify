export const SERVICE_TYPES = {
  AIRPORT: 'airport_transfer',
  CITY: 'city_transfer',
  CHAUFFEUR: 'chauffeur',
  INTERCITY: 'intercity_transfer',
  GCC: 'gcc_transfer',
};

export const SERVICE_LABELS = {
  airport_transfer: 'Airport Transfer',
  city_transfer: 'City Transfer',
  chauffeur: 'Chauffeur Service',
  intercity_transfer: 'Intercity Transfer',
  gcc_transfer: 'GCC Transfer',
};

export const SERVICE_DESCRIPTIONS = {
  airport_transfer: 'Airport pickup and drop-off with professional chauffeur.',
  city_transfer: 'Comfortable transfers within Riyadh (up to 20 KM).',
  chauffeur: 'Professional chauffeur by half day or full day.',
  intercity_transfer: 'Luxury travel between major Saudi cities.',
  gcc_transfer: 'Private luxury transfers from Riyadh to GCC destinations.',
};

export const AIRPORTS = ['Riyadh', 'Jeddah', 'Dammam'];

export const VEHICLES_BY_SERVICE = {
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
  gcc_transfer: [
    { category: 'gmc_yukon', label: 'GMC Yukon' },
    { category: 'gmc_tahoe', label: 'GMC Tahoe' },
    { category: 'chevrolet_suburban', label: 'Chevrolet Suburban' },
  ],
};

export const INTERCITY_ROUTES = [
  { origin: 'Riyadh', destination: 'Khobar', label: 'Riyadh ↔ Khobar' },
  { origin: 'Riyadh', destination: 'Jubail', label: 'Riyadh ↔ Jubail' },
  { origin: 'Riyadh', destination: 'Jeddah', label: 'Riyadh ↔ Jeddah' },
];

export const GCC_DESTINATIONS = [
  { destination: 'Dubai', label: 'Riyadh → Dubai' },
  { destination: 'Abu Dhabi', label: 'Riyadh → Abu Dhabi' },
  { destination: 'Bahrain', label: 'Riyadh → Bahrain' },
  { destination: 'Qatar', label: 'Riyadh → Qatar' },
  { destination: 'Oman', label: 'Riyadh → Oman' },
];

export const DURATION_OPTIONS = [
  { value: 'half_day', label: 'Half Day' },
  { value: 'full_day', label: 'Full Day' },
];

export const initialFormState = {
  serviceType: 'airport_transfer',
  airport: 'Riyadh',
  origin: '',
  destination: '',
  pickupLocation: '',
  dropoffLocation: '',
  serviceLocation: '',
  intercityRoute: '',
  gccDestination: '',
  travelDate: '',
  travelTime: '',
  flightNumber: '',
  vehicleCategory: '',
  vehicleName: '',
  durationType: '',
  distanceKm: '',
  passengers: 1,
  luggage: 0,
  customer: { name: '', email: '', mobile: '' },
  specialRequests: '',
};
