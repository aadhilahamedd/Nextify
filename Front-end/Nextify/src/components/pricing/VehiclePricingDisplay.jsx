import React from 'react';
import { getVehiclePricingHints } from '../../utils/vehiclePricing';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateService } from '../../i18n/places';

export default function VehiclePricingDisplay({ rules, car, compact = false }) {
  const { t, formatSar, formatUsd } = useLanguage();
  const hints = getVehiclePricingHints(rules, car);
  if (!hints.length) return null;

  const money = (h) => {
    const parts = [];
    if (h.price != null) parts.push(formatSar(h.price));
    if (h.priceUsd != null) parts.push(formatUsd(h.priceUsd));
    return parts.join(' · ');
  };

  const suffix = (h) => {
    if (h.suffix?.includes('Half Day')) return ` / ${t('booking.halfDay')}`;
    if (h.suffix?.includes('from')) return ` (${t('rates.from')})`;
    return h.suffix || '';
  };

  if (compact) {
    return (
      <div className="d-flex flex-column gap-2 mb-4">
        {hints.map((h) => (
          <div key={h.serviceType} className="d-flex justify-content-between" style={{ fontSize: '0.9rem' }}>
            <span style={{ color: '#a0a0a0' }}>{translateService(h.serviceType, t)}</span>
            <span style={{ color: '#eeb012', fontWeight: 600 }}>
              {money(h)}{suffix(h)}
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
          <span style={{ color: '#888' }}>{translateService(h.serviceType, t)}: </span>
          <span style={{ color: '#eeb012', fontWeight: 600 }}>
            {h.suffix?.includes('from') ? `${t('rates.from')} ` : ''}{money(h)}{h.suffix?.includes('Half Day') ? ` / ${t('booking.halfDay')}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
