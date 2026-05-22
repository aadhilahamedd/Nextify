import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in and is admin
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
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #050505 0%, #111118 55%, #1a1a22 100%)',
      fontFamily: "'Inter', sans-serif",
      padding: '140px 20px 40px',
      color: '#fff'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '18px',
          padding: '22px 28px'
        }}>
          <div>
            <h1 style={{
              margin: '0 0 4px',
              fontSize: '24px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #f093fb, #f5576c)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Admin Dashboard
            </h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              Welcome, {user.username} • {user.email}
            </p>
          </div>
          <button onClick={handleLogout} style={{
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px',
            color: '#f3f3f3',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            transition: 'all 0.2s ease'
          }}>
            Logout
          </button>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          {[
            { label: 'Role', value: 'Administrator', icon: '🛡', color: '#f5576c' },
            { label: 'Status', value: 'Active', icon: '✓', color: '#43e97b' },
            { label: 'Access Level', value: 'Full', icon: '🔐', color: '#667eea' }
          ].map((item, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
              <div style={{ color: item.color, fontSize: '18px', fontWeight: '700', marginTop: '4px' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Content area */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '28px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.4)'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
          <h3 style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 8px' }}>Admin Panel Ready</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Manage bookings, users, and system settings from here.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Admin;
