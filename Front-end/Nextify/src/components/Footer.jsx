import React from 'react'
const logo = '/images/logo.webp';
import Container from 'react-bootstrap/Container';
import { Link } from 'react-router-dom';
import { COMPANY } from '../utils/company';
import { COMPANY_PHONE } from '../utils/whatsapp';

function Footer() {
  return (
    <footer className="py-5 text-white" style={{ backgroundColor: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <Container className="py-5">
        <div className="row g-5">
          <div className="col-lg-4 col-md-6">
            <div className="mb-4">
              <img src={logo} alt="Nextify Logo" style={{ height: '45px', objectFit: 'contain' }} />
            </div>
            <p className="text-white-50 mt-3" style={{ lineHeight: '1.8', maxWidth: '300px' }}>
              {COMPANY.description}
            </p>
            <div className="d-flex align-items-center gap-3 mt-4">
              <div className="d-flex align-items-center justify-content-center border border-secondary rounded-circle" style={{ width: '40px', height: '40px' }}>
                <i className="bi bi-telephone text-warning"></i>
              </div>
              <a href={`tel:${COMPANY.phonePrimaryDigits}`} className="fw-semibold text-white text-decoration-none">{COMPANY_PHONE}</a>
            </div>
          </div>

          <div className="col-lg-2 col-md-3">
            <h4 className="h6 text-uppercase fw-bold mb-4" style={{ letterSpacing: '2px', color: '#eeb012' }}>Company</h4>
            <ul className="list-unstyled">
              <li className="mb-3"><Link to="/" className="text-white-50 text-decoration-none">Home</Link></li>
              <li className="mb-3"><Link to="/about" className="text-white-50 text-decoration-none">About Us</Link></li>
              <li className="mb-3"><Link to="/carlist" className="text-white-50 text-decoration-none">Fleet</Link></li>
              <li className="mb-3"><Link to="/contact" className="text-white-50 text-decoration-none">Contact</Link></li>
            </ul>
          </div>

          <div className="col-lg-2 col-md-3">
            <h4 className="h6 text-uppercase fw-bold mb-4" style={{ letterSpacing: '2px', color: '#eeb012' }}>Help</h4>
            <ul className="list-unstyled">
              <li className="mb-3"><Link to="/contact" className="text-white-50 text-decoration-none">Customer support</Link></li>
              <li className="mb-3"><Link to="/booking" className="text-white-50 text-decoration-none">How It Works</Link></li>
              <li className="mb-3"><Link to="/track-booking" className="text-white-50 text-decoration-none">Track Booking</Link></li>
              <li className="mb-3"><Link to="/contact" className="text-white-50 text-decoration-none">Privacy Policy</Link></li>
            </ul>
          </div>

          <div className="col-lg-4 col-md-12">
            <h4 className="h6 text-uppercase fw-bold mb-4" style={{ letterSpacing: '2px', color: '#eeb012' }}>Contact Info</h4>
            <div className="d-flex gap-3 mb-3">
              <i className="bi bi-clock text-warning"></i>
              <p className="text-white-50 small mb-0">{COMPANY.hours}</p>
            </div>
            <div className="d-flex gap-3 mb-3">
              <i className="bi bi-envelope text-warning"></i>
              <a href={`mailto:${COMPANY.email}`} className="text-white-50 small mb-0 text-decoration-none">{COMPANY.email}</a>
            </div>
            <div className="d-flex gap-3 mb-3">
              <i className="bi bi-telephone text-warning"></i>
              <p className="text-white-50 small mb-0">
                {COMPANY.phonePrimary}<br />
                {COMPANY.phoneSecondary}<br />
                {COMPANY.phoneLandline}
              </p>
            </div>
            <div className="d-flex gap-3">
              <i className="bi bi-geo-alt text-warning"></i>
              <p className="text-white-50 small mb-0">
                {COMPANY.addressLines.map((line) => (
                  <React.Fragment key={line}>{line}<br /></React.Fragment>
                ))}
              </p>
            </div>
          </div>
        </div>

        <hr className="my-5" style={{ opacity: '0.05' }} />

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-4">
          <p className="text-white-50 small mb-0" style={{ letterSpacing: '1px' }}>© {new Date().getFullYear()} NEXTIFY. ALL RIGHTS RESERVED.</p>
          <div className="d-flex gap-4">
            <a href={COMPANY.website} target="_blank" rel="noreferrer" className="text-white-50"><i className="bi bi-globe fs-5"></i></a>
            <a href={`mailto:${COMPANY.email}`} className="text-white-50"><i className="bi bi-envelope fs-5"></i></a>
            <a href={`tel:${COMPANY.phonePrimaryDigits}`} className="text-white-50"><i className="bi bi-telephone fs-5"></i></a>
          </div>
        </div>
      </Container>
    </footer>
  )
}

export default Footer
