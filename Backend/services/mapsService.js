const { findAirport, airportToCoords } = require('../data/saudiAirports');

const PROVIDER = process.env.MAPS_PROVIDER || 'mock';
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const NOMINATIM_HEADERS = {
  'User-Agent': 'NextifyLimo/1.0 (airport-transfer-distance)',
  Accept: 'application/json',
};
const SAUDI_BOUNDS = { south: 16.0, west: 34.4, north: 32.3, east: 55.8 };

let lastNominatimAt = 0;
let nominatimQueue = Promise.resolve();

function hasCoords(point) {
  return point != null
    && Number.isFinite(Number(point.latitude ?? point.lat))
    && Number.isFinite(Number(point.longitude ?? point.lng));
}

function toLatLng(point) {
  return {
    latitude: Number(point.latitude ?? point.lat),
    longitude: Number(point.longitude ?? point.lng),
  };
}

function roundKm(km) {
  return Math.round(Number(km) * 10) / 10;
}

function isInSaudi(lat, lng) {
  return Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= SAUDI_BOUNDS.south
    && lat <= SAUDI_BOUNDS.north
    && lng >= SAUDI_BOUNDS.west
    && lng <= SAUDI_BOUNDS.east;
}

function nominatimRequest(url, timeoutMs = 10000) {
  const run = nominatimQueue.then(async () => {
    const wait = Math.max(0, 1100 - (Date.now() - lastNominatimAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastNominatimAt = Date.now();
    return fetchJson(url, { headers: NOMINATIM_HEADERS }, timeoutMs);
  });
  nominatimQueue = run.catch(() => {});
  return run;
}

function cityFromAddress(address = {}) {
  return address.city
    || address.town
    || address.village
    || address.municipality
    || address.suburb
    || address.county
    || '';
}

function regionFromAddress(address = {}) {
  return address.state || address.region || address.province || '';
}

function isAerodrome(raw = {}) {
  return raw.class === 'aeroway' || raw.type === 'aerodrome' || raw.addresstype === 'aerodrome';
}

async function fetchJson(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function locationFromAirport(value) {
  const coords = airportToCoords(value);
  if (!coords) return null;
  return {
    kind: 'airport',
    id: coords.id,
    iata: coords.iata,
    address: coords.nameEn,
    latitude: coords.lat,
    longitude: coords.lng,
  };
}

function locationFromObject(value) {
  if (!value || typeof value !== 'object') return null;
  const airport = locationFromAirport(value);
  if (airport) return airport;
  if (hasCoords(value)) {
    const latLng = toLatLng(value);
    return {
      kind: value.kind || 'coords',
      id: value.id || null,
      iata: value.iata || null,
      address: value.address || value.nameEn || value.label || value.name || '',
      latitude: latLng.latitude,
      longitude: latLng.longitude,
    };
  }
  return null;
}

async function geocodeWithGoogle(address) {
  if (!GOOGLE_KEY || !address) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=sa&key=${encodeURIComponent(GOOGLE_KEY)}`;
  const data = await fetchJson(url);
  const result = data?.results?.[0];
  const loc = result?.geometry?.location;
  if (!loc || !Number.isFinite(Number(loc.lat)) || !Number.isFinite(Number(loc.lng))) return null;
  return {
    kind: 'address',
    address: result.formatted_address || address,
    latitude: Number(loc.lat),
    longitude: Number(loc.lng),
    provider: 'google',
  };
}

async function geocodeWithNominatim(address) {
  if (!address) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=sa&q=${encodeURIComponent(address)}`;
  const data = await nominatimRequest(url);
  const result = Array.isArray(data) ? data[0] : null;
  if (!result || !Number.isFinite(Number(result.lat)) || !Number.isFinite(Number(result.lon))) return null;
  return {
    kind: 'address',
    address: result.display_name || address,
    cityEn: cityFromAddress(result.address),
    regionEn: regionFromAddress(result.address),
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    provider: 'nominatim',
  };
}

function placeFromNominatim(item) {
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const address = item.display_name || item.name || '';
  const name = item.name || String(address).split(',')[0] || address;
  return {
    kind: 'place',
    id: item.osm_id ? `osm-${item.osm_type || 'n'}-${item.osm_id}` : null,
    nameEn: name,
    address,
    label: address || name,
    cityEn: cityFromAddress(item.address),
    regionEn: regionFromAddress(item.address),
    lat,
    lng,
    latitude: lat,
    longitude: lng,
    type: item.type || item.addresstype || '',
    provider: 'nominatim',
  };
}

function placeFromGoogle(result) {
  const loc = result?.geometry?.location;
  const lat = Number(loc?.lat);
  const lng = Number(loc?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInSaudi(lat, lng)) return null;
  const components = Array.isArray(result.address_components) ? result.address_components : [];
  const findType = (type) => components.find((part) => part.types?.includes(type))?.long_name || '';
  const address = result.formatted_address || result.name || '';
  return {
    kind: 'place',
    id: result.place_id || null,
    nameEn: result.name || address,
    address,
    label: address || result.name,
    cityEn: findType('locality') || findType('administrative_area_level_2'),
    regionEn: findType('administrative_area_level_1'),
    lat,
    lng,
    latitude: lat,
    longitude: lng,
    provider: 'google',
  };
}

async function searchWithGoogle(query) {
  if (!GOOGLE_KEY || !query) return null;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&region=sa&language=en&key=${encodeURIComponent(GOOGLE_KEY)}`;
  const data = await fetchJson(url);
  if (data?.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return null;
  return (Array.isArray(data?.results) ? data.results : [])
    .map(placeFromGoogle)
    .filter(Boolean)
    .slice(0, 8);
}

async function searchWithNominatim(query, lang = 'en') {
  if (!query) return [];
  const language = lang === 'ar' ? 'ar' : 'en';
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&countrycodes=sa&accept-language=${encodeURIComponent(language)}&q=${encodeURIComponent(query)}`;
  const data = await nominatimRequest(url);
  return (Array.isArray(data) ? data : [])
    .filter((item) => !isAerodrome(item))
    .map(placeFromNominatim)
    .filter((place) => place && isInSaudi(place.latitude, place.longitude));
}

async function searchPlaces(query, lang = 'en') {
  const q = String(query || '').trim().slice(0, 120);
  if (q.length < 2) return [];
  if (GOOGLE_KEY) {
    try {
      const google = await searchWithGoogle(q);
      if (Array.isArray(google)) return google;
    } catch {
      /* fall through to Nominatim */
    }
  }
  try {
    return await searchWithNominatim(q, lang);
  } catch {
    return [];
  }
}

async function reverseWithGoogle(lat, lng) {
  if (!GOOGLE_KEY) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${encodeURIComponent(GOOGLE_KEY)}`;
  const data = await fetchJson(url);
  const result = data?.results?.[0];
  return placeFromGoogle(result);
}

async function reverseWithNominatim(lat, lng, lang = 'en') {
  const language = lang === 'ar' ? 'ar' : 'en';
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=${encodeURIComponent(language)}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
  const data = await nominatimRequest(url);
  if (!data || data.error) return null;
  return placeFromNominatim(data);
}

async function reverseGeocode(latInput, lngInput, lang = 'en') {
  const lat = Number(latInput);
  const lng = Number(lngInput);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (GOOGLE_KEY) {
    try {
      const google = await reverseWithGoogle(lat, lng);
      if (google) return google;
    } catch {
      /* fall through */
    }
  }
  try {
    return await reverseWithNominatim(lat, lng, lang);
  } catch {
    return {
      kind: 'coords',
      nameEn: `Dropped pin (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
      address: `Dropped pin (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
      label: `Dropped pin (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
      lat,
      lng,
      latitude: lat,
      longitude: lng,
      provider: 'coords',
    };
  }
}

async function resolveLocation(value) {
  if (value == null || value === '') return null;
  const fromObject = locationFromObject(value);
  if (fromObject) return fromObject;
  const fromAirport = locationFromAirport(value);
  if (fromAirport) return fromAirport;
  const address = typeof value === 'string' ? value.trim() : String(value.address || value.nameEn || value.label || '').trim();
  if (!address) return null;
  try {
    const google = await geocodeWithGoogle(address);
    if (google) return google;
  } catch {
    /* try nominatim */
  }
  try {
    return await geocodeWithNominatim(address);
  } catch {
    return {
      kind: 'address',
      address,
      latitude: null,
      longitude: null,
    };
  }
}

async function googleDrivingDistance(origin, destination) {
  if (!GOOGLE_KEY) return null;
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&units=metric&key=${encodeURIComponent(GOOGLE_KEY)}`;
  const data = await fetchJson(url);
  const leg = data?.routes?.[0]?.legs?.[0];
  const meters = Number(leg?.distance?.value);
  if (!Number.isFinite(meters) || meters <= 0) return null;
  return {
    distanceKm: roundKm(meters / 1000),
    durationMinutes: Number.isFinite(Number(leg?.duration?.value))
      ? Math.round(Number(leg.duration.value) / 60)
      : null,
    provider: 'google',
  };
}

async function osrmDrivingDistance(origin, destination) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=false`;
  const data = await fetchJson(url);
  const route = data?.routes?.[0];
  const meters = Number(route?.distance);
  if (data?.code !== 'Ok' || !Number.isFinite(meters) || meters <= 0) return null;
  return {
    distanceKm: roundKm(meters / 1000),
    durationMinutes: Number.isFinite(Number(route?.duration))
      ? Math.round(Number(route.duration) / 60)
      : null,
    provider: 'osrm',
  };
}

async function calculateDrivingRoute(pickupInput, destinationInput) {
  const pickup = await resolveLocation(pickupInput);
  const destination = await resolveLocation(destinationInput);
  if (!hasCoords(pickup) || !hasCoords(destination)) {
    return {
      success: false,
      distanceKm: null,
      durationMinutes: null,
      provider: null,
      pickup,
      destination,
      message: 'Road distance could not be calculated for the selected locations.',
    };
  }

  const origin = toLatLng(pickup);
  const dest = toLatLng(destination);
  if (origin.latitude === dest.latitude && origin.longitude === dest.longitude) {
    return {
      success: false,
      distanceKm: null,
      durationMinutes: null,
      provider: null,
      pickup,
      destination,
      message: 'Pickup and drop-off cannot be the same location.',
    };
  }

  let route = null;
  if (GOOGLE_KEY) {
    try {
      route = await googleDrivingDistance(origin, dest);
    } catch {
      route = null;
    }
  }
  if (!route) {
    try {
      route = await osrmDrivingDistance(origin, dest);
    } catch {
      route = null;
    }
  }

  if (!route) {
    return {
      success: false,
      distanceKm: null,
      durationMinutes: null,
      provider: GOOGLE_KEY ? 'google' : 'osrm',
      pickup,
      destination,
      message: 'Road distance could not be calculated for the selected locations.',
    };
  }

  return {
    success: true,
    distanceKm: route.distanceKm,
    durationMinutes: route.durationMinutes,
    provider: route.provider,
    pickup,
    destination,
    googleConfigured: Boolean(GOOGLE_KEY),
  };
}

async function calculateRoute(pickup, destination) {
  return calculateDrivingRoute(pickup, destination);
}

module.exports = {
  PROVIDER,
  calculateRoute,
  calculateDrivingRoute,
  resolveLocation,
  searchPlaces,
  reverseGeocode,
  isInSaudi,
  findAirport,
};
