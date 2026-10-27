import { FLEET_VEHICLES, getVehicleImageByCategory, getVehiclesForService } from '../../data/fleetVehicles';

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

export const VEHICLE_IMAGES = Object.fromEntries(FLEET_VEHICLES.map((v) => [v.category, v.image]));

export function getVehicleImage(category) {
  return getVehicleImageByCategory(category) || VEHICLE_IMAGES[category] || '';
}

export const VEHICLES_BY_SERVICE = {
  airport_transfer: getVehiclesForService('airport_transfer'),
  city_transfer: getVehiclesForService('city_transfer'),
  chauffeur: getVehiclesForService('chauffeur'),
  intercity_transfer: getVehiclesForService('intercity_transfer'),
  gcc_transfer: getVehiclesForService('gcc_transfer'),
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
