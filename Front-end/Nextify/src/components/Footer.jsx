import React from 'react'
const logo = '/images/logo.webp';
import Container from 'react-bootstrap/Container';
import { Link } from 'react-router-dom';
import { COMPANY } from '../utils/company';
import { COMPANY_PHONE, getWhatsAppUrl } from '../utils/whatsapp';
import { useLanguage } from '../i18n/LanguageContext';
import { ClockIcon, GlobeIcon, MailIcon, MapPinIcon, PhoneIcon } from './icons';

function Footer() {
  const { t, formatNumber } = useLanguage();
  const addressLines = [t('company.address1'), t('company.address2'), t('company.address3'), t('company.address4')];
  return (
    <footer className="site-footer text-white">
      <Container>
        <div className="site-footer-grid">
          <div className="site-footer-brand">
            <img src={logo} alt="Nextify Logo" className="site-footer-logo" />
            <p className="site-footer-copy">
              {t('company.description')}
            </p>
            <div className="site-footer-phone">
              <span className="site-footer-phone-icon">
                <PhoneIcon size={16} />
              </span>
              <a href={`tel:${COMPANY.phonePrimaryDigits}`} className="fw-semibold text-white text-decoration-none ltr-num" dir="ltr">{COMPANY.phonePrimary}</a>
            </div>
          </div>

          <div className="site-footer-col">
            <h4>{t('footer.company')}</h4>
            <ul className="list-unstyled mb-0">
              <li><Link to="/" className="text-white-50 text-decoration-none">{t('nav.home')}</Link></li>
              <li><Link to="/about" className="text-white-50 text-decoration-none">{t('nav.about')}</Link></li>
              <li><Link to="/carlist" className="text-white-50 text-decoration-none">{t('footer.fleet')}</Link></li>
              <li><Link to="/contact" className="text-white-50 text-decoration-none">{t('footer.contact')}</Link></li>
            </ul>
          </div>

          <div className="site-footer-col">
            <h4>{t('footer.help')}</h4>
            <ul className="list-unstyled mb-0">
              <li><Link to="/contact" className="text-white-50 text-decoration-none">{t('footer.support')}</Link></li>
              <li><Link to={{ pathname: '/', hash: '#how-it-works' }} className="text-white-50 text-decoration-none">{t('footer.how')}</Link></li>
              <li><Link to="/track-booking" className="text-white-50 text-decoration-none">{t('footer.track')}</Link></li>
              <li><Link to="/qr" className="text-white-50 text-decoration-none">{t('footer.qr')}</Link></li>
              <li><Link to="/privacy-policy" className="text-white-50 text-decoration-none">{t('footer.privacy')}</Link></li>
              <li><Link to="/terms-and-conditions" className="text-white-50 text-decoration-none">{t('footer.terms')}</Link></li>
            </ul>
          </div>

          <div className="site-footer-col site-footer-contact">
            <h4>{t('footer.contactInfo')}</h4>
            <div className="site-footer-contact-row">
              <ClockIcon size={16} />
              <p className="text-white-50 mb-0">{t('company.hours')}</p>
            </div>
            <div className="site-footer-contact-row">
              <MailIcon size={16} />
              <a href={`mailto:${COMPANY.email}`} className="text-white-50 mb-0 text-decoration-none">{COMPANY.email}</a>
            </div>
            <div className="site-footer-contact-row">
              <PhoneIcon size={16} />
              <p className="text-white-50 mb-0">
                <a href={`tel:${COMPANY.phonePrimaryDigits}`} className="text-white-50 text-decoration-none ltr-num" dir="ltr">{COMPANY.phonePrimary}</a>
                <br />
                <a href={`tel:${COMPANY.phoneLandline.replace(/\s/g, '')}`} className="text-white-50 text-decoration-none ltr-num" dir="ltr">{COMPANY.phoneLandline}</a>
              </p>
            </div>
            <div className="site-footer-contact-row">
              <MapPinIcon size={16} />
              <p className="text-white-50 mb-0">
                {addressLines.map((line) => (
                  <React.Fragment key={line}>{line}<br /></React.Fragment>
                ))}
              </p>
            </div>
          </div>
        </div>

        <hr className="site-footer-rule" />

        <div className="site-footer-bottom">
          <p className="site-footer-legal mb-0">© {formatNumber(new Date().getFullYear())} {t('footer.rights')}</p>
          <div className="site-footer-bottom-links">
            <Link to="/privacy-policy" className="text-white-50 text-decoration-none">{t('footer.privacy')}</Link>
            <Link to="/terms-and-conditions" className="text-white-50 text-decoration-none">{t('footer.terms')}</Link>
            <Link to="/contact" className="text-white-50 text-decoration-none">{t('footer.contact')}</Link>
          </div>
          <div className="site-footer-bottom-icons">
            <a href={COMPANY.website} target="_blank" rel="noreferrer" className="text-white-50"><GlobeIcon size={20} /></a>
            <a href={`mailto:${COMPANY.email}`} className="text-white-50"><MailIcon size={20} /></a>
            <a href={getWhatsAppUrl(COMPANY_PHONE, t('wa.help'))} target="_blank" rel="noreferrer" className="text-white-50" aria-label={t('footer.whatsapp')}>
              <i className="bi bi-whatsapp" />
            </a>
          </div>
        </div>
      </Container>
    </footer>
  )
}

export default Footer
