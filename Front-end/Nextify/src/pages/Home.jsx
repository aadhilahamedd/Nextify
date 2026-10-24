import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import { applyLocalCarImages, getCarImageUrl, getEliteCollectionCars, initialCars } from '../utils/carsStorage'
import { getCarsAPI } from '../Services/allAPI'
import ServiceRates from '../components/pricing/ServiceRates'
import ClientSection from '../components/ClientSection'
import AboutReviews from '../components/AboutReviews'
import { COMPANY } from '../utils/company'
import { COMPANY_PHONE, getWhatsAppUrl } from '../utils/whatsapp'
import { formatCarDayPrice } from '../utils/currency'

const HERO_IMAGE = '/images/hero/mercedes-s-class-premium.jpg';
const HERO_IMAGE_MOBILE = '/images/hero/mercedes-s-class-premium-mobile.jpg';

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
          alt="Mercedes-Benz S-Class chauffeur car"
          className="position-absolute hero-photo hero-photo-desktop"
        />
        <img
          src={HERO_IMAGE_MOBILE}
          alt="Mercedes-Benz S-Class chauffeur car"
          className="position-absolute hero-photo hero-photo-mobile"
        />
        <div className="position-absolute w-100 h-100 hero-overlay" />

        <Container className="position-relative hero-copy">
          <p className="hero-kicker mb-2">Luxury chauffeur service</p>
          <h1 className="hero-title mb-3">Premium chauffeur in Saudi Arabia</h1>
          <p className="hero-desc hero-desc-desktop mb-4">
            Private airport transfers, city rides, and event transport with a professional chauffeur and a curated luxury fleet.
          </p>
          <p className="hero-desc hero-desc-mobile mb-3">
            Airport transfers, city rides, and event transport with a professional chauffeur.
          </p>

          <div className="hero-pills">
            <div className="hero-pill">
              <i className="bi bi-star"></i>
              <div>
                <strong>15+ luxury cars</strong>
                <span>Curated fleet</span>
              </div>
            </div>
            <div className="hero-pill">
              <i className="bi bi-shield-check"></i>
              <div>
                <strong>Fully insured</strong>
                <span>Every journey</span>
              </div>
            </div>
            <div className="hero-pill">
              <i className="bi bi-headset"></i>
              <div>
                <strong>24/7 support</strong>
                <span>Always available</span>
              </div>
            </div>
            <div className="hero-pill">
              <i className="bi bi-clock"></i>
              <div>
                <strong>On-time chauffeurs</strong>
                <span>Airport &amp; city</span>
              </div>
            </div>
            <a
              href={getWhatsAppUrl(COMPANY_PHONE, 'Hello Nextify, I would like to book a chauffeur.')}
              target="_blank"
              rel="noreferrer"
              className="hero-pill hero-pill-link"
            >
              <i className="bi bi-whatsapp"></i>
              <div>
                <strong>WhatsApp</strong>
                <span>Instant booking</span>
              </div>
            </a>
          </div>

          <div className="hero-simple">
            <p className="hero-simple-meta mb-0">15+ luxury cars · Fully insured · 24/7</p>
          </div>
        </Container>

        <div className="hero-simple-actions">
          <Link to="/carlist" className="hero-simple-btn">
            <span>See Our<br />Collection</span>
            <i className="bi bi-arrow-right"></i>
          </Link>
          <Link to="/booking" className="hero-simple-btn">
            <span>Start<br />Reservation</span>
          </Link>
          <a
            href={getWhatsAppUrl(COMPANY_PHONE, 'Hello Nextify, I would like to book a chauffeur.')}
            target="_blank"
            rel="noreferrer"
            className="hero-simple-wa"
            aria-label="WhatsApp Nextify"
          >
            <i className="bi bi-whatsapp"></i>
          </a>
        </div>
      </div>

      {/* Brands Section */}
    <section className="py-5 overflow-hidden brands-section" style={{ backgroundColor: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <Container>
        <p className="mb-4 text-white fw-normal fs-5 brands-title" style={{ fontFamily: 'Georgia, serif' }}>Our Premium Brands</p>
        <div className="position-relative overflow-hidden brands-slider" style={{ padding: '20px 0' }}>
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
              EXPLORE OUR FLEET
            </p>
            <h2 className="display-4 fw-normal mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              Our Elite Collection
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
                      <span className="fw-bold" style={{ fontSize: '0.95rem' }}>{formatCarDayPrice(car) || car.price}</span>
                      <button
                        type="button"
                        className="lux-btn lux-btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleEliteCarClick(car); }}
                      >
                        Book Now
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
              More
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
              <span className="text-uppercase fw-bold" style={{ color: '#888', letterSpacing: '2px', fontSize: '0.75rem' }}>DRIVE WITH DISTINCTION</span>
            </div>
            <h2 className="display-4 mb-4" style={{ fontFamily: 'Georgia, serif', fontWeight: '400' }}>Our Guarantee: Your Satisfaction</h2>
            <p className="mb-5" style={{ color: '#888', fontSize: '1rem', lineHeight: '1.6' }}>
              Nextify provides top-quality, fully insured cars for a hassle-free driving experience. If you're not happy with the drive, we ensure a full refund.
            </p>

            <div className="mb-5">
              <div className="d-flex align-items-center gap-4 mb-4">
                <div className="flex-shrink-0 d-flex align-items-center justify-content-center border border-secondary rounded-3" style={{ width: '50px', height: '50px' }}>
                  <i className="bi bi-check2-circle text-warning fs-4"></i>
                </div>
                <div>
                  <h4 className="h6 mb-1 text-white">Trusted Service</h4>
                  <p className="small mb-0 text-white-50">Proven excellence in premium car rentals</p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-4 mb-4">
                <div className="flex-shrink-0 d-flex align-items-center justify-content-center border border-secondary rounded-3" style={{ width: '50px', height: '50px' }}>
                  <i className="bi bi-geo-alt text-warning fs-4"></i>
                </div>
                <div>
                  <h4 className="h6 mb-1 text-white">Nationwide Reach</h4>
                  <p className="small mb-0 text-white-50">Wide network, serving all your travel needs</p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-4 mb-4">
                <div className="flex-shrink-0 d-flex align-items-center justify-content-center border border-secondary rounded-3" style={{ width: '50px', height: '50px' }}>
                  <i className="bi bi-currency-dollar text-warning fs-4"></i>
                </div>
                <div>
                  <h4 className="h6 mb-1 text-white">Money-Back Refund</h4>
                  <p className="small mb-0 text-white-50">Full refund guarantee if not satisfied</p>
                </div>
              </div>
            </div>

            <button className="btn rounded-pill px-5 py-3 fw-bold border-0" style={{ backgroundColor: '#eefe31', color: '#000', fontSize: '0.9rem' }}>
              Experience the Difference
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
                  <span className="text-uppercase fw-bold" style={{ color: '#888', letterSpacing: '2px', fontSize: '0.75rem' }}>ABOUT</span>
                </div>
                <h2 className="display-4 mb-4" style={{ fontFamily: 'Georgia, serif', fontWeight: '400' }}>The Essence of Nextify</h2>
                <p style={{ color: '#888', fontSize: '1.1rem', maxWidth: '500px' }}>
                  Redefining luxury travel in Saudi Arabia since {COMPANY.foundedYear}, founded by {COMPANY.founder}, with professional chauffeurs and unmatched reliability.
                </p>
                <div className="tga-license-card mt-4">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="bi bi-patch-check-fill" style={{ color: '#eeb012' }}></i>
                    <p className="text-uppercase small mb-0" style={{ color: '#eeb012', letterSpacing: 2, fontWeight: 700 }}>TGA licensed</p>
                  </div>
                  <p className="mb-2" style={{ color: '#f3e6c4', fontSize: '0.95rem' }}>
                    Nextify is a TGA-approved, TGA-licensed company for private taxi transport in Saudi Arabia.
                  </p>
                  <p className="tga-license-number mb-2">{COMPANY.tga.licenseNumber}</p>
                  <p className="mb-1 small" style={{ color: '#d8c38a' }}>
                    {COMPANY.tga.licenseType} · Valid through {COMPANY.tga.expiresLabel}
                  </p>
                  <p className="mb-3 small" style={{ color: '#aaa' }}>
                    Company ID {COMPANY.tga.organizationId} · CR {COMPANY.tga.crNumber}
                  </p>
                  <a
                    href={encodeURI(COMPANY.tga.document)}
                    target="_blank"
                    rel="noreferrer"
                    className="tga-license-link"
                  >
                    View TGA license
                  </a>
                </div>
              </div>

              <div className="row g-4">
                <div className="col-md-6 mb-4">
                  <i className="bi bi-key fs-3 mb-3 d-block" style={{ color: '#eeb012' }}></i>
                  <h4 className="h5 mb-3" style={{ fontFamily: 'Georgia, serif' }}>Easy Access</h4>
                  <p className="small" style={{ color: '#777', lineHeight: '1.6' }}>
                    Booking your dream luxury car is now simpler than ever. Our intuitive platform allows you to reserve premium vehicles with just a few clicks, ready for you when you arrive.
                  </p>
                </div>
                <div className="col-md-6 mb-4">
                  <i className="bi bi-shield-check fs-3 mb-3 d-block" style={{ color: '#eeb012' }}></i>
                  <h4 className="h5 mb-3" style={{ fontFamily: 'Georgia, serif' }}>Total Protection</h4>
                  <p className="small" style={{ color: '#777', lineHeight: '1.6' }}>
                    Drive with absolute peace of mind. Our comprehensive insurance and 24/7 roadside assistance guarantee complete safety and support for you and your premium vehicle throughout the journey.
                  </p>
                </div>
                <div className="col-md-6 mb-4">
                  <i className="bi bi-clock fs-3 mb-3 d-block" style={{ color: '#eeb012' }}></i>
                  <h4 className="h5 mb-3" style={{ fontFamily: 'Georgia, serif' }}>On-Time Always</h4>
                  <p className="small" style={{ color: '#777', lineHeight: '1.6' }}>
                    Experience consistent excellence with every rental. Our commitment to premium quality ensures that your experience with us is flawlessly luxurious, every single time.
                  </p>
                </div>
                <div className="col-md-6 mb-4">
                  <i className="bi bi-star fs-3 mb-3 d-block" style={{ color: '#eeb012' }}></i>
                  <h4 className="h5 mb-3" style={{ fontFamily: 'Georgia, serif' }}>Premium Service</h4>
                  <p className="small" style={{ color: '#777', lineHeight: '1.6' }}>
                    Indulge in a personalized service experience tailored to your exquisite taste. From a pristine fleet to VIP support, we define luxury car rentals by exceeding your expectations.
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
                src="/images/events-bulk-fleet.jpg?v=2"
                alt="Nextify luxury SUVs and vans lined up for a bulk event"
              />
            </div>
          </div>

          <div className="col-lg-7 ps-lg-5">
            <div className="d-flex align-items-center gap-3 mb-4">
              <div style={{ width: '40px', height: '1px', backgroundColor: '#8a8940' }}></div>
              <span className="text-uppercase" style={{ color: '#777', letterSpacing: '2px', fontSize: '0.8rem' }}>EVENTS</span>
            </div>
            <h2 className="mb-4 events-title" style={{ fontFamily: 'Georgia, serif', lineHeight: '1.1' }}>
              Bulk Car Rentals for<br className="d-none d-md-inline" />Functions
            </h2>
            <p className="mb-4" style={{ color: '#888', fontSize: '1.05rem', lineHeight: '1.6', maxWidth: '600px' }}>
              Planning large-scale celebrations? We provide bulk car rentals tailored for all your events, from weddings to corporate gatherings. Choose from our extensive fleet for seamless transport.
            </p>
            <Link to="/contact" className="btn rounded-pill px-4 py-2 mt-3 fw-medium border-0 text-decoration-none" style={{ backgroundColor: '#f0f424', color: '#000', fontSize: '0.95rem' }}>
              Contact Us
            </Link>
          </div>
        </div>

        {/* Statistics Row */}
        <div className="row text-center pt-2 stats-row">
          <div className="col-3">
            <h3 className="mb-3 stat-number" style={{ fontFamily: 'Georgia, serif', fontWeight: '400' }}>34K+</h3>
            <p className="mb-0 stat-label" style={{ color: '#777', fontSize: '1rem' }}>Happy Clients</p>
          </div>
          <div className="col-3">
            <h3 className="mb-3 stat-number" style={{ fontFamily: 'Georgia, serif', fontWeight: '400' }}>99%</h3>
            <p className="mb-0 stat-label" style={{ color: '#777', fontSize: '1rem' }}>Accident-Free Rentals</p>
          </div>
          <div className="col-3">
            <h3 className="mb-3 stat-number" style={{ fontFamily: 'Georgia, serif', fontWeight: '400' }}>15+</h3>
            <p className="mb-0 stat-label" style={{ color: '#777', fontSize: '1rem' }}>Luxury Cars</p>
          </div>
          <div className="col-3">
            <h3 className="mb-3 stat-number" style={{ fontFamily: 'Georgia, serif', fontWeight: '400' }}>100%</h3>
            <p className="mb-0 stat-label" style={{ color: '#777', fontSize: '1rem' }}>Fully Insured Vehicles</p>
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
              <span className="text-uppercase fw-bold" style={{ color: '#888', letterSpacing: '2px', fontSize: '0.75rem' }}>HOW IT WORKS</span>
            </div>
            <h2 className="display-4 mb-3" style={{ fontFamily: 'Georgia, serif', fontWeight: 400 }}>
              From request to chauffeur in four steps
            </h2>
            <p className="mb-0" style={{ color: '#888', lineHeight: 1.8, maxWidth: '620px' }}>
              Reservations now live on our secure booking page. Use this path to book, message us on WhatsApp, or track an existing chauffeur assignment.
            </p>
          </div>
          <div className="col-lg-5">
            <div className="rounded-4 p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-uppercase small mb-2" style={{ color: '#eeb012', letterSpacing: 2 }}>Coverage</p>
              <p className="mb-2" style={{ fontFamily: 'Georgia, serif', fontSize: '1.15rem' }}>
                Riyadh · Jeddah · Dammam · GCC
              </p>
              <p className="mb-0 small" style={{ color: '#777' }}>
                {COMPANY.hours} · {COMPANY.phonePrimary}
              </p>
            </div>
          </div>
        </div>

        <div className="row g-4 mb-5">
          {[
            { step: '01', icon: 'bi-sliders', title: 'Choose your service', text: 'Airport, city, chauffeur, intercity, or GCC transfer — pick the journey that matches your schedule.' },
            { step: '02', icon: 'bi-geo-alt', title: 'Confirm the details', text: 'Add pickup, drop-off, vehicle, and passenger information. Pricing is calculated securely by our backend.' },
            { step: '03', icon: 'bi-shield-lock', title: 'Secure checkout', text: 'Pay in SAR through our booking flow, or request a custom quote for events and multi-vehicle trips.' },
            { step: '04', icon: 'bi-person-badge', title: 'Meet your chauffeur', text: 'We assign a professional driver and premium vehicle. Track the reservation any time after checkout.' },
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
            <p className="text-uppercase small mb-2" style={{ color: '#eeb012', letterSpacing: 2 }}>Ready when you are</p>
            <h3 className="h3 mb-2" style={{ fontFamily: 'Georgia, serif' }}>Book online, or speak with our team</h3>
            <p className="mb-0" style={{ color: '#888', maxWidth: '540px' }}>
              Need a wedding, airport meet-and-greet, or last-minute transfer? Start a reservation or message us on WhatsApp.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-3">
            <Link
              to="/booking"
              className="btn rounded-pill px-4 py-3 fw-semibold border-0 text-decoration-none"
              style={{ background: 'linear-gradient(135deg, #a88448 0%, #c8a261 100%)', color: '#000' }}
            >
              Book Now
            </Link>
            <a
              href={getWhatsAppUrl(COMPANY_PHONE, 'Hello Nextify, I need help with a chauffeur reservation.')}
              target="_blank"
              rel="noreferrer"
              className="btn rounded-pill px-4 py-3 fw-semibold text-decoration-none"
              style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              WhatsApp
            </a>
            <Link
              to="/track-booking"
              className="btn rounded-pill px-4 py-3 fw-semibold text-decoration-none"
              style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              Track Booking
            </Link>
          </div>
        </div>
      </Container>
    </section>


    </>
  )
}

export default Home
