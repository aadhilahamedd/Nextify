const { calculatePrice } = require('../pricingService');
const { createBookingFromPayload } = require('../bookingCreateService');
const { createOrReuseCheckout } = require('../paymentService');
const WhatsAppSession = require('../../models/WhatsAppSession');
const {
  SERVICE_VEHICLE_OPTIONS,
  INTERCITY_ROUTES,
  GCC_ROUTES,
} = require('../../utils/vehicleCategories');

const SERVICE_LABELS = {
  airport_transfer: 'Airport Transfer',
  city_transfer: 'City Transfer',
  chauffeur: 'Chauffeur Service',
  intercity_transfer: 'Intercity Transfer',
  gcc_transfer: 'GCC Transfer',
};

function draftToPayload(draft, phoneNumber) {
  const route = INTERCITY_ROUTES.find((r) => r.label === draft.destination || `${r.origin} ↔ ${r.destination}` === draft.destination);
  return {
    serviceType: draft.serviceType,
    vehicleCategory: draft.vehicleCategory,
    vehicleName: draft.vehicleName,
    airport: draft.airport,
    origin: draft.origin || (draft.serviceType === 'city_transfer' ? 'Riyadh' : draft.origin),
    destination: draft.destination,
    durationType: draft.durationType,
    distanceKm: draft.distanceKm,
    travelDate: draft.date,
    travelTime: draft.time,
    schedule: { pickupDateTime: `${draft.date}T${draft.time}` },
    pickupLocation: draft.origin || draft.airport || '',
    dropoffLocation: draft.destination,
    passengers: draft.passengers || 1,
    luggage: draft.luggage || 0,
    customer: {
      name: draft.customerName,
      email: draft.customerEmail,
      mobile: draft.customerMobile || phoneNumber,
    },
    specialRequests: draft.specialRequests || '',
    vehicle: { name: draft.vehicleName, type: draft.vehicleCategory },
    intercityRoute: route?.label,
  };
}

async function quoteDraft(draft) {
  return calculatePrice({
    serviceType: draft.serviceType,
    vehicleCategory: draft.vehicleCategory,
    vehicleName: draft.vehicleName,
    airport: draft.airport,
    origin: draft.origin || (draft.serviceType === 'city_transfer' ? 'Riyadh' : ''),
    destination: draft.destination,
    durationType: draft.durationType,
    distanceKm: draft.distanceKm,
  });
}

function formatQuote(quote) {
  if (!quote) return '';
  if (quote.customQuoteRequired) {
    return `This journey needs a personal quotation. ${quote.message || ''}`.trim();
  }
  return `Fare: SAR ${Number(quote.price).toLocaleString()} (${quote.currency || 'SAR'})`;
}

function formatSummary(draft, quote) {
  const lines = [
    'NEXTIFY booking summary',
    `Service: ${SERVICE_LABELS[draft.serviceType] || draft.serviceType}`,
    draft.airport && `Airport: ${draft.airport}`,
    draft.origin && `From: ${draft.origin}`,
    draft.destination && `To: ${draft.destination}`,
    draft.vehicleName && `Vehicle: ${draft.vehicleName} + chauffeur`,
    draft.durationType && `Duration: ${draft.durationType === 'half_day' ? 'Half day' : 'Full day'}`,
    draft.date && `Date: ${draft.date}`,
    draft.time && `Time: ${draft.time}`,
    `Passengers: ${draft.passengers || 1}`,
    draft.serviceType !== 'chauffeur' ? `Luggage: ${draft.luggage || 0}` : '',
    `Name: ${draft.customerName}`,
    `Email: ${draft.customerEmail}`,
    formatQuote(quote),
  ].filter(Boolean);
  return lines.join('\n');
}

async function confirmSessionBooking(session) {
  const payload = draftToPayload(session.bookingDraft, session.phoneNumber);
  const { booking, quote } = await createBookingFromPayload(payload);
  session.bookingId = booking._id;
  session.bookingDraft.price = quote.price;
  session.bookingDraft.currency = quote.currency || 'SAR';
  session.bookingDraft.customQuoteRequired = Boolean(quote.customQuoteRequired);
  session.bookingDraft.quoteMessage = quote.message || '';

  if (quote.customQuoteRequired) {
    session.currentStep = 'COMPLETED';
    session.status = 'COMPLETED';
    await session.save();
    return { booking, quote, paymentUrl: null };
  }

  const checkout = await createOrReuseCheckout(booking);
  session.paymentId = checkout.payment._id;
  session.currentStep = 'PAYMENT';
  session.status = 'PAYMENT';
  await session.save();
  return { booking, quote, paymentUrl: checkout.paymentUrl, payment: checkout.payment };
}

async function notifyPaymentResult({ payment, booking, mappedStatus }) {
  if (!booking?._id) return;
  const session = await WhatsAppSession.findOne({ bookingId: booking._id });
  if (!session) return;

  const { sendText, sendButtons } = require('./whatsappService');
  const paid = mappedStatus === 'PAID' || payment?.status === 'PAID';

  if (paid) {
    session.currentStep = 'COMPLETED';
    session.status = 'COMPLETED';
    await session.save();
    await sendText(
      session.phoneNumber,
      `Payment received successfully ✅\n\nYour Nextify booking is confirmed.\n\nBooking ID: ${booking.bookingNumber}\n\nWe will send your chauffeur details closer to pickup.`
    );
    return;
  }

  session.currentStep = 'PAYMENT';
  session.status = 'PAYMENT';
  await session.save();
  await sendButtons(
    session.phoneNumber,
    'Your payment was unsuccessful.\n\nYour booking is still saved and has not been confirmed.\n\nWould you like to try again?',
    [
      { id: 'pay:retry', title: 'Try Payment Again' },
      { id: 'pay:cancel', title: 'Cancel Booking' },
    ]
  );
}

module.exports = {
  SERVICE_LABELS,
  SERVICE_VEHICLE_OPTIONS,
  INTERCITY_ROUTES,
  GCC_ROUTES,
  quoteDraft,
  formatQuote,
  formatSummary,
  confirmSessionBooking,
  notifyPaymentResult,
};
