import { COMPANY } from './company';

const SERVICE_LABELS = {
  airport: 'Airport Transfer',
  pointToPoint: 'City Transfer',
  hourly: 'Chauffeur Service',
  airport_transfer: 'Airport Transfer',
  city_transfer: 'City Transfer',
  chauffeur: 'Chauffeur Service',
  intercity_transfer: 'Intercity Transfer',
  gcc_transfer: 'GCC Transfer',
};

/** Company WhatsApp support line — Saudi Arabia */
export const COMPANY_PHONE = COMPANY.phonePrimary;

/** Strip non-digits and normalize common Saudi / international formats */
export function normalizeWhatsAppPhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length >= 10) digits = digits.slice(1);

  if (digits.length === 9 && digits.startsWith('5')) {
    digits = `966${digits}`;
  } else if (digits.length === 10 && digits.startsWith('05')) {
    digits = `966${digits.slice(1)}`;
  }

  return digits;
}

export function getServiceTypeLabel(serviceType) {
  return SERVICE_LABELS[serviceType] || serviceType;
}

export function buildBookingWhatsAppMessage(data, serviceType) {
  const lines = [
    '*Nextify — Booking Request*',
    '',
    `*Service:* ${getServiceTypeLabel(serviceType)}`,
    `*Name:* ${data.name}`,
    `*Mobile:* ${data.mobile}`,
    `*Email:* ${data.email}`,
  ];

  if (data.eventType) {
    const eventLabel =
      data.eventType === 'Other' && data.eventOther
        ? `${data.eventType} (${data.eventOther})`
        : data.eventType;
    lines.push(`*Event:* ${eventLabel}`);
  }

  if (data.flightNumber) {
    lines.push(`*Flight Number:* ${data.flightNumber}`);
  }

  if (data.arrivalDateTime) {
    const dateLabel =
      serviceType === 'hourly' || serviceType === 'chauffeur'
        ? 'Start Date & Time'
        : serviceType === 'pointToPoint' || serviceType === 'city_transfer'
          ? 'Date & Time'
          : 'Arrival Date & Time';
    lines.push(`*${dateLabel}:* ${data.arrivalDateTime}`);
  }

  if (data.vehicle) {
    lines.push(`*Vehicle:* ${data.vehicle}`);
  }

  if (data.pickupLocation) {
    const pickup =
      data.pickupLocation === 'Other' && data.otherPickupLocation
        ? data.otherPickupLocation
        : data.pickupLocation;
    lines.push(`*Pick-up Location:* ${pickup}`);
  } else if (data.otherPickupLocation) {
    lines.push(`*Other Pick-up:* ${data.otherPickupLocation}`);
  }

  if (data.dropoffLocation) {
    lines.push(`*Drop-off Location:* ${data.dropoffLocation}`);
  }

  if ((serviceType === 'hourly' || serviceType === 'chauffeur') && data.hours) {
    lines.push(`*Hours:* ${data.hours}`);
  }

  return lines.join('\n');
}

function hasDisplayValue(value) {
  if (value == null) return false;
  const text = String(value).trim();
  if (!text) return false;
  const lower = text.toLowerCase();
  return lower !== 'undefined' && lower !== 'null' && text !== '—';
}

function pickValue(...values) {
  return values.find((value) => hasDisplayValue(value));
}

function formatAmount(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return '';
  return numeric.toLocaleString('en-US');
}

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

function formatLocalDate(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function formatLocalTime(value) {
  if (!value) return '';
  if (/^\d{2}:\d{2}/.test(value)) return String(value).slice(0, 5);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function durationLabelFromType(durationType) {
  if (durationType === 'half_day') return 'Half Day (5 Hrs)';
  if (durationType === 'full_day') return 'Full Day (10 Hrs)';
  return '';
}

function pushField(lines, label, value) {
  const display = pickValue(value);
  if (!hasDisplayValue(display)) return;
  lines.push(`${label}: ${String(display).trim()}`);
}

/**
 * Pending WhatsApp confirmation message for the temporary Pay Now flow.
 * Omits empty, null, and placeholder fields. Does not claim payment.
 */
export function buildWhatsAppConfirmationMessage({
  booking = {},
  form = {},
  quote = null,
  serviceLabel,
  durationLabel,
} = {}) {
  const serviceType = form.serviceType || booking.serviceType;
  const typeLabel = pickValue(serviceLabel, getServiceTypeLabel(serviceType));
  const customer = form.customer || booking.customer || {};
  const pickupDateTime = booking.schedule?.pickupDateTime || booking.arrivalDateTime;
  const pickup = pickValue(
    form.pickupLocation,
    form.serviceLocation,
    form.origin,
    booking.pickup?.address,
    booking.origin,
  );
  const dropoff = pickValue(
    form.dropoffLocation,
    form.destination,
    booking.destination?.address,
    booking.destinationText,
    booking.dropoffLocation,
  );
  const airport = pickValue(form.airport, booking.airport);
  const vehicle = pickValue(
    form.vehicleName,
    booking.vehicle?.name,
    booking.vehicle?.label,
    booking.vehicleName,
  );
  const date = pickValue(form.travelDate, formatLocalDate(pickupDateTime));
  const time = pickValue(form.travelTime, formatLocalTime(pickupDateTime));
  const duration = pickValue(
    durationLabel,
    durationLabelFromType(form.durationType),
    durationLabelFromType(booking.durationType),
  );
  const flight = pickValue(form.flightNumber, booking.flight?.flightNumber);
  const distanceKm = pickValue(form.distanceKm, booking.distanceKm);
  const specialRequests = pickValue(form.specialRequests, booking.specialRequests);
  const amount = formatAmount(quote?.price ?? booking.quotedPrice ?? booking.pricing?.totalAmount);
  const currency = pickValue(quote?.currency, booking.pricing?.currency, 'SAR');
  const customQuote = Boolean(quote?.customQuoteRequired || booking.customQuoteRequired);

  const lines = [
    'Hello Nextify Team,',
    '',
    'I would like to confirm my chauffeur booking.',
    '',
    'BOOKING DETAILS',
  ];
  pushField(lines, 'Booking Reference', booking.bookingNumber);

  lines.push('', 'CUSTOMER DETAILS');
  pushField(lines, 'Customer Name', customer.name);
  pushField(lines, 'Phone Number', customer.mobile);
  pushField(lines, 'Email', customer.email);

  lines.push('', 'SERVICE DETAILS');
  pushField(lines, 'Selected Service', typeLabel);
  pushField(lines, 'Vehicle Category', vehicle);
  pushField(lines, 'Booking Type', typeLabel);

  lines.push('', 'TRIP DETAILS');
  if (serviceType === 'airport_transfer') {
    pushField(lines, 'Airport', airport);
    pushField(lines, 'Pickup Location', pickup || airport);
    pushField(lines, 'Drop-off Location', dropoff);
    pushField(lines, 'Flight Number', flight);
    pushField(lines, 'Pickup Date', date);
    pushField(lines, 'Pickup Time', time);
  } else if (serviceType === 'city_transfer') {
    pushField(lines, 'Pickup Location', pickup);
    pushField(lines, 'Drop-off Location', dropoff);
    pushField(lines, 'Pickup Date', date);
    pushField(lines, 'Pickup Time', time);
  } else if (serviceType === 'chauffeur') {
    pushField(lines, 'Pickup Location', pickup);
    pushField(lines, 'Service Date', date);
    pushField(lines, 'Start Time', time);
    pushField(lines, 'Selected Duration', duration);
    pushField(lines, 'Vehicle Category', vehicle);
  } else if (serviceType === 'intercity_transfer') {
    pushField(lines, 'Departure City', pickValue(form.origin, booking.origin));
    pushField(lines, 'Destination City', pickValue(form.destination, booking.destinationText, dropoff));
    pushField(lines, 'Pickup Date', date);
    pushField(lines, 'Pickup Time', time);
    pushField(lines, 'Vehicle Category', vehicle);
  } else if (serviceType === 'gcc_transfer') {
    pushField(lines, 'Pickup City', pickValue(form.origin, booking.origin));
    pushField(lines, 'Destination', pickValue(form.gccDestination, dropoff, booking.destinationText));
    pushField(lines, 'Pickup Date', date);
    pushField(lines, 'Pickup Time', time);
    pushField(lines, 'Vehicle Category', vehicle);
  } else {
    pushField(lines, 'Pickup Location', pickup);
    pushField(lines, 'Drop-off Location', dropoff);
    pushField(lines, 'Pickup Date', date);
    pushField(lines, 'Pickup Time', time);
  }

  const additional = [];
  if (serviceType === 'intercity_transfer') {
    pushField(additional, 'Route', form.intercityRoute);
  }
  if (serviceType !== 'airport_transfer') {
    pushField(additional, 'Flight Number', flight);
  }
  if (serviceType === 'city_transfer' && hasDisplayValue(distanceKm)) {
    pushField(additional, 'Estimated Distance', `${String(distanceKm).trim()} KM`);
  }
  if (Number(form.passengers) > 0) {
    pushField(additional, 'Passengers', form.passengers);
  } else if (Number(booking.trip?.passengerCount) > 0) {
    pushField(additional, 'Passengers', booking.trip.passengerCount);
  }
  if (Number(form.luggage) > 0) {
    pushField(additional, 'Luggage', form.luggage);
  } else if (Number(booking.trip?.luggageCount) > 0) {
    pushField(additional, 'Luggage', booking.trip.luggageCount);
  }
  pushField(additional, 'Special Instructions', specialRequests);

  if (additional.length) {
    lines.push('', 'Additional Details:');
    lines.push(...additional);
  }

  lines.push('', 'PRICE DETAILS');
  if (!customQuote && hasDisplayValue(amount)) {
    pushField(lines, 'Currency', currency);
    pushField(lines, 'Booking Amount', amount);
  }

  lines.push(
    '',
    'Please confirm my booking.',
    'Payment can be made by mada, Visa, Mastercard, Apple Pay, Samsung Pay, or Google Pay.',
    '',
    'Thank you.',
    'Nextify Limo',
  );

  return lines.join('\n');
}

export function buildConfirmedBookingWhatsAppMessage(booking) {
  const price =
    booking.quotedPrice ??
    booking.pricing?.totalAmount ??
    booking.pricing?.price ??
    null;

  const lines = [
    '*Nextify — Booking Inquiry*',
    '',
    `*Booking ID:* ${booking.bookingNumber}`,
    `*Service:* ${getServiceTypeLabel(booking.serviceType)}`,
    `*Vehicle:* ${booking.vehicle?.name || booking.vehicleName || '—'}`,
    `*Route:* ${booking.pickup?.address || booking.origin || '—'} → ${booking.destination?.address || booking.destinationText || '—'}`,
    `*Date:* ${new Date(booking.schedule?.pickupDateTime || booking.arrivalDateTime).toLocaleString()}`,
    `*Customer:* ${booking.customer?.name}`,
  ];

  if (price != null && !booking.customQuoteRequired) {
    lines.push(`*Total:* SAR ${Number(price).toLocaleString()}`);
  } else {
    lines.push('*Status:* Custom quote requested');
  }

  lines.push('', 'Hello, I would like assistance with my booking.');
  return lines.join('\n');
}

const WHATSAPP_WINDOW_NAME = 'nextifyWhatsApp';

export function getWhatsAppUrl(phone, message = '') {
  const normalized = normalizeWhatsAppPhone(phone) || phone;
  const base = `https://wa.me/${normalized}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Open a named tab during the click so WhatsApp is not treated as a blocked popup later. */
export function reserveWhatsAppWindow() {
  if (typeof window === 'undefined') return null;
  try {
    return window.open('about:blank', WHATSAPP_WINDOW_NAME);
  } catch {
    return null;
  }
}

function assignWhatsAppWindow(target, url) {
  if (!target || target.closed) return false;
  try {
    target.location.replace(url);
    target.focus();
    return true;
  } catch {
    return false;
  }
}

/** Opens WhatsApp with a pre-filled message to the given phone number */
export function openWhatsAppBooking(phone, message, options = {}) {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) {
    return { ok: false, error: 'WhatsApp is unavailable. Please check the company phone number.' };
  }

  const url = getWhatsAppUrl(normalized, message);
  if (assignWhatsAppWindow(options.window, url)) {
    return { ok: true, method: 'window' };
  }

  if (options.redirect) {
    window.location.assign(url);
    return { ok: true, method: 'redirect' };
  }

  let popup = null;
  try {
    popup = window.open(url, WHATSAPP_WINDOW_NAME);
  } catch {
    popup = null;
  }

  if (assignWhatsAppWindow(popup, url)) {
    return { ok: true, method: 'window' };
  }

  window.location.assign(url);
  return { ok: true, method: 'redirect' };
}

export const COMPANY_WHATSAPP_NUMBER = normalizeWhatsAppPhone(COMPANY_PHONE);

/** Opens WhatsApp to the Nextify company number with a pre-filled message */
export function openCompanyWhatsApp(message, options = {}) {
  return openWhatsAppBooking(COMPANY_WHATSAPP_NUMBER, message, options);
}
