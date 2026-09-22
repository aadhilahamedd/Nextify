import React, { useCallback, useEffect, useState } from 'react';
import {
  createDriverAPI,
  deleteDriverAPI,
  getDriversAPI,
  updateDriverAPI,
} from '../../Services/allAPI';

const sectionCardStyle = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px',
  padding: '28px',
};

const refreshBtnStyle = {
  padding: '10px 18px',
  background: 'rgba(255, 255, 255, 0.15)',
  border: '1px solid rgba(255, 255, 255, 0.4)',
  borderRadius: '10px',
  color: '#ffffff',
  fontWeight: '600',
  fontSize: '13px',
  cursor: 'pointer',
};

const emptyDriver = { name: '', phone: '', email: '', licenseNumber: '', languages: ['Arabic', 'English'], status: 'AVAILABLE', active: true };

export default function AdminDriversPanel() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyDriver);
  const [editingId, setEditingId] = useState(null);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    const res = await getDriversAPI();
    if (res?.status === 200) {
      setDrivers(Array.isArray(res.data) ? res.data : res.data?.drivers || []);
      setError('');
    } else {
      setError(res?.error || 'Failed to load drivers');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const saveDriver = async (e) => {
    e.preventDefault();
    const res = editingId
      ? await updateDriverAPI(editingId, form)
      : await createDriverAPI(form);
    if (res?.status === 200 || res?.status === 201) {
      setForm(emptyDriver);
      setEditingId(null);
      fetchDrivers();
    } else {
      alert(res?.error || res?.data?.message || 'Save failed');
    }
  };

  const removeDriver = async (id) => {
    if (!window.confirm('Delete this driver?')) return;
    const res = await deleteDriverAPI(id);
    if (res?.status === 200) fetchDrivers();
  };

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Drivers</h1>
          <p>Manage chauffeurs for vehicle + driver bookings</p>
        </div>
        <button type="button" onClick={fetchDrivers} style={refreshBtnStyle}>Refresh</button>
      </div>

      <div style={sectionCardStyle}>
        <form onSubmit={saveDriver} className="row g-2 mb-4">
          {['name', 'phone', 'email', 'licenseNumber'].map((field) => (
            <div key={field} className="col-md-3">
              <input
                className="form-control form-control-sm"
                placeholder={field}
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                required={field !== 'email'}
              />
            </div>
          ))}
          <div className="col-md-2">
            <select className="form-select form-select-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {['AVAILABLE', 'ASSIGNED', 'ON_TRIP', 'OFFLINE'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <button type="submit" className="btn btn-light btn-sm w-100">{editingId ? 'Update' : 'Add Driver'}</button>
          </div>
        </form>

        {error && <div className="alert alert-danger py-2">{error}</div>}
        {loading && <p className="text-white-50">Loading drivers...</p>}

        {!loading && drivers.map((d) => (
          <div key={d._id} className="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary">
            <div>
              <strong>{d.name}</strong> · {d.phone}
              <div className="small text-white-50">{d.licenseNumber} · {d.status} · {d.active ? 'Active' : 'Inactive'}</div>
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-outline-light btn-sm" onClick={() => { setEditingId(d._id); setForm({ name: d.name, phone: d.phone, email: d.email, licenseNumber: d.licenseNumber, languages: d.languages, status: d.status, active: d.active }); }}>Edit</button>
              <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeDriver(d._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
