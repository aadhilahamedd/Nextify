import React, { useState } from 'react';
import Container from 'react-bootstrap/Container';
import { Link } from 'react-router-dom';
import { trackBookingAPI } from '../Services/allAPI';
import PriceSummary from '../components/booking/PriceSummary';
import { SERVICE_LABELS } from '../components/booking/bookingConstants';
import '../components/booking/Booking.css';
import { useLanguage } from '../i18n/LanguageContext';
import { translateService } from '../i18n/places';
import { formatDateTimeForLang } from '../i18n/format';

function prettyStatus(value) {
  return String(value || 'Pending')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function TrackBooking() {
  const { t, lang } = useLanguage();
  const [bookingNumber, setBookingNumber] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e) => {
    e.preventDefault();
    setError('');
    setBooking(null);
    if (!bookingNumber.trim()) {
      setError(t('track.errNumber'));
      return;
    }
    if (!email.trim() && !mobile.trim()) {
      setError(t('track.errContact'));
      return;
    }
    setLoading(true);
    const res = await trackBookingAPI(bookingNumber.trim(), { email, mobile });
    setLoading(false);
    if (res?.status === 200) {
      setBooking(res.data?.data?.booking || res.data?.booking);
    } else {
      setError(res?.data?.message || res?.error || t('track.errFind'));
    }
  };

  const resetSearch = () => {
    setBooking(null);
    setError('');
  };

  const scheduled = booking?.schedule?.pickupDateTime || booking?.arrivalDateTime;
  const pricingQuote = booking
    ? {
        price: booking.quotedPrice ?? booking.pricing?.totalAmount,
        currency: booking.pricing?.currency || 'SAR',
        customQuoteRequired: booking.customQuoteRequired,
        pricingType: booking.pricingType || booking.pricing?.breakdown?.pricingType,
        message: booking.pricing?.breakdown?.message,
      }
    : null;

  return (
    <div className="book-page">
      <Container style={{ maxWidth: 720 }}>
        <div className="text-center mb-4">
          <p className="book-kicker">{t('track.kicker')}</p>
          <h1 className="book-title">{t('track.title')}</h1>
          <p className="book-lead">
            {t('track.lead')}
          </p>
        </div>

        <form onSubmit={handleTrack} className="book-panel mb-4">
          <div className="mb-3">
            <label className="book-label">{t('track.number')}</label>
            <input
              className="form-control book-input"
              value={bookingNumber}
              onChange={(e) => setBookingNumber(e.target.value)}
              placeholder={t('track.placeholder')}
              autoComplete="off"
            />
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="book-label">{t('track.email')}</label>
              <input
                type="email"
                className="form-control book-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
              />
            </div>
            <div className="col-md-6">
              <label className="book-label">{t('track.mobile')}</label>
              <input
                className="form-control book-input"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+966..."
              />
            </div>
          </div>
          <span className="book-hint">{t('track.hint')}</span>
          {error && <div className="book-error">{error}</div>}
          <button type="submit" className="lux-btn w-100 mt-4" style={{ padding: '14px 24px' }} disabled={loading}>
            {loading ? t('track.searching') : t('track.submit')}
          </button>
        </form>

        {booking && (
          <div className="book-panel">
            <p className="book-kicker mb-2">{t('track.reservation')}</p>
            <h2 className="h4 mb-1" style={{ fontFamily: 'Georgia, serif' }}>{booking.bookingNumber}</h2>
            <div className="track-pills">
              <span className="track-pill">{prettyStatus(booking.bookingStatus)}</span>
              <span className="track-pill is-muted">{t('track.payment')} · {prettyStatus(booking.paymentStatus)}</span>
            </div>

            <div className="track-result-grid">
              <p>
                <span>{t('track.service')}</span>
                {translateService(booking.serviceType, t) || SERVICE_LABELS[booking.serviceType] || booking.serviceType}
              </p>
              <p>
                <span>{t('track.vehicle')}</span>
                {booking.vehicle?.name || booking.vehicleName || t('track.assigned')}
              </p>
              <p>
                <span>{t('track.pickup')}</span>
                {booking.pickup?.address || booking.pickupLocation || booking.origin || '—'}
              </p>
              <p>
                <span>{t('track.dest')}</span>
                {booking.destination?.address || booking.dropoffLocation || booking.destinationText || '—'}
              </p>
              <p>
                <span>{t('track.datetime')}</span>
                {scheduled ? formatDateTimeForLang(scheduled, lang) : t('track.tbc')}
              </p>
              <p>
                <span>{t('track.guest')}</span>
                {booking.customer?.name || '—'}
                {booking.customer?.mobile ? <><br />{booking.customer.mobile}</> : null}
              </p>
            </div>

            {booking.driver?.name && (
              <div className="track-chauffeur">
                <span className="book-label mb-1">{t('track.chauffeur')}</span>
                <p className="mb-0">{booking.driver.name}{booking.driver.phone ? ` · ${booking.driver.phone}` : ''}</p>
              </div>
            )}

            <PriceSummary
              form={{
                serviceType: booking.serviceType,
                vehicleName: booking.vehicle?.name || booking.vehicleName,
                travelDate: scheduled ? new Date(scheduled).toLocaleString() : '',
              }}
              quote={pricingQuote}
              compact
            />

            <button type="button" className="book-ghost mt-4" onClick={resetSearch}>
              {t('track.another')}
            </button>
          </div>
        )}

        <div className="text-center mt-5">
          <Link to="/booking" className="lux-btn text-decoration-none" style={{ padding: '12px 28px' }}>
            {t('track.newBooking')}
          </Link>
        </div>
      </Container>
    </div>
  );
}

export default TrackBooking;
