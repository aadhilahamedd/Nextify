import React from 'react'
const logo = '/images/logo.webp';
import Container from 'react-bootstrap/Container';
import { Link } from 'react-router-dom';
import { COMPANY } from '../utils/company';
import { COMPANY_PHONE, getWhatsAppUrl } from '../utils/whatsapp';
import { useLanguage } from '../i18n/LanguageContext';

function Footer() {
  const { t, formatNumber } = useLanguage();
  const addressLines = [t('company.address1'), t('company.address2'), t('company.address3'), t('company.address4')];
  return (
    <footer className="py-5 text-white" style={{ backgroundColor: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <Container className="py-5">
        <div className="row g-5">
          <div className="col-lg-4 col-md-6">
            <div className="mb-4">
              <img src={logo} alt="Nextify Logo" style={{ height: '52px', width: 'auto', objectFit: 'contain' }} />
            </div>
            <p className="text-white-50 mt-3" style={{ lineHeight: '1.8', maxWidth: '300px' }}>
              {t('company.description')}
            </p>
            <div className="d-flex align-items-center gap-3 mt-4">
              <div className="d-flex align-items-center justify-content-center border border-secondary rounded-circle" style={{ width: '40px', height: '40px' }}>
                <i className="bi bi-telephone text-warning"></i>
              </div>
              <a href={`tel:${COMPANY.phonePrimaryDigits}`} className="fw-semibold text-white text-decoration-none ltr-num" dir="ltr">{COMPANY.phonePrimary}</a>
            </div>
          </div>

          <div className="col-lg-2 col-md-3">
            <h4 className="h6 text-uppercase fw-bold mb-4" style={{ letterSpacing: '2px', color: '#eeb012' }}>{t('footer.company')}</h4>
            <ul className="list-unstyled">
              <li className="mb-3"><Link to="/" className="text-white-50 text-decoration-none">{t('nav.home')}</Link></li>
              <li className="mb-3"><Link to="/about" className="text-white-50 text-decoration-none">{t('nav.about')}</Link></li>
              <li className="mb-3"><Link to="/carlist" className="text-white-50 text-decoration-none">{t('footer.fleet')}</Link></li>
              <li className="mb-3"><Link to="/contact" className="text-white-50 text-decoration-none">{t('footer.contact')}</Link></li>
            </ul>
          </div>

          <div className="col-lg-2 col-md-3">
            <h4 className="h6 text-uppercase fw-bold mb-4" style={{ letterSpacing: '2px', color: '#eeb012' }}>{t('footer.help')}</h4>
            <ul className="list-unstyled">
              <li className="mb-3"><Link to="/contact" className="text-white-50 text-decoration-none">{t('footer.support')}</Link></li>
              <li className="mb-3"><Link to={{ pathname: '/', hash: '#how-it-works' }} className="text-white-50 text-decoration-none">{t('footer.how')}</Link></li>
              <li className="mb-3"><Link to="/track-booking" className="text-white-50 text-decoration-none">{t('footer.track')}</Link></li>
              <li className="mb-3"><Link to="/qr" className="text-white-50 text-decoration-none">{t('footer.qr')}</Link></li>
              <li className="mb-3"><Link to="/privacy-policy" className="text-white-50 text-decoration-none">{t('footer.privacy')}</Link></li>
              <li className="mb-3"><Link to="/terms-and-conditions" className="text-white-50 text-decoration-none">{t('footer.terms')}</Link></li>
            </ul>
          </div>

          <div className="col-lg-4 col-md-12">
            <h4 className="h6 text-uppercase fw-bold mb-4" style={{ letterSpacing: '2px', color: '#eeb012' }}>{t('footer.contactInfo')}</h4>
            <div className="d-flex gap-3 mb-3">
              <i className="bi bi-clock text-warning"></i>
              <p className="text-white-50 small mb-0">{t('company.hours')}</p>
            </div>
            <div className="d-flex gap-3 mb-3">
              <i className="bi bi-envelope text-warning"></i>
              <a href={`mailto:${COMPANY.email}`} className="text-white-50 small mb-0 text-decoration-none">{COMPANY.email}</a>
            </div>
            <div className="d-flex gap-3 mb-3">
              <i className="bi bi-telephone text-warning"></i>
              <p className="text-white-50 small mb-0">
                <a href={`tel:${COMPANY.phonePrimaryDigits}`} className="text-white-50 text-decoration-none ltr-num" dir="ltr">{COMPANY.phonePrimary}</a>
                <br />
                <a href={`tel:${COMPANY.phoneLandline.replace(/\s/g, '')}`} className="text-white-50 text-decoration-none ltr-num" dir="ltr">{COMPANY.phoneLandline}</a>
              </p>
            </div>
            <div className="d-flex gap-3">
              <i className="bi bi-geo-alt text-warning"></i>
              <p className="text-white-50 small mb-0">
                {addressLines.map((line) => (
                  <React.Fragment key={line}>{line}<br /></React.Fragment>
                ))}
              </p>
            </div>
          </div>
        </div>

        <hr className="my-5" style={{ opacity: '0.05' }} />

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-4">
          <p className="text-white-50 small mb-0" style={{ letterSpacing: '1px' }}>© {formatNumber(new Date().getFullYear())} {t('footer.rights')}</p>
          <div className="d-flex flex-wrap justify-content-center gap-3 gap-md-4">
            <Link to="/privacy-policy" className="text-white-50 small text-decoration-none">{t('footer.privacy')}</Link>
            <Link to="/terms-and-conditions" className="text-white-50 small text-decoration-none">{t('footer.terms')}</Link>
          </div>
          <div className="d-flex gap-4">
            <a href={COMPANY.website} target="_blank" rel="noreferrer" className="text-white-50"><i className="bi bi-globe fs-5"></i></a>
            <a href={`mailto:${COMPANY.email}`} className="text-white-50"><i className="bi bi-envelope fs-5"></i></a>
            <a href={getWhatsAppUrl(COMPANY_PHONE, t('wa.help'))} target="_blank" rel="noreferrer" className="text-white-50" aria-label={t('footer.whatsapp')}><i className="bi bi-whatsapp fs-5"></i></a>
          </div>
        </div>
      </Container>
    </footer>
  )
}

export default Footer
