import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import logo from '../assets/Logo_Nextify_2.png';
import { Link } from 'react-router-dom';

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname === '/login';
  const isAdminPage = location.pathname === '/admin';

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (err) {
    user = null;
  }
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="position-absolute w-100 z-3" style={{ top: 0, left: 0, zIndex: 1100 }}>
      <Navbar
        expand="lg"
        variant="dark"
        className={`main-navbar ${isLogin || isAdminPage ? 'bg-black pt-2' : 'home-navbar pt-4'}`}
        style={{ borderBottom: isAdminPage ? '1px solid rgba(255,255,255,0.08)' : 'transparent', transition: 'background 0.25s ease' }}
      >
        <Container className="main-navbar-container">
          <Navbar.Brand as={Link} to="/" className="border-0 text-decoration-none shadow-none me-auto" style={{ outline: "none" }}>
            <img src={logo} alt="Nextify Logo" className="navbar-logo" style={{ border: 'none', outline: 'none' }}/>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" style={{ borderColor: 'rgba(255,255,255,0.18)', background: 'transparent' }} />
          <Navbar.Collapse id="basic-navbar-nav" className="main-navbar-collapse justify-content-lg-end">
            <Nav className="main-navbar-nav flex-column flex-lg-row gap-3 gap-lg-4 align-items-start align-items-lg-center py-3 py-lg-0">
              <Nav.Link as={Link} to="/" className="text-decoration-none border-0" style={{ color: '#cda274' }}>Home</Nav.Link>
              <Nav.Link as={Link} to="/about" className="text-decoration-none border-0 text-white">About Us</Nav.Link>
              <Nav.Link as={Link} to="/carlist" className="text-decoration-none border-0 text-white">Car List</Nav.Link>
              <Nav.Link as={Link} to="/contact" className="text-decoration-none border-0 text-white">Contact Us</Nav.Link>
              {isAdmin ? (
                <>
                  <span className="text-white" style={{ fontSize: '0.95rem', fontWeight: 600 }}>Hii, {user.username}</span>
                  <button
                    onClick={handleLogout}
                    className="btn text-white rounded-pill px-4 py-2"
                    style={{ border: '1px solid rgba(255,255,255,0.18)', backgroundColor: 'transparent' }}
                  >
                    Logout <i className="bi bi-box-arrow-right"></i>
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="btn text-white rounded-pill px-4 py-2 text-decoration-none"
                  style={{ border: '1px solid rgba(255,255,255,0.18)', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  Login <i className="bi bi-box-arrow-in-right"></i>
                </Link>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </div>
  )
}

export default Header