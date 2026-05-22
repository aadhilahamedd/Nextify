import React from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

function About() {
  return (
    <div style={{ backgroundColor: '#0a0a0a', color: 'white', minHeight: '100vh', paddingTop: '140px', paddingBottom: '80px' }}>
      <Container>
        <div className="text-center mb-5">
          <p className="text-uppercase fw-semibold mb-2" style={{ color: '#eeb012', letterSpacing: '3px', fontSize: '0.8rem' }}>
            About Us
          </p>
          <h2 className="display-4 fw-normal mb-4" style={{ fontFamily: 'Georgia, serif', color: '#fff' }}>
            Luxury travel tailored to your every need
          </h2>
          <p className="mx-auto" style={{ maxWidth: '720px', color: '#bfbfbf', lineHeight: '1.8' }}>
            Nextify combines premium vehicles, trusted chauffeurs, and seamless service to create an elevated ground transportation experience in Saudi Arabia. Whether you need airport transfers, point-to-point rides, hourly luxury service, or fleet support for events, we make every journey feel exceptional.
          </p>
        </div>

        <Row className="g-4 mb-5">
          {[
            {
              title: 'Premium Fleet',
              description: 'A curated selection of luxury sedans, vans, and executive vehicles maintained to the highest standard.',
              icon: 'bi-car-front-fill'
            },
            {
              title: 'Professional Drivers',
              description: 'Experienced and courteous chauffeurs trained for safety, privacy, and premium customer service.',
              icon: 'bi-people-fill'
            },
            {
              title: 'Flexible Service',
              description: 'Airport pickup, point-to-point rides, hourly bookings and event transportation available on demand.',
              icon: 'bi-clock-fill'
            },
            {
              title: 'Reliable Support',
              description: '24/7 customer assistance ensures your booking runs smoothly from confirmation until drop-off.',
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
              <h3 className="mb-4" style={{ fontFamily: 'Georgia, serif', color: '#fff' }}>Our Mission</h3>
              <p style={{ color: '#bfbfbf', lineHeight: '1.8' }}>
                To deliver the highest level of luxury travel with transparency, reliability, and personalized service. Every ride with Nextify is carefully curated to provide comfort, professionalism, and peace of mind.
              </p>
              <p style={{ color: '#bfbfbf', lineHeight: '1.8' }}>
                From corporate transfers to special events, our team is committed to meeting your exact requirements and exceeding expectations at every mile.
              </p>
            </div>
          </Col>
          <Col lg={6}>
            <div className="row g-4">
              {[
                { label: 'Years of Trust', value: '12+', color: '#eeb012' },
                { label: 'Luxury Vehicles', value: '210+', color: '#fff' },
                { label: 'Happy Clients', value: '34K+', color: '#fff' },
                { label: 'Available 24/7', value: 'Yes', color: '#fff' }
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