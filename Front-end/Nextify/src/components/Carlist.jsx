import { useEffect, useState } from 'react';
import Container from 'react-bootstrap/Container';
import { useNavigate } from 'react-router-dom';
import { applyLocalCarImages, getCarImageUrl, initialCars, sortCarsForShowcase } from '../utils/carsStorage';
import { FLEET_CLASS, getFleetClass } from '../data/fleetVehicles';
import { getCarsAPI, getPricingRulesAPI } from '../Services/allAPI';
import VehiclePricingDisplay from './pricing/VehiclePricingDisplay';
import { formatCarDayPriceForLang } from '../i18n/format';
import { useLanguage } from '../i18n/LanguageContext';
import { BriefcaseIcon, UsersIcon } from './icons';

const getCarListId = (car) => {
  if (car?._id) return String(car._id);
  const numeric = Number(car?.id);
  if (Number.isInteger(numeric) && numeric > 0 && String(car.id).length < 16) return numeric;
  return car?.id;
};

function Carlist() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [cars, setCars] = useState(initialCars);
  const [activeFilter, setActiveFilter] = useState('All');
  const [pricingRules, setPricingRules] = useState([]);

  const handleCardClick = (car) => {
    navigate('/cardetails', { state: { car } });
  };

  useEffect(() => {
    let cancelled = false;
    getCarsAPI().then((response) => {
      if (!cancelled && response && Array.isArray(response.data)) {
        const visible = response.data.filter((car) => car?.available !== false);
        setCars(applyLocalCarImages(visible, { collapseGmc: true }));
      }
    });
    getPricingRulesAPI().then((res) => {
      if (!cancelled && res?.status === 200) setPricingRules(res.data?.rules || []);
    });
    return () => { cancelled = true; };
  }, []);

  const getCarCategory = (car) => {
    const fleetClass = getFleetClass(car);
    if (fleetClass) return fleetClass;
    const type = String(car.type || '').toLowerCase();
    const name = String(car.name || '').toLowerCase();

    if (type.includes('suv') || name.includes('gmc') || name.includes('yukon') || name.includes('tahoe') || name.includes('suburban')) return FLEET_CLASS.SUV;
    if (type.includes('coach') || type.includes('bus') || type.includes('mini bus') || name.includes('coaster')) return FLEET_CLASS.COACHES;
    if (type.includes('van') || type.includes('minivan') || type.includes('passenger van') || name.includes('hiace') || name.includes('sprinter') || name.includes('v-class')) return FLEET_CLASS.VAN;
    if (name.includes('s-class') || name.includes('7 series')) return FLEET_CLASS.FIRST;
    if (name.includes('e-class') || name.includes('5 series')) return FLEET_CLASS.BUSINESS;
    return FLEET_CLASS.SEDAN;
  };

  const filterOptions = [
    { id: 'All', label: t('fleet.all') },
    { id: FLEET_CLASS.FIRST, label: t('fleet.firstClass') },
    { id: FLEET_CLASS.BUSINESS, label: t('fleet.businessClass') },
    { id: FLEET_CLASS.SUV, label: t('fleet.suv') },
    { id: FLEET_CLASS.SEDAN, label: t('fleet.sedan') },
    { id: FLEET_CLASS.VAN, label: t('fleet.van') },
    { id: FLEET_CLASS.COACHES, label: t('fleet.coaches') },
  ];

  const filteredCars = sortCarsForShowcase(cars.filter((car) => car?.available !== false)).filter((car) => {
    if (activeFilter === 'All') return true;
    return getCarCategory(car) === activeFilter;
  });

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: 'white', paddingTop: '140px', paddingBottom: '80px' }}>
      <Container>
        <div className="text-center mb-5">
          <p className="text-uppercase fw-semibold mb-2" style={{ color: '#a0a0a0', letterSpacing: '3px', fontSize: '0.8rem' }}>
            {t('fleet.kicker')}
          </p>
          <h2 className="display-4 fw-normal mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            {t('fleet.title')}
          </h2>
          <div style={{ width: '60px', height: '2px', backgroundColor: '#fff', margin: '0 auto' }}></div>
        </div>

        <div className="d-flex flex-wrap justify-content-center gap-2 gap-md-3 mb-4">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setActiveFilter(option.id)}
              className="btn btn-sm text-uppercase fw-semibold"
              style={{
                borderRadius: '999px',
                padding: '10px 16px',
                letterSpacing: '1px',
                border: activeFilter === option.id ? '1px solid rgba(238, 176, 18, 0.9)' : '1px solid rgba(255,255,255,0.16)',
                background: activeFilter === option.id ? 'rgba(238, 176, 18, 0.18)' : 'rgba(255,255,255,0.04)',
                color: activeFilter === option.id ? '#f6d26e' : 'rgba(255,255,255,0.85)',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="row g-4">
          {filteredCars.map((car) => (
            <div key={getCarListId(car) || car.name} className="col-lg-4 col-md-6 mb-4">
              <div
                className="h-100 d-flex flex-column fleet-card"
                style={{
                  backgroundColor: '#141414',
                  border: '1px solid rgba(255,255,255,0.05)',
                  transition: 'transform 0.3s ease, border-color 0.3s ease',
                  cursor: 'pointer',
                }}
                onClick={() => handleCardClick(car)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-10px)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                }}
              >
                <div className="fleet-card-image">
                  {car.img && (
                    <img
                      key={String(car.img).slice(0, 80)}
                      src={getCarImageUrl(car.img)}
                      alt={car.name}
                    />
                  )}
                </div>
                <div className="p-4 d-flex flex-column flex-grow-1">
                  <p className="mb-1 text-uppercase" style={{ fontSize: '0.7rem', color: '#a0a0a0', letterSpacing: '1px' }}>{car.type}</p>
                  <h3 className="h4 mb-3" style={{ fontFamily: 'Georgia, serif' }}>{car.name}</h3>

                  <div className="mb-3">
                    <span
                      className="badge bg-dark border border-secondary text-light fw-normal py-2 px-3 rounded-pill"
                      style={{ fontSize: '0.72rem' }}
                    >
                      {getCarCategory(car)}
                    </span>
                  </div>

                  {car.description ? (
                    <p className="small mb-3" style={{ color: 'rgba(255,255,255,0.62)', lineHeight: 1.55 }}>
                      {car.description}
                    </p>
                  ) : null}

                  <div className="d-flex flex-wrap gap-2 mb-4 mt-auto">
                    <span className="badge bg-dark border border-secondary text-light fw-normal py-2 px-3 rounded-pill" style={{ fontSize: '0.75rem' }}>
                      <UsersIcon size={14} className="me-2" />
                      {car.seats}
                    </span>
                    <span className="badge bg-dark border border-secondary text-light fw-normal py-2 px-3 rounded-pill" style={{ fontSize: '0.75rem' }}>
                      <BriefcaseIcon size={14} className="me-2" />
                      {car.luggage}
                    </span>
                  </div>

                  {formatCarDayPriceForLang(car, lang) && (
                    <p className="mb-2 fw-semibold" style={{ color: '#f4f4f4', fontSize: '0.95rem' }}>
                      {formatCarDayPriceForLang(car, lang)}
                      <span className="ms-1" style={{ color: '#888', fontWeight: 400, fontSize: '0.75rem' }}>{t('fleet.perDay')}</span>
                    </p>
                  )}
                  <VehiclePricingDisplay rules={pricingRules} car={car} />

                  <div className="d-flex justify-content-between align-items-center pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <span className="fw-bold fs-6" style={{ color: '#888' }}>{t('fleet.chauffeur')}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleCardClick(car); }}
                      className="lux-btn lux-btn-sm"
                    >
                      {t('fleet.book')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}

export default Carlist;
