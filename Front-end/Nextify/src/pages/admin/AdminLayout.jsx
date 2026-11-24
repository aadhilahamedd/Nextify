import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AUTH_SESSION_EVENT,
  clearSession,
  readStoredUser,
  readToken,
} from '../../utils/authSession';
import './AdminLayout.css';

const logo = '/images/logo.webp';

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/messages', label: 'Messages' },
  { to: '/admin/bookings', label: 'Bookings' },
  { to: '/admin/fleet', label: 'Fleet' },
  { to: '/admin/pricing', label: 'Pricing' },
  { to: '/admin/drivers', label: 'Drivers' },
  { to: '/admin/payments', label: 'Payments' },
];

function getValidAdminUser() {
  if (!readToken()) return null;
  const stored = readStoredUser();
  return stored?.role === 'admin' ? stored : null;
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(getValidAdminUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  const loggingOutRef = useRef(false);

  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    if (menuOpen) setMenuOpen(false);
  }

  useEffect(() => {
    const loginTarget = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;

    const redirectIfUnauthorized = () => {
      const token = readToken();
      const storedUser = readStoredUser();
      if (!token || !storedUser) {
        navigate(loginTarget, { replace: true });
        return null;
      }
      if (storedUser.role !== 'admin') {
        navigate('/', { replace: true });
        return null;
      }
      return storedUser;
    };

    redirectIfUnauthorized();

    const handleSessionChange = () => {
      if (loggingOutRef.current) return;
      setUser(redirectIfUnauthorized());
    };

    window.addEventListener(AUTH_SESSION_EVENT, handleSessionChange);
    window.addEventListener('storage', handleSessionChange);
    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, handleSessionChange);
      window.removeEventListener('storage', handleSessionChange);
    };
  }, [navigate, location.pathname, location.search]);

  const handleLogout = () => {
    loggingOutRef.current = true;
    clearSession();
    setUser(null);
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  return (
    <div className="admin-shell" dir="ltr">
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
