import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import { verifyPaymentAPI } from '../Services/allAPI';
import { useLanguage } from '../i18n/LanguageContext';
import { clearCheckoutToken } from '../utils/checkoutSession';
import { TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR } from '../utils/paymentMode';
import { COMPANY_PHONE, getWhatsAppUrl } from '../utils/whatsapp';

function readSessionBooking(bookingNumber) {
  let pending = null;
  let stored = null;
  try {
    pending = JSON.parse(sessionStorage.getItem('nextify_pending_booking') || 'null');
  } catch { /* ignore */ }
  try {
    if (bookingNumber) {
      stored = JSON.parse(sessionStorage.getItem(`booking_${bookingNumber}`) || 'null');
    }
  } catch { /* ignore */ }
  return { ...(stored || {}), ...(pending || {}) };
}

function storeRetryBooking(booking) {
  if (!booking?._id) return;
  try {
    sessionStorage.setItem(
      'nextify_pending_booking',
      JSON.stringify({
        _id: booking._id,
        bookingNumber: booking.bookingNumber,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.bookingStatus,
      })
    );
  } catch {
    /* ignore quota */
  }
}

/** Merge server-safe verify fields with any client-local session copy the user already had. */
function mergeConfirmationBooking(verifiedBooking) {
  if (!verifiedBooking?._id) return verifiedBooking;
  const local = readSessionBooking(verifiedBooking.bookingNumber);
  if (!local?._id || String(local._id) !== String(verifiedBooking._id)) {
    return verifiedBooking;
  }
  return {
    ...local,
    ...verifiedBooking,
    // Prefer verified payment/booking statuses and amount from the server.
    paymentStatus: verifiedBooking.paymentStatus ?? local.paymentStatus,
    bookingStatus: verifiedBooking.bookingStatus ?? local.bookingStatus,
    quotedPrice: verifiedBooking.quotedPrice ?? local.quotedPrice,
    pricing: verifiedBooking.pricing || local.pricing,
  };
}

function PaymentResult() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const moyasarId = searchParams.get('id');
  const [error, setError] = useState('');
  const [message, setMessage] = useState(t('payment.verifying'));
  const [retryBookingId, setRetryBookingId] = useState('');
  const displayError = !moyasarId
    ? 'Missing payment id. This page cannot confirm a payment from the URL alone.'
    : error;

  useEffect(() => {
    if (!moyasarId) return;

    const MAX_ATTEMPTS = 5;
    const POLL_DELAYS_MS = [2000, 3000, 4000, 5000];
    let cancelled = false;
    let pollTimer = null;

    const runVerify = (attempt) => {
      verifyPaymentAPI(moyasarId).then((res) => {
        if (cancelled) return;
        const verifiedBooking = res.data?.booking;
        const booking = mergeConfirmationBooking(verifiedBooking);
        const verified = res.data?.verified === true && res.status === 200;
        const status = res.data?.status;

        if (booking?._id) setRetryBookingId(booking._id);

        if (verified && booking?.bookingNumber) {
          clearCheckoutToken(booking._id);
          navigate(`/booking-confirmation/${booking.bookingNumber}`, {
            state: {
              booking,
              paymentSuccess: true,
              manualInterventionRequired: Boolean(res.data?.manualInterventionRequired),
              paymentNotice: res.message || '',
            },
            replace: true,
          });
          return;
        }

        if (booking?.bookingNumber && ['FAILED', 'CANCELLED'].includes(status)) {
          storeRetryBooking(booking);
          navigate(`/booking-confirmation/${booking.bookingNumber}`, {
            state: { booking, paymentSuccess: false },
            replace: true,
          });
          return;
        }

        const isPendingStatus = (res.status === 200 || res.status === 422) && status === 'PENDING';
        const isTransientError = [500, 502, 503, 504].includes(res.status) && !res.data?.status;

        if ((isPendingStatus || isTransientError) && attempt < MAX_ATTEMPTS) {
          setMessage(t('payment.processing'));
          const delay = POLL_DELAYS_MS[Math.min(attempt - 1, POLL_DELAYS_MS.length - 1)];
          pollTimer = window.setTimeout(() => {
            if (!cancelled) runVerify(attempt + 1);
          }, delay);
          return;
        }

        if (res.status === 200 || res.status === 422) {
          setMessage(t('payment.processing'));
          return;
        }

        if (booking?._id) storeRetryBooking(booking);
        setError(res?.data?.message || res?.error || 'Payment verification failed');
        setMessage('');
      });
    };

    runVerify(1);

    return () => {
      cancelled = true;
      if (pollTimer) window.clearTimeout(pollTimer);
    };
  }, [moyasarId, navigate, t]);

  const canRetryOnline = Boolean(!TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR && retryBookingId);
  const retryHref = canRetryOnline
    ? `/payment?bookingId=${encodeURIComponent(retryBookingId)}`
    : '/track-booking';

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', paddingTop: 140, paddingBottom: 80, color: 'white' }}>
      <Container style={{ maxWidth: 560 }}>
        <div className="rounded-4 p-4 p-md-5 text-center" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-uppercase small mb-2" style={{ color: '#eeb012', letterSpacing: 3 }}>NEXTIFY</p>
          <h3 style={{ fontFamily: 'Georgia, serif' }}>{displayError ? t('payment.notConfirmed') : t('payment.checking')}</h3>
          <p className="text-white-50 mt-3">{displayError || message}</p>
          {displayError && (
            <div className="d-flex flex-wrap gap-2 justify-content-center mt-4">
              {canRetryOnline && (
                <Link to={retryHref} className="btn rounded-pill px-4" style={{ background: '#eeb012', color: '#0a0a0a' }}>
                  {t('payment.tryAgain')}
                </Link>
              )}
              <a
                href={getWhatsAppUrl(COMPANY_PHONE, t('wa.help'))}
                target="_blank"
                rel="noreferrer"
                className="btn rounded-pill px-4 fw-semibold"
                style={{ background: '#25D366', color: '#0a0a0a', border: 'none' }}
              >
                WhatsApp Assistance
              </a>
              <Link to="/track-booking" className="btn btn-outline-light rounded-pill px-4">{t('payment.track')}</Link>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}

export default PaymentResult;
