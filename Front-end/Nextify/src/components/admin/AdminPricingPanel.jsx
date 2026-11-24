import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createPricingRuleAPI,
  deletePricingRuleAPI,
  getAdminCarsAPI,
  getAdminPricingRulesAPI,
  updatePricingRuleAPI,
} from '../../Services/allAPI';
import { FLEET_VEHICLES, findFleetVehicle, normalizeVehicleCategory, toCategorySlug } from '../../data/fleetVehicles';
import { AIRPORT_FIXED_ROUTES, LOCATIONS as FIXED_ROUTE_LOCATIONS } from '../../data/airportFixedRoutes';
import { formatSarAndUsd, sarToUsd } from '../../utils/currency';

const ADMIN_SERVICE_LABELS = {
  airport_transfer: 'Airport Transfer',
  city_transfer: 'Point-to-Point',
  chauffeur: 'Hourly Chauffeur',
  intercity_transfer: 'Intercity Transfer',
  gcc_transfer: 'GCC Transfer',
};

const DURATION_LABELS = {
  hourly: 'Hourly',
  half_day: 'Half Day',
  full_day: 'Full Day',
};

const LOCATION_SUGGESTIONS = Array.from(
  new Set([
    ...FIXED_ROUTE_LOCATIONS.filter((loc) => loc.kind === 'airport' || loc.kind === 'city').map((loc) => loc.label),
    'Riyadh',
    'Jeddah',
    'Dammam',
    'Al Khobar',
    'Makkah',
    'Madinah',
    'Bahrain',
    'Bahrain Airport',
    'Riyadh Airport',
    'Jeddah Airport',
    'Dammam Airport',
    'Al Qassim Airport',
    'Madinah Airport',
    'Dubai',
    'Abu Dhabi',
    'Qatar',
    'Kuwait',
  ])
);

const EMPTY_FORM = {
  vehicleCategory: 'gmc',
  vehicleCarId: '',
  serviceType: 'airport_transfer',
  origin: '',
  destination: '',
  durationType: 'hourly',
  pricingMode: 'fixed',
  price: '',
  priceUsd: '',
  taxIncluded: false,
  active: true,
  notes: '',
  displayLabel: '',
};

const LOCATION_LABEL_BY_ID = Object.fromEntries(
  FIXED_ROUTE_LOCATIONS.map((loc) => [loc.id, loc.label || loc.displayLabel || loc.id])
);

function getVehicleDisplayName(category, fleetList) {
  if (!category) return 'All Vehicles';
  const found = fleetList.find((v) => v.category === category);
  return found ? found.label : category;
}

function getApiMessage(res, fallback) {
  return res?.error || res?.data?.message || res?.message || fallback;
}

export default function AdminPricingPanel() {
  const [rules, setRules] = useState([]);
  const [adminCars, setAdminCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [routeSearch, setRouteSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [pageError, setPageError] = useState('');
  const [pageSuccess, setPageSuccess] = useState('');

  const fleetList = useMemo(() => {
    const base = FLEET_VEHICLES.map((v) => ({
      category: v.category,
      label: v.label,
      fleetClass: v.fleetClass,
      carId: null,
    }));
    const seen = new Set(base.map((v) => v.category));
    for (const car of adminCars) {
      const matchedBase = findFleetVehicle({ category: car.category, name: car.name });
      const rawCat = String(car.category || '').trim() || matchedBase?.category || toCategorySlug(car.name, car.id);
      const cat = normalizeVehicleCategory(rawCat);
      if (cat && seen.has(cat)) {
        const target = base.find((v) => v.category === cat);
        if (target && target.carId == null && car.id != null) target.carId = car.id;
        continue;
      }
      if (cat && !seen.has(cat)) {
        seen.add(cat);
        base.push({
          category: cat,
          label: car.name,
          fleetClass: car.type || 'Custom',
          carId: car.id ?? null,
        });
      }
    }
    return base;
  }, [adminCars]);

  const filteredVehicles = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    if (!q) return fleetList;
    return fleetList.filter(
      (v) => v.label.toLowerCase().includes(q) || v.category.toLowerCase().includes(q)
    );
  }, [fleetList, vehicleSearch]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [rulesRes, carsRes] = await Promise.all([
      getAdminPricingRulesAPI(),
      getAdminCarsAPI(),
    ]);
    if (rulesRes?.status === 200) {
      setRules(rulesRes.data?.rules || []);
      setPageError('');
    } else {
      setPageError(getApiMessage(rulesRes, 'Failed to load pricing rules.'));
    }
    if (carsRes?.status === 200 && Array.isArray(carsRes.data)) {
      setAdminCars(carsRes.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAdminPricingRulesAPI(), getAdminCarsAPI()]).then(([rulesRes, carsRes]) => {
      if (cancelled) return;
      if (rulesRes?.status === 200) {
        setRules(rulesRes.data?.rules || []);
      } else {
        setPageError(getApiMessage(rulesRes, 'Failed to load pricing rules.'));
      }
      if (carsRes?.status === 200 && Array.isArray(carsRes.data)) {
        setAdminCars(carsRes.data);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Build read-only view of approved default Airport Fixed Routes not yet overridden in MongoDB.
  const approvedDefaultRows = useMemo(() => {
    const rows = [];
    const dbAirportKeys = new Set(
      rules
        .filter((r) => r.serviceType === 'airport_transfer' && r.active)
        .map((r) => `${r.vehicleCategory || r.vehicleId}::${r.originId || r.origin.toLowerCase()}::${r.destinationId || r.destination.toLowerCase()}`)
    );

    const gmcAndSedan = [
      { category: 'gmc', key: 'gmc' },
      { category: 'ford_taurus', key: 'sedan' },
      { category: 'lexus_es', key: 'sedan' },
    ];

    for (const route of AIRPORT_FIXED_ROUTES) {
      const originLabel = LOCATION_LABEL_BY_ID[route.originId] || route.originId;
      const destLabel = LOCATION_LABEL_BY_ID[route.destinationId] || route.destinationId;
      for (const veh of gmcAndSedan) {
        const amount = route[veh.key];
        if (amount == null) continue;
        const dbKey = `${veh.category}::${route.originId}::${route.destinationId}`;
        if (dbAirportKeys.has(dbKey)) continue;
        rows.push({
          _id: `approved_${route.id}_${veh.category}`,
          isApprovedDefault: true,
          serviceType: 'airport_transfer',
          vehicleCategory: veh.category,
          origin: originLabel,
          originId: route.originId,
          destination: destLabel,
          destinationId: route.destinationId,
          price: amount,
          pricingMode: 'fixed',
          taxIncluded: Boolean(route.taxIncluded),
          active: true,
          notes: route.allowReverse === false ? 'Approved one-way default rate' : 'Approved default fixed route',
        });
      }
    }
    return rows;
  }, [rules]);

  const combinedRows = useMemo(() => {
    const dbRows = rules.map((r) => ({ ...r, isApprovedDefault: false }));
    return [...dbRows, ...approvedDefaultRows];
  }, [rules, approvedDefaultRows]);

  const visibleRows = useMemo(() => {
    const locQ = filterLocation.trim().toLowerCase();
    const routeQ = routeSearch.trim().toLowerCase();
    return combinedRows.filter((row) => {
      const vehCat = row.vehicleCategory || row.vehicleId || '';
      if (selectedVehicle !== 'all' && vehCat !== selectedVehicle && row.vehicleApplicability !== 'all') {
        return false;
      }
      if (filterService && row.serviceType !== filterService) return false;
      if (filterStatus === 'active' && !row.active) return false;
      if (filterStatus === 'inactive' && row.active) return false;
      if (filterStatus === 'fixed' && row.pricingMode === 'whatsapp_assistant') return false;
      if (filterStatus === 'whatsapp_assistant' && row.pricingMode !== 'whatsapp_assistant') return false;

      if (locQ) {
        const hay = `${row.origin || ''} ${row.destination || ''} ${row.originId || ''} ${row.destinationId || ''}`.toLowerCase();
        if (!hay.includes(locQ)) return false;
      }

      if (routeQ) {
        const vehLabel = getVehicleDisplayName(vehCat, fleetList);
        const hay = [
          vehLabel,
          vehCat,
          ADMIN_SERVICE_LABELS[row.serviceType] || row.serviceType,
          row.origin,
          row.destination,
          row.durationType,
          row.notes,
          row.displayLabel,
        ].join(' ').toLowerCase();
        if (!hay.includes(routeQ)) return false;
      }
      return true;
    });
  }, [combinedRows, selectedVehicle, filterService, filterStatus, filterLocation, routeSearch, fleetList]);

  const openCreate = (prefill = {}) => {
    setEditingId(null);
    const defaultVeh = prefill.vehicleCategory
      || (selectedVehicle !== 'all' ? selectedVehicle : 'gmc');
    const matchedFleet = fleetList.find((v) => v.category === defaultVeh);
    setForm({
      ...EMPTY_FORM,
      vehicleCategory: defaultVeh,
      vehicleCarId: matchedFleet?.carId ?? '',
      serviceType: prefill.serviceType || filterService || 'airport_transfer',
      origin: prefill.origin || '',
      destination: prefill.destination || '',
      durationType: prefill.durationType || 'hourly',
      pricingMode: prefill.pricingMode || 'fixed',
      price: prefill.price != null ? String(prefill.price) : '',
      priceUsd: prefill.price != null ? String(sarToUsd(Number(prefill.price)) ?? '') : '',
      taxIncluded: Boolean(prefill.taxIncluded),
      active: true,
      notes: prefill.notes || '',
      displayLabel: prefill.displayLabel || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (rule) => {
    if (rule.isApprovedDefault) {
      openCreate({
        vehicleCategory: rule.vehicleCategory,
        serviceType: rule.serviceType,
        origin: rule.origin,
        destination: rule.destination,
        price: rule.price,
        taxIncluded: rule.taxIncluded,
        notes: rule.notes,
      });
      return;
    }
    setEditingId(rule._id);
    setForm({
      vehicleCategory: rule.vehicleCategory || rule.vehicleId || 'gmc',
      vehicleCarId: rule.vehicleCarId ?? '',
      serviceType: rule.serviceType || 'airport_transfer',
      origin: rule.origin || '',
      destination: rule.destination || '',
      durationType: rule.durationType || 'hourly',
      pricingMode: rule.pricingMode || 'fixed',
      price: rule.price != null ? String(rule.price) : '',
      priceUsd: rule.priceUsd != null ? String(rule.priceUsd) : '',
      taxIncluded: Boolean(rule.taxIncluded),
      active: rule.active !== false,
      notes: rule.notes || '',
      displayLabel: rule.displayLabel || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const saveRule = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.vehicleCategory) {
      setFormError('Please select a vehicle.');
      return;
    }
    if (form.serviceType === 'airport_transfer' && (!form.origin.trim() || !form.destination.trim())) {
      setFormError('Pickup and drop-off locations are required for Airport Transfer.');
      return;
    }
    if (form.serviceType === 'chauffeur' && !form.durationType) {
      setFormError('Please select Hourly, Half Day, or Full Day for Hourly Chauffeur.');
      return;
    }

    let numericPrice = null;
    let numericUsd = null;
    if (form.pricingMode === 'fixed') {
      numericPrice = Number(form.price);
      if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
        setFormError('Please enter a valid positive price in SAR.');
        return;
      }
      numericUsd = form.priceUsd !== '' && Number.isFinite(Number(form.priceUsd))
        ? Number(form.priceUsd)
        : sarToUsd(numericPrice);
    }

    const vehLabel = getVehicleDisplayName(form.vehicleCategory, fleetList);
    const payload = {
      serviceType: form.serviceType,
      vehicleCategory: form.vehicleCategory,
      vehicleId: form.vehicleCategory,
      vehicleCarId: form.vehicleCarId !== '' ? Number(form.vehicleCarId) : null,
      vehicleApplicability: 'specific',
      origin: form.origin.trim(),
      destination: form.serviceType === 'chauffeur' ? '' : form.destination.trim(),
      durationType: form.serviceType === 'chauffeur' ? form.durationType : '',
      pricingMode: form.pricingMode,
      price: numericPrice,
      priceUsd: numericUsd,
      currency: 'SAR',
      allowReverse: false,
      taxIncluded: Boolean(form.taxIncluded),
      active: Boolean(form.active),
      notes: form.notes.trim(),
      displayLabel: form.displayLabel.trim() || `${vehLabel}${form.origin ? ` — ${form.origin}` : ''}${form.destination ? ` → ${form.destination}` : ''}`,
    };

    setSaving(true);
    const res = editingId
      ? await updatePricingRuleAPI(editingId, payload)
      : await createPricingRuleAPI(payload);
    setSaving(false);

    if (res?.status === 200 || res?.status === 201) {
      setShowModal(false);
      setPageSuccess(editingId ? 'Pricing record updated.' : 'Pricing record created.');
      setPageError('');
      await fetchData();
    } else {
      setFormError(getApiMessage(res, 'Failed to save pricing record.'));
    }
  };

  const toggleActive = async (rule) => {
    if (rule.isApprovedDefault) return;
    const res = await updatePricingRuleAPI(rule._id, { active: !rule.active });
    if (res?.status === 200) {
      setPageSuccess(`Pricing record ${rule.active ? 'deactivated' : 'activated'}.`);
      await fetchData();
    } else {
      setPageError(getApiMessage(res, 'Failed to update status.'));
    }
  };

  const togglePricingMode = async (rule) => {
    if (rule.isApprovedDefault) {
      openCreate({
        vehicleCategory: rule.vehicleCategory,
        serviceType: rule.serviceType,
        origin: rule.origin,
        destination: rule.destination,
        pricingMode: 'whatsapp_assistant',
      });
      return;
    }
    if (rule.pricingMode === 'whatsapp_assistant') {
      openEdit({ ...rule, pricingMode: 'fixed' });
      return;
    }
    const res = await updatePricingRuleAPI(rule._id, { pricingMode: 'whatsapp_assistant' });
    if (res?.status === 200) {
      setPageSuccess('Switched route to WhatsApp Assistant (Price on Request).');
      await fetchData();
    } else {
      setPageError(getApiMessage(res, 'Failed to switch pricing mode.'));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const res = await deletePricingRuleAPI(pendingDelete._id);
    setDeleting(false);
    if (res?.status === 200) {
      setPendingDelete(null);
      setPageSuccess('Pricing record deleted.');
      await fetchData();
    } else {
      setPageError(getApiMessage(res, 'Failed to delete pricing record.'));
    }
  };

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Centralized Pricing Management</h1>
          <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            Manage Airport Transfer, Point-to-Point, and Hourly Chauffeur pricing per vehicle and directional route
          </p>
        </div>
        <button type="button" onClick={() => openCreate()} style={btnGold}>
          + Add Pricing
        </button>
      </div>

      {pageError && (
        <div className="mb-3 p-3 rounded-3" style={{ background: 'rgba(245,87,108,0.12)', border: '1px solid rgba(245,87,108,0.35)', color: '#ff8a98' }}>
          {pageError}
        </div>
      )}
      {pageSuccess && (
        <div className="mb-3 p-3 rounded-3" style={{ background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.35)', color: '#7ee2a8' }}>
          {pageSuccess}
        </div>
      )}

      {/* Vehicle Selector Strip */}
      <div style={panelStyle} className="mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h5 className="mb-0" style={{ color: '#f6d26e', fontSize: 15 }}>Select Vehicle</h5>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              Click any vehicle (e.g. GMC Yukon) to view and manage its directional route &amp; chauffeur pricing
            </span>
          </div>
          <input
            placeholder="Search vehicles..."
            value={vehicleSearch}
            onChange={(e) => setVehicleSearch(e.target.value)}
            style={{ ...inputStyle, width: 220, padding: '7px 12px', fontSize: 13 }}
          />
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedVehicle('all')}
            style={selectedVehicle === 'all' ? chipActiveStyle : chipStyle}
          >
            All Vehicles ({combinedRows.length})
          </button>
          {filteredVehicles.map((veh) => {
            const count = combinedRows.filter(
              (r) => (r.vehicleCategory || r.vehicleId) === veh.category
            ).length;
            const active = selectedVehicle === veh.category;
            return (
              <button
                key={veh.category}
                type="button"
                onClick={() => setSelectedVehicle(veh.category)}
                style={active ? chipActiveStyle : chipStyle}
              >
                {veh.label} <span style={{ opacity: 0.65, fontSize: 11 }}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        <select value={filterService} onChange={(e) => setFilterService(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 180 }}>
          <option value="">All Services</option>
          {Object.entries(ADMIN_SERVICE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <input
          placeholder="Filter by location (e.g. Bahrain, Riyadh)..."
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          style={{ ...inputStyle, width: 'auto', minWidth: 230 }}
        />
        <input
          placeholder="Search route, vehicle, or notes..."
          value={routeSearch}
          onChange={(e) => setRouteSearch(e.target.value)}
          style={{ ...inputStyle, width: 'auto', minWidth: 220 }}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 165 }}>
          <option value="all">All Statuses</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
          <option value="fixed">Fixed Price only</option>
          <option value="whatsapp_assistant">WhatsApp Assistant only</option>
        </select>
        <button type="button" onClick={fetchData} style={btnOutline}>Refresh</button>
      </div>

      {/* Pricing Table */}
      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading pricing records...</p>
      ) : visibleRows.length === 0 ? (
        <div style={panelStyle} className="text-center py-5">
          <p className="mb-2" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16 }}>
            No pricing records found for this selection.
          </p>
          <p className="mb-3" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
            Unconfigured vehicle/route combinations automatically use WhatsApp Price on Request until configured.
          </p>
          <button type="button" onClick={() => openCreate()} style={btnGold}>
            + Add Pricing Record
          </button>
        </div>
      ) : (
        <div style={{ ...panelStyle, padding: 0, overflowX: 'auto' }}>
          <table className="table table-dark table-hover align-middle mb-0" style={{ background: 'transparent' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 12, textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 16px' }}>Vehicle</th>
                <th style={{ padding: '14px 16px' }}>Service</th>
                <th style={{ padding: '14px 16px' }}>Pickup</th>
                <th style={{ padding: '14px 16px' }}>Drop-off / Duration</th>
                <th style={{ padding: '14px 16px' }}>Price (SAR) / Mode</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((rule) => {
                const isWhatsApp = rule.pricingMode === 'whatsapp_assistant';
                const vehName = rule.vehicleApplicability === 'all'
                  ? 'All Vehicles'
                  : getVehicleDisplayName(rule.vehicleCategory || rule.vehicleId, fleetList);
                return (
                  <tr key={rule._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      <div>{vehName}</div>
                      {rule.notes && (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>{rule.notes}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>
                      <span style={{ color: '#f6d26e' }}>
                        {ADMIN_SERVICE_LABELS[rule.serviceType] || rule.serviceType}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>
                      {rule.origin || (rule.serviceType === 'chauffeur' ? '—' : 'Riyadh (Base)')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>
                      {rule.serviceType === 'chauffeur'
                        ? (DURATION_LABELS[rule.durationType] || rule.durationType || '—')
                        : (rule.destination || 'Any / Base')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {isWhatsApp ? (
                        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(37,211,102,0.16)', color: '#6ee7a0' }}>
                          WhatsApp Assistant
                        </span>
                      ) : (
                        <div>
                          <span style={{ fontWeight: 700, color: '#eeb012', fontSize: 14 }}>
                            {formatSarAndUsd(rule.price, rule.priceUsd)}
                          </span>
                          {rule.taxIncluded && (
                            <span style={{ marginLeft: 8, fontSize: 11, color: '#7ee2a8' }}>Incl. Tax</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          background: rule.active ? 'rgba(46,204,113,0.16)' : 'rgba(245,87,108,0.16)',
                          color: rule.active ? '#7ee2a8' : '#ff8a98',
                        }}
                      >
                        {rule.isApprovedDefault ? 'Approved Default' : rule.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div className="d-flex justify-content-end flex-wrap gap-2">
                        <button type="button" onClick={() => openEdit(rule)} style={btnOutline}>
                          {rule.isApprovedDefault ? 'Override' : 'Edit'}
                        </button>
                        <button type="button" onClick={() => togglePricingMode(rule)} style={btnOutline}>
                          {isWhatsApp ? 'Set Fixed' : 'WhatsApp'}
                        </button>
                        {!rule.isApprovedDefault && (
                          <>
                            <button type="button" onClick={() => toggleActive(rule)} style={btnOutline}>
                              {rule.active ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDelete(rule)}
                              style={{ ...btnOutline, color: '#f5576c', borderColor: 'rgba(245,87,108,0.4)' }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={modalOverlayStyle} onClick={() => !saving && setShowModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h4 className="mb-1">{editingId ? 'Edit Pricing Record' : 'Add Pricing Record'}</h4>
                <p className="mb-0 small" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Routes are strictly directional (A → B does not overwrite B → A).
                </p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} style={closeBtnStyle} aria-label="Close">✕</button>
            </div>

            <form onSubmit={saveRule}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label style={labelStyle}>Vehicle *</label>
                  <select
                    value={form.vehicleCategory}
                    onChange={(e) => {
                      const cat = e.target.value;
                      const found = fleetList.find((v) => v.category === cat);
                      setForm({ ...form, vehicleCategory: cat, vehicleCarId: found?.carId ?? '' });
                    }}
                    style={inputStyle}
                    required
                  >
                    {fleetList.map((v) => (
                      <option key={v.category} value={v.category}>{v.label}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label style={labelStyle}>Service Type *</label>
                  <select
                    value={form.serviceType}
                    onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                    style={inputStyle}
                    required
                  >
                    {Object.entries(ADMIN_SERVICE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {form.serviceType === 'chauffeur' ? (
                  <div className="col-md-6">
                    <label style={labelStyle}>Chauffeur Package *</label>
                    <select
                      value={form.durationType}
                      onChange={(e) => setForm({ ...form, durationType: e.target.value })}
                      style={inputStyle}
                      required
                    >
                      <option value="hourly">Hourly</option>
                      <option value="half_day">Half Day</option>
                      <option value="full_day">Full Day</option>
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="col-md-6">
                      <label style={labelStyle}>
                        Pickup Location {form.serviceType === 'airport_transfer' ? '*' : '(optional for base)'}
                      </label>
                      <input
                        list="nextify-location-suggestions"
                        value={form.origin}
                        onChange={(e) => setForm({ ...form, origin: e.target.value })}
                        placeholder="e.g. Bahrain, Riyadh Airport, Al Ula..."
                        style={inputStyle}
                        required={form.serviceType === 'airport_transfer'}
                      />
                    </div>
                    <div className="col-md-6">
                      <label style={labelStyle}>
                        Drop-off Location {form.serviceType === 'airport_transfer' ? '*' : '(optional for base)'}
                      </label>
                      <input
                        list="nextify-location-suggestions"
                        value={form.destination}
                        onChange={(e) => setForm({ ...form, destination: e.target.value })}
                        placeholder="e.g. Riyadh, Dammam, Al Khobar..."
                        style={inputStyle}
                        required={form.serviceType === 'airport_transfer'}
                      />
                    </div>
                  </>
                )}

                <div className="col-md-6">
                  <label style={labelStyle}>Pricing Mode *</label>
                  <select
                    value={form.pricingMode}
                    onChange={(e) => setForm({ ...form, pricingMode: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="fixed">Fixed Price (SAR)</option>
                    <option value="whatsapp_assistant">WhatsApp Assistant (Price on Request)</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label style={labelStyle}>Status</label>
                  <select
                    value={form.active ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}
                    style={inputStyle}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                {form.pricingMode === 'fixed' && (
                  <>
                    <div className="col-md-6">
                      <label style={labelStyle}>Price (SAR) *</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={form.price}
                        onChange={(e) => {
                          const price = e.target.value;
                          const usd = sarToUsd(Number(price));
                          setForm({ ...form, price, priceUsd: usd != null ? String(usd) : '' });
                        }}
                        placeholder="e.g. 1800"
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div className="col-md-6 d-flex align-items-end">
                      <label className="d-flex align-items-center gap-2 mb-2" style={{ color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={form.taxIncluded}
                          onChange={(e) => setForm({ ...form, taxIncluded: e.target.checked })}
                        />
                        Price includes tax (VAT included)
                      </label>
                    </div>
                  </>
                )}

                <div className="col-12">
                  <label style={labelStyle}>Internal Admin Notes (optional)</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="e.g. Approved rate from management"
                    style={inputStyle}
                  />
                </div>
              </div>

              <datalist id="nextify-location-suggestions">
                {LOCATION_SUGGESTIONS.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>

              {formError && (
                <div className="mt-3 p-2 rounded-3" style={{ background: 'rgba(245,87,108,0.14)', color: '#ff8a98', fontSize: 13 }}>
                  {formError}
                </div>
              )}

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button type="button" onClick={() => setShowModal(false)} style={btnOutline} disabled={saving}>Cancel</button>
                <button type="submit" style={btnGold} disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Pricing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {pendingDelete && (
        <div style={modalOverlayStyle} onClick={() => !deleting && setPendingDelete(null)}>
          <div style={{ ...modalStyle, maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h4 className="mb-2">Delete Pricing Record</h4>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
              Delete this {ADMIN_SERVICE_LABELS[pendingDelete.serviceType] || pendingDelete.serviceType} rule for{' '}
              <strong>{getVehicleDisplayName(pendingDelete.vehicleCategory || pendingDelete.vehicleId, fleetList)}</strong>
              {pendingDelete.origin || pendingDelete.destination
                ? ` (${[pendingDelete.origin, pendingDelete.destination].filter(Boolean).join(' → ')})`
                : ''}
              ? This action cannot be undone.
            </p>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button type="button" onClick={() => setPendingDelete(null)} style={btnOutline} disabled={deleting}>Cancel</button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                style={{ ...btnGold, background: 'linear-gradient(135deg, #7f1d1d, #dc2626)', color: '#fff' }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const panelStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16,
  padding: 20,
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  color: 'rgba(255,255,255,0.6)',
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 10,
  color: '#fff',
  fontSize: 14,
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
  padding: '7px 12px',
  background: 'transparent',
  border: '1px solid rgba(238,176,18,0.4)',
  borderRadius: 10,
  color: '#eeb012',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 12,
};

const chipStyle = {
  padding: '7px 14px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.14)',
  color: 'rgba(255,255,255,0.82)',
  fontSize: 13,
  cursor: 'pointer',
};

const chipActiveStyle = {
  ...chipStyle,
  background: 'rgba(238,176,18,0.18)',
  border: '1px solid rgba(238,176,18,0.85)',
  color: '#f6d26e',
  fontWeight: 600,
};

const closeBtnStyle = {
  border: 'none',
  background: 'transparent',
  color: '#fff',
  fontSize: 18,
  cursor: 'pointer',
};

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.82)',
  zIndex: 1200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
};

const modalStyle = {
  width: '100%',
  maxWidth: 680,
  background: '#12121b',
  borderRadius: 20,
  padding: 24,
  border: '1px solid rgba(255,255,255,0.1)',
  maxHeight: 'calc(100vh - 80px)',
  overflowY: 'auto',
};
