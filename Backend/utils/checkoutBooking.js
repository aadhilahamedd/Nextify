/** Minimal checkout / confirmation payload — no customer PII, driver, or admin fields. */
function toCheckoutBooking(booking) {
  if (!booking) return null;
  const doc = typeof booking.toObject === 'function' ? booking.toObject() : booking;
  const vehicleName = doc.vehicle?.name || doc.vehicleName || '';
  return {
    _id: doc._id,
    bookingNumber: doc.bookingNumber,
    serviceType: doc.serviceType,
    vehicle: vehicleName
      ? { name: vehicleName, type: doc.vehicle?.type || '' }
      : undefined,
    vehicleName: vehicleName || undefined,
    quotedPrice: doc.quotedPrice ?? doc.pricing?.totalAmount ?? 0,
    pricing: {
      totalAmount: doc.pricing?.totalAmount ?? doc.quotedPrice ?? 0,
      currency: doc.pricing?.currency || 'SAR',
      breakdown: doc.pricing?.breakdown
        ? {
            pricingType: doc.pricing.breakdown.pricingType,
            quoteStatus: doc.pricing.breakdown.quoteStatus,
            message: doc.pricing.breakdown.message,
          }
        : undefined,
    },
    paymentStatus: doc.paymentStatus,
    bookingStatus: doc.bookingStatus,
    customQuoteRequired: Boolean(doc.customQuoteRequired),
  };
}

/** Slim booking projection for GET /api/payments/verify — confirmation-safe only. */
function toPaymentConfirmationBooking(booking, payment) {
  const base = toCheckoutBooking(booking);
  if (!base) return null;
  const amount = payment?.amount ?? base.pricing?.totalAmount ?? base.quotedPrice ?? 0;
  const currency = payment?.currency || base.pricing?.currency || 'SAR';
  return {
    _id: base._id,
    bookingNumber: base.bookingNumber,
    serviceType: base.serviceType,
    vehicle: base.vehicle,
    vehicleName: base.vehicleName,
    paymentStatus: base.paymentStatus,
    bookingStatus: base.bookingStatus,
    customQuoteRequired: base.customQuoteRequired,
    quotedPrice: amount,
    pricing: {
      totalAmount: amount,
      currency,
    },
  };
}

module.exports = { toCheckoutBooking, toPaymentConfirmationBooking };
