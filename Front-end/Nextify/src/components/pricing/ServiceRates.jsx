import React, { useEffect, useState } from 'react';
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
          {CARDS.map((card) => {
            const fromPrice = summary[card.serviceType]?.fromPrice;
            const fromUsd = summary[card.serviceType]?.fromPriceUsd ?? sarToUsd(fromPrice);
            return (
              <div key={card.serviceType} className="col-md-6 col-lg-4">
                <div className="service-rate-card">
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
            );
          })}
        </div>
      </Container>
    </section>
  );
}
