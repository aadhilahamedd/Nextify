import React from 'react';
import { SERVICE_LABELS } from './bookingConstants';

export default function PriceSummary({ form, quote, compact = false }) {
  const isDark = compact;
  const border = isDark ? 'rgba(255,255,255,0.15)' : '#eee';
  const textMuted = isDark ? '#aaa' : '#666';
  const textMain = isDark ? '#fff' : '#111';

  const price = quote?.price ?? quote?.totalAmount ?? quote?.quotedPrice ?? null;
  const customQuoteRequired =
    quote?.customQuoteRequired ||
    quote?.pricingType === 'custom_quote' ||
    quote?.breakdown?.pricingType === 'custom_quote';

  if (customQuoteRequired) {
    return (
      <div className="rounded-4 p-4" style={{ background: isDark ? '#141414' : '#fff', border: `1px solid ${border}`, color: textMain }}>
        <p className="text-uppercase small mb-2" style={{ color: '#eeb012', letterSpacing: 2 }}>Custom Quote</p>
        <h5 style={{ fontFamily: 'Georgia, serif' }}>This journey requires a custom quotation</h5>
        <p className="mb-0" style={{ color: textMuted, lineHeight: 1.7 }}>
          {quote.message || 'Our team will review your trip details and contact you with the final price.'}
        </p>
      </div>
    );
  }

  if (price == null) return null;

  const rows = [
    ['Service', SERVICE_LABELS[form?.serviceType] || form?.serviceType],
    form?.airport && ['Airport', form.airport],
    form?.origin && ['From', form.origin],
    form?.destination && ['To', form.destination],
    form?.pickupLocation && ['Pickup', form.pickupLocation],
    form?.dropoffLocation && ['Drop-off', form.dropoffLocation],
    form?.intercityRoute && ['Route', form.intercityRoute],
    form?.gccDestination && ['Destination', form.gccDestination],
    form?.vehicleName && ['Vehicle', form.vehicleName],
    form?.durationType && ['Duration', form.durationType === 'half_day' ? 'Half Day' : 'Full Day'],
    form?.travelDate && ['Date', `${form.travelDate}${form.travelTime ? ` ${form.travelTime}` : ''}`],
  ].filter(Boolean);

  return (
    <div className="rounded-4 p-4" style={{ background: isDark ? '#141414' : '#fff', border: `1px solid ${border}`, color: textMain }}>
      <p className="text-uppercase small mb-3" style={{ color: '#eeb012', letterSpacing: 2 }}>Booking Summary</p>
      {rows.map(([label, value]) => (
        <div key={label} className="d-flex justify-content-between py-2" style={{ borderBottom: `1px solid ${border}`, fontSize: '0.95rem' }}>
          <span style={{ color: textMuted }}>{label}</span>
          <span className="text-end ms-3">{value}</span>
        </div>
      ))}
      <div className="d-flex justify-content-between align-items-center pt-4 mt-2">
        <span className="fw-bold">TOTAL</span>
        <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#eeb012', fontFamily: 'Georgia, serif' }}>
          SAR {Number(price).toLocaleString()}
        </span>
      </div>
      <p className="small mb-0 mt-2" style={{ color: textMuted }}>
        Vehicle + professional chauffeur included. Price confirmed by backend.
      </p>
    </div>
  );
}
