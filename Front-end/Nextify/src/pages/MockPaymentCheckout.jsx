import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import {
  attachMoyasarReferenceAPI,
  createPaymentAPI,
  getPublicPayBookingAPI,
  mockCompletePaymentAPI,
  mockFailPaymentAPI,
} from '../Services/allAPI';
import PriceSummary from '../components/booking/PriceSummary';
import { SERVICE_LABELS } from '../components/booking/bookingConstants';
import { useLanguage } from '../i18n/LanguageContext';
import { translateService } from '../i18n/places';

const MOYASAR_JS = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.js';
const MOYASAR_CSS = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.css';

function loadMoyasarAssets() {
  return new Promise((resolve, reject) => {
    if (window.Moyasar) {
      resolve(window.Moyasar);
      return;
    }

    if (!document.querySelector(`link[href="${MOYASAR_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = MOYASAR_CSS;
      document.head.appendChild(link);
    }

    const existing = document.querySelector(`script[src="${MOYASAR_JS}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Moyasar));
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = MOYASAR_JS;
    script.async = true;
    script.onload = () => resolve(window.Moyasar);
    script.onerror = () => reject(new Error('Could not load Moyasar payment form'));
    document.body.appendChild(script);
  });
}

function MockPaymentCheckout() {
  const { t, formatSar } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const queryBookingId = new URLSearchParams(location.search).get('bookingId');
  const [booking, setBooking] = useState(() => {
    if (location.state?.booking) return location.state.booking;
    try {
      return JSON.parse(sessionStorage.getItem('nextify_pending_booking') || 'null');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [error, setError] = useState('');
  const formReady = useRef(false);

  useEffect(() => {
    const startCheckout = (current) => {
      sessionStorage.setItem('nextify_pending_booking', JSON.stringify(current));
      createPaymentAPI(current._id).then((res) => {
        if (res?.status === 200 || res?.status === 201) {
          setPayment(res.data?.payment);
          setCheckout(res.data?.checkout || { provider: 'mock' });
        } else {
          setError(res?.data?.message || res?.error || 'Could not create payment session');
        }
      });
    };

    if (booking?._id) {
      startCheckout(booking);
      return;
    }

    if (!queryBookingId) {
      navigate('/booking');
      return;
    }

    getPublicPayBookingAPI(queryBookingId).then((res) => {
      const fetched = res.data?.booking;
      if ((res?.status === 200 || res?.status === 201) && fetched?._id) {
        setBooking(fetched);
        startCheckout(fetched);
      } else {
        setError(res?.data?.message || res?.error || 'Could not load this booking');
      }
    });
  }, [booking, navigate, queryBookingId]);

  useEffect(() => {
    if (checkout?.provider !== 'moyasar' || !payment?._id || formReady.current) return;
    const publishableKey = checkout.publishableKey || import.meta.env.VITE_MOYASAR_PUBLISHABLE_KEY;
    if (!publishableKey) {
      setError('Moyasar publishable key is missing');
      return;
    }

    let cancelled = false;
    loadMoyasarAssets()
      .then((Moyasar) => {
        if (cancelled || !Moyasar) return;
        formReady.current = true;
        Moyasar.init({
          element: '.mysr-form',
          amount: checkout.amountHalalas,
          currency: checkout.currency || 'SAR',
          description: checkout.description,
          publishable_api_key: publishableKey,
          callback_url: checkout.callbackUrl,
          methods: ['creditcard'],
          supported_networks: ['mada', 'visa', 'mastercard'],
          metadata: checkout.metadata,
          language: 'en',
          on_initiating: async () => ({
            amount: checkout.amountHalalas,
            description: checkout.description,
            callback_url: checkout.callbackUrl,
            metadata: checkout.metadata,
          }),
          on_completed: async (moyasarPayment) => {
            if (moyasarPayment?.id) {
              await attachMoyasarReferenceAPI(payment._id, moyasarPayment.id);
            }
          },
          on_failure: async (message) => {
            setError(typeof message === 'string' ? message : 'Payment failed');
          },
        });
      })
      .catch((err) => {
        setError(err.message || 'Could not load Moyasar payment form');
      });

    return () => {
      cancelled = true;
    };
  }, [checkout, payment]);

  const handleOutcome = async (success) => {
    if (!payment?._id) return;
    setLoading(true);
    const fn = success ? mockCompletePaymentAPI : mockFailPaymentAPI;
    const res = await fn(payment._id);
    setLoading(false);
    if (res?.status === 200) {
      const updatedBooking = res.data?.booking || booking;
      navigate(`/booking-confirmation/${updatedBooking.bookingNumber}`, {
        state: { booking: updatedBooking, paymentSuccess: success },
      });
    } else {
      setError(res?.data?.message || 'Payment update failed');
    }
  };

  if (!booking) {
    return (
      <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', paddingTop: 140, color: 'white', textAlign: 'center' }}>
        <p>{error || t('payment.loading')}</p>
      </div>
    );
  }

  const serviceLabel = translateService(booking.serviceType, t) || SERVICE_LABELS[booking.serviceType] || booking.serviceType;
  const vehicleLabel = booking.vehicle?.name || booking.vehicleName || '—';
  const amount = booking.pricing?.totalAmount ?? booking.quotedPrice ?? checkout?.amount;
  const isMoyasar = checkout?.provider === 'moyasar';

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', paddingTop: 120, paddingBottom: 80, color: 'white' }}>
      <Container style={{ maxWidth: 560 }}>
        <div className="rounded-4 p-4 p-md-5 shadow-lg" style={{ background: '#fff', color: '#111' }}>
          <p className="text-uppercase small mb-1" style={{ color: '#a88448', letterSpacing: 3 }}>NEXTIFY</p>
          <h3 className="mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{t('payment.title')}</h3>
          <p className="text-muted small mb-4">
            {isMoyasar ? t('payment.moyasar') : t('payment.demo')}
          </p>

          <div className="mb-4" style={{ fontSize: '0.95rem', lineHeight: 1.8 }}>
            <div className="d-flex justify-content-between"><span className="text-muted">{t('payment.bookingNo')}</span><strong>{booking.bookingNumber}</strong></div>
            <div className="d-flex justify-content-between"><span className="text-muted">{t('payment.service')}</span><strong>{serviceLabel}</strong></div>
            <div className="d-flex justify-content-between"><span className="text-muted">{t('payment.vehicle')}</span><strong>{vehicleLabel}</strong></div>
            <div className="d-flex justify-content-between"><span className="text-muted">{t('payment.amount')}</span><strong>{formatSar(amount || 0)}</strong></div>
          </div>

          <PriceSummary quote={booking.pricing} />

          {error && <div className="alert alert-danger mt-3">{error}</div>}

          {isMoyasar ? (
            <div className="mt-4">
              <div className="mysr-form" />
              <p className="text-muted small mt-3 mb-0">{t('payment.testCards')}</p>
            </div>
          ) : (
            <>
              <div className="alert alert-info small mt-3">
                {t('payment.mock')}
              </div>
              <div className="d-grid gap-2 mt-4">
                <button type="button" className="btn rounded-pill py-3 text-dark border-0 fw-bold" style={{ background: 'linear-gradient(135deg, #a88448 0%, #c8a261 100%)' }} disabled={loading || !payment} onClick={() => handleOutcome(true)}>
                  {t('payment.success')}
                </button>
                <button type="button" className="btn btn-outline-secondary rounded-pill py-3" disabled={loading || !payment} onClick={() => handleOutcome(false)}>
                  {t('payment.fail')}
                </button>
              </div>
            </>
          )}
        </div>
      </Container>
    </div>
  );
}

export default MockPaymentCheckout;
