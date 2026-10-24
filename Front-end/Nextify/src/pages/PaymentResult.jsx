import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import { verifyPaymentAPI } from '../Services/allAPI';
import { useLanguage } from '../i18n/LanguageContext';

function PaymentResult() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const moyasarId = searchParams.get('id');
  const [error, setError] = useState('');
  const [message, setMessage] = useState(t('payment.verifying'));

  useEffect(() => {
    if (!moyasarId) {
      setError('Missing payment id. This page cannot confirm a payment from the URL alone.');
      return;
    }

    let cancelled = false;
    verifyPaymentAPI(moyasarId).then((res) => {
      if (cancelled) return;
      const booking = res.data?.booking;
      const verified = res.data?.verified === true && res.status === 200;
      const status = res.data?.status;

      if (verified && booking?.bookingNumber) {
        sessionStorage.removeItem('nextify_pending_booking');
        navigate(`/booking-confirmation/${booking.bookingNumber}`, {
          state: { booking, paymentSuccess: true },
          replace: true,
        });
        return;
      }

      if (booking?.bookingNumber && ['FAILED', 'CANCELLED'].includes(status)) {
        sessionStorage.removeItem('nextify_pending_booking');
        navigate(`/booking-confirmation/${booking.bookingNumber}`, {
          state: { booking, paymentSuccess: false },
          replace: true,
        });
        return;
      }

      if (res.status === 200 || res.status === 422) {
        setMessage(t('payment.processing'));
        return;
      }

      setError(res?.data?.message || res?.error || 'Payment verification failed');
      setMessage('');
    });

    return () => {
      cancelled = true;
    };
  }, [moyasarId, navigate]);

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', paddingTop: 140, paddingBottom: 80, color: 'white' }}>
      <Container style={{ maxWidth: 560 }}>
        <div className="rounded-4 p-4 p-md-5 text-center" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-uppercase small mb-2" style={{ color: '#eeb012', letterSpacing: 3 }}>NEXTIFY</p>
          <h3 style={{ fontFamily: 'Georgia, serif' }}>{error ? t('payment.notConfirmed') : t('payment.checking')}</h3>
          <p className="text-white-50 mt-3">{error || message}</p>
          {error && (
            <div className="d-flex flex-wrap gap-2 justify-content-center mt-4">
              <Link to="/payment" className="btn rounded-pill px-4" style={{ background: '#eeb012', color: '#0a0a0a' }}>{t('payment.tryAgain')}</Link>
              <Link to="/track-booking" className="btn btn-outline-light rounded-pill px-4">{t('payment.track')}</Link>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}

export default PaymentResult;
