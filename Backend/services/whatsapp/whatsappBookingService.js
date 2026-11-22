const { calculatePrice } = require('../pricingService');
const { createBookingFromPayload } = require('../bookingCreateService');
const { createOrReuseCheckout } = require('../paymentService');
const { frontendBaseUrl } = require('../../config/publicUrls');
const {
  buildCheckoutPaymentUrl,
  rotateBookingCheckoutToken,
} = require('../../utils/checkoutToken');
const { phonesMatch } = require('../../utils/phoneMatch');
const Booking = require('../../models/Booking');
const WhatsAppSession = require('../../models/WhatsAppSession');
const {
  SERVICE_VEHICLE_OPTIONS,
  INTERCITY_ROUTES,
  GCC_ROUTES,
} = require('../../utils/vehicleCategories');

const DEFAULT_RETRY_COOLDOWN_MS = 15 * 1000;
const MIN_RETRY_COOLDOWN_MS = 1000;
const MAX_RETRY_COOLDOWN_MS = 5 * 60 * 1000;

function getRetryCooldownMs(overrideMs) {
  if (typeof overrideMs === 'number' && Number.isFinite(overrideMs) && overrideMs >= 0) {
    return Math.floor(overrideMs);
  }
  const raw = process.env.WHATSAPP_RETRY_COOLDOWN_MS;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return DEFAULT_RETRY_COOLDOWN_MS;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < MIN_RETRY_COOLDOWN_MS || parsed > MAX_RETRY_COOLDOWN_MS) {
    return DEFAULT_RETRY_COOLDOWN_MS;
  }
  return Math.floor(parsed);
}

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

async function rollbackRetryCooldown(sessionId, claimedSentAt, previousSentAt) {
  if (!sessionId || !claimedSentAt) return false;
  try {
    const res = await WhatsAppSession.updateOne(
      { _id: sessionId, lastPaymentLinkSentAt: claimedSentAt },
      { $set: { lastPaymentLinkSentAt: previousSentAt ?? null } }
    );
    return Boolean(res && (res.modifiedCount === undefined || res.modifiedCount > 0));
  } catch {
    return false;
  }
}

async function confirmSessionBooking(session) {
  const payload = draftToPayload(session.bookingDraft, session.phoneNumber);
  const { booking, quote, checkoutToken } = await createBookingFromPayload(payload);
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

  try {
    if (!checkoutToken) {
      throw new Error('Checkout session could not be created');
    }

    const checkout = await createOrReuseCheckout(booking);
    const paymentUrl = buildCheckoutPaymentUrl(frontendBaseUrl(), booking._id, checkoutToken);
    session.paymentId = checkout.payment._id;
    session.currentStep = 'PAYMENT';
    session.status = 'PAYMENT';
    session.lastPaymentLinkSentAt = new Date();
    await session.save();
    return { booking, quote, paymentUrl, payment: checkout.payment };
  } catch (err) {
    // Mark that the booking record was already persisted so callers do not reset CONFIRMATION.
    err.bookingCreated = true;
    err.bookingId = booking._id;
    try {
      if (session._id) {
        await WhatsAppSession.updateOne(
          { _id: session._id },
          { $set: { bookingId: booking._id, currentStep: 'PAYMENT', status: 'PAYMENT' } }
        );
      }
    } catch { /* best-effort persistence */ }
    throw err;
  }
}

async function retrySessionPayment(session, { now = Date.now(), cooldownMs } = {}) {
  if (!session?.bookingId) {
    return { ok: false, reason: 'no_booking' };
  }

  const booking = await Booking.findById(session.bookingId);
  if (!booking) {
    return { ok: false, reason: 'not_found' };
  }

  if (!phonesMatch(booking.customer?.mobile, session.phoneNumber)) {
    return { ok: false, reason: 'phone_mismatch' };
  }

  const paymentStatus = String(booking.paymentStatus || '').toUpperCase();
  const bookingStatus = String(booking.bookingStatus || '').toUpperCase();
  const quoteStatus = booking.pricing?.breakdown?.quoteStatus;

  if (paymentStatus === 'PAID') {
    return { ok: false, reason: 'already_paid', booking };
  }
  if (
    booking.customQuoteRequired
    || paymentStatus === 'NOT_REQUIRED'
    || quoteStatus === 'rate_on_request'
    || quoteStatus === 'long_distance'
  ) {
    return { ok: false, reason: 'not_payable', booking };
  }
  if (bookingStatus === 'CANCELLED' && paymentStatus !== 'FAILED') {
    return { ok: false, reason: 'cancelled', booking };
  }

  const resolvedCooldown = getRetryCooldownMs(cooldownMs);
  const prevSentAt = session.lastPaymentLinkSentAt || null;
  const sentAt = new Date(now);
  let cooldownClaimed = false;

  if (resolvedCooldown > 0 && session._id) {
    const cutoff = new Date(now - resolvedCooldown);
    const claimedSession = await WhatsAppSession.findOneAndUpdate(
      {
        _id: session._id,
        bookingId: booking._id,
        $or: [
          { lastPaymentLinkSentAt: null },
          { lastPaymentLinkSentAt: { $exists: false } },
          { lastPaymentLinkSentAt: { $lte: cutoff } },
        ],
      },
      { $set: { lastPaymentLinkSentAt: sentAt } },
      { new: true }
    );
    if (!claimedSession) {
      return { ok: false, reason: 'cooldown', booking };
    }
    cooldownClaimed = true;
  }

  let rotated;
  try {
    rotated = await rotateBookingCheckoutToken(booking._id, {
      verifiedPhone: session.phoneNumber,
      now,
    });
  } catch (err) {
    if (cooldownClaimed) {
      await rollbackRetryCooldown(session._id, sentAt, prevSentAt);
    }
    throw err;
  }

  if (!rotated.ok) {
    if (cooldownClaimed && rotated.reason !== 'already_paid') {
      await rollbackRetryCooldown(session._id, sentAt, prevSentAt);
    }
    return { ok: false, reason: rotated.reason, booking: rotated.booking || booking };
  }

  let checkout;
  try {
    checkout = await createOrReuseCheckout(rotated.booking);
  } catch (err) {
    if (err?.statusCode === 409 && /already paid/i.test(String(err.message || ''))) {
      return { ok: false, reason: 'already_paid', booking: rotated.booking };
    }
    if (cooldownClaimed) {
      await rollbackRetryCooldown(session._id, sentAt, prevSentAt);
    }
    throw err;
  }

  const paymentUrl = buildCheckoutPaymentUrl(
    frontendBaseUrl(),
    rotated.booking._id,
    rotated.checkoutToken,
  );
  session.paymentId = checkout.payment._id;
  session.lastPaymentLinkSentAt = sentAt;
  if (session._id) {
    await WhatsAppSession.updateOne(
      { _id: session._id },
      { $set: { paymentId: checkout.payment._id, lastPaymentLinkSentAt: sentAt } }
    );
  }

  return {
    ok: true,
    booking: rotated.booking,
    payment: checkout.payment,
    paymentUrl,
    cooldownClaim: cooldownClaimed
      ? { sessionId: session._id, claimedSentAt: sentAt, previousSentAt: prevSentAt }
      : null,
  };
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
  DEFAULT_RETRY_COOLDOWN_MS,
  SERVICE_LABELS,
  SERVICE_VEHICLE_OPTIONS,
  INTERCITY_ROUTES,
  GCC_ROUTES,
  quoteDraft,
  formatQuote,
  formatSummary,
  confirmSessionBooking,
  retrySessionPayment,
  rollbackRetryCooldown,
  notifyPaymentResult,
};
