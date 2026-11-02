import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import { getPricingSummaryAPI } from '../../Services/allAPI';
import { sarToUsd } from '../../utils/currency';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateService } from '../../i18n/places';
import { ArrowRightIcon, SERVICE_ICONS } from '../icons';

const CARDS = [
  {
    serviceType: 'airport_transfer',
    Icon: SERVICE_ICONS.airport_transfer,
    image: '/images/services/service-airport.jpg',
    altKey: 'rates.airportAlt',
  },
  {
    serviceType: 'city_transfer',
    Icon: SERVICE_ICONS.city_transfer,
    image: '/images/services/service-city.jpg',
    altKey: 'rates.cityAlt',
  },
  {
    serviceType: 'chauffeur',
    Icon: SERVICE_ICONS.chauffeur,
    image: '/images/services/service-chauffeur.jpg',
    altKey: 'rates.chauffeurAlt',
  },
  {
    serviceType: 'intercity_transfer',
    Icon: SERVICE_ICONS.intercity_transfer,
    image: '/images/services/service-intercity.jpg',
    altKey: 'rates.intercityAlt',
  },
  {
    serviceType: 'gcc_transfer',
    Icon: SERVICE_ICONS.gcc_transfer,
    image: '/images/services/service-gcc.jpg',
    altKey: 'rates.gccAlt',
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
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`service-rates${inView ? ' is-inview' : ''}`}
      aria-labelledby="service-rates-heading"
    >
      <Container>
        <header className="service-rates-heading">
          <div className="service-rates-kicker">
            <span className="service-rates-line" aria-hidden="true" />
            <span>{t('rates.kicker')}</span>
          </div>
          <h2 id="service-rates-heading">{t('rates.title')}</h2>
          <p className="service-rates-tagline">{t('rates.tagline')}</p>
          <p className="service-rates-note">{t('rates.lead')}</p>
        </header>

        <div className="service-rates-grid">
          {CARDS.map((card, index) => {
            const fromPrice = summary[card.serviceType]?.fromPrice;
            const fromUsd = summary[card.serviceType]?.fromPriceUsd ?? sarToUsd(fromPrice);
            const title = card.serviceType === 'intercity_transfer'
              ? t('rates.intercityCard')
              : translateService(card.serviceType, t);
            const Icon = card.Icon;
            return (
              <article
                key={card.serviceType}
                className="service-rate-col"
                style={{ '--rise-delay': `${140 + index * 120}ms` }}
              >
                <div className="service-rate-card">
                  <div className="service-rate-media">
                    <img
                      src={card.image}
                      alt={t(card.altKey)}
                      width={720}
                      height={210}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="service-rate-card-body">
                    <div className="service-rate-name">
                      <span className="service-rate-icon" aria-hidden="true">
                        <Icon size={16} />
                      </span>
                      <h3 className="service-rate-title">{title}</h3>
                    </div>
                    <p className="service-rate-sub">{t(SUBTITLE_KEYS[card.serviceType])}</p>
                    <div className="service-rate-price">
                      {fromPrice != null ? (
                        <>
                          <span className="service-rate-from">{t('rates.from')}</span>
                          <strong className="service-rate-amount">{formatSar(fromPrice)}</strong>
                          <span className="service-rate-usd">{formatUsd(fromUsd)}</span>
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
                      <span>{t('rates.book')}</span>
                      <ArrowRightIcon size={16} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
