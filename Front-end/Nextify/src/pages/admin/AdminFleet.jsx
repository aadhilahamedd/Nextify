import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addCarAPI,
  deleteCarAPI,
  getAdminCarsAPI,
  toggleCarAvailabilityAPI,
  updateCarAPI,
} from '../../Services/allAPI';
import { applyLocalCarImages, getCarImageUrl } from '../../utils/carsStorage';
import { FLEET_VEHICLES } from '../../data/fleetVehicles';
import {
  formatMoney,
  parseOptionalPositiveUsd,
  parsePriceNumber,
  resolveUsdDisplay,
  sarToUsd,
} from '../../utils/currency';

const EMPTY_FORM = {
  name: '',
  brand: '',
  model: '',
  category: '',
  type: '',
  seats: '',
  luggage: '',
  price: '',
  priceUsd: '',
  description: '',
  img: '',
  imagesText: '',
  available: true,
  displayOrder: '',
};

const CATEGORY_OPTIONS = FLEET_VEHICLES.map((v) => ({
  value: v.category,
  label: `${v.label} (${v.category})`,
}));

function getCarIdentifier(car) {
  if (car?._id) return String(car._id);
  return car?.id != null ? String(car.id) : '';
}

function getApiMessage(res, fallback) {
  return res?.error || res?.data?.message || res?.message || fallback;
}

export default function AdminFleet() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCars = useCallback(async () => {
    setLoading(true);
    const res = await getAdminCarsAPI();
    if (res?.status === 200 && Array.isArray(res.data)) {
      setCars(applyLocalCarImages(res.data, { collapseGmc: false }));
      setError('');
    } else {
      setError(getApiMessage(res, 'Failed to load fleet vehicles.'));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getAdminCarsAPI().then((res) => {
      if (cancelled) return;
      if (res?.status === 200 && Array.isArray(res.data)) {
        setCars(applyLocalCarImages(res.data, { collapseGmc: false }));
      } else {
        setError(getApiMessage(res, 'Failed to load fleet vehicles.'));
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const filteredCars = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cars.filter((car) => {
      const isAvail = car.available !== false;
      if (statusFilter === 'available' && !isAvail) return false;
      if (statusFilter === 'disabled' && isAvail) return false;
      if (!q) return true;
      return [car.name, car.brand, car.model, car.type, car.category, String(car.id ?? '')]
        .some((field) => String(field || '').toLowerCase().includes(q));
    });
  }, [cars, search, statusFilter]);

  const openAdd = () => {
    setEditingCar(null);
    setForm({
      ...EMPTY_FORM,
      displayOrder: String(cars.length + 1),
    });
    setPreview('');
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const openEdit = (car) => {
    setEditingCar(car);
    setForm({
      name: car.name || '',
      brand: car.brand || '',
      model: car.model || '',
      category: car.category || '',
      type: car.type || '',
      seats: car.seats || '',
      luggage: car.luggage || '',
      price: car.price || '',
      priceUsd: car.priceUsd || '',
      description: car.description || '',
      img: car.img || '',
      imagesText: Array.isArray(car.images) ? car.images.join('\n') : '',
      available: car.available !== false,
      displayOrder: car.displayOrder != null ? String(car.displayOrder) : '',
    });
    setPreview(getCarImageUrl(car.img));
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCar(null);
    setPreview('');
  };

  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const applyImage = (dataUrl) => {
      setPreview(dataUrl);
      setForm((prev) => ({ ...prev, img: dataUrl }));
    };
    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result || '');
      const image = new Image();
      image.onload = () => {
        const maxWidth = 1400;
        const scale = Math.min(1, maxWidth / Math.max(image.width, 1));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          applyImage(source);
          return;
        }
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        applyImage(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.onerror = () => applyImage(source);
      image.src = source;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const saveVehicle = async (e) => {
    e.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError('Vehicle name is required.');
      return;
    }
    if (!form.img.trim()) {
      setError('Cover image is required.');
      return;
    }

    const usdCheck = parseOptionalPositiveUsd(form.priceUsd);
    if (!usdCheck.valid) {
      setError(usdCheck.message);
      return;
    }

    const extraImages = form.imagesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      name: trimmedName,
      brand: form.brand.trim(),
      model: form.model.trim(),
      category: form.category.trim(),
      type: form.type.trim() || 'Luxury Vehicle',
      seats: form.seats.trim() || '4 passengers',
      luggage: form.luggage.trim() || '3 Bags',
      price: form.price.trim() || 'SAR 0',
      priceUsd: usdCheck.value != null ? String(usdCheck.value) : '',
      description: form.description.trim(),
      img: form.img.trim(),
      images: extraImages,
      available: Boolean(form.available),
      displayOrder: form.displayOrder !== '' ? Number(form.displayOrder) : 0,
    };

    setSaving(true);
    setError('');
    const res = editingCar
      ? await updateCarAPI(getCarIdentifier(editingCar), payload)
      : await addCarAPI(payload);
    setSaving(false);

    if (res?.status === 200 || res?.status === 201) {
      setSuccess(editingCar ? `Updated ${trimmedName}.` : `Added ${trimmedName} to the fleet.`);
      closeModal();
      await fetchCars();
    } else {
      setError(getApiMessage(res, 'Failed to save vehicle.'));
    }
  };

  const handleToggleAvailability = async (car) => {
    const id = getCarIdentifier(car);
    if (!id) return;
    const nextAvailable = car.available === false;
    setTogglingId(id);
    setError('');
    const res = await toggleCarAvailabilityAPI(id, nextAvailable);
    setTogglingId('');
    if (res?.status === 200) {
      setSuccess(`${car.name} is now ${nextAvailable ? 'available' : 'disabled'}.`);
      await fetchCars();
    } else {
      setError(getApiMessage(res, 'Failed to update availability.'));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = getCarIdentifier(pendingDelete);
    setDeleting(true);
    setError('');
    const res = await deleteCarAPI(id);
    setDeleting(false);
    if (res?.status === 200) {
      setSuccess(`Removed ${pendingDelete.name} from the fleet.`);
      setPendingDelete(null);
      await fetchCars();
    } else {
      setError(getApiMessage(res, 'Failed to delete vehicle.'));
    }
  };

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Fleet Management</h1>
          <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            Add, edit, reorder, and enable or disable vehicles shown on the public fleet page
          </p>
        </div>
        <button type="button" onClick={openAdd} style={btnGold}>
          + Add Vehicle
        </button>
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-3" style={{ background: 'rgba(245,87,108,0.12)', border: '1px solid rgba(245,87,108,0.35)', color: '#ff8a98' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 p-3 rounded-3" style={{ background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.35)', color: '#7ee2a8' }}>
          {success}
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 mb-4">
        <input
          placeholder="Search by vehicle name, brand, type, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: 320 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ ...inputStyle, width: 'auto', minWidth: 160 }}
        >
          <option value="all">All vehicles ({cars.length})</option>
          <option value="available">Available only</option>
          <option value="disabled">Disabled only</option>
        </select>
        <button type="button" onClick={fetchCars} style={btnOutline}>Refresh</button>
      </div>

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading fleet vehicles...</p>
      ) : filteredCars.length === 0 ? (
        <div style={panelStyle} className="text-center py-5">
          <p className="mb-2" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>No vehicles match your filters.</p>
          <p className="mb-0" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>Try clearing the search or add a new fleet vehicle.</p>
        </div>
      ) : (
        <div style={{ ...panelStyle, padding: 0, overflowX: 'auto' }}>
          <table className="table table-dark table-hover align-middle mb-0" style={{ background: 'transparent' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 12, textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 16px' }}>Order / ID</th>
                <th style={{ padding: '14px 16px' }}>Vehicle</th>
                <th style={{ padding: '14px 16px' }}>Category / Type</th>
                <th style={{ padding: '14px 16px' }}>Capacity</th>
                <th style={{ padding: '14px 16px' }}>Display Rate</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCars.map((car) => {
                const isAvail = car.available !== false;
                const carKey = getCarIdentifier(car);
                return (
                  <tr key={carKey} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                      <div>#{car.displayOrder ?? 0}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>ID: {car.id}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div className="d-flex align-items-center gap-3">
                        <img
                          src={getCarImageUrl(car.img)}
                          alt={car.name}
                          style={{ width: 64, height: 42, objectFit: 'cover', borderRadius: 8, background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{car.name}</div>
                          {(car.brand || car.model) && (
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                              {[car.brand, car.model].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>
                      <div>{car.type}</div>
                      {car.category && (
                        <div style={{ fontSize: 11, color: '#eeb012' }}>{car.category}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                      <div>{car.seats}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{car.luggage}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#eeb012', fontWeight: 600 }}>
                      <div>{car.price}</div>
                      {(() => {
                        const usdInfo = resolveUsdDisplay(car.price, car.priceUsd);
                        if (usdInfo.amount == null) return null;
                        return (
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 500, marginTop: 2 }}>
                            {formatMoney(usdInfo.amount, 'USD')}{' '}
                            <span style={{ color: usdInfo.isOverride ? '#f6d26e' : '#7ee2a8' }}>
                              ({usdInfo.isOverride ? 'Manual USD' : 'Auto USD'})
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          background: isAvail ? 'rgba(46,204,113,0.16)' : 'rgba(245,87,108,0.16)',
                          color: isAvail ? '#7ee2a8' : '#ff8a98',
                        }}
                      >
                        {isAvail ? 'Available' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div className="d-flex justify-content-end flex-wrap gap-2">
                        <button type="button" onClick={() => openEdit(car)} style={btnOutline}>Edit</button>
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(car)}
                          disabled={togglingId === carKey}
                          style={btnOutline}
                        >
                          {togglingId === carKey ? '...' : isAvail ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(car)}
                          style={{ ...btnOutline, color: '#f5576c', borderColor: 'rgba(245,87,108,0.4)' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={modalOverlayStyle} onClick={closeModal}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h4 className="mb-1">{editingCar ? `Edit Vehicle (ID #${editingCar.id})` : 'Add New Vehicle'}</h4>
                <p className="mb-0 small" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Vehicle IDs are preserved automatically so existing bookings stay linked.
                </p>
              </div>
              <button type="button" onClick={closeModal} style={closeBtnStyle} aria-label="Close">✕</button>
            </div>

            <form onSubmit={saveVehicle}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label style={labelStyle}>Vehicle Name *</label>
                  <input value={form.name} onChange={(e) => handleField('name', e.target.value)} style={inputStyle} required />
                </div>
                <div className="col-md-3">
                  <label style={labelStyle}>Brand</label>
                  <input value={form.brand} onChange={(e) => handleField('brand', e.target.value)} style={inputStyle} placeholder="e.g. GMC" />
                </div>
                <div className="col-md-3">
                  <label style={labelStyle}>Model</label>
                  <input value={form.model} onChange={(e) => handleField('model', e.target.value)} style={inputStyle} placeholder="e.g. Yukon XL" />
                </div>
                <div className="col-md-4">
                  <label style={labelStyle}>Pricing Category Key</label>
                  <select value={form.category} onChange={(e) => handleField('category', e.target.value)} style={inputStyle}>
                    <option value="">Auto / Custom</option>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label style={labelStyle}>Vehicle Type *</label>
                  <input value={form.type} onChange={(e) => handleField('type', e.target.value)} style={inputStyle} placeholder="Full-Size SUV" required />
                </div>
                <div className="col-md-4">
                  <label style={labelStyle}>Display Order</label>
                  <input type="number" value={form.displayOrder} onChange={(e) => handleField('displayOrder', e.target.value)} style={inputStyle} placeholder="1" />
                </div>
                <div className="col-md-4">
                  <label style={labelStyle}>Passenger Capacity *</label>
                  <input value={form.seats} onChange={(e) => handleField('seats', e.target.value)} style={inputStyle} placeholder="7–8 passengers" required />
                </div>
                <div className="col-md-4">
                  <label style={labelStyle}>Luggage Capacity *</label>
                  <input value={form.luggage} onChange={(e) => handleField('luggage', e.target.value)} style={inputStyle} placeholder="5-6 Bags" required />
                </div>
                <div className="col-md-4">
                  <label style={labelStyle}>Availability</label>
                  <select
                    value={form.available ? 'true' : 'false'}
                    onChange={(e) => handleField('available', e.target.value === 'true')}
                    style={inputStyle}
                  >
                    <option value="true">Available (visible to customers)</option>
                    <option value="false">Disabled (hidden from customers)</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label style={labelStyle}>Display Rate (SAR) *</label>
                  <input value={form.price} onChange={(e) => handleField('price', e.target.value)} style={inputStyle} placeholder="e.g. SAR 1400" required />
                </div>
                <div className="col-md-6">
                  <label style={labelStyle}>USD Price (optional)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.priceUsd}
                    onChange={(e) => handleField('priceUsd', e.target.value)}
                    style={inputStyle}
                    placeholder={(() => {
                      const autoUsd = sarToUsd(parsePriceNumber(form.price));
                      return autoUsd != null ? `Auto: ${formatMoney(autoUsd, 'USD')}` : 'Leave empty for auto (SAR ÷ 3.75)';
                    })()}
                  />
                  <div style={{ fontSize: 11, marginTop: 4, color: form.priceUsd.trim() ? '#f6d26e' : '#7ee2a8' }}>
                    {form.priceUsd.trim()
                      ? 'Manual USD override active — clear this field to return to automatic conversion.'
                      : (() => {
                          const autoUsd = sarToUsd(parsePriceNumber(form.price));
                          return autoUsd != null
                            ? `Automatic USD (SAR ÷ 3.75): ${formatMoney(autoUsd, 'USD')}`
                            : 'Automatic USD (SAR ÷ 3.75)';
                        })()}
                  </div>
                </div>
                <div className="col-12">
                  <label style={labelStyle}>Description</label>
                  <textarea rows={2} value={form.description} onChange={(e) => handleField('description', e.target.value)} style={inputStyle} placeholder="Short vehicle overview for customers" />
                </div>
                <div className="col-md-6">
                  <label style={labelStyle}>Cover Image URL or Upload *</label>
                  <input value={form.img} onChange={(e) => { handleField('img', e.target.value); setPreview(getCarImageUrl(e.target.value)); }} style={inputStyle} placeholder="/images/car/..." />
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="mt-2" style={{ color: '#ccc', fontSize: 12 }} />
                </div>
                <div className="col-md-6">
                  <label style={labelStyle}>Preview</label>
                  <div style={{ height: 110, borderRadius: 12, overflow: 'hidden', background: '#0e0e14', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {preview || form.img ? (
                      <img src={preview || getCarImageUrl(form.img)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>No image selected</span>
                    )}
                  </div>
                </div>
                <div className="col-12">
                  <label style={labelStyle}>Additional Gallery Images (one URL per line)</label>
                  <textarea rows={2} value={form.imagesText} onChange={(e) => handleField('imagesText', e.target.value)} style={inputStyle} placeholder="/images/car/..." />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button type="button" onClick={closeModal} style={btnOutline} disabled={saving}>Cancel</button>
                <button type="submit" style={btnGold} disabled={saving}>
                  {saving ? 'Saving...' : editingCar ? 'Save Changes' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div style={modalOverlayStyle} onClick={() => !deleting && setPendingDelete(null)}>
          <div style={{ ...modalStyle, maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h4 className="mb-2">Delete Vehicle</h4>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
              Permanently remove <strong>{pendingDelete.name}</strong> (ID #{pendingDelete.id}) from the fleet?
              If you want to keep historical references intact, consider disabling it instead.
            </p>
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button type="button" onClick={() => setPendingDelete(null)} style={btnOutline} disabled={deleting}>Cancel</button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                style={{ ...btnGold, background: 'linear-gradient(135deg, #7f1d1d, #dc2626)', color: '#fff' }}
              >
                {deleting ? 'Deleting...' : 'Delete Vehicle'}
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
  padding: 24,
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
  padding: '8px 14px',
  background: 'transparent',
  border: '1px solid rgba(238,176,18,0.4)',
  borderRadius: 10,
  color: '#eeb012',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 13,
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
  maxWidth: 740,
  background: '#12121b',
  borderRadius: 20,
  padding: 24,
  border: '1px solid rgba(255,255,255,0.1)',
  maxHeight: 'calc(100vh - 80px)',
  overflowY: 'auto',
};
