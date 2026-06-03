import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCarImageUrl } from '../utils/carsStorage';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

function Cardetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const car = location.state?.car;

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!car) {
      navigate('/carlist');
    }
  }, [car, navigate]);

  if (!car) return null;

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: 'white', paddingTop: '120px', paddingBottom: '80px' }}>
      <Container>
        {/* Back button */}
        <button 
          onClick={() => navigate(-1)} 
          className="btn btn-link text-decoration-none text-light p-0 mb-4 d-flex align-items-center"
          style={{ fontSize: '0.9rem', letterSpacing: '1px' }}
        >
          <i className="bi bi-arrow-left me-2"></i> BACK TO FLEET
        </button>

        <Row className="g-5 align-items-center mt-2">
          {/* Image Section */}
          <Col lg={7}>
            <div className="position-relative" style={{ borderRadius: '12px', overflow: 'hidden', backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
              <img 
                src={getCarImageUrl(car.img)} 
                alt={car.name} 
                className="img-fluid w-100" 
                style={{ objectFit: 'cover', height: '100%', minHeight: '400px', maxHeight: '550px', filter: 'contrast(1.1) saturate(1.1)' }} 
              />
              <div className="position-absolute top-0 start-0 m-4">
                <span className="badge bg-dark border border-secondary text-light fw-normal py-2 px-3 rounded-pill" style={{ letterSpacing: '1px' }}>
                  {car.type}
                </span>
              </div>
            </div>
          </Col>

          {/* Details Section */}
          <Col lg={5}>
            <div>
              <h1 className="display-4 fw-normal mb-2" style={{ fontFamily: 'Georgia, serif' }}>{car.name}</h1>
              <p className="fs-3 fw-bold mb-4" style={{ color: '#eeb012' }}>{car.price}</p>
              
              <div style={{ width: '60px', height: '2px', backgroundColor: '#eeb012', marginBottom: '30px' }}></div>
              
              <p className="mb-4" style={{ color: '#a0a0a0', lineHeight: '1.8' }}>
                Experience unparalleled luxury and performance with the {car.name}. Designed to provide ultimate comfort and style, this vehicle is perfect for executive travel, special events, or simply enjoying the journey in utmost elegance.
              </p>

              <div className="d-flex flex-column gap-3 mb-5">
                <div className="d-flex align-items-center p-3 rounded" style={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.05)', transition: 'background-color 0.3s' }}
                     onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}
                     onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#141414'}>
                  <i className="bi bi-people-fill fs-4 me-3" style={{ color: '#eeb012' }}></i>
                  <div>
                    <p className="mb-0 text-uppercase" style={{ fontSize: '0.7rem', color: '#a0a0a0', letterSpacing: '1px' }}>Capacity</p>
                    <p className="mb-0 fw-semibold">{car.seats}</p>
                  </div>
                </div>
                
                <div className="d-flex align-items-center p-3 rounded" style={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.05)', transition: 'background-color 0.3s' }}
                     onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}
                     onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#141414'}>
                  <i className="bi bi-briefcase-fill fs-4 me-3" style={{ color: '#eeb012' }}></i>
                  <div>
                    <p className="mb-0 text-uppercase" style={{ fontSize: '0.7rem', color: '#a0a0a0', letterSpacing: '1px' }}>Luggage Space</p>
                    <p className="mb-0 fw-semibold">{car.luggage}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => navigate('/booking', { state: { car } })}
                className="btn btn-outline-light py-3 px-5 rounded-0 text-uppercase fw-semibold w-100" 
                style={{ letterSpacing: '2px', transition: 'all 0.3s ease', cursor: 'pointer' }}
              >
                Proceed to Reservation
              </button>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default Cardetails