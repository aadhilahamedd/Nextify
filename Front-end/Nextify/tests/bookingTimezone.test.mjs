import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_BOOKING_TIMEZONE,
  convertLocalDateTimeBetweenTimezones,
  getMinimumBookingConstraint,
  isValidIanaTimeZone,
  validateBookingDateTime,
} from '../src/components/booking/dateTimeUtils.js';

test('minimum 60-minute constraint calculates exact slot and rounds UP (never down)', () => {
  // 08:00 Riyadh (= 05:00Z) -> 09:00 Riyadh
  const c1 = getMinimumBookingConstraint('Asia/Riyadh', new Date('2026-12-01T05:00:00.000Z'), 5);
  assert.equal(c1.minDate, '2026-12-01');
  assert.equal(c1.minTime, '09:00');

  // 08:15 Riyadh (= 05:15Z) -> 09:15 Riyadh
  const c2 = getMinimumBookingConstraint('Asia/Riyadh', new Date('2026-12-01T05:15:00.000Z'), 5);
  assert.equal(c2.minDate, '2026-12-01');
  assert.equal(c2.minTime, '09:15');

  // 08:45 Riyadh (= 05:45Z) -> 09:45 Riyadh
  const c3 = getMinimumBookingConstraint('Asia/Riyadh', new Date('2026-12-01T05:45:00.000Z'), 5);
  assert.equal(c3.minDate, '2026-12-01');
  assert.equal(c3.minTime, '09:45');

  // 08:16 Riyadh (= 05:16Z) -> rounds UP to 09:20 (never 09:15)
  const c4 = getMinimumBookingConstraint('Asia/Riyadh', new Date('2026-12-01T05:16:00.000Z'), 5);
  assert.equal(c4.minDate, '2026-12-01');
  assert.equal(c4.minTime, '09:20');

  // 15-minute interval: 08:16 -> 09:30
  const c15 = getMinimumBookingConstraint('Asia/Riyadh', new Date('2026-12-01T05:16:00.000Z'), 15);
  assert.equal(c15.minDate, '2026-12-01');
  assert.equal(c15.minTime, '09:30');
});

test('midnight, next-day, month-end, and year-end rollovers work accurately', () => {
  // 2026-12-31 23:30 Asia/Riyadh (= 2026-12-31T20:30:00Z) -> 2027-01-01 00:30
  const c = getMinimumBookingConstraint('Asia/Riyadh', new Date('2026-12-31T20:30:00.000Z'), 5);
  assert.equal(c.minDate, '2027-01-01');
  assert.equal(c.minTime, '00:30');
});

test('timezone conversion preserves UTC instant across Riyadh, London (DST), India, and Dubai', () => {
  assert.equal(DEFAULT_BOOKING_TIMEZONE, 'Asia/Riyadh');

  // Summer DST: 2026-07-10 12:00 Asia/Riyadh (= 09:00Z) -> 10:00 Europe/London (BST) & 14:30 Asia/Kolkata
  const toLondon = convertLocalDateTimeBetweenTimezones('2026-07-10', '12:00', 'Asia/Riyadh', 'Europe/London');
  assert.equal(toLondon.travelDate, '2026-07-10');
  assert.equal(toLondon.travelTime, '10:00');
  assert.equal(toLondon.utcDate.toISOString(), '2026-07-10T09:00:00.000Z');

  const toIndia = convertLocalDateTimeBetweenTimezones('2026-07-10', '12:00', 'Asia/Riyadh', 'Asia/Kolkata');
  assert.equal(toIndia.travelDate, '2026-07-10');
  assert.equal(toIndia.travelTime, '14:30');
  assert.equal(toIndia.utcDate.toISOString(), '2026-07-10T09:00:00.000Z');

  // Changing timezone does not make a 45-minute booking valid
  const now = new Date('2026-07-10T08:15:00.000Z'); // 11:15 Riyadh, 09:15 London
  const invalidCheck = validateBookingDateTime(toLondon.travelDate, toLondon.travelTime, 'Europe/London', now);
  assert.equal(invalidCheck.valid, false);
  assert.equal(invalidCheck.reason, 'too_soon');
});

test('invalid timezones and nonexistent DST local times are rejected', () => {
  assert.equal(isValidIanaTimeZone('UTC+3'), false);
  assert.equal(isValidIanaTimeZone('Invalid/Zone'), false);
  assert.equal(isValidIanaTimeZone('Asia/Riyadh'), true);

  const dstGap = validateBookingDateTime('2026-03-29', '01:30', 'Europe/London', new Date('2026-03-28T00:00:00.000Z'));
  assert.equal(dstGap.valid, false);
  assert.equal(dstGap.reason, 'dst_nonexistent');
});
