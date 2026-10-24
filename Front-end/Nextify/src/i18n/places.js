import { displayDestinationName } from '../data/saudiDestinations';

const ROUTE_KEYS = {
  'Riyadh ↔ Khobar': 'routes.khobar',
  'Riyadh ↔ Jubail': 'routes.jubail',
  'Riyadh ↔ Jeddah': 'routes.jeddah',
  'Riyadh → Dubai': 'routes.dubai',
  'Riyadh → Abu Dhabi': 'routes.abuDhabi',
  'Riyadh → Bahrain': 'routes.bahrain',
  'Riyadh → Qatar': 'routes.qatar',
  'Riyadh → Oman': 'routes.oman',
};

export function translatePlace(value, t, lang = 'en') {
  if (!value) return '';
  const routeKey = ROUTE_KEYS[value];
  if (routeKey) return t(routeKey);
  const cityKey = `cities.${value}`;
  const city = t(cityKey);
  if (city !== cityKey) return city;
  return displayDestinationName(value, lang);
}

export function translateVehicle(category, fallback, t) {
  if (!category) return fallback || '';
  const key = `vehicles.${category}`;
  const label = t(key);
  return label !== key ? label : (fallback || category);
}

export function translateService(serviceType, t) {
  if (!serviceType) return '';
  const key = `services.${serviceType}`;
  const label = t(key);
  return label !== key ? label : serviceType;
}
