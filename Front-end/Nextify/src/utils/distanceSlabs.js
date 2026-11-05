/** Distance-slab ranges only. Prices always come from configured rates. */

export const CITY_MIN_KM = 20;
export const CITY_MAX_KM = 60;
export const CITY_SLAB_STEP_KM = 5;
export const AIRPORT_BASE_KM = 40;
export const AIRPORT_SLAB_STEP_KM = 5;

function toKm(value) {
  const km = Number(value);
  return Number.isFinite(km) ? km : NaN;
}

export function citySlabForDistance(distanceKm) {
  const km = toKm(distanceKm);
  if (!Number.isFinite(km) || km < 0) {
    return { kind: 'invalid' };
  }
  if (km > CITY_MAX_KM) {
    return {
      kind: 'long_distance',
      minKm: CITY_MAX_KM + 1,
      maxKm: null,
      label: '61+ km',
      billedKm: km,
      distanceKm: km,
    };
  }
  if (km <= CITY_MIN_KM) {
    return {
      kind: 'slab',
      minKm: 0,
      maxKm: CITY_MIN_KM,
      label: '0–20 km',
      billedKm: CITY_MIN_KM,
      distanceKm: km,
    };
  }
  const extra = km - CITY_MIN_KM;
  const maxKm = CITY_MIN_KM + Math.ceil(extra / CITY_SLAB_STEP_KM) * CITY_SLAB_STEP_KM;
  const minKm = maxKm - CITY_SLAB_STEP_KM + 1;
  return {
    kind: 'slab',
    minKm,
    maxKm,
    label: `${minKm}–${maxKm} km`,
    billedKm: maxKm,
    distanceKm: km,
  };
}

export function airportSlabForDistance(distanceKm) {
  const km = toKm(distanceKm);
  if (!Number.isFinite(km) || km <= 0) {
    return {
      kind: 'base',
      extraSlabs: 0,
      extraKmBilled: 0,
      label: '0–40 km',
      billedKm: AIRPORT_BASE_KM,
      distanceKm: null,
    };
  }
  if (km <= AIRPORT_BASE_KM) {
    return {
      kind: 'base',
      extraSlabs: 0,
      extraKmBilled: 0,
      label: '0–40 km',
      billedKm: AIRPORT_BASE_KM,
      distanceKm: km,
    };
  }
  const extra = km - AIRPORT_BASE_KM;
  const extraSlabs = Math.ceil(extra / AIRPORT_SLAB_STEP_KM);
  const extraKmBilled = extraSlabs * AIRPORT_SLAB_STEP_KM;
  return {
    kind: 'extra',
    extraSlabs,
    extraKmBilled,
    label: `40 km + ${extraKmBilled} km`,
    billedKm: AIRPORT_BASE_KM + extraKmBilled,
    distanceKm: km,
  };
}
