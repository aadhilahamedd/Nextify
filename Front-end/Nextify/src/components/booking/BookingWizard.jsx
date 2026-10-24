import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import {
  SERVICE_TYPES,
  SERVICE_DESCRIPTIONS,
  AIRPORTS,
  VEHICLES_BY_SERVICE,
  getVehicleImage,
  INTERCITY_ROUTES,
  GCC_DESTINATIONS,
  DURATION_OPTIONS,
  initialFormState,
} from './bookingConstants';
import PriceSummary from './PriceSummary';
import DestinationAutocomplete from './DestinationAutocomplete';
import { LocaleDateInput, LocaleTimeInput } from './ArabicDateTime';
import { calculatePriceAPI, createBookingAPI } from '../../Services/allAPI';
import { useLanguage } from '../../i18n/LanguageContext';
import { translatePlace, translateService, translateVehicle } from '../../i18n/places';
import './Booking.css';

const SERVICE_ICONS = {
  airport_transfer: 'bi-airplane',
  city_transfer: 'bi-geo-alt',
  chauffeur: 'bi-clock-history',
  intercity_transfer: 'bi-signpost-split',
  gcc_transfer: 'bi-globe2',
};

function BookingWizard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang, formatNumber } = useLanguage();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...initialFormState });
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const wizardRef = useRef(null);
  const skipWizardScroll = useRef(true);

  const services = useMemo(
    () => Object.entries(SERVICE_TYPES).map(([, value]) => ({
      value,
      label: translateService(value, t),
      desc: t(`services.${value}_desc`) !== `services.${value}_desc` ? t(`services.${value}_desc`) : SERVICE_DESCRIPTIONS[value],
    })),
    [t]
  );

  const vehicles = VEHICLES_BY_SERVICE[form.serviceType] || [];
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const pre = location.state?.prefill;
    if (pre?.serviceType) {
      setForm((f) => ({ ...f, serviceType: pre.serviceType }));
      setStep(1);
    }
    if (location.state?.serviceType) {
      setForm((f) => ({ ...f, serviceType: location.state.serviceType }));
      setStep(1);
    }
  }, [location.state]);

  const update = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    const pricingKeys = [
      'serviceType', 'vehicleCategory', 'vehicleName', 'airport', 'origin', 'destination',
      'durationType', 'distanceKm', 'intercityRoute', 'gccDestination', 'pickupLocation',
      'dropoffLocation', 'serviceLocation',
    ];
    if (Object.keys(patch).some((key) => pricingKeys.includes(key))) {
      setQuote(null);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.category === form.vehicleCategory);

  const buildPricingPayload = useCallback(() => {
    const route = INTERCITY_ROUTES.find((r) => r.label === form.intercityRoute);
    const gcc = GCC_DESTINATIONS.find((g) => g.destination === form.gccDestination || g.label === form.gccDestination);
    return {
      serviceType: form.serviceType,
      vehicleCategory: form.vehicleCategory,
      vehicleName: selectedVehicle?.label || form.vehicleName,
      airport: form.airport,
      origin: form.origin || form.pickupLocation || 'Riyadh',
      destination: route
        ? route.destination
        : gcc
          ? gcc.destination
          : form.destination || form.dropoffLocation,
      durationType: form.durationType,
      distanceKm: form.distanceKm ? Number(form.distanceKm) : undefined,
    };
  }, [form, selectedVehicle]);

  const fetchQuote = async () => {
    if (!form.vehicleCategory) return;
    setQuoteLoading(true);
    setError('');
    const res = await calculatePriceAPI(buildPricingPayload());
    setQuoteLoading(false);
    if (res?.status === 200 && res.data?.quote) {
      setQuote(res.data.quote);
    } else {
      setError(res?.data?.message || res?.error || t('booking.errPrice'));
    }
  };

  useEffect(() => {
    if (form.vehicleCategory && step >= 1) fetchQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.vehicleCategory, form.durationType, form.intercityRoute, form.gccDestination, form.distanceKm, form.serviceType]);

  useEffect(() => {
    if (skipWizardScroll.current) {
      skipWizardScroll.current = false;
      return;
    }
    const node = wizardRef.current;
    if (!node) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.requestAnimationFrame(() => {
      node.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  }, [step]);

  const validateTrip = () => {
    if (!form.travelDate || !form.travelTime) {
      setError(t('booking.errDate'));
      return false;
    }
    if (!form.vehicleCategory) {
      setError(t('booking.errVehicle'));
      return false;
    }
    if (form.serviceType === 'airport_transfer' && !form.destination?.trim()) {
      setError(t('booking.errDest'));
      return false;
    }
    if (form.serviceType === 'city_transfer' && (!form.pickupLocation?.trim() || !form.dropoffLocation?.trim())) {
      setError(t('booking.errCity'));
      return false;
    }
    if (form.serviceType === 'chauffeur' && (!form.serviceLocation?.trim() || !form.durationType)) {
      setError(t('booking.errChauffeur'));
      return false;
    }
    if (form.serviceType === 'intercity_transfer' && !form.intercityRoute) {
      setError(t('booking.errRoute'));
      return false;
    }
    if (form.serviceType === 'gcc_transfer' && !form.gccDestination) {
      setError(t('booking.errGcc'));
      return false;
    }
    setError('');
    return true;
  };

  const validate = () => {
    if (!validateTrip()) return false;
    if (!form.customer.name || !form.customer.email || !form.customer.mobile) {
      setError(t('booking.errGuest'));
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setError('');

    const payload = {
      ...buildPricingPayload(),
      vehicleName: selectedVehicle?.label || form.vehicleName,
      travelDate: form.travelDate,
      travelTime: form.travelTime,
      schedule: { pickupDateTime: `${form.travelDate}T${form.travelTime}` },
      flightNumber: form.flightNumber,
      pickupLocation: form.pickupLocation || form.origin || form.serviceLocation,
      dropoffLocation: form.dropoffLocation || form.destination,
      passengers: form.passengers,
      luggage: form.luggage,
      passengerCount: form.passengers,
      luggageCount: form.luggage,
      customer: form.customer,
      specialRequests: form.specialRequests,
    };

    const res = await createBookingAPI(payload);
    setLoading(false);

    if (res?.status === 201 || res?.status === 200) {
      const booking = res.data?.booking || res.data?.data?.booking;
      if (booking?.customQuoteRequired || quote?.customQuoteRequired) {
        navigate(`/booking-confirmation/${booking.bookingNumber}`, { state: { booking, customQuote: true } });
      } else {
        navigate('/payment', { state: { booking } });
      }
    } else {
      setError(res?.data?.message || res?.error || t('booking.errCreate'));
    }
  };

  const Choice = ({ active, onClick, children }) => (
    <button type="button" className={`book-choice${active ? ' is-active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );

  const renderServiceForm = () => {
    switch (form.serviceType) {
      case 'airport_transfer':
        return (
          <>
            <div className="col-12">
              <span className="book-label">{t('booking.airport')}</span>
              <div className="book-choice-grid">
                {AIRPORTS.map((a) => (
                  <Choice key={a} active={form.airport === a} onClick={() => update({ airport: a })}>{translatePlace(a, t, lang)}</Choice>
                ))}
              </div>
            </div>
            <div className="col-12 col-md-6">
              <label className="book-label">{t('booking.destination')}</label>
              <DestinationAutocomplete value={form.destination} onChange={(destination) => update({ destination })} placeholder={t('booking.destPh')} />
            </div>
            <div className="col-12 col-md-6">
              <label className="book-label">{t('booking.flight')}</label>
              <input className="form-control book-input" value={form.flightNumber} onChange={(e) => update({ flightNumber: e.target.value })} placeholder={t('booking.flightPh')} autoComplete="off" />
            </div>
          </>
        );
      case 'city_transfer':
        return (
          <>
            <div className="col-12 col-md-6">
              <label className="book-label">{t('booking.pickup')}</label>
              <input className="form-control book-input" value={form.pickupLocation} onChange={(e) => update({ pickupLocation: e.target.value, origin: 'Riyadh' })} placeholder={t('booking.pickupPh')} autoComplete="street-address" />
            </div>
            <div className="col-12 col-md-6">
              <label className="book-label">{t('booking.dropoff')}</label>
              <input className="form-control book-input" value={form.dropoffLocation} onChange={(e) => update({ dropoffLocation: e.target.value, destination: e.target.value })} placeholder={t('booking.dropoffPh')} autoComplete="street-address" />
            </div>
            <div className="col-12 col-md-6">
              <label className="book-label">{t('booking.distance')}</label>
              <input type="number" inputMode="numeric" min={0} max={100} className="form-control book-input" value={form.distanceKm} onChange={(e) => update({ distanceKm: e.target.value })} placeholder={t('booking.distancePh')} />
              <span className="book-hint">{t('booking.distanceHint')}</span>
            </div>
          </>
        );
      case 'chauffeur':
        return (
          <>
            <div className="col-12 col-md-7">
              <label className="book-label">{t('booking.location')}</label>
              <input className="form-control book-input" value={form.serviceLocation} onChange={(e) => update({ serviceLocation: e.target.value, pickupLocation: e.target.value })} placeholder={t('booking.locationPh')} autoComplete="street-address" />
            </div>
            <div className="col-12 col-md-5">
              <span className="book-label">{t('booking.duration')}</span>
              <div className="book-choice-grid">
                {DURATION_OPTIONS.map((d) => (
                  <Choice key={d.value} active={form.durationType === d.value} onClick={() => update({ durationType: d.value })}>{d.value === 'half_day' ? t('booking.halfDay') : t('booking.fullDay')}</Choice>
                ))}
              </div>
            </div>
          </>
        );
      case 'intercity_transfer':
        return (
          <div className="col-12">
            <span className="book-label">{t('booking.route')}</span>
            <div className="book-choice-grid">
              {INTERCITY_ROUTES.map((r) => (
                <Choice
                  key={r.label}
                  active={form.intercityRoute === r.label}
                  onClick={() => update({ intercityRoute: r.label, origin: r.origin, destination: r.destination })}
                >
                  {translatePlace(r.label, t, lang)}
                </Choice>
              ))}
            </div>
          </div>
        );
      case 'gcc_transfer':
        return (
          <div className="col-12">
            <span className="book-label">{t('booking.gccDest')}</span>
            <div className="book-choice-grid">
              {GCC_DESTINATIONS.map((g) => (
                <Choice
                  key={g.destination}
                  active={form.gccDestination === g.destination}
                  onClick={() => update({ gccDestination: g.destination, destination: g.destination })}
                >
                  {translatePlace(g.label, t, lang)}
                </Choice>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const summary = (
    <div className="book-summary-wrap">
      {quoteLoading && <p className="book-empty-quote mb-3">{t('booking.confirming')}</p>}
      {!quote && !quoteLoading && (
        <div className="book-summary">
          <p className="book-kicker mb-2">{t('booking.fare')}</p>
          <p className="book-empty-quote">{t('booking.chooseRate')}</p>
        </div>
      )}
      {quote && (
        <PriceSummary
          form={{
            ...form,
            vehicleName: selectedVehicle?.label,
            vehicleImage: getVehicleImage(form.vehicleCategory),
          }}
          quote={quote}
          compact
        />
      )}
      <div className="book-trust">
        <span><i className="bi bi-person-badge" /> {t('booking.included')}</span>
        <span><i className="bi bi-currency-exchange" /> {t('booking.pricesSar')}</span>
        <span><i className="bi bi-shield-check" /> {t('booking.backendQuote')}</span>
      </div>
      {error && <div className="book-error">{error}</div>}
      {step === 2 && (
        <button
          type="button"
          className="lux-btn w-100 mt-4"
          style={{ padding: '14px 24px' }}
          disabled={loading || quoteLoading || !quote}
          onClick={handleSubmit}
        >
          {loading ? t('booking.processing') : quote?.customQuoteRequired ? t('booking.requestQuote') : t('booking.continueBooking')}
        </button>
      )}
    </div>
  );

  return (
    <div className="book-page">
      <Container>
        <div className="text-center mb-2">
          <p className="book-kicker">{t('booking.kicker')}</p>
          <h1 className="book-title">{t('booking.title')}</h1>
          <p className="book-lead">{t('booking.lead')}</p>
        </div>

        <div className="book-wizard" ref={wizardRef}>
        <p className="book-progress-mobile">{t('booking.stepOf', { current: formatNumber(step + 1), label: step === 0 ? t('booking.service') : step === 1 ? t('booking.trip') : t('booking.guest') })}</p>
        <div className="book-stepper" aria-label="Booking steps">
          <div className={`book-step${step === 0 ? ' is-active' : ''}${step > 0 ? ' is-done' : ''}`}>
            <span className="book-step-num">{formatNumber(1)}</span>
            <span className="book-step-label">{t('booking.service')}</span>
          </div>
          <div className="book-step-line" />
          <div className={`book-step${step === 1 ? ' is-active' : ''}${step > 1 ? ' is-done' : ''}`}>
            <span className="book-step-num">{formatNumber(2)}</span>
            <span className="book-step-label">{t('booking.trip')}</span>
          </div>
          <div className="book-step-line" />
          <div className={`book-step${step === 2 ? ' is-active' : ''}`}>
            <span className="book-step-num">{formatNumber(3)}</span>
            <span className="book-step-label">{t('booking.guest')}</span>
          </div>
        </div>

        {step === 0 && (
          <div className="row g-3">
            {services.map((s) => (
              <div key={s.value} className="col-md-6 col-lg-4">
                <button
                  type="button"
                  className={`book-service-card${form.serviceType === s.value ? ' is-active' : ''}`}
                  onClick={() => {
                    update({ serviceType: s.value, vehicleCategory: '', vehicleName: '' });
                    setError('');
                    setStep(1);
                  }}
                >
                  <div className="book-service-icon"><i className={`bi ${SERVICE_ICONS[s.value]}`} /></div>
                  <h5 className="mb-2" style={{ fontFamily: 'Georgia, serif' }}>{s.label}</h5>
                  <p className="small mb-0" style={{ color: 'rgba(255,255,255,0.62)', lineHeight: 1.6 }}>{s.desc}</p>
                </button>
              </div>
            ))}
          </div>
        )}

        {step >= 1 && (
          <div className="row g-4">
            <div className="col-lg-7">
              <div className="book-panel">
                <div className="book-panel-head">
                  <div>
                    <p className="book-kicker mb-1">{step === 1 ? t('booking.step2') : t('booking.step3')}</p>
                    <h2 className="h4 mb-0" style={{ fontFamily: 'Georgia, serif' }}>
                      {step === 1 ? translateService(form.serviceType, t) : t('booking.guestDetails')}
                    </h2>
                  </div>
                  <button type="button" className="book-ghost" onClick={() => { setError(''); setStep(step === 2 ? 1 : 0); }}>
                    {step === 2 ? t('booking.back') : t('booking.changeService')}
                  </button>
                </div>

                {step === 1 && (
                  <>
                    <div className="row g-3">{renderServiceForm()}</div>
                    <h3 className="book-section-title mt-4">{t('booking.when')}</h3>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="book-label">{t('booking.travelDate')}</label>
                        <LocaleDateInput min={today} className="form-control book-input" value={form.travelDate} onChange={(travelDate) => update({ travelDate })} />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="book-label">{t('booking.travelTime')}</label>
                        <LocaleTimeInput className="form-control book-input" value={form.travelTime} onChange={(travelTime) => update({ travelTime })} />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="book-label">{t('booking.passengers')}</label>
                        <input type="number" inputMode="numeric" min={1} className="form-control book-input" value={form.passengers} onChange={(e) => update({ passengers: Number(e.target.value) })} />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="book-label">{t('booking.luggage')}</label>
                        <input type="number" inputMode="numeric" min={0} className="form-control book-input" value={form.luggage} onChange={(e) => update({ luggage: Number(e.target.value) })} />
                      </div>
                    </div>
                    <h3 className="book-section-title mt-4">{t('booking.chooseVehicle')}</h3>
                    <div className="book-choice-grid">
                      {vehicles.map((v) => (
                        <Choice
                          key={v.category}
                          active={form.vehicleCategory === v.category}
                          onClick={() => update({ vehicleCategory: v.category, vehicleName: v.label })}
                        >
                          {translateVehicle(v.category, v.label, t)}
                          <small>{t('booking.chauffeurIncluded')}</small>
                        </Choice>
                      ))}
                    </div>
                    <div className="book-actions">
                      <button type="button" className="lux-btn" style={{ padding: '12px 28px' }} onClick={() => { if (validateTrip()) setStep(2); }}>
                        {t('booking.continue')}
                      </button>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="book-label">{t('booking.fullName')}</label>
                      <input className="form-control book-input" value={form.customer.name} onChange={(e) => update({ customer: { ...form.customer, name: e.target.value } })} placeholder={t('booking.namePh')} autoComplete="name" />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="book-label">{t('booking.email')}</label>
                      <input type="email" inputMode="email" autoComplete="email" className="form-control book-input" value={form.customer.email} onChange={(e) => update({ customer: { ...form.customer, email: e.target.value } })} placeholder={t('booking.emailPh')} />
                    </div>
                    <div className="col-12">
                      <label className="book-label">{t('booking.mobile')}</label>
                      <input type="tel" inputMode="tel" autoComplete="tel" className="form-control book-input" value={form.customer.mobile} onChange={(e) => update({ customer: { ...form.customer, mobile: e.target.value } })} placeholder={t('booking.mobilePh')} />
                    </div>
                    <div className="col-12">
                      <label className="book-label">{t('booking.special')}</label>
                      <textarea className="form-control book-input" rows={3} value={form.specialRequests} onChange={(e) => update({ specialRequests: e.target.value })} placeholder={t('booking.specialPh')} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="col-lg-5">{summary}</div>
          </div>
        )}
        </div>
      </Container>
    </div>
  );
}

export default BookingWizard;
