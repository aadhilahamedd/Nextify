import React from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import { COMPANY } from '../utils/company'
import { useLanguage } from '../i18n/LanguageContext'

function About() {
  const { t, formatNumber } = useLanguage()
  const years = new Date().getFullYear() - COMPANY.foundedYear
  return (
    <div style={{ backgroundColor: '#0a0a0a', color: 'white', minHeight: '100vh', paddingTop: '140px', paddingBottom: '80px' }}>
      <Container>
        <div className="row align-items-center g-4 mb-5">
          <div className="col-lg-7 text-start">
            <p className="text-uppercase fw-semibold mb-2" style={{ color: '#eeb012', letterSpacing: '3px', fontSize: '0.8rem' }}>
              {t('about.kicker')}
            </p>
            <h2 className="h1 fw-normal mb-4" style={{ fontFamily: 'Georgia, serif', color: '#fff' }}>
              {t('about.title')}
            </h2>
            <p className="mb-4" style={{ color: '#bfbfbf', lineHeight: 1.8, maxWidth: '540px' }}>
              {t('about.intro', { year: formatNumber(COMPANY.foundedYear), founder: COMPANY.founder })}
            </p>
            <p className="mb-0 small" style={{ color: '#888', maxWidth: '540px' }}>
              {t('about.tgaLine')}
            </p>
          </div>
          <div className="col-lg-5 d-flex justify-content-lg-end justify-content-center">
            <img
              src="/images/about-mark.webp"
              alt="Nextify Limo Service"
              style={{
                display: 'block',
                width: 240,
                height: 240,
                objectFit: 'contain',
                flexShrink: 0,
                background: 'transparent',
                borderRadius: '50%',
              }}
            />
          </div>
        </div>

        <Row className="g-4 mb-5">
          {[
            {
              title: t('about.fleet'),
              description: t('about.fleetText'),
              icon: 'bi-car-front-fill'
            },
            {
              title: t('about.drivers'),
              description: t('about.driversText'),
              icon: 'bi-people-fill'
            },
            {
              title: t('about.flexible'),
              description: t('about.flexibleText'),
              icon: 'bi-clock-fill'
            },
            {
              title: t('about.support'),
              description: t('about.supportText'),
              icon: 'bi-headset'
            }
          ].map((item, index) => (
            <Col key={index} md={6} lg={3}>
              <div className="p-4 rounded-4 h-100" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="mb-4 d-flex align-items-center justify-content-center rounded-circle" style={{ width: '62px', height: '62px', backgroundColor: '#0f0f0f' }}>
                  <i className={`bi ${item.icon} fs-3`} style={{ color: '#eeb012' }}></i>
                </div>
                <h3 className="h5 mb-3" style={{ color: '#fff', fontFamily: 'Georgia, serif' }}>{item.title}</h3>
                <p className="mb-0" style={{ color: '#bfbfbf', lineHeight: '1.8' }}>{item.description}</p>
              </div>
            </Col>
          ))}
        </Row>

        <div className="row align-items-center g-5">
          <Col lg={6}>
            <div className="p-5 rounded-4" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="mb-4" style={{ fontFamily: 'Georgia, serif', color: '#fff' }}>{t('about.mission')}</h3>
              <p style={{ color: '#bfbfbf', lineHeight: '1.8' }}>
                {t('about.mission1')}
              </p>
              <p style={{ color: '#bfbfbf', lineHeight: '1.8' }}>
                {t('about.mission2', { founder: COMPANY.founder, year: formatNumber(COMPANY.foundedYear), place: t('company.addressShort') })}
              </p>
            </div>
          </Col>
          <Col lg={6}>
            <div className="row g-4">
              {[
                { label: t('about.years'), value: `${formatNumber(years)}+`, color: '#eeb012' },
                { label: t('about.vehicles'), value: `${formatNumber(15)}+`, color: '#fff' },
                { label: t('about.clients'), value: `${formatNumber(34)}K+`, color: '#fff' },
                { label: t('about.available'), value: t('about.yes'), color: '#fff' }
              ].map((item, index) => (
                <div key={index} className="col-6">
                  <div className="p-4 rounded-4 h-100" style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="mb-2 text-uppercase fw-semibold" style={{ letterSpacing: '1px', color: '#a0a0a0', fontSize: '0.75rem' }}>{item.label}</p>
                    <h3 className="mb-0" style={{ fontFamily: 'Georgia, serif', color: item.color, fontSize: '2.5rem' }}>{item.value}</h3>
                  </div>
                </div>
              ))}
            </div>
          </Col>
        </div>
      </Container>
    </div>
  )
}

export default About