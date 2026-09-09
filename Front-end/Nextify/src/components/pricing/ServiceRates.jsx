import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import { getPricingSummaryAPI } from '../../Services/allAPI';
import { SERVICE_LABELS } from '../booking/bookingConstants';

const CARDS = [
  {
    serviceType: 'airport_transfer',
    title: 'Airport Transfer',
    subtitle: 'Riyadh • Jeddah • Dammam',
    icon: 'bi-airplane',
  },
  {
    serviceType: 'city_transfer',
    title: 'City Transfer',
    subtitle: 'Riyadh • Up to 20 KM',
    icon: 'bi-geo-alt',
  },
  {
    serviceType: 'chauffeur',
    title: 'Chauffeur Service',
    subtitle: 'Half Day / Full Day',
    icon: 'bi-person-badge',
  },
  {
    serviceType: 'intercity_transfer',
    title: 'Intercity',
    subtitle: 'Riyadh • Khobar • Jubail • Jeddah',
    icon: 'bi-signpost-split',
  },
  {
    serviceType: 'gcc_transfer',
    title: 'GCC Transfer',
    subtitle: 'Dubai • Abu Dhabi • Bahrain • Qatar • Oman',
    icon: 'bi-globe2',
  },
];

export default function ServiceRates() {
  const [summary, setSummary] = useState({});

  useEffect(() => {
    (async () => {
      const res = await getPricingSummaryAPI();
      if (res?.status === 200 && res.data?.summary) {
        setSummary(res.data.summary);
      }
    })();
  }, []);

  return (
    <section className="py-5" style={{ backgroundColor: '#0f0f0f', color: 'white' }}>
      <Container>
        <div className="text-center mb-5">
          <p className="text-uppercase mb-2" style={{ color: '#eeb012', letterSpacing: 3, fontSize: '0.8rem' }}>
            Transparent Pricing
          </p>
          <h2 className="display-5 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
            Our Services &amp; Rates
          </h2>
          <p style={{ color: '#888', maxWidth: 560, margin: '0 auto' }}>
            All prices in SAR. Final pricing is calculated securely by our backend when you book.
          </p>
        </div>

        <div className="row g-4">
          {CARDS.map((card) => {
            const fromPrice = summary[card.serviceType]?.fromPrice;
            return (
              <div key={card.serviceType} className="col-md-6 col-lg-4">
                <div
                  className="h-100 p-4 rounded-4 d-flex flex-column"
                  style={{
                    background: '#141414',
                    border: '1px solid rgba(255,255,255,0.08)',
                    transition: 'transform 0.3s ease, border-color 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.borderColor = 'rgba(238,176,18,0.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  }}
                >
                  <i className={`bi ${card.icon} fs-3 mb-3`} style={{ color: '#eeb012' }} />
                  <p className="text-uppercase small mb-1" style={{ color: '#888', letterSpacing: 1 }}>
                    {SERVICE_LABELS[card.serviceType]}
                  </p>
                  <h4 className="mb-2" style={{ fontFamily: 'Georgia, serif' }}>{card.title}</h4>
                  <p className="mb-3" style={{ color: '#888', fontSize: '0.9rem' }}>{card.subtitle}</p>
                  <div className="mb-4">
                    {fromPrice != null ? (
                      <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#eeb012', fontFamily: 'Georgia, serif' }}>
                        From SAR {fromPrice.toLocaleString()}
                      </span>
                    ) : (
                      <span style={{ color: '#888' }}>Rates loading...</span>
                    )}
                  </div>
                  <Link
                    to="/booking"
                    state={{ serviceType: card.serviceType }}
                    className="btn rounded-pill mt-auto py-2 fw-semibold border-0"
                    style={{ background: 'linear-gradient(135deg, #a88448 0%, #c8a261 100%)', color: '#000' }}
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
