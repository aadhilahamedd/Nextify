import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import { getPricingSummaryAPI } from '../../Services/allAPI';
import { formatMoney, sarToUsd } from '../../utils/currency';

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
    <section className="py-5 service-rates" style={{ backgroundColor: '#0f0f0f', color: 'white' }}>
      <Container>
        <div className="text-center mb-5">
          <p className="text-uppercase mb-2" style={{ color: '#eeb012', letterSpacing: 3, fontSize: '0.8rem' }}>
            Transparent Pricing
          </p>
          <h2 className="display-5 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
            Our Services &amp; Rates
          </h2>
          <p style={{ color: '#888', maxWidth: 560, margin: '0 auto' }}>
            Prices shown in SAR and USD. Final pricing is calculated when you book.
          </p>
        </div>

        <div className="row g-4">
          {CARDS.map((card) => {
            const fromPrice = summary[card.serviceType]?.fromPrice;
            const fromUsd = summary[card.serviceType]?.fromPriceUsd ?? sarToUsd(fromPrice);
            return (
              <div key={card.serviceType} className="col-md-6 col-lg-4">
                <div className="service-rate-card">
                  <div className="service-rate-icon">
                    <i className={`bi ${card.icon}`} />
                  </div>
                  <h3 className="service-rate-title">{card.title}</h3>
                  <p className="service-rate-sub">{card.subtitle}</p>
                  <div className="service-rate-price">
                    {fromPrice != null ? (
                      <>
                        <strong>From {formatMoney(fromPrice, 'SAR')}</strong>
                        <span>{formatMoney(fromUsd, 'USD')}</span>
                      </>
                    ) : (
                      <span className="service-rate-loading">Rates loading...</span>
                    )}
                  </div>
                  <Link
                    to="/booking"
                    state={{ serviceType: card.serviceType }}
                    className="service-rate-btn"
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
