import { findFleetVehicle } from '../data/fleetVehicles';
import { SERVICE_LABELS } from '../components/booking/bookingConstants';
import { initialCars } from './carsStorage';

export function getInquiryVehicleLabel(vehicle, serviceType) {
  if (!vehicle) return '';
  if (vehicle.category === 'gmc') {
    return serviceType === 'gcc_transfer' ? 'GMC Yukon' : 'GMC Yukon / SUV';
  }
  if (vehicle.category === 'mercedes_vito') return 'Mercedes-Benz Vito Tourer';
  return vehicle.label;
}

export function getVehicleCapacity(category) {
  const car = initialCars.find((item) => findFleetVehicle(item)?.category === category);
  if (!car) return {};
  return {
    seats: car.seats || '',
    luggage: car.luggage || '',
    type: car.type || '',
  };
}

export function resolveInquiryDestination(form = {}) {
  if (form.destination === 'Other' || form.gccDestination === 'Other') {
    return String(form.otherDestination || '').trim();
  }
  return String(form.destination || form.gccDestination || form.dropoffLocation || '').trim();
}

export function resolveInquiryPickup(form = {}) {
  return String(form.origin || form.pickupLocation || 'Riyadh').trim();
}

function line(label, value) {
  const text = value == null ? '' : String(value).trim();
  if (!text) return '';
  return `${label}: ${text}`;
}

export function buildTransferInquiryMessage(form = {}, extras = {}) {
  const serviceType = form.serviceType;
  const serviceLabel = extras.serviceLabel || SERVICE_LABELS[serviceType] || serviceType;
  const pickup = resolveInquiryPickup(form);
  const destination = resolveInquiryDestination(form);
  const vehicleLabel = extras.vehicleLabel || form.vehicleName || '';
  const returnTrip = Boolean(form.returnTrip);
  const luggage = Number(form.luggage) > 0 ? form.luggage : '';
  const passengers = Number(form.passengers) > 0 ? form.passengers : '';

  const lines = [
    'Hello NEXTIFY LIMO,',
    '',
    'I would like to request a quotation for a transfer.',
    '',
    line('Transfer Type', serviceLabel),
    line('Pickup Location', pickup),
    line('Destination', destination),
    line('Estimated Distance', form.distanceKm ? `${String(form.distanceKm).trim()} km` : ''),
    line('Distance Slab', extras.slabLabel || ''),
    line('Vehicle', vehicleLabel),
    line('Travel Date', form.travelDate),
    line('Pickup Time', form.travelTime),
    line('Passengers', passengers),
    line('Return Trip', returnTrip ? 'Yes' : 'No'),
    returnTrip ? line('Return Date', form.returnDate) : '',
    returnTrip ? line('Return Time', form.returnTime) : '',
    line('Luggage Requirements', luggage),
    line('Flight Information', form.flightNumber),
    line('Additional Requirements', form.specialRequests),
    line('Customer Name', form.customer?.name),
    line('Contact Number', form.customer?.mobile),
    form.customer?.email ? line('Email', form.customer.email) : '',
    '',
    'Please provide your quotation and availability.',
    '',
    'Thank you.',
  ];

  return lines.filter((item, index, all) => item !== '' || all[index - 1] !== '').join('\n').trim();
}

export function buildTransferChatInquiry(form = {}, extras = {}) {
  const serviceLabel = extras.serviceLabel || SERVICE_LABELS[form.serviceType] || form.serviceType;
  return [
    `This is a ${serviceLabel} quotation inquiry. Do not quote a fixed, starting, or estimated price.`,
    'Confirm the details below and explain that the team will provide a personalized quotation.',
    '',
    buildTransferInquiryMessage(form, extras),
  ].join('\n');
}
