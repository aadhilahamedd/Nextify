import React from 'react';
import { getVehicleImage } from './bookingConstants';
import { useLanguage } from '../../i18n/LanguageContext';
import { translatePlace, translateService, translateVehicle } from '../../i18n/places';

export default function PriceSummary({ form, quote, compact = false }) {
  const { t, lang, formatSar } = useLanguage();
  const price = quote?.price ?? quote?.totalAmount ?? quote?.quotedPrice ?? null;
  const customQuoteRequired =
    quote?.customQuoteRequired ||
    quote?.pricingType === 'custom_quote' ||
    quote?.breakdown?.pricingType === 'custom_quote';

  if (customQuoteRequired) {
    return (
      <div className={compact ? 'book-summary' : 'rounded-4 p-4 border bg-white'}>
        <p className="book-kicker mb-2">{t('booking.customQuote')}</p>
        <h5 style={{ fontFamily: 'Georgia, serif' }}>{t('booking.customTitle')}</h5>
        <p className="mb-0" style={{ color: compact ? 'rgba(255,255,255,0.62)' : '#666', lineHeight: 1.7 }}>
          {quote.message || t('booking.customBody')}
        </p>
      </div>
    );
  }

  if (price == null) return null;

  const rows = [
    [t('booking.serviceLabel'), translateService(form?.serviceType, t) || form?.serviceType],
    form?.airport && [t('booking.airport'), translatePlace(form.airport, t, lang)],
    form?.origin && [t('booking.from'), translatePlace(form.origin, t, lang)],
    form?.destination && [t('booking.to'), translatePlace(form.destination, t, lang)],
    form?.pickupLocation && [t('booking.pickupLabel'), form.pickupLocation],
    form?.dropoffLocation && [t('booking.dropoffLabel'), form.dropoffLocation],
    form?.intercityRoute && [t('booking.routeLabel'), translatePlace(form.intercityRoute, t, lang)],
    form?.gccDestination && [t('booking.destLabel'), translatePlace(form.gccDestination, t, lang)],
    form?.vehicleName && [t('booking.vehicle'), translateVehicle(form?.vehicleCategory, form.vehicleName, t)],
    form?.durationType && [t('booking.durationLabel'), form.durationType === 'half_day' ? t('booking.halfDay') : t('booking.fullDay')],
    form?.travelDate && [t('booking.date'), `${form.travelDate}${form.travelTime ? ` ${form.travelTime}` : ''}`],
  ].filter(Boolean);

  if (!compact) {
    return (
      <div className="rounded-4 p-4 border bg-white">
        <p className="text-uppercase small mb-3" style={{ color: '#a88448', letterSpacing: 2 }}>{t('booking.summary')}</p>
        {rows.map(([label, value]) => (
          <div key={label} className="d-flex justify-content-between py-2" style={{ borderBottom: '1px solid #eee', fontSize: '0.95rem' }}>
            <span style={{ color: '#666' }}>{label}</span>
            <span className="text-end ms-3">{value}</span>
          </div>
        ))}
        <div className="d-flex justify-content-between align-items-center pt-4 mt-2">
          <span className="fw-bold">{t('booking.total')}</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#a88448', fontFamily: 'Georgia, serif' }}>
            {formatSar(price)}
          </span>
        </div>
      </div>
    );
  }

  const vehicleImage = form?.vehicleImage || getVehicleImage(form?.vehicleCategory);

  return (
    <div className="book-summary">
      <p className="book-kicker mb-3">{t('booking.summary')}</p>
      {vehicleImage && (
        <div className="book-summary-vehicle">
          <img src={vehicleImage} alt={form?.vehicleName || t('booking.vehicle')} />
        </div>
      )}
      {rows.map(([label, value]) => (
        <div key={label} className="book-summary-row">
          <span>{label}</span>
          <span className="text-end">{value}</span>
        </div>
      ))}
      <div className="book-summary-total">
        <span>{t('booking.total')}</span>
        <strong>{formatSar(price)}</strong>
      </div>
      <p className="small mb-0 mt-3" style={{ color: 'rgba(255,255,255,0.48)' }}>
        {t('booking.fareNote')}
      </p>
    </div>
  );
}
