import { SERVICE_LABELS } from '../components/booking/bookingConstants';
import { findFleetVehicle } from '../data/fleetVehicles';

export function inferVehicleCategory(car) {
  return findFleetVehicle(car)?.category || null;
}

export function getVehiclePricingHints(_rules, car) {
  const fleet = findFleetVehicle(car);
  if (!fleet) return [];

  const hints = [];

  if (fleet.half != null) {
    hints.push({
      serviceType: 'chauffeur',
      label: SERVICE_LABELS.chauffeur,
      price: fleet.half,
      suffix: '/ Half Day',
    });
  }

  hints.push({
    serviceType: 'chauffeur_full',
    label: SERVICE_LABELS.chauffeur,
    price: fleet.full,
    suffix: '/ Full Day',
    note: fleet.fullDayNote ? 'destination' : '',
  });

  return hints;
}
