import React, { useCallback, useEffect, useState } from 'react';
import { getPaymentsAPI } from '../../Services/allAPI';
import { PAYMENT_STATUS_COLORS, formatDate, refreshBtnStyle, sectionCardStyle } from './adminShared';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getPaymentsAPI();
    if (res?.status === 200) {
      setPayments(res.data?.payments || []);
    } else {
      setError(res?.error || 'Failed to load payments.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Recent Payments</h1>
          <p>Checkout records linked to bookings</p>
        </div>
        <button type="button" onClick={fetchPayments} style={refreshBtnStyle}>
          Refresh
        </button>
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
