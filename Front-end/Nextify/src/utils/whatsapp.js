const SERVICE_LABELS = {
  airport: 'Airport Transfer',
  pointToPoint: 'Point to Point',
  hourly: 'Hourly Service',
}

/** Company contact — keep in sync with footer */
export const COMPANY_PHONE = '+1 (333) 000-0000'

/** Strip non-digits and normalize common Saudi / international formats */
export function normalizeWhatsAppPhone(phone) {
  if (!phone) return ''
  let digits = String(phone).replace(/\D/g, '')
  if (!digits) return ''

  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0') && digits.length >= 10) digits = digits.slice(1)

  if (digits.length === 9 && digits.startsWith('5')) {
    digits = `966${digits}`
  } else if (digits.length === 10 && digits.startsWith('05')) {
    digits = `966${digits.slice(1)}`
  }

  return digits
}

export function getServiceTypeLabel(serviceType) {
  return SERVICE_LABELS[serviceType] || serviceType
}

export function buildBookingWhatsAppMessage(data, serviceType) {
  const lines = [
    '*Nextify — Booking Request*',
    '',
    `*Service:* ${getServiceTypeLabel(serviceType)}`,
    `*Name:* ${data.name}`,
    `*Mobile:* ${data.mobile}`,
    `*Email:* ${data.email}`,
  ]

  if (data.eventType) {
    const eventLabel =
      data.eventType === 'Other' && data.eventOther
        ? `${data.eventType} (${data.eventOther})`
        : data.eventType
    lines.push(`*Event:* ${eventLabel}`)
  }

  if (data.flightNumber) {
    lines.push(`*Flight Number:* ${data.flightNumber}`)
  }

  if (data.arrivalDateTime) {
    const dateLabel =
      serviceType === 'hourly'
        ? 'Start Date & Time'
        : serviceType === 'pointToPoint'
          ? 'Date & Time'
          : 'Arrival Date & Time'
    lines.push(`*${dateLabel}:* ${data.arrivalDateTime}`)
  }

  if (data.vehicle) {
    lines.push(`*Vehicle:* ${data.vehicle}`)
  }

  if (data.pickupLocation) {
    const pickup =
      data.pickupLocation === 'Other' && data.otherPickupLocation
        ? data.otherPickupLocation
        : data.pickupLocation
    lines.push(`*Pick-up Location:* ${pickup}`)
  } else if (data.otherPickupLocation) {
    lines.push(`*Other Pick-up:* ${data.otherPickupLocation}`)
  }

  if (data.dropoffLocation) {
    lines.push(`*Drop-off Location:* ${data.dropoffLocation}`)
  }

  if (serviceType === 'hourly' && data.hours) {
    lines.push(`*Hours:* ${data.hours}`)
  }

  return lines.join('\n')
}

export function getWhatsAppUrl(phone, message = '') {
  const normalized = normalizeWhatsAppPhone(phone) || phone
  const base = `https://wa.me/${normalized}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

/** Opens WhatsApp with a pre-filled message to the given phone number */
export function openWhatsAppBooking(phone, message) {
  const normalized = normalizeWhatsAppPhone(phone)
  if (!normalized) {
    return { ok: false, error: 'WhatsApp is unavailable. Please check the company phone number.' }
  }

  window.open(getWhatsAppUrl(normalized, message), '_blank', 'noopener,noreferrer')
  return { ok: true }
}

export const COMPANY_WHATSAPP_NUMBER = normalizeWhatsAppPhone(COMPANY_PHONE)

/** Opens WhatsApp to the Nextify company number with a pre-filled message */
export function openCompanyWhatsApp(message) {
  return openWhatsAppBooking(COMPANY_WHATSAPP_NUMBER, message)
}
