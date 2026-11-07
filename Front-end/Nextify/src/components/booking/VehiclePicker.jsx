import React, { useEffect, useMemo, useRef, useState } from 'react';
import { findFleetVehicle, getOfficialQuote } from '../../data/fleetVehicles';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateVehicle } from '../../i18n/places';

export default function VehiclePicker({
  vehicles = [],
  value,
  onChange,
  serviceType,
  durationType,
  quotePayload = {},
  placeholder,
  className = 'form-control book-input',
  id = 'booking-vehicle',
}) {
  const { t, isAr, formatSar } = useLanguage();
  const wrapRef = useRef(null);
  const selectedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(0);

  const selected = vehicles.find((v) => v.category === value) || findFleetVehicle({ category: value });
  const selectedLabel = selected ? translateVehicle(selected.category, selected.label, t) : '';
  const displayValue = typing ? query : selectedLabel;

  const results = useMemo(() => {
    const q = (typing ? query : '').trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => {
      const label = `${translateVehicle(v.category, v.label, t)} ${v.label} ${v.fleetClass}`.toLowerCase();
      return label.includes(q);
    });
  }, [typing, query, vehicles, t]);

  const fareFor = (item) => {
    if (serviceType === 'chauffeur' && !durationType) {
      return { note: item.fleetClass, priceLabel: '' };
    }
    if (serviceType === 'city_transfer') {
      const cityPrice = item.city ?? item.airport;
      if (cityPrice != null) {
        return { note: item.fleetClass, priceLabel: formatSar(cityPrice) };
      }
    }
    const quote = getOfficialQuote({
      serviceType,
      durationType,
      vehicleCategory: item.category,
      vehicleName: item.label,
      airport: quotePayload.airport,
      origin: quotePayload.origin,
      destination: quotePayload.destination,
      pickupPlace: quotePayload.pickupPlace,
      dropoffPlace: quotePayload.dropoffPlace,
      returnTrip: quotePayload.returnTrip,
      distanceKm: quotePayload.distanceKm,
    });
    if (quote?.customQuoteRequired || quote?.price == null) {
      return { note: item.fleetClass, priceLabel: t('booking.rateOnRequest') };
    }
    return { note: item.fleetClass, priceLabel: formatSar(quote.price) };
  };

  useEffect(() => {
    const onDoc = (event) => {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false);
        setTyping(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, []);

  const selectItem = (item) => {
    selectedRef.current = true;
    onChange(item);
    setQuery('');
    setTyping(false);
    setOpen(false);
  };

  return (
    <div className="dest-ac" ref={wrapRef}>
      <input
        id={id}
        className={className}
        value={displayValue}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onChange={(e) => {
          setTyping(true);
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            if (selectedRef.current) {
              selectedRef.current = false;
              setTyping(false);
              setOpen(false);
              return;
            }
            setTyping(false);
            setQuery('');
            setOpen(false);
          }, 0);
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setOpen(true);
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter' && open && results[active]) {
            e.preventDefault();
            selectItem(results[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul id={`${id}-list`} className={`dest-ac-list${isAr ? ' is-rtl' : ''}`} role="listbox">
          {results.length ? results.map((item, index) => {
            const fare = fareFor(item);
            return (
              <li
                key={item.category}
                role="option"
                aria-selected={index === active}
                className={`dest-ac-item${index === active ? ' is-active' : ''}${value === item.category ? ' is-selected' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectItem(item);
                }}
                onMouseEnter={() => setActive(index)}
              >
                <span className="dest-ac-copy">
                  <span className="dest-ac-name">{translateVehicle(item.category, item.label, t)}</span>
                  {fare.note ? <span className="dest-ac-region">{fare.note}</span> : null}
                </span>
                {fare.priceLabel ? <span className="dest-ac-price">{fare.priceLabel}</span> : null}
              </li>
            );
          }) : (
            <li className="dest-ac-empty">{t('booking.noResults')}</li>
          )}
        </ul>
      )}
    </div>
  );
}
