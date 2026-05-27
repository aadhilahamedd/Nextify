import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteBookingAPI,
  deleteContactMessageAPI,
  getBookingsAPI,
  getContactMessagesAPI,
  markMessageReadAPI,
} from '../Services/allAPI';
import {
  getLocalContactMessages,
  markLocalContactMessageRead,
  removeLocalContactMessage,
} from '../utils/contactMessagesStorage';

const SERVICE_LABELS = {
  airport: 'Airport Transfer',
  pointToPoint: 'Point to Point',
  hourly: 'Hourly Service',
};

const STATUS_COLORS = {
  pending: '#eeb012',
  confirmed: '#43e97b',
  cancelled: '#f5576c',
};

const sectionCardStyle = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px',
  padding: '28px',
};

const refreshBtnStyle = {
  padding: '10px 18px',
  background: 'rgba(238, 176, 18, 0.15)',
  border: '1px solid rgba(238, 176, 18, 0.4)',
  borderRadius: '10px',
  color: '#eeb012',
  fontWeight: '600',
  fontSize: '13px',
  cursor: 'pointer',
};

function DetailField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', wordBreak: 'break-word' }}>{value || '—'}</div>
    </div>
  );
}

function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState('');
  const [expandedMessageId, setExpandedMessageId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState('');
  const [expandedBookingId, setExpandedBookingId] = useState(null);

  const fetchMessages = useCallback(async () => {
    setMessagesLoading(true);
    setMessagesError('');

    const response = await getContactMessagesAPI();
    const localMessages = getLocalContactMessages();

    if (response?.status === 200) {
      const serverMessages = response.data || [];
      const localOnly = localMessages.filter(
        (local) => !serverMessages.some((server) => server._id === local._id)
      );
      setMessages([...serverMessages, ...localOnly]);
      setMessagesError('');
    } else if (localMessages.length > 0) {
      setMessages(localMessages);
      setMessagesError(
        response?.status === 404
          ? 'Server API not deployed yet. Showing messages saved from this browser until the backend is updated on Render.'
          : response?.error || 'Could not reach server. Showing locally saved messages.'
      );
    } else {
      setMessages([]);
      setMessagesError(
        response?.error ||
          (response?.status === 404
            ? 'Messages API not found. Deploy the latest Backend folder to Render (includes /api/messages).'
            : 'Failed to load messages.')
      );
    }

    setMessagesLoading(false);
  }, []);

  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    setBookingsError('');

    const response = await getBookingsAPI();

    if (response?.status === 200) {
      setBookings(response.data || []);
    } else {
      setBookingsError(
        response?.response?.data?.message || response?.error || 'Failed to load bookings.'
      );
    }

    setBookingsLoading(false);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'admin') {
      navigate('/');
      return;
    }

    setUser(parsedUser);
    fetchMessages();
    fetchBookings();
  }, [navigate, fetchMessages, fetchBookings]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleToggleMessage = async (msg) => {
    const isExpanded = expandedMessageId === msg._id;
    setExpandedMessageId(isExpanded ? null : msg._id);

    if (!isExpanded && msg.status === 'new') {
      if (String(msg._id).startsWith('local_')) {
        markLocalContactMessageRead(msg._id);
        setMessages((prev) =>
          prev.map((item) =>
            item._id === msg._id ? { ...item, status: 'read' } : item
          )
        );
      } else {
        const response = await markMessageReadAPI(msg._id);
        if (response?.status === 200) {
          setMessages((prev) =>
            prev.map((item) =>
              item._id === msg._id ? { ...item, status: 'read' } : item
            )
          );
        }
      }
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Delete this message?')) return;

    if (String(id).startsWith('local_')) {
      removeLocalContactMessage(id);
      setMessages((prev) => prev.filter((item) => item._id !== id));
      if (expandedMessageId === id) setExpandedMessageId(null);
      return;
    }

    const response = await deleteContactMessageAPI(id);
    if (response?.status === 200) {
      setMessages((prev) => prev.filter((item) => item._id !== id));
      if (expandedMessageId === id) setExpandedMessageId(null);
    } else {
      alert(response?.error || 'Failed to delete message.');
    }
  };

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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString();
  };

  const newCount = messages.filter((m) => m.status === 'new').length;
  const pendingBookings = bookings.filter((b) => b.bookingStatus === 'pending').length;

  if (!user) return null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #050505 0%, #111118 55%, #1a1a22 100%)',
        fontFamily: "'Inter', sans-serif",
        padding: '140px 20px 40px',
        color: '#fff',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px',
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '18px',
            padding: '22px 28px',
          }}
        >
          <div>
            <h1
              style={{
                margin: '0 0 4px',
                fontSize: '24px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #f093fb, #f5576c)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Admin Dashboard
            </h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              Welcome, {user.username} • {user.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px',
              color: '#f3f3f3',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Logout
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          {[
            { label: 'New Messages', value: String(newCount), icon: '✉', color: '#eeb012' },
            { label: 'Total Bookings', value: String(bookings.length), icon: '🚗', color: '#667eea' },
            { label: 'Pending Bookings', value: String(pendingBookings), icon: '⏳', color: '#f5576c' },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
              <div
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '12px',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {item.label}
              </div>
              <div style={{ color: item.color, fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...sectionCardStyle, marginBottom: '32px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h3 style={{ color: '#fff', margin: '0 0 6px', fontSize: '20px' }}>Messages</h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '14px' }}>
                Contact form submissions from the Help section
              </p>
            </div>
            <button type="button" onClick={fetchMessages} style={refreshBtnStyle}>
              Refresh
            </button>
          </div>

          {messagesLoading && (
            <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', margin: '24px 0' }}>
              Loading messages...
            </p>
          )}

          {messagesError && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '10px',
                background: 'rgba(245, 87, 108, 0.12)',
                border: '1px solid rgba(245, 87, 108, 0.35)',
                color: '#f5576c',
                marginBottom: '16px',
              }}
            >
              {messagesError}
            </div>
          )}

          {!messagesLoading && !messagesError && messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
              <p style={{ margin: 0 }}>No messages yet. Submissions from the contact page will appear here.</p>
            </div>
          )}

          {!messagesLoading && messages.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.map((msg) => {
                const isExpanded = expandedMessageId === msg._id;
                return (
                  <div
                    key={msg._id}
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      border: `1px solid ${msg.status === 'new' ? 'rgba(238, 176, 18, 0.35)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '12px',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleMessage(msg)}
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
                          <span style={{ fontWeight: '700', fontSize: '15px' }}>{msg.name}</span>
                          {msg.status === 'new' && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                padding: '3px 8px',
                                borderRadius: '20px',
                                background: 'rgba(238, 176, 18, 0.2)',
                                color: '#eeb012',
                              }}
                            >
                              New
                            </span>
                          )}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px' }}>
                          {msg.subject}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '4px' }}>
                          {formatDate(msg.createdAt)}
                        </div>
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '18px' }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </button>

                    {isExpanded && (
                      <div
                        style={{
                          padding: '0 20px 20px',
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '12px',
                            marginTop: '16px',
                            marginBottom: '16px',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>Email</div>
                            <div style={{ fontSize: '14px', wordBreak: 'break-all' }}>{msg.email}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>Phone</div>
                            <div style={{ fontSize: '14px' }}>{msg.phone || '—'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>Subject</div>
                            <div style={{ fontSize: '14px' }}>{msg.subject}</div>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '8px' }}>Message</div>
                          <p
                            style={{
                              margin: 0,
                              padding: '14px',
                              borderRadius: '8px',
                              background: 'rgba(255,255,255,0.04)',
                              color: 'rgba(255,255,255,0.85)',
                              lineHeight: '1.7',
                              whiteSpace: 'pre-wrap',
                              fontSize: '14px',
                            }}
                          >
                            {msg.message}
                          </p>
                        </div>
                        <div style={{ marginTop: '16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg._id)}
                            style={{
                              padding: '8px 16px',
                              background: 'rgba(245, 87, 108, 0.12)',
                              border: '1px solid rgba(245, 87, 108, 0.35)',
                              borderRadius: '8px',
                              color: '#f5576c',
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

        <div style={sectionCardStyle}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h3 style={{ color: '#fff', margin: '0 0 6px', fontSize: '20px' }}>Bookings</h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '14px' }}>
                Reservation details from the booking form
              </p>
            </div>
            <button type="button" onClick={fetchBookings} style={refreshBtnStyle}>
              Refresh
            </button>
          </div>

          {bookingsLoading && (
            <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', margin: '24px 0' }}>
              Loading bookings...
            </p>
          )}

          {bookingsError && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '10px',
                background: 'rgba(245, 87, 108, 0.12)',
                border: '1px solid rgba(245, 87, 108, 0.35)',
                color: '#f5576c',
                marginBottom: '16px',
              }}
            >
              {bookingsError}
            </div>
          )}

          {!bookingsLoading && !bookingsError && bookings.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚗</div>
              <p style={{ margin: 0 }}>No bookings yet. Submissions from the booking page will appear here.</p>
            </div>
          )}

          {!bookingsLoading && bookings.length > 0 && (
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
                      border: `1px solid ${status === 'pending' ? 'rgba(102, 126, 234, 0.35)' : 'rgba(255,255,255,0.08)'}`,
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
                          <span style={{ fontWeight: '700', fontSize: '15px' }}>{booking.name}</span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              padding: '3px 8px',
                              borderRadius: '20px',
                              background: `${STATUS_COLORS[status] || '#eeb012'}22`,
                              color: STATUS_COLORS[status] || '#eeb012',
                            }}
                          >
                            {status}
                          </span>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px' }}>
                          {booking.vehicle} • {SERVICE_LABELS[booking.serviceType] || booking.serviceType}
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
                          <DetailField label="Customer Name" value={booking.name} />
                          <DetailField label="Car / Vehicle" value={booking.vehicle} />
                          <DetailField label="Service Type" value={SERVICE_LABELS[booking.serviceType] || booking.serviceType} />
                          <DetailField label="Mobile" value={booking.mobile} />
                          <DetailField label="Email" value={booking.email} />
                          <DetailField label="Status" value={status} />
                          {eventLabel && <DetailField label="Event" value={eventLabel} />}
                          {booking.flightNumber && <DetailField label="Flight Number" value={booking.flightNumber} />}
                          <DetailField label="Date & Time" value={formatDate(booking.arrivalDateTime)} />
                          <DetailField label="Pick-up Location" value={booking.pickupLocation} />
                          {booking.otherPickupLocation && (
                            <DetailField label="Other Pick-up" value={booking.otherPickupLocation} />
                          )}
                          <DetailField label="Drop-off Location" value={booking.dropoffLocation} />
                          {booking.serviceType === 'hourly' && (
                            <DetailField label="Hours" value={booking.hours} />
                          )}
                          <DetailField label="Booked On" value={formatDate(booking.createdAt)} />
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
                              color: '#f5576c',
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
    </div>
  );
}

export default Admin;
