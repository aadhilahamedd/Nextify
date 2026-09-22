import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import './AdminLayout.css';

const logo = '/images/logo.webp';

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/messages', label: 'Messages' },
  { to: '/admin/bookings', label: 'Bookings' },
  { to: '/admin/pricing', label: 'Pricing Management' },
  { to: '/admin/drivers', label: 'Drivers' },
  { to: '/admin/payments', label: 'Recent Payments' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'admin') {
        navigate('/');
        return;
      }
      setUser(parsedUser);
    } catch {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="admin-shell">
      <header className={`admin-topbar${menuOpen ? ' open' : ''}`}>
        <div className="admin-topbar-inner">
          <NavLink to="/admin" className="admin-brand" end>
            <img src={logo} alt="Nextify" />
            <div className="admin-brand-meta">
              <span>Admin</span>
              <span>{user.username}</span>
            </div>
          </NavLink>

          <button
            type="button"
            className="admin-menu-toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>

          <nav className="admin-nav">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="admin-topbar-actions">
            <NavLink to="/" className="admin-topbar-btn ghost">
              View site
            </NavLink>
            <button type="button" className="admin-topbar-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="admin-content">
        <Outlet context={{ user }} />
      </main>
    </div>
  );
}
