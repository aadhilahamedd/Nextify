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
export const COMPANY_PHONE = '+966512345678';

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

export function getWhatsAppUrl(phone, message = '') {
  const normalized = normalizeWhatsAppPhone(phone) || phone;
  const base = `https://wa.me/${normalized}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Opens WhatsApp with a pre-filled message to the given phone number */
export function openWhatsAppBooking(phone, message) {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) {
    return { ok: false, error: 'WhatsApp is unavailable. Please check the company phone number.' };
  }

  window.open(getWhatsAppUrl(normalized, message), '_blank', 'noopener,noreferrer');
  return { ok: true };
}

export const COMPANY_WHATSAPP_NUMBER = normalizeWhatsAppPhone(COMPANY_PHONE);

/** Opens WhatsApp to the Nextify company number with a pre-filled message */
export function openCompanyWhatsApp(message) {
  return openWhatsAppBooking(COMPANY_WHATSAPP_NUMBER, message);
}
