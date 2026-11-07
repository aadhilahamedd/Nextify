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
  city_transfer: 'Comfortable transfers within Riyadh. Vehicle base fare matches Airport Transfer.',
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

export const ROUTE_TRANSFER_TYPES = ['intercity_transfer', 'gcc_transfer'];
export const INQUIRY_SERVICE_TYPES = ROUTE_TRANSFER_TYPES;

export function isRouteTransferService(serviceType) {
  return ROUTE_TRANSFER_TYPES.includes(serviceType);
}

export function isInquiryTransfer(serviceType) {
  return isRouteTransferService(serviceType);
}

export function quoteRequiresInquiry(quote, form = {}) {
  if (form.origin === 'Other' || form.destination === 'Other' || form.gccDestination === 'Other') return true;
  if (form.returnTrip && isRouteTransferService(form.serviceType)) return true;
  if (!quote) return false;
  return Boolean(
    quote.customQuoteRequired
    || quote.quoteStatus === 'rate_on_request'
    || quote.quoteStatus === 'long_distance'
    || quote.pricingType === 'custom_quote',
  );
}

export const INTERCITY_CITIES = [
  'Riyadh',
  'Jeddah',
  'Dammam',
  'Al Khobar',
  'Jubail',
  'Salwa',
  'Batha',
  'Madinah',
  'Abha',
  'Jizan',
  'Tabuk',
  'Other',
];

export const TRANSFER_ORIGINS = INTERCITY_CITIES;
export const INTERCITY_DESTINATIONS = INTERCITY_CITIES;

export const GCC_LOCATION_OPTIONS = [
  'Riyadh',
  'Jeddah',
  'Dammam',
  'Bahrain',
  'Qatar',
  'Abu Dhabi',
  'Dubai',
  'Kuwait',
  'Other',
];

export const GCC_DESTINATION_OPTIONS = GCC_LOCATION_OPTIONS;

export const INTERCITY_ROUTES = INTERCITY_DESTINATIONS
  .filter((destination) => destination !== 'Other' && destination !== 'Riyadh')
  .map((destination) => ({
    origin: 'Riyadh',
    destination,
    label: `Riyadh ↔ ${destination}`,
  }));

export const GCC_DESTINATIONS = GCC_DESTINATION_OPTIONS
  .filter((destination) => destination !== 'Other')
  .map((destination) => ({
    destination,
    label: `Riyadh → ${destination}`,
  }));

export const DURATION_OPTIONS = [
  { value: 'half_day', label: 'Half Day' },
  { value: 'full_day', label: 'Full Day' },
];

export const initialFormState = {
  serviceType: 'airport_transfer',
  airport: '',
  origin: '',
  destination: '',
  pickupLocation: '',
  dropoffLocation: '',
  pickupPlace: null,
  dropoffPlace: null,
  serviceLocation: '',
  intercityRoute: '',
  gccDestination: '',
  otherOrigin: '',
  otherDestination: '',
  returnTrip: false,
  returnDate: '',
  returnTime: '',
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
