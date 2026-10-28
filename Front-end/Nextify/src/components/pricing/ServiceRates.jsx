import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import { getPricingSummaryAPI } from '../../Services/allAPI';
import { sarToUsd } from '../../utils/currency';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateService } from '../../i18n/places';

const CARDS = [
  {
    serviceType: 'airport_transfer',
    title: 'Airport Transfer',
    subtitle: 'Riyadh • Jeddah • Dammam',
    icon: 'bi-airplane',
    image: '/images/services/service-airport.jpg',
  },
  {
    serviceType: 'city_transfer',
    title: 'City Transfer',
    subtitle: 'Riyadh • Up to 20 KM',
    icon: 'bi-geo-alt',
    image: '/images/services/service-city.jpg',
  },
  {
    serviceType: 'chauffeur',
    title: 'Chauffeur Service',
    subtitle: 'Half Day / Full Day',
    icon: 'bi-person-badge',
    image: '/images/services/service-chauffeur.jpg',
  },
  {
    serviceType: 'intercity_transfer',
    title: 'Intercity',
    subtitle: 'Riyadh • Khobar • Jubail • Jeddah',
    icon: 'bi-signpost-split',
    image: '/images/services/service-intercity.jpg',
  },
  {
    serviceType: 'gcc_transfer',
    title: 'GCC Transfer',
    subtitle: 'Dubai • Abu Dhabi • Bahrain • Qatar • Oman',
    icon: 'bi-globe2',
    image: '/images/services/service-gcc.jpg',
  },
];

const SUBTITLE_KEYS = {
  airport_transfer: 'rates.airportSub',
  city_transfer: 'rates.citySub',
  chauffeur: 'rates.chauffeurSub',
  intercity_transfer: 'rates.intercitySub',
  gcc_transfer: 'rates.gccSub',
};

export default function ServiceRates() {
  const { t, formatSar, formatUsd } = useLanguage();
  const [summary, setSummary] = useState({});
  const [inView, setInView] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    (async () => {
      const res = await getPricingSummaryAPI();
      if (res?.status === 200 && res.data?.summary) {
        setSummary(res.data.summary);
      }
    })();
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`py-5 service-rates${inView ? ' is-inview' : ''}`}
      style={{ backgroundColor: '#0f0f0f', color: 'white' }}
    >
      <Container>
        <div className="text-center mb-5">
          <p className="text-uppercase mb-2" style={{ color: '#eeb012', letterSpacing: 3, fontSize: '0.8rem' }}>
            {t('rates.kicker')}
          </p>
          <h2 className="display-5 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
            {t('rates.title')}
          </h2>
          <p style={{ color: '#888', maxWidth: 560, margin: '0 auto' }}>
            {t('rates.lead')}
          </p>
        </div>

        <div className="row g-4">
          {CARDS.map((card, index) => {
            const fromPrice = summary[card.serviceType]?.fromPrice;
            const fromUsd = summary[card.serviceType]?.fromPriceUsd ?? sarToUsd(fromPrice);
            return (
              <div
                key={card.serviceType}
                className="col-md-6 col-lg-4 service-rate-col"
                style={{ '--rise-delay': `${index * 90}ms` }}
              >
                <div className="service-rate-card">
                  <div className="service-rate-card-media" aria-hidden="true">
                    <img src={card.image} alt="" />
                  </div>
                  <div className="service-rate-card-body">
                    <div className="service-rate-icon">
                      <i className={`bi ${card.icon}`} />
                    </div>
                    <h3 className="service-rate-title">{card.serviceType === 'intercity_transfer' ? t('rates.intercityCard') : translateService(card.serviceType, t)}</h3>
                    <p className="service-rate-sub">{t(SUBTITLE_KEYS[card.serviceType])}</p>
                    <div className="service-rate-price">
                      {fromPrice != null ? (
                        <>
                          <strong>{t('rates.from')} {formatSar(fromPrice)}</strong>
                          <span>{formatUsd(fromUsd)}</span>
                        </>
                      ) : (
                        <span className="service-rate-loading">{t('rates.loading')}</span>
                      )}
                    </div>
                    <Link
                      to="/booking"
                      state={{ serviceType: card.serviceType }}
                      className="service-rate-btn"
                    >
                      {t('rates.book')}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
