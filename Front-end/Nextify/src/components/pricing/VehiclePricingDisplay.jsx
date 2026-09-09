import React from 'react';
import { getVehiclePricingHints } from '../../utils/vehiclePricing';

export default function VehiclePricingDisplay({ rules, car, compact = false }) {
  const hints = getVehiclePricingHints(rules, car);
  if (!hints.length) return null;

  if (compact) {
    return (
      <div className="d-flex flex-column gap-2 mb-4">
        {hints.map((h) => (
          <div key={h.serviceType} className="d-flex justify-content-between" style={{ fontSize: '0.9rem' }}>
            <span style={{ color: '#a0a0a0' }}>{h.label}</span>
            <span style={{ color: '#eeb012', fontWeight: 600 }}>
              SAR {h.price.toLocaleString()}{h.suffix || ''}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-3">
      {hints.map((h) => (
        <div key={h.serviceType} style={{ fontSize: '0.85rem', color: '#ccc', marginBottom: 4 }}>
          <span style={{ color: '#888' }}>{h.label}: </span>
          <span style={{ color: '#eeb012', fontWeight: 600 }}>
            {h.suffix?.includes('from') ? 'From ' : ''}SAR {h.price.toLocaleString()}{h.suffix?.replace(' (from)', '') || ''}
          </span>
        </div>
      ))}
    </div>
  );
}
