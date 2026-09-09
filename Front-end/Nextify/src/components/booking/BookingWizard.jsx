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

const inputDark = 'form-control p-3 bg-dark border-secondary text-white';
const labelCls = 'form-label fw-semibold text-white mb-2';

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
    setQuote(null);
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

  const validate = () => {
    if (!form.customer.name || !form.customer.email || !form.customer.mobile) {
      setError('Name, email, and mobile are required');
      return false;
    }
    if (!form.travelDate || !form.travelTime) {
      setError('Travel date and time are required');
      return false;
    }
    if (!form.vehicleCategory) {
      setError('Please select a vehicle');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setError('');

    const route = INTERCITY_ROUTES.find((r) => r.label === form.intercityRoute);
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

  const renderServiceForm = () => {
    switch (form.serviceType) {
      case 'airport_transfer':
        return (
          <>
            <div className="col-md-6">
              <label className={labelCls}>Airport *</label>
              <select className={`form-select ${inputDark}`} value={form.airport} onChange={(e) => update({ airport: e.target.value })}>
                {AIRPORTS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className={labelCls}>Destination *</label>
              <input className={inputDark} value={form.destination} onChange={(e) => update({ destination: e.target.value })} placeholder="e.g. Riyadh City Center" />
            </div>
            <div className="col-md-6">
              <label className={labelCls}>Flight Number</label>
              <input className={inputDark} value={form.flightNumber} onChange={(e) => update({ flightNumber: e.target.value })} placeholder="e.g. SV123" />
            </div>
          </>
        );
      case 'city_transfer':
        return (
          <>
            <div className="col-md-6">
              <label className={labelCls}>Pickup Location *</label>
              <input className={inputDark} value={form.pickupLocation} onChange={(e) => update({ pickupLocation: e.target.value, origin: 'Riyadh' })} />
            </div>
            <div className="col-md-6">
              <label className={labelCls}>Drop-off Location *</label>
              <input className={inputDark} value={form.dropoffLocation} onChange={(e) => update({ dropoffLocation: e.target.value, destination: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label className={labelCls}>Estimated Distance (KM)</label>
              <input type="number" min={0} max={100} className={inputDark} value={form.distanceKm} onChange={(e) => update({ distanceKm: e.target.value })} placeholder="0–20 KM approved rate" />
              <small className="text-white-50">Trips above 20 KM require a custom quote.</small>
            </div>
          </>
        );
      case 'chauffeur':
        return (
          <>
            <div className="col-md-8">
              <label className={labelCls}>Service Location *</label>
              <input className={inputDark} value={form.serviceLocation} onChange={(e) => update({ serviceLocation: e.target.value, pickupLocation: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className={labelCls}>Duration *</label>
              <select className={`form-select ${inputDark}`} value={form.durationType} onChange={(e) => update({ durationType: e.target.value })}>
                <option value="">Select</option>
                {DURATION_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </>
        );
      case 'intercity_transfer':
        return (
          <div className="col-12">
            <label className={labelCls}>Route *</label>
            <select className={`form-select ${inputDark}`} value={form.intercityRoute} onChange={(e) => {
              const r = INTERCITY_ROUTES.find((x) => x.label === e.target.value);
              update({ intercityRoute: e.target.value, origin: r?.origin, destination: r?.destination });
            }}>
              <option value="">Select route</option>
              {INTERCITY_ROUTES.map((r) => <option key={r.label} value={r.label}>{r.label}</option>)}
            </select>
          </div>
        );
      case 'gcc_transfer':
        return (
          <div className="col-12">
            <label className={labelCls}>Destination *</label>
            <select className={`form-select ${inputDark}`} value={form.gccDestination} onChange={(e) => update({ gccDestination: e.target.value, destination: e.target.value })}>
              <option value="">Select destination</option>
              {GCC_DESTINATIONS.map((g) => <option key={g.destination} value={g.destination}>{g.label}</option>)}
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', paddingTop: 120, paddingBottom: 80, color: 'white' }}>
      <Container>
        <div className="text-center mb-4">
          <p className="text-uppercase small mb-2" style={{ color: '#eeb012', letterSpacing: 2 }}>Luxury Chauffeur Booking</p>
          <h2 style={{ fontFamily: 'Georgia, serif' }}>Book Your Journey</h2>
          <p className="text-white-50">Every reservation includes a professional driver — vehicle + chauffeur.</p>
        </div>

        {step === 0 && (
          <div className="row g-3 mb-4">
            {services.map((s) => (
              <div key={s.value} className="col-md-6 col-lg-4">
                <button
                  type="button"
                  className="w-100 h-100 p-4 border-0 rounded-4 text-start text-white"
                  style={{
                    background: form.serviceType === s.value ? 'linear-gradient(135deg, #231b12, #a98231, #d4b56d)' : '#141414',
                    border: '1px solid rgba(255,255,255,0.08)',
                    minHeight: 140,
                  }}
                  onClick={() => { update({ serviceType: s.value, vehicleCategory: '', vehicleName: '' }); setStep(1); }}
                >
                  <h5 className="mb-2" style={{ fontFamily: 'Georgia, serif' }}>{s.label}</h5>
                  <p className="small mb-0 opacity-75">{s.desc}</p>
                </button>
              </div>
            ))}
          </div>
        )}

        {step >= 1 && (
          <div className="row g-4">
            <div className="col-lg-7">
              <div className="p-4 rounded-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4 style={{ fontFamily: 'Georgia, serif', color: '#eeb012' }}>{SERVICE_LABELS[form.serviceType]}</h4>
                  <button type="button" className="btn btn-sm btn-outline-warning rounded-pill" onClick={() => setStep(0)}>Change Service</button>
                </div>
                <div className="row g-3">
                  {renderServiceForm()}
                  <div className="col-md-6">
                    <label className={labelCls}>Travel Date *</label>
                    <input type="date" className={inputDark} value={form.travelDate} onChange={(e) => update({ travelDate: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className={labelCls}>Travel Time *</label>
                    <input type="time" className={inputDark} value={form.travelTime} onChange={(e) => update({ travelTime: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className={labelCls}>Vehicle *</label>
                    <select className={`form-select ${inputDark}`} value={form.vehicleCategory} onChange={(e) => {
                      const v = vehicles.find((x) => x.category === e.target.value);
                      update({ vehicleCategory: e.target.value, vehicleName: v?.label || '' });
                    }}>
                      <option value="">Select vehicle</option>
                      {vehicles.map((v) => <option key={v.category} value={v.category}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className={labelCls}>Passengers</label>
                    <input type="number" min={1} className={inputDark} value={form.passengers} onChange={(e) => update({ passengers: Number(e.target.value) })} />
                  </div>
                  <div className="col-md-4">
                    <label className={labelCls}>Luggage</label>
                    <input type="number" min={0} className={inputDark} value={form.luggage} onChange={(e) => update({ luggage: Number(e.target.value) })} />
                  </div>
                  <div className="col-12"><hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} /></div>
                  <div className="col-md-4">
                    <label className={labelCls}>Full Name *</label>
                    <input className={inputDark} value={form.customer.name} onChange={(e) => update({ customer: { ...form.customer, name: e.target.value } })} />
                  </div>
                  <div className="col-md-4">
                    <label className={labelCls}>Email *</label>
                    <input type="email" className={inputDark} value={form.customer.email} onChange={(e) => update({ customer: { ...form.customer, email: e.target.value } })} />
                  </div>
                  <div className="col-md-4">
                    <label className={labelCls}>Mobile *</label>
                    <input className={inputDark} value={form.customer.mobile} onChange={(e) => update({ customer: { ...form.customer, mobile: e.target.value } })} placeholder="+966..." />
                  </div>
                  <div className="col-12">
                    <label className={labelCls}>Special Request</label>
                    <textarea className={inputDark} rows={2} value={form.specialRequests} onChange={(e) => update({ specialRequests: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-5">
              {quoteLoading && <p className="text-white-50">Calculating price...</p>}
              <PriceSummary form={{ ...form, vehicleName: selectedVehicle?.label }} quote={quote} compact />
              {error && <div className="alert alert-danger mt-3">{error}</div>}
              <button
                type="button"
                className="btn w-100 mt-4 py-3 rounded-pill fw-bold border-0"
                style={{ background: 'linear-gradient(135deg, #a88448 0%, #c8a261 100%)', color: '#000' }}
                disabled={loading || quoteLoading || !quote}
                onClick={handleSubmit}
              >
                {loading ? 'Processing...' : quote?.customQuoteRequired ? 'Request Quote' : 'Continue Booking'}
              </button>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}

export default BookingWizard;
