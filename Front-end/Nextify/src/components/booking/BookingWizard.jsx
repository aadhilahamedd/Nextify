import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import {
  SERVICE_TYPES,
  SERVICE_LABELS,
  SERVICE_DESCRIPTIONS,
  AIRPORTS,
  VEHICLES_BY_SERVICE,
  INTERCITY_ROUTES,
  GCC_DESTINATIONS,
  DURATION_OPTIONS,
  initialFormState,
} from './bookingConstants';
import PriceSummary from './PriceSummary';
import { calculatePriceAPI, createBookingAPI } from '../../Services/allAPI';
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
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...initialFormState });
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const services = useMemo(
    () => Object.entries(SERVICE_TYPES).map(([, value]) => ({
      value,
      label: SERVICE_LABELS[value],
      desc: SERVICE_DESCRIPTIONS[value],
    })),
    []
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
      setError(res?.data?.message || res?.error || 'Could not calculate price');
    }
  };

  useEffect(() => {
    if (form.vehicleCategory && step >= 1) fetchQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.vehicleCategory, form.durationType, form.intercityRoute, form.gccDestination, form.distanceKm, form.serviceType]);

  const validateTrip = () => {
    if (!form.travelDate || !form.travelTime) {
      setError('Please choose your travel date and time.');
      return false;
    }
    if (!form.vehicleCategory) {
      setError('Please select a vehicle.');
      return false;
    }
    if (form.serviceType === 'airport_transfer' && !form.destination?.trim()) {
      setError('Please enter your destination.');
      return false;
    }
    if (form.serviceType === 'city_transfer' && (!form.pickupLocation?.trim() || !form.dropoffLocation?.trim())) {
      setError('Pickup and drop-off locations are required.');
      return false;
    }
    if (form.serviceType === 'chauffeur' && (!form.serviceLocation?.trim() || !form.durationType)) {
      setError('Service location and duration are required.');
      return false;
    }
    if (form.serviceType === 'intercity_transfer' && !form.intercityRoute) {
      setError('Please select an intercity route.');
      return false;
    }
    if (form.serviceType === 'gcc_transfer' && !form.gccDestination) {
      setError('Please select a GCC destination.');
      return false;
    }
    setError('');
    return true;
  };

  const validate = () => {
    if (!validateTrip()) return false;
    if (!form.customer.name || !form.customer.email || !form.customer.mobile) {
      setError('Name, email, and mobile are required.');
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
      vehicleName: selectedVehicle?.label,
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
      setError(res?.data?.message || res?.error || 'Failed to create booking');
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
              <span className="book-label">Airport</span>
              <div className="book-choice-grid">
                {AIRPORTS.map((a) => (
                  <Choice key={a} active={form.airport === a} onClick={() => update({ airport: a })}>{a}</Choice>
                ))}
              </div>
            </div>
            <div className="col-md-6">
              <label className="book-label">Destination *</label>
              <input className="form-control book-input" value={form.destination} onChange={(e) => update({ destination: e.target.value })} placeholder="Hotel, home, or city area" />
            </div>
            <div className="col-md-6">
              <label className="book-label">Flight number</label>
              <input className="form-control book-input" value={form.flightNumber} onChange={(e) => update({ flightNumber: e.target.value })} placeholder="Optional, e.g. SV123" />
            </div>
          </>
        );
      case 'city_transfer':
        return (
          <>
            <div className="col-md-6">
              <label className="book-label">Pickup *</label>
              <input className="form-control book-input" value={form.pickupLocation} onChange={(e) => update({ pickupLocation: e.target.value, origin: 'Riyadh' })} placeholder="Pickup address in Riyadh" />
            </div>
            <div className="col-md-6">
              <label className="book-label">Drop-off *</label>
              <input className="form-control book-input" value={form.dropoffLocation} onChange={(e) => update({ dropoffLocation: e.target.value, destination: e.target.value })} placeholder="Drop-off address" />
            </div>
            <div className="col-md-6">
              <label className="book-label">Estimated distance (KM)</label>
              <input type="number" min={0} max={100} className="form-control book-input" value={form.distanceKm} onChange={(e) => update({ distanceKm: e.target.value })} placeholder="0–20 KM approved rate" />
              <span className="book-hint">Trips above 20 KM need a custom quote.</span>
            </div>
          </>
        );
      case 'chauffeur':
        return (
          <>
            <div className="col-md-7">
              <label className="book-label">Service location *</label>
              <input className="form-control book-input" value={form.serviceLocation} onChange={(e) => update({ serviceLocation: e.target.value, pickupLocation: e.target.value })} placeholder="Where should we meet you?" />
            </div>
            <div className="col-md-5">
              <span className="book-label">Duration *</span>
              <div className="book-choice-grid">
                {DURATION_OPTIONS.map((d) => (
                  <Choice key={d.value} active={form.durationType === d.value} onClick={() => update({ durationType: d.value })}>{d.label}</Choice>
                ))}
              </div>
            </div>
          </>
        );
      case 'intercity_transfer':
        return (
          <div className="col-12">
            <span className="book-label">Route *</span>
            <div className="book-choice-grid">
              {INTERCITY_ROUTES.map((r) => (
                <Choice
                  key={r.label}
                  active={form.intercityRoute === r.label}
                  onClick={() => update({ intercityRoute: r.label, origin: r.origin, destination: r.destination })}
                >
                  {r.label}
                </Choice>
              ))}
            </div>
          </div>
        );
      case 'gcc_transfer':
        return (
          <div className="col-12">
            <span className="book-label">Destination *</span>
            <div className="book-choice-grid">
              {GCC_DESTINATIONS.map((g) => (
                <Choice
                  key={g.destination}
                  active={form.gccDestination === g.destination}
                  onClick={() => update({ gccDestination: g.destination, destination: g.destination })}
                >
                  {g.label}
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
      {quoteLoading && <p className="book-empty-quote mb-3">Confirming your fare...</p>}
      {!quote && !quoteLoading && (
        <div className="book-summary">
          <p className="book-kicker mb-2">Your fare</p>
          <p className="book-empty-quote">Choose a vehicle to see the official Nextify rate. Prices are never estimated on this page.</p>
        </div>
      )}
      {quote && <PriceSummary form={{ ...form, vehicleName: selectedVehicle?.label }} quote={quote} compact />}
      <div className="book-trust">
        <span><i className="bi bi-person-badge" /> Professional chauffeur included</span>
        <span><i className="bi bi-currency-exchange" /> Prices in SAR</span>
        <span><i className="bi bi-shield-check" /> Backend-confirmed quote</span>
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
          {loading ? 'Processing...' : quote?.customQuoteRequired ? 'Request Quote' : 'Continue Booking'}
        </button>
      )}
    </div>
  );

  return (
    <div className="book-page">
      <Container>
        <div className="text-center mb-2">
          <p className="book-kicker">Luxury chauffeur booking</p>
          <h1 className="book-title">Reserve your journey</h1>
          <p className="book-lead">A calm, three-step booking. Every trip includes a professional chauffeur — never self-drive.</p>
        </div>

        <div className="book-stepper" aria-label="Booking steps">
          <div className={`book-step${step === 0 ? ' is-active' : ''}${step > 0 ? ' is-done' : ''}`}>
            <span className="book-step-num">1</span>
            <span className="book-step-label">Service</span>
          </div>
          <div className="book-step-line" />
          <div className={`book-step${step === 1 ? ' is-active' : ''}${step > 1 ? ' is-done' : ''}`}>
            <span className="book-step-num">2</span>
            <span className="book-step-label">Trip details</span>
          </div>
          <div className="book-step-line" />
          <div className={`book-step${step === 2 ? ' is-active' : ''}`}>
            <span className="book-step-num">3</span>
            <span className="book-step-label">Guest</span>
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
                    <p className="book-kicker mb-1">{step === 1 ? 'Step 2' : 'Step 3'}</p>
                    <h2 className="h4 mb-0" style={{ fontFamily: 'Georgia, serif' }}>
                      {step === 1 ? SERVICE_LABELS[form.serviceType] : 'Guest details'}
                    </h2>
                  </div>
                  <button type="button" className="book-ghost" onClick={() => { setError(''); setStep(step === 2 ? 1 : 0); }}>
                    {step === 2 ? 'Back' : 'Change service'}
                  </button>
                </div>

                {step === 1 && (
                  <>
                    <div className="row g-3">{renderServiceForm()}</div>
                    <h3 className="book-section-title mt-4">When do you travel?</h3>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="book-label">Travel date *</label>
                        <input type="date" min={today} className="form-control book-input" value={form.travelDate} onChange={(e) => update({ travelDate: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="book-label">Travel time *</label>
                        <input type="time" className="form-control book-input" value={form.travelTime} onChange={(e) => update({ travelTime: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="book-label">Passengers</label>
                        <input type="number" min={1} className="form-control book-input" value={form.passengers} onChange={(e) => update({ passengers: Number(e.target.value) })} />
                      </div>
                      <div className="col-md-6">
                        <label className="book-label">Luggage</label>
                        <input type="number" min={0} className="form-control book-input" value={form.luggage} onChange={(e) => update({ luggage: Number(e.target.value) })} />
                      </div>
                    </div>
                    <h3 className="book-section-title mt-4">Choose your vehicle</h3>
                    <div className="book-choice-grid">
                      {vehicles.map((v) => (
                        <Choice
                          key={v.category}
                          active={form.vehicleCategory === v.category}
                          onClick={() => update({ vehicleCategory: v.category, vehicleName: v.label })}
                        >
                          {v.label}
                          <small>Chauffeur included</small>
                        </Choice>
                      ))}
                    </div>
                    <div className="book-actions">
                      <button type="button" className="lux-btn" style={{ padding: '12px 28px' }} onClick={() => { if (validateTrip()) setStep(2); }}>
                        Continue
                      </button>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="book-label">Full name *</label>
                      <input className="form-control book-input" value={form.customer.name} onChange={(e) => update({ customer: { ...form.customer, name: e.target.value } })} placeholder="As on your ID" />
                    </div>
                    <div className="col-md-6">
                      <label className="book-label">Email *</label>
                      <input type="email" className="form-control book-input" value={form.customer.email} onChange={(e) => update({ customer: { ...form.customer, email: e.target.value } })} placeholder="name@email.com" />
                    </div>
                    <div className="col-12">
                      <label className="book-label">Mobile *</label>
                      <input className="form-control book-input" value={form.customer.mobile} onChange={(e) => update({ customer: { ...form.customer, mobile: e.target.value } })} placeholder="+966..." />
                    </div>
                    <div className="col-12">
                      <label className="book-label">Special request</label>
                      <textarea className="form-control book-input" rows={3} value={form.specialRequests} onChange={(e) => update({ specialRequests: e.target.value })} placeholder="Child seat, extra stop, or notes for the chauffeur" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="col-lg-5">{summary}</div>
          </div>
        )}
      </Container>
    </div>
  );
}

export default BookingWizard;
