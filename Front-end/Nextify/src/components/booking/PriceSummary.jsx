import React from 'react';
import { SERVICE_LABELS } from './bookingConstants';

export default function PriceSummary({ form, quote, compact = false }) {
  const price = quote?.price ?? quote?.totalAmount ?? quote?.quotedPrice ?? null;
  const customQuoteRequired =
    quote?.customQuoteRequired ||
    quote?.pricingType === 'custom_quote' ||
    quote?.breakdown?.pricingType === 'custom_quote';

  if (customQuoteRequired) {
    return (
      <div className={compact ? 'book-summary' : 'rounded-4 p-4 border bg-white'}>
        <p className="book-kicker mb-2">Custom quote</p>
        <h5 style={{ fontFamily: 'Georgia, serif' }}>This journey needs a personal quotation</h5>
        <p className="mb-0" style={{ color: compact ? 'rgba(255,255,255,0.62)' : '#666', lineHeight: 1.7 }}>
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

  if (!compact) {
    return (
      <div className="rounded-4 p-4 border bg-white">
        <p className="text-uppercase small mb-3" style={{ color: '#a88448', letterSpacing: 2 }}>Booking Summary</p>
        {rows.map(([label, value]) => (
          <div key={label} className="d-flex justify-content-between py-2" style={{ borderBottom: '1px solid #eee', fontSize: '0.95rem' }}>
            <span style={{ color: '#666' }}>{label}</span>
            <span className="text-end ms-3">{value}</span>
          </div>
        ))}
        <div className="d-flex justify-content-between align-items-center pt-4 mt-2">
          <span className="fw-bold">TOTAL</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#a88448', fontFamily: 'Georgia, serif' }}>
            SAR {Number(price).toLocaleString()}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="book-summary">
      <p className="book-kicker mb-3">Booking summary</p>
      {rows.map(([label, value]) => (
        <div key={label} className="book-summary-row">
          <span>{label}</span>
          <span className="text-end">{value}</span>
        </div>
      ))}
      <div className="book-summary-total">
        <span>Total</span>
        <strong>SAR {Number(price).toLocaleString()}</strong>
      </div>
      <p className="small mb-0 mt-3" style={{ color: 'rgba(255,255,255,0.48)' }}>
        Vehicle + professional chauffeur included. Fare confirmed by Nextify.
      </p>
    </div>
  );
}
