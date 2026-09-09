import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import { mockCompletePaymentAPI, mockFailPaymentAPI, createPaymentAPI } from '../Services/allAPI';
import PriceSummary from '../components/booking/PriceSummary';

function MockPaymentCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const booking = location.state?.booking;
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!booking) {
      navigate('/booking');
      return;
    }
    createPaymentAPI(booking._id).then((res) => {
      if (res?.status === 200 || res?.status === 201) {
        setPayment(res.data?.data?.payment || res.data?.payment);
      } else {
        setError(res?.data?.message || 'Could not create payment session');
      }
    });
  }, [booking, navigate]);

  const handleOutcome = async (success) => {
    if (!payment?._id) return;
    setLoading(true);
    const fn = success ? mockCompletePaymentAPI : mockFailPaymentAPI;
    const res = await fn(payment._id);
    setLoading(false);
    if (res?.status === 200) {
      const updatedBooking = res.data?.data?.booking || booking;
      navigate(`/booking-confirmation/${updatedBooking.bookingNumber}`, {
        state: { booking: updatedBooking, paymentSuccess: success },
      });
    } else {
      setError(res?.data?.message || 'Payment update failed');
    }
  };

  if (!booking) return null;

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', paddingTop: 120, paddingBottom: 80, color: 'white' }}>
      <Container style={{ maxWidth: 560 }}>
        <div className="rounded-4 p-4 p-md-5 shadow-lg" style={{ background: '#fff' }}>
          <h3 className="mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Secure Checkout</h3>
          <p className="text-muted small mb-4">Demo payment — no real charges. Booking: {booking.bookingNumber}</p>

          <PriceSummary quote={booking.pricing} />

          <div className="alert alert-info small mt-3">
            Mock payment sandbox. A real Saudi gateway (PayTabs, HyperPay, Tap) can replace this layer later.
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <div className="d-grid gap-2 mt-4">
            <button type="button" className="btn rounded-pill py-3 text-dark border-0 fw-bold" style={{ background: 'linear-gradient(135deg, #a88448 0%, #c8a261 100%)' }} disabled={loading || !payment} onClick={() => handleOutcome(true)}>
              Simulate Successful Payment
            </button>
            <button type="button" className="btn btn-outline-secondary rounded-pill py-3" disabled={loading || !payment} onClick={() => handleOutcome(false)}>
              Simulate Failed Payment
            </button>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default MockPaymentCheckout;
