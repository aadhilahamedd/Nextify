import { useEffect, useRef, useState } from 'react';
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
import { TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR } from '../utils/paymentMode';
import {
  CHECKOUT_TOKEN_MISSING_MESSAGE,
  clearCheckoutToken,
  consumeCheckoutTokenFromHash,
  hasAuthSession,
  normalizeCheckoutToken,
  readCheckoutToken,
  resolveCheckoutToken,
} from '../utils/checkoutSession';
import { buildWhatsAppConfirmationMessage, openCompanyWhatsApp } from '../utils/whatsapp';

const MOYASAR_JS = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.js';
const MOYASAR_CSS = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.css';

function resolveMoyasarKeyMode(publishableKey) {
  const key = String(publishableKey || '').trim();
  if (key.startsWith('pk_live_')) return 'live';
  if (key.startsWith('pk_test_')) return 'test';
  return 'invalid';
}

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

function readSessionBooking() {
  try {
    return JSON.parse(sessionStorage.getItem('nextify_pending_booking') || 'null');
  } catch {
    return null;
  }
}

function MockPaymentCheckout() {
  const { t, formatSar } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const queryBookingId = new URLSearchParams(location.search).get('bookingId');
  const [booking, setBooking] = useState(() => {
    if (queryBookingId) return null;
    if (location.state?.booking) return location.state.booking;
    return readSessionBooking();
  });
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [error, setError] = useState('');
  const formReady = useRef(false);
  const whatsappRedirected = useRef(false);
  const checkoutStartedFor = useRef(null);
  const bootstrapped = useRef(false);

  const targetBookingId = queryBookingId || booking?._id || '';
  const hasValidQueryBookingId = !queryBookingId || /^[a-fA-F0-9]{24}$/.test(queryBookingId);
  const hashCtToken = location.hash
    ? normalizeCheckoutToken(new URLSearchParams(location.hash.slice(1)).get('ct') || '')
    : '';
  const stateTokenMatches = Boolean(
    location.state?.checkoutToken
    && (!location.state?.booking?._id || String(location.state.booking._id).trim() === String(targetBookingId))
    && normalizeCheckoutToken(location.state.checkoutToken)
  );
  const hasCheckoutAuth = Boolean(
    TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR
    || !targetBookingId
    || !hasValidQueryBookingId
    || hasAuthSession()
    || hashCtToken
    || stateTokenMatches
    || readCheckoutToken(targetBookingId)
  );
  const derivedBootstrapError = !hasValidQueryBookingId
    ? 'Invalid booking id'
    : (!hasCheckoutAuth ? CHECKOUT_TOKEN_MISSING_MESSAGE : '');

  const isMoyasar = checkout?.provider === 'moyasar';
  const activePublishableKey = isMoyasar
    ? (checkout?.publishableKey || import.meta.env.VITE_MOYASAR_PUBLISHABLE_KEY || '')
    : '';
  const moyasarKeyMode = isMoyasar ? resolveMoyasarKeyMode(activePublishableKey) : null;
  const moyasarKeyError = isMoyasar && payment?._id
    ? (!activePublishableKey
      ? 'Moyasar publishable key is missing'
      : (moyasarKeyMode === 'invalid' ? 'Moyasar publishable key is invalid' : ''))
    : '';
  const displayError = derivedBootstrapError || moyasarKeyError || error;

  useEffect(() => {
    if (bootstrapped.current) return;
    let cancelled = false;

    // Always strip any `#ct=` fragment immediately; only persist when queryBookingId is valid.
    const fragmentToken = consumeCheckoutTokenFromHash(queryBookingId || '');

    const startCheckout = (current, resolvedToken = '') => {
      if (!current?._id || checkoutStartedFor.current === current._id) return;

      const checkoutToken = resolvedToken || resolveCheckoutToken({
        bookingId: current._id,
        stateToken: location.state?.checkoutToken,
        stateBookingId: location.state?.booking?._id,
      });

      if (!TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR && !checkoutToken && !hasAuthSession()) {
        return;
      }

      checkoutStartedFor.current = current._id;

      try {
        sessionStorage.setItem('nextify_pending_booking', JSON.stringify(current));
      } catch { /* ignore quota */ }

      if (TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR) {
        if (whatsappRedirected.current) return;
        whatsappRedirected.current = true;
        const message = buildWhatsAppConfirmationMessage({ booking: current });
        try {
          sessionStorage.setItem(`booking_${current.bookingNumber}`, JSON.stringify(current));
        } catch { /* ignore quota */ }
        openCompanyWhatsApp(message, { redirect: true });
        return;
      }

      createPaymentAPI(current._id, checkoutToken).then((res) => {
        if (cancelled) return;
        if (res?.status === 200 || res?.status === 201) {
          const paidBooking = res.data?.booking;
          if (paidBooking?._id) setBooking((prev) => ({ ...prev, ...paidBooking }));
          setPayment(res.data?.payment);
          setCheckout(res.data?.checkout || { provider: 'mock' });
        } else {
          setError(res?.data?.message || res?.error || 'Could not create payment session');
        }
      });
    };

    // Explicit bookingId (retry) always wins over stale session state.
    if (queryBookingId) {
      bootstrapped.current = true;
      if (!/^[a-fA-F0-9]{24}$/.test(queryBookingId)) {
        return () => { cancelled = true; };
      }

      const retryToken = fragmentToken || resolveCheckoutToken({
        bookingId: queryBookingId,
        stateToken: location.state?.checkoutToken,
        stateBookingId: location.state?.booking?._id,
      });

      if (!retryToken && !hasAuthSession()) {
        return () => { cancelled = true; };
      }

      getPublicPayBookingAPI(queryBookingId, retryToken).then((res) => {
        if (cancelled) return;
        const fetched = res.data?.booking;
        if ((res?.status === 200 || res?.status === 201) && fetched?._id) {
          setBooking(fetched);
          startCheckout(fetched, retryToken);
        } else {
          setError(res?.data?.message || res?.error || 'Could not load this booking');
        }
      });
      return () => { cancelled = true; };
    }

    if (booking?._id) {
      bootstrapped.current = true;
      startCheckout(booking);
      return () => { cancelled = true; };
    }

    navigate('/booking');
    return () => { cancelled = true; };
  }, [booking, location.state, navigate, queryBookingId]);

  useEffect(() => {
    if (checkout?.provider !== 'moyasar' || !payment?._id || formReady.current) return;
    if (!activePublishableKey || moyasarKeyMode === 'invalid') return;

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
          publishable_api_key: activePublishableKey,
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
              // Attach new Moyasar id to this checkout's local attempt only (immutable history).
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
  }, [activePublishableKey, checkout, moyasarKeyMode, payment]);

  const handleOutcome = async (success) => {
    if (!payment?._id) return;
    setLoading(true);
    const fn = success ? mockCompletePaymentAPI : mockFailPaymentAPI;
    const res = await fn(payment._id);
    setLoading(false);
    if (res?.status === 200) {
      const updatedBooking = res.data?.booking || booking;
      if (success) {
        clearCheckoutToken(updatedBooking?._id || booking?._id);
      } else if (updatedBooking?._id) {
        try {
          sessionStorage.setItem('nextify_pending_booking', JSON.stringify({
            _id: updatedBooking._id,
            bookingNumber: updatedBooking.bookingNumber,
            paymentStatus: updatedBooking.paymentStatus,
            bookingStatus: updatedBooking.bookingStatus,
          }));
        } catch { /* ignore */ }
      }
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
        <p>{displayError || t('payment.loading')}</p>
      </div>
    );
  }

  const serviceLabel = translateService(booking.serviceType, t) || SERVICE_LABELS[booking.serviceType] || booking.serviceType;
  const vehicleLabel = booking.vehicle?.name || booking.vehicleName || '—';
  const amount = booking.pricing?.totalAmount ?? booking.quotedPrice ?? checkout?.amount;
  const subtitle = !isMoyasar
    ? t('payment.demo')
    : moyasarKeyMode === 'live'
      ? t('payment.moyasarLive')
      : moyasarKeyMode === 'test'
        ? t('payment.moyasar')
        : t('payment.unavailable');

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', paddingTop: 120, paddingBottom: 80, color: 'white' }}>
      <Container style={{ maxWidth: 560 }}>
        <div className="rounded-4 p-4 p-md-5 shadow-lg" style={{ background: '#fff', color: '#111' }}>
          <p className="text-uppercase small mb-1" style={{ color: '#a88448', letterSpacing: 3 }}>NEXTIFY</p>
          <h3 className="mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{t('payment.title')}</h3>
          <p className="text-muted small mb-4">
            {subtitle}
          </p>

          <div className="mb-4" style={{ fontSize: '0.95rem', lineHeight: 1.8 }}>
            <div className="d-flex justify-content-between"><span className="text-muted">{t('payment.bookingNo')}</span><strong>{booking.bookingNumber}</strong></div>
            <div className="d-flex justify-content-between"><span className="text-muted">{t('payment.service')}</span><strong>{serviceLabel}</strong></div>
            <div className="d-flex justify-content-between"><span className="text-muted">{t('payment.vehicle')}</span><strong>{vehicleLabel}</strong></div>
            <div className="d-flex justify-content-between"><span className="text-muted">{t('payment.amount')}</span><strong>{formatSar(amount || 0)}</strong></div>
          </div>

          <PriceSummary quote={booking.pricing} />

          {displayError && <div className="alert alert-danger mt-3">{displayError}</div>}

          {isMoyasar ? (
            <div className="mt-4">
              <div className="mysr-form" />
              {moyasarKeyMode === 'live' && (
                <p className="text-muted small mt-3 mb-0">{t('payment.liveCards')}</p>
              )}
              {moyasarKeyMode === 'test' && (
                <p className="text-muted small mt-3 mb-0">{t('payment.testCards')}</p>
              )}
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
