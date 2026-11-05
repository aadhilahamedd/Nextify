/** Distance-slab ranges only. Never invent prices here. */

const CITY_MIN_KM = 20;
const CITY_MAX_KM = 60;
const CITY_SLAB_STEP_KM = 5;
const AIRPORT_BASE_KM = 40;
const AIRPORT_SLAB_STEP_KM = 5;

function toKm(value) {
  const km = Number(value);
  return Number.isFinite(km) ? km : NaN;
}

function citySlabForDistance(distanceKm) {
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
      distanceKm: Number.isFinite(km) ? km : CITY_MIN_KM,
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

function airportSlabForDistance(distanceKm) {
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

function ruleCoversCitySlab(rule, slab) {
  if (!rule || !slab || slab.kind !== 'slab' || slab.maxKm == null) return false;
  const min = rule.minDistanceKm == null ? 0 : Number(rule.minDistanceKm);
  const max = rule.maxDistanceKm == null ? null : Number(rule.maxDistanceKm);
  if (Number.isFinite(max) && slab.maxKm > max) return false;
  if (slab.minKm < min) return false;
  if (rule.minDistanceKm != null && rule.maxDistanceKm != null) {
    return slab.minKm >= min && slab.maxKm <= max;
  }
  return true;
}

module.exports = {
  CITY_MIN_KM,
  CITY_MAX_KM,
  CITY_SLAB_STEP_KM,
  AIRPORT_BASE_KM,
  AIRPORT_SLAB_STEP_KM,
  citySlabForDistance,
  airportSlabForDistance,
  ruleCoversCitySlab,
};
