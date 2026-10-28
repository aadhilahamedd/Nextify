import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
const logo = '/images/logo.webp';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();
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
    <div className="site-header-bar">
      <Navbar
        expand={isAdmin ? 'xl' : 'lg'}
        variant="dark"
        expanded={expanded}
        onToggle={setExpanded}
        className={`main-navbar ${isLogin ? 'login-navbar' : ''} ${isAdmin ? 'admin-session-navbar' : ''}`}
      >
        <Container className="main-navbar-container">
          <Navbar.Brand as={Link} to="/" onClick={closeMenu} className="border-0 text-decoration-none shadow-none me-auto" style={{ outline: "none" }}>
            <img src={logo} alt={t('nav.logoAlt')} className="navbar-logo" style={{ border: 'none', outline: 'none' }}/>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" style={{ borderColor: 'rgba(255,255,255,0.18)', background: 'transparent' }} />
          <Navbar.Collapse id="basic-navbar-nav" className="main-navbar-collapse justify-content-lg-end">
            <Nav className={`main-navbar-nav flex-column align-items-start py-3 ${isAdmin ? 'flex-xl-row align-items-xl-center py-xl-0' : 'flex-lg-row gap-2 gap-lg-3 align-items-lg-center py-lg-0'}`}>
              <Nav.Link as={Link} to="/" onClick={closeMenu} className="nav-hover-link text-decoration-none border-0">{t('nav.home')}</Nav.Link>
              <Nav.Link as={Link} to="/about" onClick={closeMenu} className="nav-hover-link text-decoration-none border-0">{t('nav.about')}</Nav.Link>
              <Nav.Link as={Link} to="/carlist" onClick={closeMenu} className="nav-hover-link text-decoration-none border-0">{t('nav.cars')}</Nav.Link>
              <Nav.Link as={Link} to="/booking" onClick={closeMenu} className="nav-hover-link text-decoration-none border-0">{t('nav.book')}</Nav.Link>
              <Nav.Link as={Link} to="/track-booking" onClick={closeMenu} className="nav-hover-link text-decoration-none border-0">{t('nav.track')}</Nav.Link>
              <Nav.Link as={Link} to="/contact" onClick={closeMenu} className="nav-hover-link text-decoration-none border-0">{t('nav.contact')}</Nav.Link>
              <Nav.Link as={Link} to="/qr" onClick={closeMenu} className="nav-hover-link text-decoration-none border-0">{t('nav.qr')}</Nav.Link>
              {isAdmin && (
                <div className="header-admin-actions d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center gap-2">
                  <Link
                    to="/admin"
                    onClick={closeMenu}
                    className="header-admin-pill text-decoration-none"
                  >
                    {t('nav.admin')}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn text-white rounded-pill px-3 py-2"
                    style={{ border: '1px solid rgba(255,255,255,0.18)', backgroundColor: 'transparent' }}
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              )}
              <div className="header-end-actions">
                <div className={`lang-switch ${lang === 'ar' ? 'is-ar' : 'is-en'}`} role="group" aria-label="Language">
                  <button type="button" className={lang === 'en' ? 'is-active' : ''} onClick={() => { setLang('en'); closeMenu(); }}>
                    EN
                  </button>
                  <button type="button" className={lang === 'ar' ? 'is-active' : ''} onClick={() => { setLang('ar'); closeMenu(); }}>
                    AR
                  </button>
                </div>
                {!isAdmin && !isLogin && (
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="nav-login-icon"
                    aria-label={t('nav.login')}
                    title={t('nav.login')}
                  >
                    <i className="bi bi-box-arrow-in-right" aria-hidden="true"></i>
                  </Link>
                )}
              </div>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </div>
  )
}

export default Header
