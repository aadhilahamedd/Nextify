import { SAUDI_AIRPORTS, displayAirportName, findAirport, searchSaudiAirports } from './saudiAirports';
import { SAUDI_DESTINATIONS, displayDestinationName, findDestination, searchSaudiDestinations } from './saudiDestinations';

export const FEATURED_AIRPORT_IDS = [
  'riyadh-airport',
  'jeddah-airport',
  'dammam-airport',
  'medina-airport',
  'abha-airport',
  'taif-airport',
  'tabuk-airport',
  'gassim-airport',
];

export const FEATURED_CITY_IDS = [
  'riyadh',
  'jeddah',
  'mecca',
  'medina',
  'dammam',
  'khobar',
  'al-qassim',
  'bahrain',
  'abha',
  'taif',
  'tabuk',
];

function byId(list, ids) {
  return ids.map((id) => list.find((item) => item.id === id)).filter(Boolean);
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.id || item.nameEn;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function featuredTransferAirports() {
  return byId(SAUDI_AIRPORTS, FEATURED_AIRPORT_IDS).map((item) => ({ ...item, kind: 'airport' }));
}

export function featuredTransferCities() {
  return byId(SAUDI_DESTINATIONS, FEATURED_CITY_IDS).map((item) => ({ ...item, kind: 'place' }));
}

export function formatTransferLocation(value, lang = 'en') {
  if (!value) return '';
  const isPlaceObject = typeof value === 'object' && value.kind === 'place' && !value.iata;
  if (isPlaceObject) {
    const dest = findDestination(value);
    if (dest) return lang === 'ar' ? (dest.nameAr || dest.nameEn) : dest.nameEn;
  }
  const airport = findAirport(value);
  if (airport && !isPlaceObject) return displayAirportName(airport, lang);
  const dest = findDestination(value);
  if (dest) return lang === 'ar' ? (dest.nameAr || dest.nameEn) : dest.nameEn;
  if (typeof value === 'object') {
    const name = lang === 'ar' ? (value.nameAr || value.nameEn || value.address) : (value.nameEn || value.address || value.label);
    const city = lang === 'ar' ? value.cityAr : value.cityEn;
    if (value.kind === 'airport' && name && city && !String(name).includes(city)) return `${name} – ${city}`;
    return name || '';
  }
  return displayDestinationName(value, lang) || String(value);
}

export function searchTransferLocations(query) {
  const q = String(query || '').trim();
  if (!q) {
    return {
      airports: featuredTransferAirports(),
      cities: featuredTransferCities(),
    };
  }
  const searchedAirports = searchSaudiAirports(q, 10).map((item) => ({ ...item, kind: 'airport' }));
  const featuredAirHits = featuredTransferAirports().filter((item) => (
    searchedAirports.some((airport) => airport.id === item.id)
  ));
  const airports = uniqueById([...featuredAirHits, ...searchedAirports]).slice(0, 8);

  const searchedCities = searchSaudiDestinations(q, 10)
    .filter((item) => !String(item.id || '').endsWith('-airport'))
    .map((item) => ({ ...item, kind: 'place' }));
  const featuredCityHits = featuredTransferCities().filter((item) => (
    searchedCities.some((city) => city.id === item.id)
  ));
  const cities = uniqueById([...featuredCityHits, ...searchedCities]).slice(0, 8);

  return { airports, cities };
}
