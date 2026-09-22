import React, { useState } from 'react';
import Container from 'react-bootstrap/Container';
import { Link } from 'react-router-dom';
import { trackBookingAPI } from '../Services/allAPI';
import PriceSummary from '../components/booking/PriceSummary';
import { SERVICE_LABELS } from '../components/booking/bookingConstants';
import '../components/booking/Booking.css';

function prettyStatus(value) {
  return String(value || 'Pending')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function TrackBooking() {
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
      setError('Please enter your booking number.');
      return;
    }
    if (!email.trim() && !mobile.trim()) {
      setError('Enter the email or mobile number used when you booked.');
      return;
    }
    setLoading(true);
    const res = await trackBookingAPI(bookingNumber.trim(), { email, mobile });
    setLoading(false);
    if (res?.status === 200) {
      setBooking(res.data?.data?.booking || res.data?.booking);
    } else {
      setError(res?.data?.message || res?.error || 'We could not find a matching booking.');
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
          <p className="book-kicker">Reservation status</p>
          <h1 className="book-title">Track your booking</h1>
          <p className="book-lead">
            Enter your booking number and the email or mobile you used at checkout. We will show the live status of your chauffeur reservation.
          </p>
        </div>

        <form onSubmit={handleTrack} className="book-panel mb-4">
          <div className="mb-3">
            <label className="book-label">Booking number *</label>
            <input
              className="form-control book-input"
              value={bookingNumber}
              onChange={(e) => setBookingNumber(e.target.value)}
              placeholder="NXT-20260908-XXXXX"
              autoComplete="off"
            />
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="book-label">Email</label>
              <input
                type="email"
                className="form-control book-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
              />
            </div>
            <div className="col-md-6">
              <label className="book-label">Mobile</label>
              <input
                className="form-control book-input"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+966..."
              />
            </div>
          </div>
          <span className="book-hint">Only one of email or mobile is required.</span>
          {error && <div className="book-error">{error}</div>}
          <button type="submit" className="lux-btn w-100 mt-4" style={{ padding: '14px 24px' }} disabled={loading}>
            {loading ? 'Searching...' : 'Track booking'}
          </button>
        </form>

        {booking && (
          <div className="book-panel">
            <p className="book-kicker mb-2">Your reservation</p>
            <h2 className="h4 mb-1" style={{ fontFamily: 'Georgia, serif' }}>{booking.bookingNumber}</h2>
            <div className="track-pills">
              <span className="track-pill">{prettyStatus(booking.bookingStatus)}</span>
              <span className="track-pill is-muted">Payment · {prettyStatus(booking.paymentStatus)}</span>
            </div>

            <div className="track-result-grid">
              <p>
                <span>Service</span>
                {SERVICE_LABELS[booking.serviceType] || booking.serviceType}
              </p>
              <p>
                <span>Vehicle</span>
                {booking.vehicle?.name || booking.vehicleName || 'Assigned with chauffeur'}
              </p>
              <p>
                <span>Pickup</span>
                {booking.pickup?.address || booking.pickupLocation || booking.origin || '—'}
              </p>
              <p>
                <span>Destination</span>
                {booking.destination?.address || booking.dropoffLocation || booking.destinationText || '—'}
              </p>
              <p>
                <span>Date & time</span>
                {scheduled ? new Date(scheduled).toLocaleString() : 'To be confirmed'}
              </p>
              <p>
                <span>Guest</span>
                {booking.customer?.name || '—'}
                {booking.customer?.mobile ? <><br />{booking.customer.mobile}</> : null}
              </p>
            </div>

            {booking.driver?.name && (
              <div className="track-chauffeur">
                <span className="book-label mb-1">Assigned chauffeur</span>
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
              Search another booking
            </button>
          </div>
        )}

        <div className="text-center mt-5">
          <Link to="/booking" className="lux-btn text-decoration-none" style={{ padding: '12px 28px' }}>
            Make a new booking
          </Link>
        </div>
      </Container>
    </div>
  );
}

export default TrackBooking;
