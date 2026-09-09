import { SERVICE_LABELS } from '../components/booking/bookingConstants';

export function inferVehicleCategory(car) {
  const name = String(car?.name || '').toLowerCase();
  const type = String(car?.type || '').toLowerCase();

  if (name.includes('taurus')) return 'ford_taurus';
  if (name.includes('prado') || name.includes('fortuner')) return 'prado_fortuner';
  if (name.includes('suburban')) return 'chevrolet_suburban';
  if (name.includes('tahoe')) return 'gmc_tahoe';
  if (name.includes('yukon')) return 'gmc_yukon';
  if (name.includes('v-class') || name.includes('v class')) return 'mercedes_v_class';
  if (name.includes('coaster') || type.includes('coach')) return 'toyota_coaster';
  if (type.includes('van') || name.includes('hiace') || name.includes('sprinter')) return 'mini_van';
  if (type.includes('suv')) return 'gmc_yukon';
  if (type.includes('sedan') || name.includes('7 series') || name.includes('s-class') || name.includes('es 350')) {
    return 'sedan';
  }
  return null;
}

function ruleMatchesVehicle(rule, category) {
  if (rule.vehicleApplicability === 'all') return true;
  if (rule.vehicleCategory === category) return true;
  return false;
}

export function getVehiclePricingHints(rules, car) {
  const category = inferVehicleCategory(car);
  if (!category || !Array.isArray(rules)) return [];

  const hints = [];
  const services = ['airport_transfer', 'city_transfer', 'chauffeur', 'intercity_transfer', 'gcc_transfer'];

  for (const serviceType of services) {
    const serviceRules = rules.filter((r) => r.serviceType === serviceType && r.active !== false);
    const matched = serviceRules.filter((r) => ruleMatchesVehicle(r, category));
    if (!matched.length) continue;

    if (serviceType === 'chauffeur') {
      const half = matched.find((r) => r.durationType === 'half_day');
      if (half) {
        hints.push({ serviceType, label: SERVICE_LABELS[serviceType], price: half.price, suffix: '/ Half Day' });
      }
      continue;
    }

    const minPrice = Math.min(...matched.map((r) => r.price));
    hints.push({
      serviceType,
      label: SERVICE_LABELS[serviceType],
      price: minPrice,
      suffix: serviceType === 'intercity_transfer' ? ' (from)' : '',
    });
  }

  return hints.slice(0, 3);
}
