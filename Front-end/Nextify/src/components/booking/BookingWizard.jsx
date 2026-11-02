import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import {
  SERVICE_TYPES,
  SERVICE_DESCRIPTIONS,
  AIRPORTS,
  getVehicleImage,
  INTERCITY_ROUTES,
  GCC_DESTINATIONS,
  DURATION_OPTIONS,
  initialFormState,
} from './bookingConstants';
import PriceSummary from './PriceSummary';
import PaymentMethods from './PaymentMethods';
import DestinationAutocomplete from './DestinationAutocomplete';
import VehiclePicker from './VehiclePicker';
import { LocaleDateInput, LocaleTimeInput, getLocalDateValue, isTravelDateTimePast } from './ArabicDateTime';
import { FLEET_CLASS, findFleetVehicle, getOfficialQuote, getVehiclesForService } from '../../data/fleetVehicles';
import { calculatePriceAPI, createBookingAPI } from '../../Services/allAPI';
import { useLanguage } from '../../i18n/LanguageContext';
import { translatePlace, translateService } from '../../i18n/places';
import { TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR } from '../../utils/paymentMode';
import { buildWhatsAppConfirmationMessage, openCompanyWhatsApp } from '../../utils/whatsapp';
import './Booking.css';
import { CheckCircleIcon, CoinsIcon, SERVICE_ICONS, ShieldIcon, UserIcon } from '../icons';

const SERVICE_IMAGES = {
  airport_transfer: '/images/services/service-airport.jpg',
  city_transfer: '/images/services/service-city.jpg',
  chauffeur: '/images/services/service-chauffeur.jpg',
  intercity_transfer: '/images/services/service-intercity.jpg',
  gcc_transfer: '/images/services/service-gcc.jpg',
};

const SERVICE_ALT_KEYS = {
  airport_transfer: 'rates.airportAlt',
  city_transfer: 'rates.cityAlt',
  chauffeur: 'rates.chauffeurAlt',
  intercity_transfer: 'rates.intercityAlt',
  gcc_transfer: 'rates.gccAlt',
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
  const [vehicleFilter, setVehicleFilter] = useState('All');
  const wizardRef = useRef(null);
  const pageRef = useRef(null);
  const skipWizardScroll = useRef(true);
  const [inView, setInView] = useState(false);

  const services = useMemo(
    () => Object.entries(SERVICE_TYPES).map(([, value]) => ({
      value,
      label: translateService(value, t),
      desc: t(`services.${value}_desc`) !== `services.${value}_desc` ? t(`services.${value}_desc`) : SERVICE_DESCRIPTIONS[value],
    })),
    [t]
  );

  const vehicles = useMemo(
    () => getVehiclesForService(form.serviceType, vehicleFilter, form.durationType),
    [form.serviceType, vehicleFilter, form.durationType]
  );
  const selectedVehicle = findFleetVehicle({ category: form.vehicleCategory, name: form.vehicleName });
  const today = getLocalDateValue();
  const minTravelTime = form.travelDate === today
    ? `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`
    : undefined;
  const vehicleFilters = [
    { id: 'All', label: t('fleet.all') },
    { id: FLEET_CLASS.FIRST, label: t('fleet.firstClass') },
    { id: FLEET_CLASS.BUSINESS, label: t('fleet.businessClass') },
    { id: FLEET_CLASS.SUV, label: t('fleet.suv') },
    { id: FLEET_CLASS.SEDAN, label: t('fleet.sedan') },
    { id: FLEET_CLASS.VAN, label: t('fleet.van') },
    { id: FLEET_CLASS.COACHES, label: t('fleet.coaches') },
  ];

  useEffect(() => {
    const pre = location.state?.prefill;
    const car = location.state?.car;
    if (pre?.serviceType) {
      setForm((f) => ({ ...f, serviceType: pre.serviceType }));
      setStep(1);
    }
    if (location.state?.serviceType) {
      setForm((f) => ({ ...f, serviceType: location.state.serviceType }));
      setStep(1);
    }
    if (car) {
      const fleet = findFleetVehicle(car);
      if (fleet) {
        setForm((f) => ({
          ...f,
          vehicleCategory: fleet.category,
          vehicleName: fleet.label,
          durationType: fleet.half == null ? 'full_day' : f.durationType,
        }));
        setVehicleFilter(fleet.fleetClass);
        setStep(1);
      }
    }
  }, [location.state]);

  useEffect(() => {
    if (!form.vehicleCategory) return;
    const allowed = getVehiclesForService(form.serviceType, 'All', form.durationType);
    if (!allowed.some((v) => v.category === form.vehicleCategory)) {
      setForm((f) => ({ ...f, vehicleCategory: '', vehicleName: '' }));
      setQuote(null);
    }
  }, [form.serviceType, form.durationType]);

  const update = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    if (Object.prototype.hasOwnProperty.call(patch, 'vehicleCategory') && !patch.vehicleCategory) {
      setQuote(null);
    }
  };

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

  const localQuote = useMemo(() => {
    if (!form.vehicleCategory) return null;
    if (form.serviceType === 'chauffeur' && !form.durationType) return null;
    return getOfficialQuote(buildPricingPayload());
  }, [buildPricingPayload, form.serviceType, form.vehicleCategory, form.durationType]);

  useEffect(() => {
    setQuote(localQuote);
    setError('');
    if (step < 1 || !localQuote || localQuote.customQuoteRequired) {
      setQuoteLoading(false);
      return undefined;
    }

    let cancelled = false;
    setQuoteLoading(false);
    const timer = window.setTimeout(() => {
      calculatePriceAPI(buildPricingPayload()).then((res) => {
        if (cancelled) return;
        const nextQuote = res?.data?.quote || (res?.data?.price != null ? res.data : null);
        if (res?.status === 200 && nextQuote) {
          setQuote(nextQuote);
        }
      });
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // Price-only fields. Do not refetch while typing pickup/guest details.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    localQuote,
    form.vehicleCategory,
    form.durationType,
    form.intercityRoute,
    form.gccDestination,
    form.distanceKm,
    form.serviceType,
    form.airport,
  ]);

  useEffect(() => {
    const el = pageRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
    if (isTravelDateTimePast(form.travelDate, form.travelTime)) {
      setError(t('booking.errPast'));
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
      if (!booking?.bookingNumber) {
        setError(res?.data?.message || res?.error || t('booking.errCreate'));
        return;
      }
      if (booking?.customQuoteRequired || quote?.customQuoteRequired) {
        navigate(`/booking-confirmation/${booking.bookingNumber}`, { state: { booking, customQuote: true } });
        return;
      }

      if (TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR) {
        const message = buildWhatsAppConfirmationMessage({
          booking,
          form,
          quote,
        });
        const opened = openCompanyWhatsApp(message);
        if (!opened.ok) {
          setError(opened.error || t('booking.errWhatsApp'));
        }
        navigate(`/booking-confirmation/${booking.bookingNumber}`, {
          state: { booking, whatsappPending: true },
        });
        return;
      }

      navigate('/payment', { state: { booking } });
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
              <DestinationAutocomplete
                id="booking-pickup"
                value={form.pickupLocation}
                onChange={(pickupLocation) => update({ pickupLocation, origin: pickupLocation || 'Riyadh' })}
                placeholder={t('booking.pickupPh')}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="book-label">{t('booking.dropoff')}</label>
              <DestinationAutocomplete
                id="booking-dropoff"
                value={form.dropoffLocation}
                onChange={(dropoffLocation) => update({ dropoffLocation, destination: dropoffLocation })}
                placeholder={t('booking.dropoffPh')}
              />
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
              <DestinationAutocomplete
                id="booking-service-location"
                value={form.serviceLocation}
                onChange={(serviceLocation) => update({ serviceLocation, pickupLocation: serviceLocation })}
                placeholder={t('booking.locationPh')}
              />
            </div>
            <div className="col-12 col-md-5">
              <span className="book-label">{t('booking.duration')}</span>
              <div className="book-choice-grid">
                {DURATION_OPTIONS.map((d) => (
                  <Choice key={d.value} active={form.durationType === d.value} onClick={() => update({ durationType: d.value })}>
                    {d.value === 'half_day' ? t('booking.halfDayHrs') : t('booking.fullDayHrs')}
                  </Choice>
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

  const summaryForm = {
    ...form,
    vehicleName: selectedVehicle?.label || form.vehicleName,
    vehicleImage: getVehicleImage(form.vehicleCategory),
  };

  const summary = (
    <div className="book-summary-wrap">
      {!form.vehicleCategory ? (
        <div className="book-summary">
          <p className="book-kicker mb-2">{t('booking.fare')}</p>
          <p className="book-empty-quote">{t('booking.chooseRate')}</p>
        </div>
      ) : (
        <PriceSummary
          form={summaryForm}
          quote={quote}
          loading={quoteLoading}
          compact
        />
      )}
      <div className="book-trust">
        <span><UserIcon size={15} /> {t('booking.included')}</span>
        <span><CoinsIcon size={15} /> {t('booking.pricesSar')}</span>
        <span><ShieldIcon size={15} /> {t('booking.backendQuote')}</span>
      </div>
      {TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR && step === 2 && !quote?.customQuoteRequired && (
        <PaymentMethods />
      )}
      {error && !/timeout|network error|econnaborted/i.test(error) && (
        <div className="book-error">{error}</div>
      )}
      {step === 2 && (
        <button
          type="button"
          className="lux-btn w-100 mt-4"
          style={{ padding: '14px 24px' }}
          disabled={loading || !quote}
          onClick={handleSubmit}
        >
          {loading ? t('booking.processing') : quote?.customQuoteRequired ? t('booking.requestQuote') : t('booking.payNow')}
        </button>
      )}
    </div>
  );

  return (
    <div className={`book-page${inView ? ' is-inview' : ''}`} ref={pageRef}>
      <Container>
        <header className="book-heading">
          <p className="book-kicker">{t('booking.kicker')}</p>
          <span className="book-heading-line" aria-hidden="true" />
          <h1 className="book-title">{t('booking.title')}</h1>
          <p className="book-lead">{t('booking.lead')}</p>
        </header>

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
          <div className="book-service-grid">
            {services.map((s, index) => {
              const ServiceIcon = SERVICE_ICONS[s.value];
              const selected = form.serviceType === s.value;
              return (
              <div
                key={s.value}
                className="book-service-item"
                style={{ '--rise-delay': `${140 + index * 120}ms` }}
              >
                <button
                  type="button"
                  className={`book-service-card${selected ? ' is-active' : ''}`}
                  aria-pressed={selected}
                  onClick={() => {
                    update({ serviceType: s.value, vehicleCategory: '', vehicleName: '', durationType: '' });
                    setVehicleFilter('All');
                    setError('');
                    setStep(1);
                  }}
                >
                  <div className="book-service-media">
                    <img
                      src={SERVICE_IMAGES[s.value]}
                      alt={t(SERVICE_ALT_KEYS[s.value])}
                      width={720}
                      height={198}
                      loading={index < 3 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                    {selected && (
                      <span className="book-service-check" aria-hidden="true">
                        <CheckCircleIcon size={16} />
                      </span>
                    )}
                  </div>
                  <div className="book-service-body">
                    <div className="book-service-name">
                      <span className="book-service-icon" aria-hidden="true">
                        {ServiceIcon ? <ServiceIcon size={16} /> : null}
                      </span>
                      <span className="book-service-title">{s.label}</span>
                    </div>
                    <p className="book-service-desc">{s.desc}</p>
                  </div>
                </button>
              </div>
              );
            })}
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
                        <LocaleTimeInput className="form-control book-input" value={form.travelTime} min={minTravelTime} onChange={(travelTime) => update({ travelTime })} />
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
                    <div className="book-vehicle-filters">
                      {vehicleFilters.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`book-vehicle-chip${vehicleFilter === option.id ? ' is-active' : ''}`}
                          onClick={() => setVehicleFilter(option.id)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <VehiclePicker
                      vehicles={vehicles}
                      value={form.vehicleCategory}
                      placeholder={form.serviceType === 'chauffeur' && !form.durationType ? t('booking.pickDurationFirst') : t('booking.pickVehicle')}
                      onChange={(v) => update({
                        vehicleCategory: v.category,
                        vehicleName: v.label,
                      })}
                    />
                    {form.serviceType === 'chauffeur' && form.durationType === 'half_day' && (
                      <span className="book-hint">{t('booking.halfDayVehicles')}</span>
                    )}
                    {form.serviceType === 'chauffeur' && form.durationType === 'full_day' && (
                      <span className="book-hint">{t('booking.fullDayVehicles')}</span>
                    )}
                    {selectedVehicle?.fullDayNote && (
                      <span className="book-hint">{t('booking.coachNote')}</span>
                    )}
                    {form.serviceType === 'city_transfer' && selectedVehicle?.city == null && form.vehicleCategory && (
                      <span className="book-hint">{t('booking.cityUnavailable')}</span>
                    )}
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
