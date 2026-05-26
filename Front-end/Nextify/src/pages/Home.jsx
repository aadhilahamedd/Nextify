import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import bmw7 from '../assets/bmw_7_series.png'
import benzS from '../assets/benz_s_class.png'
import lexusES from '../assets/lexus_es_350.png'
import guaranteeImg from '../assets/guarantee.png'
import mercedesLogo from '../assets/Brands/Mercedes-symbol.jpg'
import lexusLogo from '../assets/Brands/Lexus logo.jpg'
import chevroletLogo from '../assets/Brands/Chevrolet logo.jpg'
import toyotaLogo from '../assets/Brands/Toyota logo.jpg'
import fordLogo from '../assets/Brands/Ford logo.webp'
import gmcLogo from '../assets/Brands/GMC logo.jpg'
import bmwLogo from '../assets/Brands/BMWlogo.webp'

const backgrounds = [bmw7, benzS, lexusES];

function Home() {
  const [currentBg, setCurrentBg] = useState(0);
  const [prevBg, setPrevBg] = useState(-1);
  const [activeTab, setActiveTab] = useState('airport');
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    eventType: '',
    eventOther: '',
    flightNumber: '',
    arrivalDateTime: '',
    vehicle: '',
    pickupLocation: '',
    otherPickupLocation: '',
    dropoffLocation: '',
    hours: '5 HRS'
  });

  const vehicles = [
    "Mercedes-Benz Sprinter",
    "Lexus ES 350",
    "Chevrolet Impala",
    "Toyota Hiace",
    "Toyota Coaster",
    "Mercedes-Benz Coach Bus",
    "Mercedes-Benz V-Class",
    "Mercedes-Benz S-Class",
    "Ford Taurus",
    "GMC Yukon XL AT4",
    "BMW 7 Series",
    "BMW 5 Series",
    "Mercedes-Benz E-Class",
    "Mercedes-Benz eVito Tourer"
  ];

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    const eventInfo = formData.eventType ? `\nEvent: ${formData.eventType}${formData.eventType === 'Other' && formData.eventOther ? ` (${formData.eventOther})` : ''}` : '';
    alert(`Thank you for booking! Details:\nService: ${activeTab === 'airport' ? 'Airport Transfer' : activeTab === 'pointToPoint' ? 'Point to Point' : 'Hourly Service'}\nVehicle: ${formData.vehicle}\nName: ${formData.name}${eventInfo}`);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setPrevBg(currentBg);
      setCurrentBg((prev) => (prev + 1) % backgrounds.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [currentBg]);

  return (
    <>
      <div
        className="position-relative d-flex align-items-center"
        style={{
          height: '100vh',
          backgroundColor: '#0a0a0a',
          overflow: 'hidden'
        }}
      >
        {/* Background Images for perfectly smooth cross-fading */}
        {backgrounds.map((bg, index) => {
          const isActive = index === currentBg;

          return (
            <img
              key={index}
              src={bg}
              alt="Luxury Car"
              className="position-absolute"
              style={{
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                transition: 'opacity 2s ease-in-out, transform 6s linear',
                opacity: isActive ? 1 : 0,
                zIndex: isActive ? 2 : 1
              }}
            />
          );
        })}

        {/* Subtle dark overlay removed for brightness as requested */}
        <div className="position-absolute w-100 h-100" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', top: 0, left: 0, zIndex: 1 }}></div>

        <Container className="position-relative pt-5 mt-5" style={{ zIndex: 2 }}>
          <div className="row">
            <div className="col-lg-7 col-md-9 text-white">
              <p className="mb-3 fw-semibold" style={{ color: '#a0a0a0', letterSpacing: '2px', fontSize: '0.85rem' }}>
                ARRIVE IN STYLE
              </p>
              <h1 className="mb-4" style={{ fontFamily: 'Georgia, serif', fontSize: '4rem', lineHeight: '1.1' }}>
                Luxury Cars, First-Class<br />Experience
              </h1>
              <p className="mb-5" style={{ color: '#e0e0e0', fontSize: '1.15rem', maxWidth: '85%', lineHeight: '1.6' }}>
                Redefine your journey with Nextify. Experience a curated fleet of world-class vehicles paired with the personalized, first-class service you deserve.
              </p>
            </div>
          </div>
        </Container>

        {/* Bottom Buttons Row */}
        <div className="position-absolute bottom-0 w-100 d-flex flex-column flex-md-row" style={{ borderTop: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'transparent', zIndex: 10 }}>
          <Link to="/carlist" className="text-white text-decoration-none py-4 px-4 px-md-5 d-flex justify-content-between align-items-center w-100" style={{ borderRight: '1px solid rgba(255,255,255,0.2)' }}>
            <span className="fs-5">See Our Collection</span>
            <i className="bi bi-arrow-right fs-4"></i>
          </Link>
          <a href="#reservation" className="text-white text-decoration-none py-4 px-4 px-md-5 d-flex justify-content-between align-items-center w-100">
            <span className="fs-5">Start Reservation</span>
            <i className="bi bi-arrow-right fs-4"></i>
          </a>
        </div>
      </div>

      {/* Brands Section */}
    <section className="py-5 overflow-hidden" style={{ backgroundColor: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <Container>
        <p className="mb-4 text-white fw-normal fs-5" style={{ fontFamily: 'Georgia, serif' }}>Our Premium Brands</p>
        <div className="position-relative overflow-hidden" style={{ padding: '20px 0' }}>
          <div
            className="d-flex align-items-center logo-slider-track"
            style={{ gap: '30px', width: 'max-content', animation: 'logo-slide 24s linear infinite' }}
          >
            {[
              { name: 'Mercedes-Benz', src: mercedesLogo },
              { name: 'Lexus', src: lexusLogo },
              { name: 'Chevrolet', src: chevroletLogo },
              { name: 'Toyota', src: toyotaLogo },
              { name: 'Ford', src: fordLogo },
              { name: 'GMC', src: gmcLogo },
              { name: 'BMW', src: bmwLogo }
            ].concat([
              { name: 'Mercedes-Benz', src: mercedesLogo },
              { name: 'Lexus', src: lexusLogo },
              { name: 'Chevrolet', src: chevroletLogo },
              { name: 'Toyota', src: toyotaLogo },
              { name: 'Ford', src: fordLogo },
              { name: 'GMC', src: gmcLogo },
              { name: 'BMW', src: bmwLogo }
            ]).map((brand, index) => (
              <div
                key={`${brand.name}-${index}`}
                className="d-flex align-items-center justify-content-center rounded-4"
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
                  Redefining luxury travel in Saudi Arabia since 2011 with an exclusive fleet and unmatched reliability.
                </p>
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
              <div className="position-relative mb-4">
                <img
                  src={bmw7}
                  alt="Luxury Car Model"
                  className="img-fluid rounded-4 shadow-lg"
                  style={{ backgroundColor: '#1a1a1a', padding: '20px' }}
                />
              </div>
              <div className="mt-5 pt-3">
                <p className="mb-5" style={{ color: '#888', lineHeight: '1.8' }}>
                  Embark on a journey with Nextify, your premier destination for luxury car rentals in Saudi Arabia. We provide unparalleled access to a world-class fleet, ensuring prestige, safety, and exceptional service at any time.
                </p>
                <button
                  className="btn rounded-pill px-5 py-3 fw-bold border-0"
                  style={{ backgroundColor: '#eefe31', color: '#000', fontSize: '0.9rem' }}
                >
                  Discover Our Story
                </button>
              </div>
            </div>
          </div>
        </Container>
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
            {[
              { name: 'BMW 7 Series', img: bmw7, price: '$250/day', type: 'Luxury Sedan' },
              { name: 'Mercedes S-Class', img: benzS, price: '$280/day', type: 'Premium Executive' },
              { name: 'Lexus ES 350', img: lexusES, price: '$200/day', type: 'Elegant Comfort' }
            ].map((car, i) => (
              <div key={i} className="col-lg-4 col-md-6">
                <div
                  className="h-100 p-4 d-flex flex-column"
                  style={{
                    backgroundColor: '#141414',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'transform 0.3s ease, border-color 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-10px)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                  }}
                >
                  <div className="mb-4" style={{ height: '220px', backgroundColor: '#1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
                    <img 
                      src={car.img} 
                      alt={car.name} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover', 
                        filter: 'contrast(1.2) saturate(1.3)',
                        transition: 'transform 0.5s ease'
                      }} 
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  </div>
                  <p className="mb-1 text-uppercase" style={{ fontSize: '0.7rem', color: '#a0a0a0', letterSpacing: '1px' }}>{car.type}</p>
                  <h3 className="h4 mb-3" style={{ fontFamily: 'Georgia, serif' }}>{car.name}</h3>
                  <div className="d-flex justify-content-between align-items-center mt-auto pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <span className="fw-bold fs-5">{car.price}</span>
                    <button className="btn btn-outline-light btn-sm px-3 rounded-0 text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
                      Rent Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
      {/* Guarantee Section */}
    <section id="guarantee" className="py-5" style={{ backgroundColor: '#0a0a0a', color: 'white' }}>
      <Container className="py-5">
        <div className="row align-items-center g-5">
          <div className="col-lg-6">
            <img 
              src={guaranteeImg} 
              alt="Luxury Guarantee & Safety" 
              className="img-fluid rounded-4 shadow-lg floating-image" 
              style={{ objectFit: 'cover', minHeight: '450px', width: '100%', border: '1px solid rgba(255,255,255,0.05)' }}
            />
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

    {/* Events & Testimonial Section */}
    <section className="py-5" style={{ backgroundColor: '#000000', color: 'white' }}>
      <Container className="py-5">
        <div className="row mb-5 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Testimonial Side */}
          <div className="col-lg-5 pe-lg-5 mb-5 mb-lg-0">
            <div className="d-flex justify-content-between align-items-center mb-4" style={{ maxWidth: '380px' }}>
              <div className="d-flex gap-2" style={{ color: '#f0f424', fontSize: '1.1rem' }}>
                <i className="bi bi-star-fill"></i>
                <i className="bi bi-star-fill"></i>
                <i className="bi bi-star-fill"></i>
                <i className="bi bi-star-fill"></i>
                <i className="bi bi-star-fill"></i>
              </div>
              <div className="rounded px-2 py-1" style={{ backgroundColor: '#555', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>
                5.0
              </div>
            </div>
            <p className="mb-4" style={{ color: '#aaa', fontSize: '1.05rem', lineHeight: '1.7', maxWidth: '380px' }}>
              I never knew renting a car could feel this premium. The entire process was seamless, and the Ferrari was in mint condition. Luzurio exceeded every expectation.
            </p>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px', maxWidth: '380px' }}>
              <span className="fw-bold text-white" style={{ fontSize: '0.9rem' }}>Julian Maddox, </span>
              <span style={{ color: '#777', fontSize: '0.9rem' }}>Luxury Event Planner</span>
            </div>
          </div>

          {/* Events Side */}
          <div className="col-lg-7 ps-lg-5">
            <div className="d-flex align-items-center gap-3 mb-4">
              <div style={{ width: '40px', height: '1px', backgroundColor: '#8a8940' }}></div>
              <span className="text-uppercase" style={{ color: '#777', letterSpacing: '2px', fontSize: '0.8rem' }}>EVENTS</span>
            </div>
            <h2 className="mb-4" style={{ fontFamily: 'Georgia, serif', fontSize: '3.5rem', lineHeight: '1.1' }}>
              Bulk Car Rentals for<br />Functions
            </h2>
            <p className="mb-4" style={{ color: '#888', fontSize: '1.05rem', lineHeight: '1.6', maxWidth: '600px' }}>
              Planning large-scale celebrations? We provide bulk car rentals tailored for all your events, from weddings to corporate gatherings. Choose from our extensive fleet for seamless transport.
            </p>
            <button className="btn rounded-pill px-4 py-2 mt-3 fw-medium border-0" style={{ backgroundColor: '#f0f424', color: '#000', fontSize: '0.95rem' }}>
              Contact Us
            </button>
          </div>
        </div>

        {/* Statistics Row */}
        <div className="row text-center pt-2">
          <div className="col-md-3 col-6 mb-4 mb-md-0">
            <h3 className="mb-3" style={{ fontFamily: 'Georgia, serif', fontSize: '4rem', fontWeight: '400' }}>34K+</h3>
            <p className="mb-0" style={{ color: '#777', fontSize: '1rem' }}>Happy Clients</p>
          </div>
          <div className="col-md-3 col-6 mb-4 mb-md-0">
            <h3 className="mb-3" style={{ fontFamily: 'Georgia, serif', fontSize: '4rem', fontWeight: '400' }}>99%</h3>
            <p className="mb-0" style={{ color: '#777', fontSize: '1rem' }}>Accident-Free Rentals</p>
          </div>
          <div className="col-md-3 col-6 mb-4 mb-md-0">
            <h3 className="mb-3" style={{ fontFamily: 'Georgia, serif', fontSize: '4rem', fontWeight: '400' }}>210+</h3>
            <p className="mb-0" style={{ color: '#777', fontSize: '1rem' }}>Luxury Cars</p>
          </div>
          <div className="col-md-3 col-6">
            <h3 className="mb-3" style={{ fontFamily: 'Georgia, serif', fontSize: '4rem', fontWeight: '400' }}>100%</h3>
            <p className="mb-0" style={{ color: '#777', fontSize: '1rem' }}>Fully Insured Vehicles</p>
          </div>
        </div>
      </Container>
    </section>

    {/* Reservation Section */}
      <section id="reservation" className="py-4 position-relative overflow-hidden" style={{ 
        backgroundColor: '#fdfdfd', 
        backgroundImage: 'linear-gradient(30deg, #f0f0f0 12%, transparent 12.5%, transparent 87%, #f0f0f0 87.5%, #f0f0f0), linear-gradient(150deg, #f0f0f0 12%, transparent 12.5%, transparent 87%, #f0f0f0 87.5%, #f0f0f0), linear-gradient(30deg, #f0f0f0 12%, transparent 12.5%, transparent 87%, #f0f0f0 87.5%, #f0f0f0), linear-gradient(150deg, #f0f0f0 12%, transparent 12.5%, transparent 87%, #f0f0f0 87.5%, #f0f0f0), linear-gradient(60deg, #f5f5f5 25%, transparent 25.5%, transparent 75%, #f5f5f5 75%, #f5f5f5), linear-gradient(60deg, #f5f5f5 25%, transparent 25.5%, transparent 75%, #f5f5f5 75%, #f5f5f5)',
        backgroundSize: '80px 140px',
        color: '#333' 
      }}>
        {/* Decorative blur element */}
        <div className="position-absolute" style={{ 
          width: '600px', 
          height: '600px', 
          background: 'radial-gradient(circle, rgba(238, 254, 49, 0.05) 0%, transparent 70%)', 
          top: '-200px', 
          right: '-200px',
          filter: 'blur(80px)',
          zIndex: 0
        }}></div>

        <Container className="py-4 position-relative" style={{ zIndex: 1 }}>
          <div className="row g-4 mb-4">
            <div className="col-lg-7">
              <div className="d-flex align-items-center gap-3 mb-3">
                <div style={{ width: '40px', height: '1px', backgroundColor: '#eeb012' }}></div>
                <span className="text-uppercase fw-bold" style={{ color: '#aaa', letterSpacing: '2px', fontSize: '0.75rem' }}>DRIVE STARTS HERE</span>
              </div>
              <h2 className="display-4 mb-4" style={{ fontFamily: 'Georgia, serif', color: '#1a1a1a' }}>Your Journey Begins with One Click</h2>
              <p className="mb-0" style={{ color: '#777', lineHeight: '1.8', maxWidth: '600px' }}>
                Tellus sed sed odio enim sem mauris mattis. Pellentesque aliquet integer non neque id. Ac nisl imperdiet tellus placerat venenatis. Habitant ullamcorper ornare est arcu elit pellentesque.
              </p>
            </div>
            <div className="col-lg-5">
              <div className="ps-lg-5">
                <div className="d-flex align-items-center gap-2 mb-4">
                  <div style={{ width: '3px', height: '30px', backgroundColor: '#eefe31' }}></div>
                  <h3 className="h4 mb-0" style={{ fontFamily: 'Georgia, serif' }}>Operating Hours</h3>
                </div>
                <div className="mb-4">
                  <div className="d-flex justify-content-between py-3 border-bottom border-dark-subtle">
                    <span className="text-uppercase fw-bold small">MONDAY – FRIDAY</span>
                    <span className="fw-bold small">08:00 – 22:00</span>
                  </div>
                  <div className="d-flex justify-content-between py-3 border-bottom border-dark-subtle">
                    <span className="text-uppercase fw-bold small">SATURDAY</span>
                    <span className="fw-bold small">09:00 – 23:00</span>
                  </div>
                  <div className="d-flex justify-content-between py-3 border-bottom border-dark-subtle">
                    <span className="text-uppercase fw-bold small">SUNDAY</span>
                    <span className="fw-bold small">10:00 – 20:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-0 rounded-4 shadow-lg overflow-hidden" style={{ backgroundColor: '#ffffff', color: '#333', border: '1px solid rgba(0,0,0,0.08)' }}>
            {/* Tab Bar */}
            <div className="d-flex w-100 flex-column flex-md-row" style={{ borderBottom: '1px solid #ddd' }}>
              <button
                type="button"
                className="flex-fill border-0 py-4 px-4 d-flex align-items-center justify-content-center gap-2 text-uppercase fw-semibold"
                style={{
                  background: activeTab === 'airport' ? 'linear-gradient(135deg, #c5a880, #a88358)' : '#000000',
                  color: '#ffffff',
                  fontSize: '1rem',
                  letterSpacing: '1px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  borderRight: '1px solid rgba(255,255,255,0.1)'
                }}
                onClick={() => setActiveTab('airport')}
              >
                <i className="bi bi-airplane-fill fs-5"></i> Airport Transfer
              </button>
              <button
                type="button"
                className="flex-fill border-0 py-4 px-4 d-flex align-items-center justify-content-center gap-2 text-uppercase fw-semibold"
                style={{
                  background: activeTab === 'pointToPoint' ? 'linear-gradient(135deg, #c5a880, #a88358)' : '#000000',
                  color: '#ffffff',
                  fontSize: '1rem',
                  letterSpacing: '1px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  borderRight: '1px solid rgba(255,255,255,0.1)'
                }}
                onClick={() => setActiveTab('pointToPoint')}
              >
                <i className="bi bi-geo-alt-fill fs-5"></i> Point to Point
              </button>
              <button
                type="button"
                className="flex-fill border-0 py-4 px-4 d-flex align-items-center justify-content-center gap-2 text-uppercase fw-semibold"
                style={{
                  background: activeTab === 'hourly' ? 'linear-gradient(135deg, #c5a880, #a88358)' : '#000000',
                  color: '#ffffff',
                  fontSize: '1rem',
                  letterSpacing: '1px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveTab('hourly')}
              >
                <i className="bi bi-clock-fill fs-5"></i> Hourly Service
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleBookingSubmit} className="p-4 p-md-5 row g-4 text-start">
              {/* Name field */}
              <div className="col-md-4">
                <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-control p-3 border rounded-3 bg-white text-dark"
                  placeholder="Enter your name"
                  style={{ borderColor: '#ccc', boxShadow: 'none' }}
                />
              </div>

              {/* Mobile Number field */}
              <div className="col-md-4">
                <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                  Mobile Number <span className="text-danger">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="form-control p-3 border rounded-3 bg-white text-dark"
                  placeholder="Enter your mobile number"
                  style={{ borderColor: '#ccc', boxShadow: 'none' }}
                />
              </div>

              {/* Email field */}
              <div className="col-md-4">
                <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                  Email <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-control p-3 border rounded-3 bg-white text-dark"
                  placeholder="Enter your email"
                  style={{ borderColor: '#ccc', boxShadow: 'none' }}
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                  Event Type (optional)
                </label>
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  className="form-select p-3 border rounded-3 bg-white text-dark"
                  style={{ borderColor: '#ccc', boxShadow: 'none' }}
                >
                  <option value="">None</option>
                  <option value="Birthday">Birthday</option>
                  <option value="Wedding">Wedding</option>
                  <option value="Anniversary">Anniversary</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {formData.eventType === 'Other' && (
                <div className="col-md-4">
                  <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                    Other Event
                  </label>
                  <input
                    type="text"
                    value={formData.eventOther}
                    onChange={(e) => setFormData({ ...formData, eventOther: e.target.value })}
                    className="form-control p-3 border rounded-3 bg-white text-dark"
                    placeholder="Specify event type"
                    style={{ borderColor: '#ccc', boxShadow: 'none' }}
                  />
                </div>
              )}

              {/* Render dynamic inputs based on Active Tab */}
              {activeTab === 'airport' && (
                <>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                      Flight Number <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.flightNumber}
                      onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value })}
                      className="form-control p-3 border rounded-3 bg-white text-dark"
                      placeholder="e.g. EK901"
                      style={{ borderColor: '#ccc', boxShadow: 'none' }}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                      Arrival Date & Time <span className="text-danger">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.arrivalDateTime}
                      onChange={(e) => setFormData({ ...formData, arrivalDateTime: e.target.value })}
                      className="form-control p-3 border rounded-3 bg-white text-dark"
                      style={{ borderColor: '#ccc', boxShadow: 'none' }}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                      Choose vehicle <span className="text-danger">*</span>
                    </label>
                    <select
                      required
                      value={formData.vehicle}
                      onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                      className="form-select p-3 border rounded-3 bg-white text-dark"
                      style={{ borderColor: '#ccc', boxShadow: 'none' }}
                    >
                      <option value="">Select a vehicle</option>
                      {vehicles.map((v, index) => (
                        <option key={index} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                      Pick-up Location <span className="text-danger">*</span>
                    </label>
                    <select
                      required
                      value={formData.pickupLocation}
                      onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                      className="form-select p-3 border rounded-3 bg-white text-dark"
                      style={{ borderColor: '#ccc', boxShadow: 'none' }}
                    >
                      <option value="">Select Airport</option>
                      <option value="King Khalid International Airport (RUH) - Riyadh">King Khalid International Airport (RUH) - Riyadh</option>
                      <option value="King Abdulaziz International Airport (JED) - Jeddah">King Abdulaziz International Airport (JED) - Jeddah</option>
                      <option value="King Fahd International Airport (DMM) - Dammam">King Fahd International Airport (DMM) - Dammam</option>
                      <option value="Prince Mohammad Bin Abdulaziz International Airport (MED) - Medina">Prince Mohammad Bin Abdulaziz International Airport (MED) - Medina</option>
                      <option value="Other">Other (Specify below)</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                      Other Pickup Location
                    </label>
                    <input
                      type="text"
                      value={formData.otherPickupLocation}
                      onChange={(e) => setFormData({ ...formData, otherPickupLocation: e.target.value })}
                      className="form-control p-3 border rounded-3 bg-white text-dark"
                      placeholder="Specify if Other selected"
                      style={{ borderColor: '#ccc', boxShadow: 'none' }}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                      Drop-off Location <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.dropoffLocation}
                      onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })}
                      className="form-control p-3 border rounded-3 bg-white text-dark"
                      placeholder="Enter drop-off location"
                      style={{ borderColor: '#ccc', boxShadow: 'none' }}
                    />
                  </div>
                </>
              )}

              {activeTab === 'pointToPoint' && (
                <>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                      Arrival Date & Time <span className="text-danger">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.arrivalDateTime}
                      onChange={(e) => setFormData({ ...formData, arrivalDateTime: e.target.value })}
                      className="form-control p-3 border rounded-3 bg-white text-dark"
                      style={{ borderColor: '#ccc', boxShadow: 'none' }}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                      Choose vehicle <span className="text-danger">*</span>
                    </label>
                    <select
                      required
                      value={formData.vehicle}
                      onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                      className="form-select p-3 border rounded-3 bg-white text-dark"
                      style={{ borderColor: '#ccc', boxShadow: 'none' }}
                    >
                      <option value="">Select a vehicle</option>
                      {vehicles.map((v, index) => (
                        <option key={index} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                      Pick-up Location <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.pickupLocation}
                      onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                      className="form-control p-3 border rounded-3 bg-white text-dark"
                      placeholder="Enter pick-up location"
                      style={{ borderColor: '#ccc', boxShadow: 'none' }}
                    />
                  </div>
                  <div className="col-md-12">
                    <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                      Drop Off Location <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.dropoffLocation}
                      onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })}
                      className="form-control p-3 border rounded-3 bg-white text-dark"
                      placeholder="Enter drop-off location"
                      style={{ borderColor: '#ccc', boxShadow: 'none' }}
                    />
                  </div>
                </>
              )}

              {activeTab === 'hourly' && (
                <>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                      Arrival Date & Time <span className="text-danger">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.arrivalDateTime}
                      onChange={(e) => setFormData({ ...formData, arrivalDateTime: e.target.value })}
                      className="form-control p-3 border rounded-3 bg-white text-dark"
                      style={{ borderColor: '#ccc', boxShadow: 'none' }}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                      Pick-up Location <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.pickupLocation}
                      onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                      className="form-control p-3 border rounded-3 bg-white text-dark"
                      placeholder="Enter pick-up location"
                      style={{ borderColor: '#ccc', boxShadow: 'none' }}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                      Choose vehicle <span className="text-danger">*</span>
                    </label>
                    <select
                      required
                      value={formData.vehicle}
                      onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                      className="form-select p-3 border rounded-3 bg-white text-dark"
                      style={{ borderColor: '#ccc', boxShadow: 'none' }}
                    >
                      <option value="">Select a vehicle</option>
                      {vehicles.map((v, index) => (
                        <option key={index} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-12">
                    <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '0.95rem' }}>
                      Select Hours (Optional)
                    </label>
                    <select
                      value={formData.hours}
                      onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                      className="form-select p-3 border rounded-3 bg-white text-dark"
                      style={{ borderColor: '#ccc', boxShadow: 'none' }}
                    >
                      <option value="1 HR">1 HR</option>
                      <option value="2 HRS">2 HRS</option>
                      <option value="3 HRS">3 HRS</option>
                      <option value="4 HRS">4 HRS</option>
                      <option value="5 HRS">5 HRS</option>
                      <option value="6 HRS">6 HRS</option>
                      <option value="8 HRS">8 HRS</option>
                      <option value="12 HRS">12 HRS</option>
                      <option value="24 HRS">24 HRS</option>
                    </select>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <div className="col-12 mt-4 text-start">
                <button
                  type="submit"
                  className="btn px-5 py-3 text-uppercase fw-bold border-0 text-white"
                  style={{
                    background: 'linear-gradient(135deg, #a88448 0%, #c8a261 100%)',
                    fontFamily: 'Georgia, serif',
                    letterSpacing: '1px',
                    fontSize: '0.95rem',
                    boxShadow: '0 8px 16px rgba(168,132,72,0.2)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    borderRadius: '30px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 20px rgba(168,132,72,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(168,132,72,0.2)';
                  }}
                >
                  BOOK NOW
                </button>
              </div>
            </form>
          </div>
        </Container>
      </section>


    </>
  )
}

export default Home
