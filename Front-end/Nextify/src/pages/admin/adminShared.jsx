import React from 'react';

export const SERVICE_LABELS = {
  airport: 'Airport Transfer',
  pointToPoint: 'City Transfer',
  hourly: 'Chauffeur Service',
  AIRPORT_TRANSFER: 'Airport Transfer',
  POINT_TO_POINT: 'City Transfer',
  HOURLY: 'Chauffeur Service',
  airport_transfer: 'Airport Transfer',
  city_transfer: 'City Transfer',
  chauffeur: 'Chauffeur Service',
  intercity_transfer: 'Intercity Transfer',
  gcc_transfer: 'GCC Transfer',
};

export const STATUS_COLORS = {
  pending: '#eeb012',
  PAYMENT_PENDING: '#eeb012',
  PENDING: '#eeb012',
  confirmed: '#43e97b',
  CONFIRMED: '#43e97b',
  DRIVER_ASSIGNED: '#667eea',
  DRIVER_ON_THE_WAY: '#764ba2',
  IN_PROGRESS: '#43e97b',
  COMPLETED: '#43e97b',
  cancelled: '#f5576c',
  CANCELLED: '#f5576c',
};

export const PAYMENT_STATUS_COLORS = {
  PENDING: '#eeb012',
  PAID: '#43e97b',
  FAILED: '#f5576c',
  CANCELLED: '#8e8e8e',
  REFUNDED: '#667eea',
};

export const sectionCardStyle = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px',
  padding: '28px',
};

export const refreshBtnStyle = {
  padding: '10px 18px',
  background: 'rgba(238, 176, 18, 0.15)',
  border: '1px solid rgba(238, 176, 18, 0.4)',
  borderRadius: '10px',
  color: '#eeb012',
  fontWeight: '600',
  fontSize: '13px',
  cursor: 'pointer',
};

export function DetailField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', wordBreak: 'break-word' }}>{value || '—'}</div>
    </div>
  );
}

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
};

export const getBookingDisplayName = (booking) =>
  booking.customer?.name || booking.name || 'Guest';

export const getBookingVehicle = (booking) =>
  booking.vehicle?.name || booking.vehicleName || booking.vehicle || '—';
