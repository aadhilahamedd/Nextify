import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createPricingRuleAPI,
  deletePricingRuleAPI,
  getPricingRulesAPI,
  updatePricingRuleAPI,
} from '../../Services/allAPI';
import { SERVICE_LABELS } from '../booking/bookingConstants';

const emptyRule = {
  serviceType: 'airport_transfer',
  origin: '',
  destination: '',
  vehicleCategory: '',
  vehicleNames: '',
  vehicleApplicability: 'specific',
  durationType: '',
  maxDistanceKm: '',
  price: '',
  currency: 'SAR',
  active: true,
  displayLabel: '',
  notes: '',
};

export default function AdminPricingPanel() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterService, setFilterService] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyRule);
  const [error, setError] = useState('');

  const fetchRules = useCallback(async () => {
    setLoading(true);
    const res = await getPricingRulesAPI({ serviceType: filterService || undefined, search: search || undefined });
    if (res?.status === 200) {
      setRules(res.data?.rules || []);
    }
    setLoading(false);
  }, [filterService, search]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const grouped = useMemo(() => {
    const map = {};
    for (const rule of rules) {
      if (!map[rule.serviceType]) map[rule.serviceType] = [];
      map[rule.serviceType].push(rule);
    }
    return map;
  }, [rules]);

  const openCreate = () => {
    setEditing('new');
    setForm(emptyRule);
    setError('');
  };

  const openEdit = (rule) => {
    setEditing(rule._id);
    setForm({
      ...rule,
      vehicleNames: (rule.vehicleNames || []).join(', '),
      maxDistanceKm: rule.maxDistanceKm ?? '',
    });
    setError('');
  };

  const saveRule = async () => {
    const payload = {
      ...form,
      price: Number(form.price),
      maxDistanceKm: form.maxDistanceKm ? Number(form.maxDistanceKm) : null,
      vehicleNames: form.vehicleNames
        ? form.vehicleNames.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    };
    const res = editing === 'new'
      ? await createPricingRuleAPI(payload)
      : await updatePricingRuleAPI(editing, payload);
    if (res?.status === 200 || res?.status === 201) {
      setEditing(null);
      fetchRules();
    } else {
      setError(res?.error || 'Failed to save pricing rule');
    }
  };

  const toggleActive = async (rule) => {
    await updatePricingRuleAPI(rule._id, { active: !rule.active });
    fetchRules();
  };

  const removeRule = async (id) => {
    if (!window.confirm('Delete this pricing rule?')) return;
    await deletePricingRuleAPI(id);
    fetchRules();
  };

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Pricing Management</h1>
          <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            View and manage approved rate sheet rules
          </p>
        </div>
        <button type="button" onClick={openCreate} style={btnGold}>Add Rule</button>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-4">
        <select value={filterService} onChange={(e) => setFilterService(e.target.value)} style={inputStyle}>
          <option value="">All services</option>
          {Object.entries(SERVICE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          placeholder="Search route, vehicle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, minWidth: 220 }}
        />
        <button type="button" onClick={fetchRules} style={btnOutline}>Refresh</button>
      </div>

      {editing && (
        <div style={panelStyle} className="mb-4">
          <h5>{editing === 'new' ? 'New Pricing Rule' : 'Edit Pricing Rule'}</h5>
          <div className="row g-2">
            <div className="col-md-4">
              <select value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} style={inputStyle}>
                {Object.entries(SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="col-md-4"><input placeholder="Origin" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} style={inputStyle} /></div>
            <div className="col-md-4"><input placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} style={inputStyle} /></div>
            <div className="col-md-4"><input placeholder="Vehicle category" value={form.vehicleCategory} onChange={(e) => setForm({ ...form, vehicleCategory: e.target.value })} style={inputStyle} /></div>
            <div className="col-md-4"><input placeholder="Vehicle names (comma-separated)" value={form.vehicleNames} onChange={(e) => setForm({ ...form, vehicleNames: e.target.value })} style={inputStyle} /></div>
            <div className="col-md-4"><input placeholder="Price (SAR)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={inputStyle} /></div>
            <div className="col-md-4">
              <select value={form.durationType} onChange={(e) => setForm({ ...form, durationType: e.target.value })} style={inputStyle}>
                <option value="">No duration</option>
                <option value="half_day">Half Day</option>
                <option value="full_day">Full Day</option>
              </select>
            </div>
            <div className="col-md-4"><input placeholder="Display label" value={form.displayLabel} onChange={(e) => setForm({ ...form, displayLabel: e.target.value })} style={inputStyle} /></div>
            <div className="col-md-4">
              <select value={form.vehicleApplicability} onChange={(e) => setForm({ ...form, vehicleApplicability: e.target.value })} style={inputStyle}>
                <option value="specific">Specific vehicle</option>
                <option value="all">All vehicles</option>
              </select>
            </div>
          </div>
          {error && <p style={{ color: '#f5576c', marginTop: 12 }}>{error}</p>}
          <div className="d-flex gap-2 mt-3">
            <button type="button" onClick={saveRule} style={btnGold}>Save</button>
            <button type="button" onClick={() => setEditing(null)} style={btnOutline}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading pricing rules...</p>
      ) : (
        Object.entries(grouped).map(([serviceType, list]) => (
          <div key={serviceType} style={panelStyle} className="mb-4">
            <h5 style={{ color: '#eeb012', marginBottom: 16 }}>{SERVICE_LABELS[serviceType] || serviceType}</h5>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {list.map((rule) => (
                <div
                  key={rule._id}
                  className="d-flex flex-wrap justify-content-between align-items-center py-3 gap-2"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {rule.displayLabel || rule.vehicleCategory || rule.destination || 'Rule'}
                      {!rule.active && <span style={{ color: '#f5576c', marginLeft: 8, fontSize: 12 }}>(inactive)</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                      {[rule.origin, rule.destination].filter(Boolean).join(' → ')}
                      {rule.durationType && ` · ${rule.durationType.replace('_', ' ')}`}
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#eeb012' }}>
                      SAR {rule.price?.toLocaleString()}
                    </span>
                    <button type="button" onClick={() => openEdit(rule)} style={btnOutline}>Edit</button>
                    <button type="button" onClick={() => toggleActive(rule)} style={btnOutline}>
                      {rule.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button type="button" onClick={() => removeRule(rule._id)} style={{ ...btnOutline, color: '#f5576c', borderColor: 'rgba(245,87,108,0.4)' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const panelStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16,
  padding: 24,
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 10,
  color: '#fff',
};

const btnGold = {
  padding: '10px 18px',
  background: 'linear-gradient(135deg, #a88448 0%, #c8a261 100%)',
  border: 'none',
  borderRadius: 10,
  color: '#000',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnOutline = {
  padding: '8px 14px',
  background: 'transparent',
  border: '1px solid rgba(238,176,18,0.4)',
  borderRadius: 10,
  color: '#eeb012',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 13,
};
