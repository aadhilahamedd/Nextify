import React, { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { getBookingStatsAPI, getBookingsAPI, getContactMessagesAPI, getPaymentsAPI } from '../../Services/allAPI';
import { getLocalContactMessages } from '../../utils/contactMessagesStorage';

export default function AdminDashboard() {
  const { user } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [newMessages, setNewMessages] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [paymentCount, setPaymentCount] = useState(0);

  const load = useCallback(async () => {
    const [statsRes, bookingsRes, messagesRes, paymentsRes] = await Promise.all([
      getBookingStatsAPI(),
      getBookingsAPI(),
      getContactMessagesAPI(),
      getPaymentsAPI(),
    ]);

    if (statsRes?.status === 200) setStats(statsRes.data?.stats || statsRes.data);

    const bookings = bookingsRes?.status === 200 ? bookingsRes.data || [] : [];
    setBookingCount(bookings.length);

    const serverMessages = messagesRes?.status === 200 ? messagesRes.data || [] : [];
    const localMessages = getLocalContactMessages();
    const localOnly = localMessages.filter(
      (local) => !serverMessages.some((server) => server._id === local._id)
    );
    const messages = [...serverMessages, ...localOnly];
    setNewMessages(messages.filter((m) => m.status === 'new').length);

    const payments = paymentsRes?.status === 200 ? paymentsRes.data?.payments || [] : [];
    setPaymentCount(payments.length);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingBookings = stats?.pendingBookings ?? 0;

  const cards = [
    { label: 'New Messages', value: String(newMessages), icon: '✉', color: '#eeb012', to: '/admin/messages' },
    { label: 'Total Bookings', value: String(stats?.totalBookings ?? bookingCount), icon: '🚗', color: '#667eea', to: '/admin/bookings' },
    { label: 'Pending', value: String(pendingBookings), icon: '⏳', color: '#f5576c', to: '/admin/bookings' },
    { label: 'Revenue (SAR)', value: String(stats?.totalRevenue ?? 0), icon: '💰', color: '#43e97b', to: '/admin/payments' },
    { label: 'Active Trips', value: String(stats?.activeTrips ?? 0), icon: '🛣', color: '#764ba2', to: '/admin/bookings' },
    { label: 'Payments', value: String(paymentCount), icon: '💳', color: '#c8a261', to: '/admin/payments' },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Welcome, {user.username} • {user.email}</p>
        </div>
      </div>

      <div className="admin-stat-grid">
        {cards.map((item) => (
          <Link key={item.label} to={item.to} className="admin-stat-card">
            <div className="icon">{item.icon}</div>
            <div className="label">{item.label}</div>
            <div className="value" style={{ color: item.color }}>{item.value}</div>
          </Link>
        ))}
      </div>

      <div className="admin-quick-links">
        <Link to="/admin/messages" className="admin-quick-link">
          <strong>Messages</strong>
          <span>Contact form submissions from Help</span>
        </Link>
        <Link to="/admin/bookings" className="admin-quick-link">
          <strong>Bookings</strong>
          <span>Reservations, status, and driver assignment</span>
        </Link>
        <Link to="/admin/pricing" className="admin-quick-link">
          <strong>Pricing Management</strong>
          <span>Rate sheet rules by service and vehicle</span>
        </Link>
        <Link to="/admin/drivers" className="admin-quick-link">
          <strong>Drivers</strong>
          <span>Chauffeur roster and availability</span>
        </Link>
        <Link to="/admin/payments" className="admin-quick-link">
          <strong>Recent Payments</strong>
          <span>Mock checkout records and payment status</span>
        </Link>
      </div>
    </div>
  );
}
