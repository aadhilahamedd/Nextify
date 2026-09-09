const PROVIDER = process.env.MAPS_PROVIDER || 'mock';

/** Simple hash for deterministic mock distances */
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const mockDistance = (pickup, destination) => {
  const pickupAddr = pickup?.address || pickup || '';
  const destAddr = destination?.address || destination || '';
  const combined = `${pickupAddr}|${destAddr}`.toLowerCase();
  const hash = hashString(combined);
  const distanceKm = 15 + (hash % 85);
  const durationMinutes = Math.round(distanceKm * 1.2 + 10);
  return { distanceKm, durationMinutes, provider: 'mock' };
};

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

async function calculateRoute(pickup, destination) {
  const hasCoords =
    pickup?.latitude != null &&
    pickup?.longitude != null &&
    destination?.latitude != null &&
    destination?.longitude != null;

  if (PROVIDER === 'google' && process.env.GOOGLE_MAPS_API_KEY && hasCoords) {
    // Placeholder for future Google Maps integration
    const distanceKm = haversineKm(
      pickup.latitude,
      pickup.longitude,
      destination.latitude,
      destination.longitude
    );
    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationMinutes: Math.round(distanceKm * 1.5 + 15),
      provider: 'google-fallback-haversine',
    };
  }

  if (hasCoords) {
    const distanceKm = haversineKm(
      pickup.latitude,
      pickup.longitude,
      destination.latitude,
      destination.longitude
    );
    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationMinutes: Math.round(distanceKm * 1.5 + 15),
      provider: 'coordinates',
    };
  }

  return mockDistance(pickup, destination);
}

module.exports = { calculateRoute, PROVIDER };
