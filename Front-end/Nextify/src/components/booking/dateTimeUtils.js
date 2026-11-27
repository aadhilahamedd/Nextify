export const DEFAULT_BOOKING_TIMEZONE = 'Asia/Riyadh';
export const MIN_ADVANCE_BOOKING_MINUTES = 60;
export const MIN_ADVANCE_BOOKING_MS = MIN_ADVANCE_BOOKING_MINUTES * 60 * 1000;
export const TIME_SLOT_INTERVAL_MINUTES = 5;

export const FEATURED_TIMEZONES = [
  { id: 'Asia/Riyadh', label: 'Saudi Arabia — Asia/Riyadh' },
  { id: 'Asia/Dubai', label: 'United Arab Emirates — Asia/Dubai' },
  { id: 'Europe/London', label: 'United Kingdom — Europe/London' },
  { id: 'Asia/Kolkata', label: 'India — Asia/Kolkata' },
  { id: 'Asia/Bahrain', label: 'Bahrain — Asia/Bahrain' },
  { id: 'Asia/Qatar', label: 'Qatar — Asia/Qatar' },
  { id: 'Asia/Kuwait', label: 'Kuwait — Asia/Kuwait' },
  { id: 'America/New_York', label: 'United States — America/New_York' },
];

const FEATURED_MAP = new Map(FEATURED_TIMEZONES.map((z) => [z.id, z.label]));

const SUPPORTED_TIMEZONE_SET = typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function'
  ? new Set(Intl.supportedValuesOf('timeZone'))
  : null;

function pad(n) {
  return String(n).padStart(2, '0');
}

export function getAllSupportedTimezones() {
  const seen = new Set(FEATURED_TIMEZONES.map((z) => z.id));
  const list = [...FEATURED_TIMEZONES];
  if (SUPPORTED_TIMEZONE_SET) {
    for (const tz of SUPPORTED_TIMEZONE_SET) {
      if (seen.has(tz)) continue;
      seen.add(tz);
      list.push({ id: tz, label: tz.replace(/_/g, ' ') });
    }
  }
  return list;
}

export function formatTimezoneLabel(timeZone) {
  const tz = String(timeZone || DEFAULT_BOOKING_TIMEZONE).trim();
  return FEATURED_MAP.get(tz) || tz.replace(/_/g, ' ');
}

export function isValidIanaTimeZone(tz) {
  if (typeof tz !== 'string') return false;
  const trimmed = tz.trim();
  if (!trimmed || trimmed.length > 80) return false;
  if (/^(?:UTC|GMT)?[+-]\d{1,2}(?::?\d{2})?$/i.test(trimmed)) return false;
  if (trimmed !== 'UTC' && !trimmed.includes('/')) return false;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

export function getZonedParts(date, timeZone = DEFAULT_BOOKING_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') {
      parts[part.type] = Number(part.value);
    }
  }
  if (parts.hour === 24) parts.hour = 0;
  return {
    ...parts,
    dateValue: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
    timeValue: `${pad(parts.hour)}:${pad(parts.minute)}`,
  };
}

function partsMatchWallClock(parts, target) {
  return (
    parts.year === target.year
    && parts.month === target.month
    && parts.day === target.day
    && parts.hour === target.hour
    && parts.minute === target.minute
  );
}

/**
 * Converts a wall-clock (YYYY-MM-DD, HH:MM) in an IANA timezone to an exact UTC Date.
 */
export function zonedLocalToUtc(dateStr, timeStr, timeZone = DEFAULT_BOOKING_TIMEZONE) {
  if (!isValidIanaTimeZone(timeZone)) {
    return { ok: false, reason: 'invalid_timezone' };
  }
  const dMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || '').trim());
  const tMatch = /^(\d{2}):(\d{2})$/.exec(String(timeStr || '').trim());
  if (!dMatch || !tMatch) {
    return { ok: false, reason: 'invalid_datetime' };
  }

  const year = Number(dMatch[1]);
  const month = Number(dMatch[2]);
  const day = Number(dMatch[3]);
  const hour = Number(tMatch[1]);
  const minute = Number(tMatch[2]);

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { ok: false, reason: 'invalid_datetime' };
  }

  const calCheck = new Date(Date.UTC(year, month - 1, day));
  if (calCheck.getUTCFullYear() !== year || calCheck.getUTCMonth() + 1 !== month || calCheck.getUTCDate() !== day) {
    return { ok: false, reason: 'invalid_datetime' };
  }

  const target = { year, month, day, hour, minute };
  const wallAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guessMs = wallAsUtcMs;

  for (let i = 0; i < 4; i += 1) {
    const observed = getZonedParts(new Date(guessMs), timeZone);
    const observedAsUtcMs = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second
    );
    const diffMs = wallAsUtcMs - observedAsUtcMs;
    if (diffMs === 0) break;
    guessMs += diffMs;
  }

  const candidate = new Date(guessMs);
  const verified = getZonedParts(candidate, timeZone);
  if (!partsMatchWallClock(verified, target)) {
    return { ok: false, reason: 'dst_nonexistent' };
  }

  return { ok: true, date: candidate };
}

/**
 * Computes the earliest allowed date and selectable time slot in `timeZone`
 * that is at least 60 minutes after `now`, rounding UP to `intervalMinutes` (never down).
 */
export function getMinimumBookingConstraint(
  timeZone = DEFAULT_BOOKING_TIMEZONE,
  now = new Date(),
  intervalMinutes = TIME_SLOT_INTERVAL_MINUTES
) {
  const safeTz = isValidIanaTimeZone(timeZone) ? timeZone : DEFAULT_BOOKING_TIMEZONE;
  const minInstantMs = now.getTime() + MIN_ADVANCE_BOOKING_MS;
  const intervalMs = Math.max(1, Number(intervalMinutes) || 1) * 60 * 1000;
  const roundedSlotMs = Math.ceil(minInstantMs / intervalMs) * intervalMs;
  const slotParts = getZonedParts(new Date(roundedSlotMs), safeTz);

  return {
    timeZone: safeTz,
    minInstant: new Date(minInstantMs),
    earliestSlotInstant: new Date(roundedSlotMs),
    minDate: slotParts.dateValue,
    minTime: slotParts.timeValue,
  };
}

/**
 * Converts an already-selected local (dateValue, timeValue) from `fromTz` to `toTz`
 * while preserving the exact UTC booking instant.
 */
export function convertLocalDateTimeBetweenTimezones(dateStr, timeStr, fromTz, toTz) {
  if (!dateStr || !timeStr) return null;
  if (!isValidIanaTimeZone(fromTz) || !isValidIanaTimeZone(toTz)) return null;
  const resolved = zonedLocalToUtc(dateStr, timeStr, fromTz);
  if (!resolved.ok) return null;
  const nextParts = getZonedParts(resolved.date, toTz);
  return {
    travelDate: nextParts.dateValue,
    travelTime: nextParts.timeValue,
    utcDate: resolved.date,
  };
}

export function validateBookingDateTime(
  dateStr,
  timeStr,
  timeZone = DEFAULT_BOOKING_TIMEZONE,
  now = new Date()
) {
  if (!dateStr || !timeStr) return { valid: false, reason: 'missing' };
  const converted = zonedLocalToUtc(dateStr, timeStr, timeZone);
  if (!converted.ok) {
    return { valid: false, reason: converted.reason };
  }
  const utcMs = converted.date.getTime();
  const nowMs = now.getTime();
  if (utcMs < nowMs) {
    return { valid: false, reason: 'past', utcDate: converted.date };
  }
  if (utcMs < nowMs + MIN_ADVANCE_BOOKING_MS) {
    return { valid: false, reason: 'too_soon', utcDate: converted.date };
  }
  return { valid: true, utcDate: converted.date };
}

export function getLocalDateValue(date = new Date(), timeZone = DEFAULT_BOOKING_TIMEZONE) {
  if (isValidIanaTimeZone(timeZone)) {
    return getZonedParts(date, timeZone).dateValue;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isTravelDateTimePast(dateValue, timeValue, timeZone = DEFAULT_BOOKING_TIMEZONE, now = new Date()) {
  if (!dateValue || !timeValue) return false;
  const res = validateBookingDateTime(dateValue, timeValue, timeZone, now);
  return !res.valid;
}
