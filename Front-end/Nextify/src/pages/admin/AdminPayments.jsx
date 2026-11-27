import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  attachMoyasarReferenceAPI,
  getAdminLivePaymentTestStatusAPI,
  getPaymentsAPI,
  startAdminLivePaymentTestAPI,
} from '../../Services/allAPI';
import { PAYMENT_STATUS_COLORS, formatDate, refreshBtnStyle, sectionCardStyle } from './adminHelpers';

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

export default function AdminPayments() {
  const [searchParams] = useSearchParams();
  const returnedBooking = searchParams.get('testBooking') || '';
  const returnedStatus = searchParams.get('paymentStatus') || '';

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [liveTestStatus, setLiveTestStatus] = useState(null);
  const [startingTest, setStartingTest] = useState(false);
  const [liveTestError, setLiveTestError] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const formMountedForRef = useRef('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    const [paymentsRes, statusRes] = await Promise.all([
      getPaymentsAPI(),
      getAdminLivePaymentTestStatusAPI(),
    ]);
    if (paymentsRes?.status === 200) {
      setPayments(paymentsRes.data?.payments || []);
    } else {
      setError(paymentsRes?.error || 'Failed to load payments.');
    }
    if (statusRes?.status === 200) {
      setLiveTestStatus(statusRes.data || null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPaymentsAPI(), getAdminLivePaymentTestStatusAPI()]).then(([paymentsRes, statusRes]) => {
      if (cancelled) return;
      if (paymentsRes?.status === 200) {
        setPayments(paymentsRes.data?.payments || []);
      } else {
        setError(paymentsRes?.error || 'Failed to load payments.');
      }
      if (statusRes?.status === 200) {
        setLiveTestStatus(statusRes.data || null);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const paymentId = activeSession?.payment?._id;
    const checkout = activeSession?.checkout;
    if (!paymentId || !checkout || checkout.provider !== 'moyasar') return;
    if (formMountedForRef.current === paymentId) return;

    const pubKey = String(checkout.publishableKey || '').trim();
    if (!pubKey.startsWith('pk_live_') || checkout.amountHalalas !== 100) {
      setLiveTestError('Invalid LIVE checkout configuration returned by server.');
      return;
    }

    let cancelled = false;
    loadMoyasarAssets()
      .then((Moyasar) => {
        if (cancelled || !Moyasar) return;
        const container = document.querySelector('.mysr-admin-live-form');
        if (container) container.innerHTML = '';
        formMountedForRef.current = paymentId;
        Moyasar.init({
          element: '.mysr-admin-live-form',
          amount: checkout.amountHalalas,
          currency: checkout.currency || 'SAR',
          description: checkout.description,
          publishable_api_key: pubKey,
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
              await attachMoyasarReferenceAPI(paymentId, moyasarPayment.id);
            }
          },
          on_failure: async (message) => {
            setLiveTestError(typeof message === 'string' ? message : 'Payment failed');
          },
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setLiveTestError(err?.message || 'Could not load Moyasar payment form');
        }
      });

    return () => { cancelled = true; };
  }, [activeSession]);

  const handleStartLiveTest = async () => {
    if (startingTest) return;
    setStartingTest(true);
    setLiveTestError('');
    const res = await startAdminLivePaymentTestAPI();
    setStartingTest(false);

    if (res?.status === 200 || res?.status === 201) {
      formMountedForRef.current = '';
      setActiveSession(res.data || null);
      const statusRes = await getAdminLivePaymentTestStatusAPI();
      if (statusRes?.status === 200) {
        setLiveTestStatus(statusRes.data || null);
      }
      const paymentsRes = await getPaymentsAPI();
      if (paymentsRes?.status === 200) {
        setPayments(paymentsRes.data?.payments || []);
      }
    } else {
      setLiveTestError(res?.data?.message || res?.error || 'Could not start 1 SAR live payment test.');
    }
  };

  const latestTest = liveTestStatus?.latestTest || null;
  const latestPaymentStatus = latestTest?.payment?.status || latestTest?.booking?.paymentStatus || 'PENDING';
  const latestBookingNumber = latestTest?.booking?.bookingNumber || '';
  const isLiveModeReady = liveTestStatus?.provider === 'moyasar' && liveTestStatus?.moyasarMode === 'live';
  const hasPendingTest = Boolean(liveTestStatus?.hasActivePendingTest);
  const startDisabled = startingTest || hasPendingTest || !isLiveModeReady || Boolean(activeSession);

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Recent Payments</h1>
          <p>Checkout records linked to bookings</p>
        </div>
        <button type="button" onClick={fetchAll} style={refreshBtnStyle}>
          Refresh
        </button>
      </div>

      {/* Admin-only LIVE Payment Verification — 1 SAR */}
      <div style={{ ...sectionCardStyle, marginBottom: '20px', border: '1px solid rgba(238, 176, 18, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700, color: '#eeb012' }}>
              LIVE Payment Verification — 1 SAR
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)', fontSize: '13px' }}>
              Internal admin-only verification using Moyasar LIVE checkout and the production webhook.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 20,
                background: isLiveModeReady ? 'rgba(46, 204, 113, 0.18)' : 'rgba(255,255,255,0.1)',
                color: isLiveModeReady ? '#2ecc71' : 'rgba(255,255,255,0.65)',
              }}
            >
              {isLiveModeReady ? 'MOYASAR LIVE READY' : `MODE: ${(liveTestStatus?.moyasarMode || 'UNKNOWN').toUpperCase()}`}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 20,
                background: liveTestStatus?.customerLivePaymentsEnabled
                  ? 'rgba(46, 204, 113, 0.18)'
                  : 'rgba(238, 176, 18, 0.18)',
                color: liveTestStatus?.customerLivePaymentsEnabled ? '#2ecc71' : '#f6d26e',
              }}
            >
              {liveTestStatus?.customerLivePaymentsEnabled
                ? 'CUSTOMER LIVE CHECKOUT: ENABLED'
                : 'CUSTOMER CHECKOUT: WHATSAPP ONLY'}
            </span>
          </div>
        </div>

        <div
          style={{
            marginTop: '14px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(238, 176, 18, 0.1)',
            border: '1px solid rgba(238, 176, 18, 0.35)',
            color: '#f6d26e',
            fontSize: '13px',
          }}
        >
          <strong>Real 1 SAR Charge Warning:</strong> Starting this test creates a real <strong>1 SAR</strong> LIVE charge on your card via Moyasar. It is not automatically refunded; you may refund it from the Moyasar dashboard after verifying webhook reconciliation.
        </div>

        {returnedBooking && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: returnedStatus === 'PAID' ? 'rgba(46, 204, 113, 0.14)' : 'rgba(245, 87, 108, 0.14)',
              border: `1px solid ${returnedStatus === 'PAID' ? 'rgba(46, 204, 113, 0.4)' : 'rgba(245, 87, 108, 0.4)'}`,
              color: '#fff',
              fontSize: '13px',
            }}
          >
            Server verification returned for <strong>{returnedBooking}</strong>: status <strong>{returnedStatus || 'CHECKED'}</strong>.
          </div>
        )}

        {liveTestError && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(245, 87, 108, 0.14)',
              border: '1px solid rgba(245, 87, 108, 0.4)',
              color: '#ff9aa8',
              fontSize: '13px',
            }}
          >
            {liveTestError}
          </div>
        )}

        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleStartLiveTest}
            disabled={startDisabled}
            style={{
              padding: '10px 20px',
              borderRadius: '999px',
              border: 'none',
              background: startDisabled ? 'rgba(255,255,255,0.12)' : '#eeb012',
              color: startDisabled ? 'rgba(255,255,255,0.45)' : '#0a0a0a',
              fontWeight: 700,
              fontSize: '13px',
              cursor: startDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {startingTest ? 'Creating 1 SAR Test...' : 'Start 1 SAR Live Payment Test'}
          </button>

          {hasPendingTest && !activeSession && isLiveModeReady && (
            <button
              type="button"
              onClick={handleStartLiveTest}
              disabled={startingTest}
              style={{
                padding: '10px 18px',
                borderRadius: '999px',
                border: '1px solid rgba(238, 176, 18, 0.5)',
                background: 'transparent',
                color: '#eeb012',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Open Active Pending 1 SAR Checkout
            </button>
          )}
        </div>

        {latestTest && (
          <div
            style={{
              marginTop: '16px',
              padding: '14px 16px',
              borderRadius: '10px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                Latest Admin LIVE Test
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '15px' }}>{latestBookingNumber}</strong>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '3px 8px',
                    borderRadius: 20,
                    background: `${PAYMENT_STATUS_COLORS[latestPaymentStatus] || '#ffffff'}22`,
                    color: PAYMENT_STATUS_COLORS[latestPaymentStatus] || '#ffffff',
                  }}
                >
                  {latestPaymentStatus}
                </span>
                <span style={{ fontSize: '13px', color: '#eeb012', fontWeight: 700 }}>
                  {latestTest.payment?.amount ?? 1} {latestTest.payment?.currency || 'SAR'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
                {formatDate(latestTest.booking?.createdAt)}
                {latestTest.payment?.providerReference ? ` · Ref: ${latestTest.payment.providerReference}` : ''}
              </div>
            </div>
            <Link
              to={`/admin/bookings?booking=${encodeURIComponent(latestBookingNumber)}`}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              View Booking Details
            </Link>
          </div>
        )}

        {activeSession?.checkout && (
          <div
            style={{
              marginTop: '18px',
              padding: '20px',
              borderRadius: '12px',
              background: '#ffffff',
              color: '#111111',
              maxWidth: '480px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', letterSpacing: '2px', color: '#a88448', fontWeight: 700 }}>
                  MOYASAR HOSTED LIVE CHECKOUT
                </div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>
                  {activeSession.booking?.bookingNumber} · 1 SAR
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  formMountedForRef.current = '';
                  setActiveSession(null);
                }}
                style={{
                  border: '1px solid #ddd',
                  background: '#f5f5f5',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
            <div className="mysr-admin-live-form" />
          </div>
        )}
      </div>

      <div style={sectionCardStyle}>
        {loading && (
          <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', margin: '24px 0' }}>
            Loading payments...
          </p>
        )}

        {error && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '10px',
              background: 'rgba(245, 87, 108, 0.12)',
              border: '1px solid rgba(245, 87, 108, 0.35)',
              color: '#8e8e8e',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && payments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💳</div>
            <p style={{ margin: 0 }}>No payments yet.</p>
          </div>
        )}

        {!loading && payments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {payments.map((payment) => {
              const status = payment.status || 'PENDING';
              const customer = payment.booking?.customer?.name;
              const isInternalTest = Boolean(payment.booking?.isInternalPaymentTest);
              return (
                <div
                  key={payment._id}
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '18px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{payment.bookingNumber}</span>
                      {isInternalTest && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            padding: '3px 8px',
                            borderRadius: 20,
                            background: 'rgba(13, 110, 253, 0.22)',
                            color: '#6ea8fe',
                          }}
                        >
                          ADMIN PAYMENT TEST
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          padding: '3px 8px',
                          borderRadius: 20,
                          background: `${PAYMENT_STATUS_COLORS[status] || '#ffffff'}22`,
                          color: PAYMENT_STATUS_COLORS[status] || '#ffffff',
                        }}
                      >
                        {status}
                      </span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
                      {customer ? `${customer} · ` : ''}
                      {payment.provider || 'mock'}
                      {payment.providerReference ? ` · ${payment.providerReference}` : ''}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 4 }}>
                      {formatDate(payment.createdAt)}
                      {payment.bookingNumber && (
                        <>
                          {' · '}
                          <Link
                            to={`/admin/bookings?booking=${encodeURIComponent(payment.bookingNumber)}`}
                            style={{ color: '#eeb012', textDecoration: 'none' }}
                          >
                            View booking
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#eeb012' }}>
                    {payment.amount} {payment.currency || 'SAR'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
