import React, { useCallback, useEffect, useState } from 'react';
import {
  assignDriverAPI,
  deleteBookingAPI,
  getBookingStatsAPI,
  getBookingsAPI,
  getDriversAPI,
  updateBookingAPI,
} from '../../Services/allAPI';
import {
  DetailField,
  SERVICE_LABELS,
  STATUS_COLORS,
  formatDate,
  getBookingDisplayName,
  getBookingVehicle,
  refreshBtnStyle,
  sectionCardStyle,
} from './adminShared';

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedBookingId, setExpandedBookingId] = useState(null);
  const [drivers, setDrivers] = useState([]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');

    const response = await getBookingsAPI();
    if (response?.status === 200) {
      setBookings(response.data || []);
    } else {
      setError(response?.response?.data?.message || response?.error || 'Failed to load bookings.');
    }

    setLoading(false);
  }, []);

  const fetchDrivers = useCallback(async () => {
    const res = await getDriversAPI();
    if (res?.status === 200) setDrivers(Array.isArray(res.data) ? res.data : []);
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchDrivers();
  }, [fetchBookings, fetchDrivers]);

  const handleToggleBooking = (bookingId) => {
    setExpandedBookingId((prev) => (prev === bookingId ? null : bookingId));
  };

  const handleDeleteBooking = async (id) => {
    if (!window.confirm('Delete this booking?')) return;

    const response = await deleteBookingAPI(id);
    if (response?.status === 200) {
      setBookings((prev) => prev.filter((item) => item._id !== id));
      if (expandedBookingId === id) setExpandedBookingId(null);
    } else {
      alert(response?.response?.data?.message || 'Failed to delete booking.');
    }
  };

  const handleStatusChange = async (bookingId, bookingStatus) => {
    const res = await updateBookingAPI(bookingId, { bookingStatus });
    if (res?.status === 200) {
      fetchBookings();
      getBookingStatsAPI();
    } else {
      alert(res?.error || 'Failed to update status');
    }
  };

  const handleAssignDriver = async (bookingId, driverId) => {
    if (!driverId) return;
    const res = await assignDriverAPI(bookingId, driverId);
    if (res?.status === 200) {
      fetchBookings();
      fetchDrivers();
    } else {
      alert(res?.error || res?.data?.message || 'Failed to assign driver');
    }
  };

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Bookings</h1>
          <p>Reservation details from the booking form</p>
        </div>
        <button type="button" onClick={fetchBookings} style={refreshBtnStyle}>
          Refresh
        </button>
      </div>

      <div style={sectionCardStyle}>
        {loading && (
          <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', margin: '24px 0' }}>
            Loading bookings...
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

        {!loading && !error && bookings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚗</div>
            <p style={{ margin: 0 }}>No bookings yet. Submissions from the booking page will appear here.</p>
          </div>
        )}

        {!loading && bookings.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bookings.map((booking) => {
              const isExpanded = expandedBookingId === booking._id;
              const status = booking.bookingStatus || 'pending';
              const eventLabel =
                booking.eventType === 'Other' && booking.eventOther
                  ? `${booking.eventType} (${booking.eventOther})`
                  : booking.eventType;

              return (
                <div
                  key={booking._id}
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: `1px solid ${status === 'pending' ? 'rgba(51, 51, 51, 0.35)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '12px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleBooking(booking._id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '16px',
                      padding: '18px 20px',
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '700', fontSize: '15px' }}>{getBookingDisplayName(booking)}</span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            padding: '3px 8px',
                            borderRadius: '20px',
                            background: `${STATUS_COLORS[status] || '#ffffff'}22`,
                            color: STATUS_COLORS[status] || '#ffffff',
                          }}
                        >
                          {status}
                        </span>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px' }}>
                        {booking.bookingNumber && `${booking.bookingNumber} · `}
                        {getBookingVehicle(booking)} • {SERVICE_LABELS[booking.serviceType] || booking.serviceType}
                        {booking.pricing?.totalAmount ? ` · ${booking.pricing.totalAmount} ${booking.pricing.currency || 'SAR'}` : ''}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '4px' }}>
                        {formatDate(booking.createdAt)}
                      </div>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '18px' }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '12px',
                          marginTop: '16px',
                          marginBottom: '16px',
                        }}
                      >
                        <DetailField label="Booking #" value={booking.bookingNumber} />
                        <DetailField label="Customer Name" value={getBookingDisplayName(booking)} />
                        <DetailField label="Vehicle + Chauffeur" value={getBookingVehicle(booking)} />
                        <DetailField label="Service Type" value={SERVICE_LABELS[booking.serviceType] || booking.serviceType} />
                        <DetailField label="Mobile" value={booking.customer?.mobile || booking.mobile} />
                        <DetailField label="Email" value={booking.customer?.email || booking.email} />
                        <DetailField label="Booking Status" value={status} />
                        <DetailField label="Payment Status" value={booking.paymentStatus || '—'} />
                        <DetailField label="Total" value={booking.pricing?.totalAmount ? `${booking.pricing.totalAmount} ${booking.pricing.currency || 'SAR'}` : '—'} />
                        {eventLabel && <DetailField label="Event" value={eventLabel} />}
                        {(booking.flight?.flightNumber || booking.flightNumber) && (
                          <DetailField label="Flight Number" value={booking.flight?.flightNumber || booking.flightNumber} />
                        )}
                        <DetailField label="Date & Time" value={formatDate(booking.schedule?.pickupDateTime || booking.arrivalDateTime)} />
                        <DetailField label="Pick-up" value={booking.pickup?.address || booking.pickupLocation} />
                        <DetailField label="Destination" value={booking.destination?.address || booking.dropoffLocation} />
                        {(booking.serviceType === 'hourly' || booking.serviceType === 'HOURLY') && (
                          <DetailField label="Hours" value={booking.hourlyBooking?.hours || booking.hours} />
                        )}
                        <DetailField label="Booked On" value={formatDate(booking.createdAt)} />
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                        <select
                          className="form-select form-select-sm"
                          style={{ maxWidth: 220 }}
                          value={status}
                          onChange={(e) => handleStatusChange(booking._id, e.target.value)}
                        >
                          {['PAYMENT_PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED', 'DRIVER_ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <select
                          className="form-select form-select-sm"
                          style={{ maxWidth: 220 }}
                          defaultValue=""
                          onChange={(e) => handleAssignDriver(booking._id, e.target.value)}
                        >
                          <option value="">Assign driver...</option>
                          {drivers.filter((d) => d.active).map((d) => (
                            <option key={d._id} value={d._id}>{d.name} ({d.status})</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ marginTop: '8px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteBooking(booking._id)}
                          style={{
                            padding: '8px 16px',
                            background: 'rgba(245, 87, 108, 0.12)',
                            border: '1px solid rgba(245, 87, 108, 0.35)',
                            borderRadius: '8px',
                            color: '#8e8e8e',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
