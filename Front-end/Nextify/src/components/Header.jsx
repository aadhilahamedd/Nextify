import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
const logo = '/images/logo.webp';
import { Link } from 'react-router-dom';

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const isLogin = location.pathname === '/login';

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (err) {
    user = null;
  }
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    setExpanded(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('nav-open', expanded);
    return () => document.body.classList.remove('nav-open');
  }, [expanded]);

  const closeMenu = () => setExpanded(false);

  const handleLogout = () => {
    closeMenu();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div
      className={isLogin ? 'site-header-bar' : 'position-absolute w-100 z-3'}
      style={{ top: 0, left: 0, zIndex: 1100 }}
    >
      <Navbar
        expand="lg"
        variant="dark"
        expanded={expanded}
        onToggle={setExpanded}
        className={`main-navbar ${isLogin ? 'login-navbar' : 'home-navbar pt-4'}`}
      >
        <Container className="main-navbar-container">
          <Navbar.Brand as={Link} to="/" onClick={closeMenu} className="border-0 text-decoration-none shadow-none me-auto" style={{ outline: "none" }}>
            <img src={logo} alt="Nextify Logo" className="navbar-logo" style={{ border: 'none', outline: 'none' }}/>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" style={{ borderColor: 'rgba(255,255,255,0.18)', background: 'transparent' }} />
          <Navbar.Collapse id="basic-navbar-nav" className="main-navbar-collapse justify-content-lg-end">
            <Nav className="main-navbar-nav flex-column flex-lg-row gap-2 gap-lg-3 align-items-start align-items-lg-center py-3 py-lg-0">
              <Nav.Link as={Link} to="/" onClick={closeMenu} className="text-decoration-none border-0" style={{ color: '#cda274' }}>Home</Nav.Link>
              <Nav.Link as={Link} to="/about" onClick={closeMenu} className="text-decoration-none border-0 text-white">About Us</Nav.Link>
              <Nav.Link as={Link} to="/carlist" onClick={closeMenu} className="text-decoration-none border-0 text-white">Car List</Nav.Link>
              <Nav.Link as={Link} to="/booking" onClick={closeMenu} className="text-decoration-none border-0 text-white">Book Now</Nav.Link>
              <Nav.Link as={Link} to="/track-booking" onClick={closeMenu} className="text-decoration-none border-0 text-white">Track Booking</Nav.Link>
              <Nav.Link as={Link} to="/contact" onClick={closeMenu} className="text-decoration-none border-0 text-white">Contact Us</Nav.Link>
              {isAdmin ? (
                <div className="header-admin-actions d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center gap-2">
                  <Link
                    to="/admin"
                    onClick={closeMenu}
                    className="header-admin-pill text-decoration-none"
                  >
                    Admin
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn text-white rounded-pill px-3 py-2"
                    style={{ border: '1px solid rgba(255,255,255,0.18)', backgroundColor: 'transparent' }}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                !isLogin && (
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="btn text-white rounded-pill px-3 py-2 text-decoration-none"
                    style={{ border: '1px solid rgba(255,255,255,0.18)', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    Login <i className="bi bi-box-arrow-in-right"></i>
                  </Link>
                )
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </div>
  )
}

export default Header
