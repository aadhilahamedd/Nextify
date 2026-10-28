import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import { applyLocalCarImages, getCarImageUrl, getEliteCollectionCars, initialCars } from '../utils/carsStorage'
import { getCarsAPI } from '../Services/allAPI'
import ServiceRates from '../components/pricing/ServiceRates'
import ClientSection from '../components/ClientSection'
import AboutReviews from '../components/AboutReviews'
import { COMPANY } from '../utils/company'
import { COMPANY_PHONE, getWhatsAppUrl } from '../utils/whatsapp'
import { formatCarDayPriceForLang } from '../i18n/format'
import { useLanguage } from '../i18n/LanguageContext'

const HERO_IMAGE = '/images/hero/mercedes-s-class-premium.webp';
const HERO_IMAGE_MOBILE = '/images/hero/mercedes-s-class-premium-mobile.webp';

function CountUpStat({ value, suffix, formatNumber }) {
  const ref = useRef(null);
  const started = useRef(false);
  const [shown, setShown] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduceMotion) {
      setShown(value);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        observer.disconnect();
        const from = 1;
        const duration = 1600;
        const start = performance.now();
        const tick = (now) => {
          const progress = Math.min(1, (now - start) / duration);
          const eased = 1 - (1 - progress) ** 3;
          const next = Math.round(from + (value - from) * eased);
          setShown(next);
          if (progress < 1) requestAnimationFrame(tick);
          else setShown(value);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.45 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <h3 ref={ref} className="mb-3 stat-number" style={{ fontFamily: 'Georgia, serif', fontWeight: '400' }}>
      {formatNumber(shown)}{suffix}
    </h3>
  );
}

const brandLogos = [
  { name: 'Mercedes-Benz', src: '/images/brands/mercedes.webp' },
  { name: 'Lexus', src: '/images/brands/lexus.webp' },
  { name: 'Chevrolet', src: '/images/brands/chevrolet.webp' },
  { name: 'Toyota', src: '/images/brands/toyota.webp' },
  { name: 'Ford', src: '/images/brands/ford.webp' },
  { name: 'GMC', src: '/images/brands/gmc.webp' },
  { name: 'BMW', src: '/images/brands/bmw.webp' },
];

function Home() {
  const { t, lang, formatNumber } = useLanguage();
  const [dbCars, setDbCars] = useState(initialCars);

  useEffect(() => {
    const fetchCars = async () => {
      const response = await getCarsAPI();
      if (response && response.data && Array.isArray(response.data) && response.data.length) {
        setDbCars(applyLocalCarImages(response.data));
      }
    };
    fetchCars();
  }, []);

  const navigate = useNavigate()

  const handleEliteCarClick = (car) => {
    navigate('/cardetails', { state: { car } })
  }

  useEffect(() => {
    if (window.location.hash !== '#how-it-works') return;
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <>
      <div className="position-relative d-flex align-items-end hero-section">
        <img
          src={HERO_IMAGE}
          alt={t('hero.photoAlt')}
          className="position-absolute hero-photo hero-photo-desktop"
        />
        <img
          src={HERO_IMAGE_MOBILE}
          alt={t('hero.photoAlt')}
          className="position-absolute hero-photo hero-photo-mobile"
        />
        <div className="position-absolute w-100 h-100 hero-overlay" />

        <Container className="position-relative hero-copy">
          <p className="hero-kicker mb-2">{t('hero.kicker')}</p>
          <h1 className="hero-title mb-3">
            <span className="hero-title-thin">{t('hero.titleLine1')}</span>
            <span className="hero-title-thick">{t('hero.titleLine2')}</span>
          </h1>
          <p className="hero-desc hero-desc-desktop mb-4">
            {t('hero.desc')}
          </p>
          <p className="hero-desc hero-desc-mobile mb-3">
            {t('hero.descMobile')}
          </p>

          <div className="hero-pills">
            <div className="hero-pill">
              <i className="bi bi-star"></i>
              <div>
                <strong>{t('hero.cars')}</strong>
                <span>{t('hero.curated')}</span>
              </div>
            </div>
            <div className="hero-pill">
              <i className="bi bi-shield-check"></i>
              <div>
                <strong>{t('hero.insured')}</strong>
                <span>{t('hero.everyJourney')}</span>
              </div>
            </div>
            <div className="hero-pill">
              <i className="bi bi-headset"></i>
              <div>
                <strong>{t('hero.support')}</strong>
                <span>{t('hero.always')}</span>
              </div>
            </div>
            <div className="hero-pill">
              <i className="bi bi-clock"></i>
              <div>
                <strong>{t('hero.onTime')}</strong>
                <span>{t('hero.airportCity')}</span>
              </div>
            </div>
            <a
              href={getWhatsAppUrl(COMPANY_PHONE, t('hero.waMessage'))}
              target="_blank"
              rel="noreferrer"
              className="hero-pill hero-pill-link"
            >
              <i className="bi bi-whatsapp"></i>
              <div>
                <strong>{t('hero.whatsapp')}</strong>
                <span>{t('hero.instant')}</span>
              </div>
            </a>
          </div>

          <div className="hero-simple">
            <p className="hero-simple-meta mb-0">{t('hero.simpleMeta')}</p>
          </div>
        </Container>

        <div className="hero-simple-actions">
          <Link to="/carlist" className="hero-simple-btn">
            <span>{t('hero.seeCollection')}</span>
            <i className="bi bi-arrow-right"></i>
          </Link>
          <Link to="/booking" className="hero-simple-btn">
            <span>{t('hero.startReservation')}</span>
          </Link>
        </div>
      </div>

      {/* Brands Section */}
    <section className="py-5 overflow-hidden brands-section" style={{ backgroundColor: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <Container>
        <p className="mb-4 text-white fw-normal fs-5 brands-title" style={{ fontFamily: 'Georgia, serif' }}>{t('home.brands')}</p>
        <div className="position-relative overflow-hidden brands-slider" dir="ltr" style={{ padding: '20px 0' }}>
          <div
            className="d-flex align-items-center logo-slider-track"
            style={{ gap: '30px', width: 'max-content', animation: 'logo-slide 24s linear infinite' }}
          >
            {brandLogos.concat(brandLogos).map((brand, index) => (
              <div
                key={`${brand.name}-${index}`}
                className="d-flex align-items-center justify-content-center rounded-4 brand-logo-card"
                style={{
                  minWidth: '160px',
                  minHeight: '90px',
                  padding: '18px 24px',
                  backgroundColor: '#000000',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.12)'
                }}
              >
                <img
                  src={brand.src}
                  alt={brand.name}
                  className="brand-logo-img"
                  style={{ maxHeight: '55px', maxWidth: '100%', objectFit: 'contain', filter: 'brightness(1.1) contrast(1.2)' }}
                />
              </div>
            ))}
          </div>
        </div>
      </Container>
      <style>{`
        @keyframes logo-slide {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>

      {/* Collection Section */}
      <section id="collection" className="py-5" style={{ backgroundColor: '#0a0a0a', color: 'white' }}>
        <Container className="py-5">
          <div className="text-center mb-5">
            <p className="text-uppercase fw-semibold mb-2" style={{ color: '#a0a0a0', letterSpacing: '3px', fontSize: '0.8rem' }}>
              {t('home.explore')}
            </p>
            <h2 className="display-4 fw-normal mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              {t('home.elite')}
            </h2>
            <div style={{ width: '60px', height: '2px', backgroundColor: '#fff', margin: '0 auto' }}></div>
          </div>

          <div className="row g-4">
            {getEliteCollectionCars(dbCars).slice(0, 6).map((car, i) => (
              <div key={car.id || i} className="col-lg-4 col-md-6">
                <div
                  className="collection-card"
                  onClick={() => handleEliteCarClick(car)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleEliteCarClick(car);
                  }}
                >
                  {car.img && (
                    <img
                      src={getCarImageUrl(car.img)}
                      alt={car.name}
                      className="collection-card-img"
                      loading={i < 3 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                  )}
                  <div className="collection-card-overlay">
                    <p className="mb-1 text-uppercase collection-card-type">{car.type}</p>
                    <h3 className="h4 mb-3" style={{ fontFamily: 'Georgia, serif' }}>{car.name}</h3>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-bold" style={{ fontSize: '0.95rem' }}>{formatCarDayPriceForLang(car, lang) || car.price}</span>
                      <button
                        type="button"
                        className="lux-btn lux-btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleEliteCarClick(car); }}
                      >
                        {t('home.bookNow')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-5">
            <Link
              to="/carlist"
              className="lux-btn text-decoration-none"
              style={{ padding: '12px 36px', minWidth: '160px' }}
            >
              {t('home.more')}
              <i className="bi bi-arrow-right ms-2" />
            </Link>
          </div>
        </Container>
      </section>
      {/* Guarantee Section */}
    <section id="guarantee" className="py-5" style={{ backgroundColor: '#0a0a0a', color: 'white' }}>
      <Container className="py-5">
        <div className="row align-items-center g-5">
          <div className="col-lg-6">
            <div
              className="rounded-4 shadow-lg floating-image overflow-hidden"
              style={{ minHeight: '450px', width: '100%', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <img 
                src="/images/service.webp" 
                alt="Professional chauffeur opening luxury sedan door" 
                className="w-100 h-100"
                style={{
                  objectFit: 'cover',
                  objectPosition: 'center',
                  minHeight: '450px',
                  transform: 'scale(1.18)',
                  transformOrigin: 'center center',
                }}
              />
            </div>
          </div>
          <div className="col-lg-6 ps-lg-5">
            <div className="d-flex align-items-center gap-3 mb-3">
              <div style={{ width: '40px', height: '1px', backgroundColor: '#eeb012' }}></div>
              <span className="text-uppercase fw-bold" style={{ color: '#888', letterSpacing: '2px', fontSize: '0.75rem' }}>{t('home.drive')}</span>
            </div>
            <h2 className="display-4 mb-4" style={{ fontFamily: 'Georgia, serif', fontWeight: '400' }}>{t('home.guaranteeTitle')}</h2>
            <p className="mb-5" style={{ color: '#888', fontSize: '1rem', lineHeight: '1.6' }}>
              {t('home.guaranteeText')}
            </p>

            <div className="mb-5">
              <div className="d-flex align-items-center gap-4 mb-4">
                <div className="flex-shrink-0 d-flex align-items-center justify-content-center border border-secondary rounded-3" style={{ width: '50px', height: '50px' }}>
                  <i className="bi bi-check2-circle text-warning fs-4"></i>
                </div>
                <div>
                  <h4 className="h6 mb-1 text-white">{t('home.trusted')}</h4>
                  <p className="small mb-0 text-white-50">{t('home.trustedText')}</p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-4 mb-4">
                <div className="flex-shrink-0 d-flex align-items-center justify-content-center border border-secondary rounded-3" style={{ width: '50px', height: '50px' }}>
                  <i className="bi bi-geo-alt text-warning fs-4"></i>
                </div>
                <div>
                  <h4 className="h6 mb-1 text-white">{t('home.nationwide')}</h4>
                  <p className="small mb-0 text-white-50">{t('home.nationwideText')}</p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-4 mb-4">
                <div className="flex-shrink-0 d-flex align-items-center justify-content-center border border-secondary rounded-3" style={{ width: '50px', height: '50px' }}>
                  <i className="bi bi-currency-dollar text-warning fs-4"></i>
                </div>
                <div>
                  <h4 className="h6 mb-1 text-white">{t('home.refund')}</h4>
                  <p className="small mb-0 text-white-50">{t('home.refundText')}</p>
                </div>
              </div>
            </div>

            <button className="btn rounded-pill px-5 py-3 fw-bold border-0" style={{ backgroundColor: '#eefe31', color: '#000', fontSize: '0.9rem' }}>
              {t('home.experience')}
            </button>
          </div>
        </div>
      </Container>
    </section>

    <ServiceRates />

    <ClientSection />

    {/* About Section */}
      <section id="about" className="py-5" style={{ backgroundColor: '#0f0f0f', color: 'white' }}>
        <Container className="py-5">
          <div className="row g-5">
            <div className="col-lg-7">
              <div className="mb-5">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div style={{ width: '40px', height: '1px', backgroundColor: '#eeb012' }}></div>
                  <span className="text-uppercase fw-bold" style={{ color: '#888', letterSpacing: '2px', fontSize: '0.75rem' }}>{t('home.about')}</span>
                </div>
                <h2 className="display-4 mb-4" style={{ fontFamily: 'Georgia, serif', fontWeight: '400' }}>{t('home.essence')}</h2>
                <p style={{ color: '#888', fontSize: '1.1rem', maxWidth: '500px' }}>
                  {t('home.essenceText', { year: formatNumber(COMPANY.foundedYear), founder: COMPANY.founder })}
                </p>
                <div className="tga-license-card mt-4">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="bi bi-patch-check-fill" style={{ color: '#eeb012' }}></i>
                    <p className="text-uppercase small mb-0" style={{ color: '#eeb012', letterSpacing: 2, fontWeight: 700 }}>{t('home.tga')}</p>
                  </div>
                  <p className="mb-2" style={{ color: '#f3e6c4', fontSize: '0.95rem' }}>
                    {t('home.tgaText')}
                  </p>
                  <p className="tga-license-number mb-0">{COMPANY.tga.licenseNumber}</p>
                </div>
              </div>

              <div className="row g-4">
                <div className="col-md-6 mb-4">
                  <i className="bi bi-key fs-3 mb-3 d-block" style={{ color: '#eeb012' }}></i>
                  <h4 className="h5 mb-3" style={{ fontFamily: 'Georgia, serif' }}>{t('home.easy')}</h4>
                  <p className="small" style={{ color: '#777', lineHeight: '1.6' }}>
                    {t('home.easyText')}
                  </p>
                </div>
                <div className="col-md-6 mb-4">
                  <i className="bi bi-shield-check fs-3 mb-3 d-block" style={{ color: '#eeb012' }}></i>
                  <h4 className="h5 mb-3" style={{ fontFamily: 'Georgia, serif' }}>{t('home.protection')}</h4>
                  <p className="small" style={{ color: '#777', lineHeight: '1.6' }}>
                    {t('home.protectionText')}
                  </p>
                </div>
                <div className="col-md-6 mb-4">
                  <i className="bi bi-clock fs-3 mb-3 d-block" style={{ color: '#eeb012' }}></i>
                  <h4 className="h5 mb-3" style={{ fontFamily: 'Georgia, serif' }}>{t('home.onTime')}</h4>
                  <p className="small" style={{ color: '#777', lineHeight: '1.6' }}>
                    {t('home.onTimeText')}
                  </p>
                </div>
                <div className="col-md-6 mb-4">
                  <i className="bi bi-star fs-3 mb-3 d-block" style={{ color: '#eeb012' }}></i>
                  <h4 className="h5 mb-3" style={{ fontFamily: 'Georgia, serif' }}>{t('home.premium')}</h4>
                  <p className="small" style={{ color: '#777', lineHeight: '1.6' }}>
                    {t('home.premiumText')}
                  </p>
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="position-relative mb-4 rounded-4 shadow-lg overflow-hidden">
                <img
                  src="/images/hero/bmw-7-series.webp"
                  alt="Luxury Car Model"
                  className="img-fluid w-100"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center',
                    transform: 'scale(1.12)',
                    transformOrigin: 'center center',
                    display: 'block',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                  }}
                />
              </div>
              <AboutReviews />
            </div>
          </div>
        </Container>
      </section>

    {/* Events & Testimonial Section */}
    <section className="py-5" style={{ backgroundColor: '#000000', color: 'white' }}>
      <Container className="py-5">
        <div className="row mb-5 pb-5 align-items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="col-lg-5 pe-lg-5 mb-5 mb-lg-0">
            <div className="events-fleet-photo">
              <img
                src="/images/events-bulk-fleet.webp"
                alt="Nextify luxury SUVs and vans lined up for a bulk event"
              />
            </div>
          </div>

          <div className="col-lg-7 ps-lg-5">
            <div className="d-flex align-items-center gap-3 mb-4">
              <div style={{ width: '40px', height: '1px', backgroundColor: '#8a8940' }}></div>
              <span className="text-uppercase" style={{ color: '#777', letterSpacing: '2px', fontSize: '0.8rem' }}>{t('home.events')}</span>
            </div>
            <h2 className="mb-4 events-title" style={{ fontFamily: 'Georgia, serif', lineHeight: '1.1' }}>
              {t('home.eventsTitle')}
            </h2>
            <p className="mb-4" style={{ color: '#888', fontSize: '1.05rem', lineHeight: '1.6', maxWidth: '600px' }}>
              {t('home.eventsText')}
            </p>
            <Link to="/contact" className="btn rounded-pill px-4 py-2 mt-3 fw-medium border-0 text-decoration-none" style={{ backgroundColor: '#f0f424', color: '#000', fontSize: '0.95rem' }}>
              {t('home.contactUs')}
            </Link>
          </div>
        </div>

        {/* Statistics Row */}
        <div className="row text-center pt-2 stats-row">
          <div className="col-3">
            <CountUpStat value={34} suffix="K+" formatNumber={formatNumber} />
            <p className="mb-0 stat-label" style={{ color: '#777', fontSize: '1rem' }}>{t('home.happyClients')}</p>
          </div>
          <div className="col-3">
            <CountUpStat value={99} suffix="%" formatNumber={formatNumber} />
            <p className="mb-0 stat-label" style={{ color: '#777', fontSize: '1rem' }}>{t('home.accidentFree')}</p>
          </div>
          <div className="col-3">
            <CountUpStat value={15} suffix="+" formatNumber={formatNumber} />
            <p className="mb-0 stat-label" style={{ color: '#777', fontSize: '1rem' }}>{t('home.luxuryCars')}</p>
          </div>
          <div className="col-3">
            <CountUpStat value={100} suffix="%" formatNumber={formatNumber} />
            <p className="mb-0 stat-label" style={{ color: '#777', fontSize: '1rem' }}>{t('home.fullyInsured')}</p>
          </div>
        </div>
      </Container>
    </section>

    {/* How It Works + Concierge */}
    <section id="how-it-works" className="py-5 position-relative overflow-hidden" style={{ backgroundColor: '#0a0a0a', color: 'white' }}>
      <div
        className="position-absolute"
        style={{
          width: '520px',
          height: '520px',
          background: 'radial-gradient(circle, rgba(238,176,18,0.08) 0%, transparent 70%)',
          top: '-160px',
          right: '-120px',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />
      <Container className="py-5 position-relative">
        <div className="row align-items-end mb-5 g-4">
          <div className="col-lg-7">
            <div className="d-flex align-items-center gap-3 mb-3">
              <div style={{ width: '40px', height: '1px', backgroundColor: '#eeb012' }}></div>
              <span className="text-uppercase fw-bold" style={{ color: '#888', letterSpacing: '2px', fontSize: '0.75rem' }}>{t('home.how')}</span>
            </div>
            <h2 className="display-4 mb-3" style={{ fontFamily: 'Georgia, serif', fontWeight: 400 }}>
              {t('home.howTitle')}
            </h2>
            <p className="mb-0" style={{ color: '#888', lineHeight: 1.8, maxWidth: '620px' }}>
              {t('home.howText')}
            </p>
          </div>
          <div className="col-lg-5">
            <div className="rounded-4 p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-uppercase small mb-2" style={{ color: '#eeb012', letterSpacing: 2 }}>{t('home.coverage')}</p>
              <p className="mb-2" style={{ fontFamily: 'Georgia, serif', fontSize: '1.15rem' }}>
                {t('home.coverageCities')}
              </p>
              <p className="mb-0 small" style={{ color: '#777' }}>
                {t('company.hours')} · <span className="ltr-num" dir="ltr">{COMPANY.phonePrimary}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="row g-4 mb-5">
          {[
            { step: '01', icon: 'bi-sliders', title: t('home.step1'), text: t('home.step1Text') },
            { step: '02', icon: 'bi-geo-alt', title: t('home.step2'), text: t('home.step2Text') },
            { step: '03', icon: 'bi-shield-lock', title: t('home.step3'), text: t('home.step3Text') },
            { step: '04', icon: 'bi-person-badge', title: t('home.step4'), text: t('home.step4Text') },
          ].map((item) => (
            <div key={item.step} className="col-md-6 col-lg-3">
              <div
                className="h-100 p-4 rounded-4"
                style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <i className={`bi ${item.icon} fs-3`} style={{ color: '#eeb012' }} />
                  <span style={{ color: '#555', fontFamily: 'Georgia, serif', fontSize: '1.25rem' }}>{item.step}</span>
                </div>
                <h3 className="h5 mb-3" style={{ fontFamily: 'Georgia, serif' }}>{item.title}</h3>
                <p className="mb-0 small" style={{ color: '#888', lineHeight: 1.7 }}>{item.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div
          className="rounded-4 p-4 p-md-5 d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-4"
          style={{ background: 'linear-gradient(135deg, #14110b 0%, #0f0f0f 100%)', border: '1px solid rgba(238,176,18,0.22)' }}
        >
          <div>
            <p className="text-uppercase small mb-2" style={{ color: '#eeb012', letterSpacing: 2 }}>{t('home.ready')}</p>
            <h3 className="h3 mb-2" style={{ fontFamily: 'Georgia, serif' }}>{t('home.bookOrSpeak')}</h3>
            <p className="mb-0" style={{ color: '#888', maxWidth: '540px' }}>
              {t('home.readyText')}
            </p>
          </div>
          <div className="d-flex flex-wrap gap-3">
            <Link
              to="/booking"
              className="btn rounded-pill px-4 py-3 fw-semibold border-0 text-decoration-none"
              style={{ background: 'linear-gradient(135deg, #a88448 0%, #c8a261 100%)', color: '#000' }}
            >
              {t('home.bookNow')}
            </Link>
            <a
              href={getWhatsAppUrl(COMPANY_PHONE, t('home.waHelp'))}
              target="_blank"
              rel="noreferrer"
              className="btn rounded-pill px-4 py-3 fw-semibold text-decoration-none"
              style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              {t('hero.whatsapp')}
            </a>
            <Link
              to="/track-booking"
              className="btn rounded-pill px-4 py-3 fw-semibold text-decoration-none"
              style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              {t('home.track')}
            </Link>
          </div>
        </div>
      </Container>
    </section>


    </>
  )
}

export default Home
