const DEFAULT_BOOKING_TIMEZONE = 'Asia/Riyadh';
const MIN_ADVANCE_BOOKING_MINUTES = 60;
const MIN_ADVANCE_BOOKING_MS = MIN_ADVANCE_BOOKING_MINUTES * 60 * 1000;

const SUPPORTED_TIMEZONES = typeof Intl.supportedValuesOf === 'function'
  ? new Set(Intl.supportedValuesOf('timeZone'))
  : null;

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Validates an IANA timezone identifier (e.g. "Asia/Riyadh", "Europe/London", "Asia/Kolkata").
 * Rejects fixed-offset strings like "UTC+3", "+03:00", "GMT+5:30", or unknown zones.
 */
function isValidIanaTimeZone(tz) {
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

function getZonedParts(date, timeZone) {
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
  // Guard against environments that emit hour 24 for midnight.
  if (parts.hour === 24) parts.hour = 0;
  return parts;
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

function parseStrictDateAndTime(dateStr, timeStr) {
  const dMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || '').trim());
  if (!dMatch) {
    throw httpError(400, 'Travel date must be a valid YYYY-MM-DD date');
  }
  const tMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(timeStr || '').trim());
  if (!tMatch) {
    throw httpError(400, 'Travel time must be a valid HH:MM time');
  }

  const year = Number(dMatch[1]);
  const month = Number(dMatch[2]);
  const day = Number(dMatch[3]);
  const hour = Number(tMatch[1]);
  const minute = Number(tMatch[2]);
  const second = tMatch[3] ? Number(tMatch[3]) : 0;

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
    throw httpError(400, 'Travel date or time is out of range');
  }

  // Verify calendar date actually exists (e.g. rejects 2026-02-30).
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year
    || check.getUTCMonth() + 1 !== month
    || check.getUTCDate() !== day
  ) {
    throw httpError(400, 'Travel date is not a valid calendar date');
  }

  return { year, month, day, hour, minute, second };
}

/**
 * Converts a local wall-clock date + time in an IANA timezone to an exact UTC Date.
 * Rejects nonexistent DST spring-forward local times and ambiguous DST fall-back times
 * (unless an explicit disambiguateUtcIso matches one of the valid wall-clock instants).
 */
function zonedLocalToUtc(dateStr, timeStr, timeZone, { disambiguateUtcIso = null } = {}) {
  if (!isValidIanaTimeZone(timeZone)) {
    throw httpError(400, 'Invalid booking timezone. Please select a supported IANA timezone.');
  }
  const target = parseStrictDateAndTime(dateStr, timeStr);
  const wallAsUtcMs = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute, target.second);

  // Iteratively converge from UTC guess to the true UTC instant for this timezone.
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
  const verifiedParts = getZonedParts(candidate, timeZone);
  if (!partsMatchWallClock(verifiedParts, target)) {
    throw httpError(
      400,
      `Selected local time does not exist in ${timeZone} due to a daylight saving time transition. Please choose another time.`
    );
  }

  // Check for DST fall-back ambiguity (two distinct UTC instants map to the same local wall-clock time).
  const candidateInstants = [guessMs];
  for (const offsetHours of [-2, -1, 1, 2]) {
    const probeMs = guessMs + offsetHours * 60 * 60 * 1000;
    const probeParts = getZonedParts(new Date(probeMs), timeZone);
    if (partsMatchWallClock(probeParts, target)) {
      candidateInstants.push(probeMs);
    }
  }

  if (candidateInstants.length > 1) {
    if (disambiguateUtcIso) {
      const explicit = new Date(disambiguateUtcIso);
      if (Number.isFinite(explicit.getTime()) && partsMatchWallClock(getZonedParts(explicit, timeZone), target)) {
        return explicit;
      }
    }
    throw httpError(
      400,
      `Selected local time is ambiguous in ${timeZone} due to a daylight saving time change. Please choose another time.`
    );
  }

  return candidate;
}

/**
 * Resolves and validates booking schedule from a request payload using the server's current time.
 * Never trusts client-supplied current time.
 */
function resolveAndValidateBookingSchedule(body = {}, { now = new Date() } = {}) {
  const rawTz = body.bookingTimezone ?? body.timezone ?? body.schedule?.timezone;
  const bookingTimezone = rawTz === undefined || rawTz === null || String(rawTz).trim() === ''
    ? DEFAULT_BOOKING_TIMEZONE
    : String(rawTz).trim();

  if (!isValidIanaTimeZone(bookingTimezone)) {
    throw httpError(400, 'Invalid booking timezone. Please select a supported IANA timezone.');
  }

  const rawSchedule = body.schedule?.pickupDateTime || body.arrivalDateTime || body.pickupDateTime || null;
  const hasExplicitOffset = typeof rawSchedule === 'string' && /(?:Z|[+-]\d{2}:?\d{2})$/i.test(rawSchedule.trim());

  let pickupDateTime = null;

  if (body.travelDate && body.travelTime) {
    pickupDateTime = zonedLocalToUtc(body.travelDate, body.travelTime, bookingTimezone, {
      disambiguateUtcIso: hasExplicitOffset ? rawSchedule : null,
    });
  } else if (rawSchedule) {
    if (rawSchedule instanceof Date) {
      if (!Number.isFinite(rawSchedule.getTime())) {
        throw httpError(400, 'Travel date and time is invalid');
      }
      pickupDateTime = rawSchedule;
    } else if (typeof rawSchedule === 'string' && hasExplicitOffset) {
      const parsed = new Date(rawSchedule);
      if (!Number.isFinite(parsed.getTime())) {
        throw httpError(400, 'Travel date and time is invalid');
      }
      pickupDateTime = parsed;
    } else if (typeof rawSchedule === 'string' && rawSchedule.includes('T')) {
      const [dPart, tPart] = rawSchedule.split('T');
      pickupDateTime = zonedLocalToUtc(dPart, String(tPart || '').slice(0, 5), bookingTimezone);
    } else {
      const parsed = new Date(rawSchedule);
      if (!Number.isFinite(parsed.getTime())) {
        throw httpError(400, 'Travel date and time is invalid');
      }
      pickupDateTime = parsed;
    }
  }

  if (!pickupDateTime || !Number.isFinite(pickupDateTime.getTime())) {
    throw httpError(400, 'Travel date and time is required');
  }

  const serverNow = now instanceof Date && Number.isFinite(now.getTime()) ? now : new Date();
  if (pickupDateTime.getTime() < serverNow.getTime()) {
    throw httpError(400, 'Travel date and time cannot be in the past');
  }
  if (pickupDateTime.getTime() < serverNow.getTime() + MIN_ADVANCE_BOOKING_MS) {
    throw httpError(400, 'Bookings must be scheduled at least 60 minutes in advance.');
  }

  return {
    pickupDateTime,
    bookingTimezone,
  };
}

module.exports = {
  DEFAULT_BOOKING_TIMEZONE,
  MIN_ADVANCE_BOOKING_MINUTES,
  MIN_ADVANCE_BOOKING_MS,
  isValidIanaTimeZone,
  getZonedParts,
  zonedLocalToUtc,
  resolveAndValidateBookingSchedule,
};
