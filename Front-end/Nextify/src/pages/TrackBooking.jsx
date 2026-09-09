import React, { useState } from 'react';
import Container from 'react-bootstrap/Container';
import { Link } from 'react-router-dom';
import { trackBookingAPI } from '../Services/allAPI';
import PriceSummary from '../components/booking/PriceSummary';
import { SERVICE_LABELS } from '../components/booking/bookingConstants';

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
      setError('Booking number is required');
      return;
    }
    if (!email && !mobile) {
      setError('Enter your email or mobile number');
      return;
    }
    setLoading(true);
    const res = await trackBookingAPI(bookingNumber.trim(), { email, mobile });
    setLoading(false);
    if (res?.status === 200) {
      setBooking(res.data?.data?.booking || res.data?.booking);
    } else {
      setError(res?.data?.message || res?.error || 'Booking not found');
    }
  };

  const serviceType = booking?.serviceType;

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', paddingTop: 120, paddingBottom: 80, color: 'white' }}>
      <Container style={{ maxWidth: 640 }}>
        <div className="text-center text-white mb-4">
          <h2 style={{ fontFamily: 'var(--font-heading)' }}>Track Your Booking</h2>
          <p className="text-white-50">Enter your booking reference and contact details</p>
        </div>

        <form onSubmit={handleTrack} className="rounded-4 p-4 shadow-lg mb-4" style={{ background: '#fff' }}>
          <div className="mb-3">
            <label className="form-label fw-bold">Booking Number *</label>
            <input className="form-control p-3" value={bookingNumber} onChange={(e) => setBookingNumber(e.target.value)} placeholder="NXT-20260908-XXXXX" />
          </div>
          <div className="mb-3">
            <label className="form-label fw-bold">Email</label>
            <input type="email" className="form-control p-3" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="form-label fw-bold">Mobile</label>
            <input className="form-control p-3" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+966..." />
          </div>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <button type="submit" className="btn w-100 rounded-pill py-3 text-dark border-0 fw-bold" style={{ background: 'linear-gradient(135deg, #a88448 0%, #c8a261 100%)' }} disabled={loading}>
            {loading ? 'Searching...' : 'Track Booking'}
          </button>
        </form>

        {booking && (
          <div className="rounded-4 p-4 shadow-lg text-white" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h5>{booking.bookingNumber}</h5>
            <p className="mb-1">Service: {SERVICE_LABELS[serviceType] || serviceType}</p>
            <p className="mb-1">Status: <strong>{booking.bookingStatus}</strong> · Payment: {booking.paymentStatus}</p>
            <p className="mb-1">Pickup: {booking.pickup?.address || booking.pickupLocation}</p>
            <p className="mb-3">Scheduled: {new Date(booking.schedule?.pickupDateTime || booking.arrivalDateTime).toLocaleString()}</p>
            {booking.driver?.name && <p className="mb-3">Chauffeur: {booking.driver.name} ({booking.driver.phone})</p>}
            <PriceSummary quote={booking.pricing} compact />
          </div>
        )}

        <div className="text-center mt-4">
          <Link to="/booking" className="text-white">Make a new booking →</Link>
        </div>
      </Container>
    </div>
  );
}

export default TrackBooking;
