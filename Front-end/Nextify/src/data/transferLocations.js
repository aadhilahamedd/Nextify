import { SAUDI_AIRPORTS, displayAirportName, findAirport, searchSaudiAirports } from './saudiAirports';
import { SAUDI_DESTINATIONS, displayDestinationName, findDestination, searchSaudiDestinations } from './saudiDestinations';
import {
  CITY_NEIGHBOURHOODS,
  findNeighbourhood,
  formatNeighbourhoodLabel,
  neighbourhoodToDestination,
  searchCityNeighbourhoods,
} from './cityNeighbourhoods';

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

function asText(value) {
  if (value == null) return '';
  if (typeof value === 'object') {
    const text = String(value.nameEn || value.address || value.label || value.name || '').trim();
    return text === '[object Object]' ? '' : text;
  }
  const text = String(value);
  return text === '[object Object]' ? '' : text;
}

export function describeTransferOption(value, lang = 'en', labels = {}) {
  if (!value) return null;
  const neighbourhood = findNeighbourhood(value)
    || (value?.kind === 'neighbourhood' ? value : null);
  if (neighbourhood) {
    const city = lang === 'ar' ? (neighbourhood.cityAr || neighbourhood.cityEn) : neighbourhood.cityEn;
    return {
      id: neighbourhood.id,
      kind: 'neighbourhood',
      title: lang === 'ar' ? (neighbourhood.nameAr || neighbourhood.nameEn) : neighbourhood.nameEn,
      region: [city, labels.neighbourhoodType].filter(Boolean).join(' · '),
      iata: '',
    };
  }
  const isPlaceObject = typeof value === 'object' && value.kind === 'place' && !value.iata;
  const airport = findAirport(value);
  if (airport && !isPlaceObject) {
    const city = lang === 'ar' ? (airport.cityAr || airport.cityEn) : airport.cityEn;
    return {
      id: airport.id,
      kind: 'airport',
      title: lang === 'ar' ? (airport.nameAr || airport.nameEn) : airport.nameEn,
      region: [city, labels.airportType].filter(Boolean).join(' · '),
      iata: airport.iata || '',
    };
  }
  const dest = findDestination(value);
  if (dest) {
    return {
      id: dest.id,
      kind: dest.kind || 'place',
      title: lang === 'ar' ? (dest.nameAr || dest.nameEn) : dest.nameEn,
      region: labels.citiesGroup || '',
      iata: '',
    };
  }
  const title = asText(typeof value === 'object' ? (value.nameEn || value.address || value.label) : value);
  return title ? { kind: 'address', title, region: '', iata: '' } : null;
}

export function formatTransferLocation(value, lang = 'en') {
  if (!value) return '';
  const neighbourhood = findNeighbourhood(value)
    || (value?.kind === 'neighbourhood' ? value : null);
  if (neighbourhood) return formatNeighbourhoodLabel(neighbourhood, lang) || '';
  const isPlaceObject = typeof value === 'object' && value.kind === 'place' && !value.iata;
  if (isPlaceObject) {
    const dest = findDestination(value);
    if (dest?.kind === 'neighbourhood') return formatNeighbourhoodLabel(dest, lang) || '';
    if (dest) return (lang === 'ar' ? (dest.nameAr || dest.nameEn) : dest.nameEn) || '';
  }
  const airport = findAirport(value);
  if (airport && !isPlaceObject) return displayAirportName(airport, lang) || '';
  const dest = findDestination(value);
  if (dest?.kind === 'neighbourhood') return formatNeighbourhoodLabel(dest, lang) || '';
  if (dest) return (lang === 'ar' ? (dest.nameAr || dest.nameEn) : dest.nameEn) || '';
  if (typeof value === 'object') {
    const name = lang === 'ar' ? (value.nameAr || value.nameEn || value.address) : (value.nameEn || value.address || value.label);
    const city = lang === 'ar' ? (value.cityAr || value.pricingCity) : (value.cityEn || value.pricingCity);
    if (value.kind === 'airport' && name && city && !String(name).includes(city)) return `${name} – ${city}`;
    if (city && name && !String(name).includes(city)) return `${name}, ${city}`;
    return asText(name);
  }
  return asText(displayDestinationName(value, lang));
}

export function featuredTransferNeighbourhoods() {
  const riyadh = CITY_NEIGHBOURHOODS.filter((item) => item.pricingCityId === 'riyadh').slice(0, 4);
  const jeddah = CITY_NEIGHBOURHOODS.filter((item) => item.pricingCityId === 'jeddah').slice(0, 4);
  return [...riyadh, ...jeddah].map(neighbourhoodToDestination);
}

export function searchTransferLocations(query) {
  const q = String(query || '').trim();
  if (!q) {
    return {
      airports: featuredTransferAirports(),
      cities: featuredTransferCities(),
      neighbourhoods: featuredTransferNeighbourhoods(),
    };
  }
  const searchedAirports = searchSaudiAirports(q, 10).map((item) => ({ ...item, kind: 'airport' }));
  const featuredAirHits = featuredTransferAirports().filter((item) => (
    searchedAirports.some((airport) => airport.id === item.id)
  ));
  const airports = uniqueById([...featuredAirHits, ...searchedAirports]).slice(0, 8);

  const searchedCities = searchSaudiDestinations(q, 12)
    .filter((item) => !String(item.id || '').endsWith('-airport') && item.kind !== 'neighbourhood')
    .map((item) => ({ ...item, kind: item.kind || 'place' }));
  const featuredCityHits = featuredTransferCities().filter((item) => (
    searchedCities.some((city) => city.id === item.id)
  ));
  const cities = uniqueById([...featuredCityHits, ...searchedCities]).slice(0, 8);

  const neighbourhoods = uniqueById(searchCityNeighbourhoods(q, 12));

  return { airports, cities, neighbourhoods };
}
