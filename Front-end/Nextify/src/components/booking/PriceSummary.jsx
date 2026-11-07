import { getVehicleImage } from './bookingConstants';
import { useLanguage } from '../../i18n/LanguageContext';
import { translatePlace, translateService, translateVehicle } from '../../i18n/places';
import { displayAirportName } from '../../data/saudiAirports';
import { formatTransferLocation } from '../../data/transferLocations';
import { toArabicIndic } from '../../i18n/format';

function formatBookingWhen(dateValue, timeValue, lang) {
  if (!dateValue) return '';
  const [year, month, day] = String(dateValue).split('-');
  if (!year || !month || !day) return dateValue;
  const datePart = `${day}/${month}/${year}`;
  const shown = [lang === 'ar' ? toArabicIndic(datePart) : datePart];
  if (timeValue) shown.push(lang === 'ar' ? toArabicIndic(timeValue) : timeValue);
  return <span dir="ltr" className="book-date-value">{shown.join(' ')}</span>;
}

function formatDistance(value, lang, t, approximate = false) {
  if (value == null || value === '') return '';
  const shown = lang === 'ar' ? toArabicIndic(String(value)) : String(value);
  const distance = `${shown} ${t('booking.km')}`;
  return approximate ? t('booking.approxDistance', { km: shown }) : distance;
}

export default function PriceSummary({ form, quote, compact = false, loading = false, inquiry = false }) {
  const { t, lang, formatSar } = useLanguage();
  const price = inquiry ? null : (quote?.price ?? quote?.totalAmount ?? quote?.quotedPrice ?? null);
  const customQuoteRequired = inquiry
    ? true
    : quote?.customQuoteRequired ||
      quote?.pricingType === 'custom_quote' ||
      quote?.breakdown?.pricingType === 'custom_quote';
  const quoteStatus = quote?.quoteStatus || (customQuoteRequired ? 'custom_quote' : 'priced');
  const vehicleImage = form?.vehicleImage || getVehicleImage(form?.vehicleCategory);
  const hasVehicle = Boolean(form?.vehicleCategory || form?.vehicleName || vehicleImage);
  const distanceValue = quote?.distanceKm ?? quote?.breakdown?.distanceKm ?? form?.distanceKm;
  const slabLabel = quote?.slabLabel || quote?.breakdown?.slabLabel;
  const isFixedAirportRoute = quote?.pricingType === 'airport_fixed_route'
    || quote?.pricingModel === 'airport_fixed_route'
    || quote?.breakdown?.pricingType === 'airport_fixed_route';
  const pickupLabel = quote?.originLabel
    || quote?.breakdown?.originLabel
    || formatTransferLocation(form?.pickupPlace || form?.airport || form?.pickupLocation, lang);
  const dropoffLabel = quote?.destinationLabel
    || quote?.breakdown?.destinationLabel
    || formatTransferLocation(form?.dropoffPlace || form?.destination || form?.dropoffLocation, lang);
  const isAirportTransfer = form?.serviceType === 'airport_transfer';

  const rows = isAirportTransfer ? [
    [t('booking.serviceLabel'), translateService(form?.serviceType, t) || form?.serviceType],
    pickupLabel && [t('booking.pickupLabel'), translatePlace(pickupLabel, t, lang) || pickupLabel],
    dropoffLabel && [t('booking.dropoffLabel'), translatePlace(dropoffLabel, t, lang) || dropoffLabel],
    form?.vehicleName && [t('booking.vehicle'), translateVehicle(form?.vehicleCategory, form.vehicleName, t)],
    isFixedAirportRoute && [t('booking.routeType'), t('booking.fixedPrice')],
    distanceValue !== '' && distanceValue != null && [t('booking.distanceLabel'), formatDistance(distanceValue, lang, t, isFixedAirportRoute)],
    form?.travelDate && [t('booking.date'), formatBookingWhen(form.travelDate, form.travelTime, lang)],
  ].filter(Boolean) : [
    [t('booking.serviceLabel'), translateService(form?.serviceType, t) || form?.serviceType],
    form?.airport && [t('booking.airport'), displayAirportName(form.airport, lang) || translatePlace(form.airport, t, lang)],
    form?.origin && [t('booking.from'), translatePlace(form.origin, t, lang)],
    form?.destination && form.destination !== 'Other' && [t('booking.to'), translatePlace(form.destination, t, lang)],
    form?.otherDestination && [t('booking.to'), form.otherDestination],
    form?.pickupLocation && [t('booking.pickupLabel'), translatePlace(form.pickupLocation, t, lang) || form.pickupLocation],
    form?.dropoffLocation && [t('booking.dropoffLabel'), translatePlace(form.dropoffLocation, t, lang) || form.dropoffLocation],
    form?.intercityRoute && [t('booking.routeLabel'), translatePlace(form.intercityRoute, t, lang)],
    form?.gccDestination && form.gccDestination !== 'Other' && [t('booking.destLabel'), translatePlace(form.gccDestination, t, lang)],
    distanceValue !== '' && distanceValue != null && [t('booking.distanceLabel'), formatDistance(distanceValue, lang, t)],
    slabLabel && [t('booking.slabLabel'), slabLabel],
    form?.vehicleName && [t('booking.vehicle'), translateVehicle(form?.vehicleCategory, form.vehicleName, t)],
    form?.durationType && [t('booking.durationLabel'), form.durationType === 'half_day' ? t('booking.halfDay') : t('booking.fullDay')],
    form?.travelDate && [t('booking.date'), formatBookingWhen(form.travelDate, form.travelTime, lang)],
  ].filter(Boolean);

  const wrapClass = compact ? 'book-summary' : 'rounded-4 p-4 border bg-white';
  const muted = compact ? 'rgba(255,255,255,0.62)' : '#666';

  const renderRows = () => rows.length > 0 && rows.map(([label, value]) => (
    <div key={label} className={compact ? 'book-summary-row' : 'd-flex justify-content-between py-2'} style={compact ? undefined : { borderBottom: '1px solid #eee', fontSize: '0.95rem' }}>
      <span>{label}</span>
      <span className="text-end">{value}</span>
    </div>
  ));

  const vehiclePreview = compact && vehicleImage ? (
    <div className="book-summary-vehicle">
      <img src={vehicleImage} alt={form?.vehicleName || t('booking.vehicle')} />
    </div>
  ) : null;

  if (!hasVehicle && price == null && !loading && !customQuoteRequired) return null;

  if (quoteStatus === 'long_distance' || (inquiry && quoteStatus === 'long_distance')) {
    return (
      <div className={wrapClass}>
        {vehiclePreview}
        {renderRows()}
        <p className="book-kicker mb-2 mt-3">{t('booking.customQuote')}</p>
        <h5 style={{ fontFamily: 'Georgia, serif' }}>{t('booking.longDistanceTitle')}</h5>
        <p className="mb-0" style={{ color: muted, lineHeight: 1.7 }}>
          {quote?.message || t('booking.longDistanceBody')}
        </p>
      </div>
    );
  }

  if (inquiry || quoteStatus === 'rate_on_request') {
    return (
      <div className={wrapClass}>
        {vehiclePreview}
        {renderRows()}
        <p className="book-kicker mb-2 mt-3">{t('booking.rateOnRequest')}</p>
        <h5 style={{ fontFamily: 'Georgia, serif' }}>{t('booking.inquiryTitle')}</h5>
        <p className="mb-0" style={{ color: muted, lineHeight: 1.7 }}>
          {t('booking.inquiryLead')}
        </p>
        <p className="mb-0 mt-2" style={{ color: compact ? 'rgba(255,255,255,0.48)' : '#888', lineHeight: 1.6, fontSize: '0.9rem' }}>
          {quote?.message && quote.message !== t('booking.rateOnRequest') ? quote.message : t('booking.inquiryQuoteNote')}
        </p>
      </div>
    );
  }

  if (customQuoteRequired) {
    return (
      <div className={wrapClass}>
        {vehiclePreview}
        {renderRows()}
        <p className="book-kicker mb-2">{t('booking.customQuote')}</p>
        <h5 style={{ fontFamily: 'Georgia, serif' }}>{t('booking.customTitle')}</h5>
        <p className="mb-0" style={{ color: muted, lineHeight: 1.7 }}>
          {quote.message || t('booking.customBody')}
        </p>
      </div>
    );
  }

  if (!compact) {
    if (price == null) return null;
    return (
      <div className="rounded-4 p-4 border bg-white">
        <p className="text-uppercase small mb-3" style={{ color: '#a88448', letterSpacing: 2 }}>
          {isFixedAirportRoute ? t('booking.fixedRouteTitle') : t('booking.summary')}
        </p>
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

  return (
    <div className="book-summary">
      <p className="book-kicker mb-3">{isFixedAirportRoute ? t('booking.fixedRouteTitle') : t('booking.summary')}</p>
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
        {price != null ? (
          <strong>{formatSar(price)}</strong>
        ) : (
          <strong className="book-summary-pending">
            {loading ? t('booking.confirming') : '—'}
          </strong>
        )}
      </div>
      <p className="small mb-0 mt-3" style={{ color: 'rgba(255,255,255,0.48)' }}>
        {t('booking.fareNote')}
      </p>
    </div>
  );
}
