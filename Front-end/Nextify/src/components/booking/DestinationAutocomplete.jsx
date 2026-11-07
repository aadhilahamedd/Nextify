import React, { useEffect, useMemo, useRef, useState } from 'react';
import { findDestination, resolveDestinationValue, searchSaudiDestinations } from '../../data/saudiDestinations';
import { displayAirportName, searchSaudiAirports, toLocationPlace } from '../../data/saudiAirports';
import { describeTransferOption, formatTransferLocation, searchTransferLocations } from '../../data/transferLocations';
import { searchPlacesAPI } from '../../Services/allAPI';
import { useLanguage } from '../../i18n/LanguageContext';

function isAirportItem(item) {
  return item?.kind === 'airport'
    || String(item?.id || '').endsWith('-airport')
    || item?.type === 'aerodrome';
}

function placeKey(item) {
  return `${item.kind || 'place'}-${item.id || item.nameEn || item.address}-${item.lat || ''}-${item.lng || ''}`;
}

function optionCopy(item, lang, t, isTransferSearch) {
  const parentCity = lang === 'ar' ? (item.cityAr || item.cityEn) : (item.cityEn || item.pricingCity);
  const title = lang === 'ar'
    ? (item.nameAr || item.nameEn || item.address)
    : (item.nameEn || item.address);
  const region = item.kind === 'airport'
    ? (isTransferSearch
      ? `${parentCity || t('booking.airportsGroup')} · ${t('booking.airportType')}`
      : `${parentCity || ''}${item.iata ? ` · ${item.iata}` : ''}`)
    : item.kind === 'neighbourhood'
      ? `${parentCity || ''} · ${t('booking.neighbourhoodType')}`
      : (isTransferSearch
        ? t('booking.citiesGroup')
        : ([item.cityEn, lang === 'ar' ? item.regionAr : item.regionEn].filter(Boolean).join(' · ') || item.address || ''));
  return { title, region, iata: item.kind === 'airport' ? item.iata : '' };
}

export default function DestinationAutocomplete({
  value,
  onChange,
  placeholder,
  className = 'form-control book-input',
  id = 'booking-destination',
  variant = 'places',
  liveSearch = false,
  excludeAirports = false,
}) {
  const { lang, t, isAr } = useLanguage();
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const selectedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(0);
  const [liveResults, setLiveResults] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  const isTransferSearch = variant === 'transfer' || variant === 'airportOrPlace';
  const isAirportSearch = variant === 'airports' || isTransferSearch;
  const includePlaces = variant !== 'airports';
  const optionLabels = {
    airportType: t('booking.airportType'),
    neighbourhoodType: t('booking.neighbourhoodType'),
    citiesGroup: t('booking.citiesGroup'),
  };
  const selectedOption = describeTransferOption(value, lang, optionLabels);
  const selectedLabel = selectedOption?.title || '';
  const displayValue = typing ? query : selectedLabel;

  const localResults = useMemo(() => {
    const q = typing ? query : '';
    if (variant === 'airports') {
      return searchSaudiAirports(q, 12).map((item) => ({ ...item, kind: 'airport' }));
    }
    if (variant === 'transfer' || variant === 'airportOrPlace') {
      const grouped = searchTransferLocations(q);
      const rows = [];
      if (grouped.airports.length) {
        rows.push({ group: 'airports', label: t('booking.airportsGroup') });
        grouped.airports.forEach((item) => rows.push({ ...item, kind: 'airport' }));
      }
      if (grouped.cities.length) {
        rows.push({ group: 'cities', label: t('booking.citiesGroup') });
        grouped.cities.forEach((item) => rows.push({ ...item, kind: item.kind || 'place' }));
      }
      if (grouped.neighbourhoods?.length) {
        rows.push({ group: 'neighbourhoods', label: t('booking.neighbourhoodsGroup') });
        grouped.neighbourhoods.forEach((item) => rows.push({ ...item, kind: 'neighbourhood' }));
      }
      return rows;
    }
    return searchSaudiDestinations(q, 10)
      .filter((item) => !excludeAirports || !isAirportItem(item))
      .map((item) => ({ ...item, kind: 'place' }));
  }, [typing, query, variant, excludeAirports, t]);

  const results = useMemo(() => {
    if (!liveSearch || !includePlaces || variant === 'transfer' || variant === 'airportOrPlace') return localResults;
    const seen = new Set(localResults.map((item) => String(item.nameEn || '').toLowerCase()));
    const extra = liveResults.filter((item) => {
      if (excludeAirports && isAirportItem(item)) return false;
      const key = String(item.nameEn || item.address || '').toLowerCase();
      if (key && seen.has(key)) return false;
      if (key) seen.add(key);
      return true;
    });
    return [...localResults.slice(0, 6), ...extra].slice(0, 12);
  }, [localResults, liveResults, liveSearch, includePlaces, excludeAirports, variant]);

  const selectableResults = useMemo(() => results.filter((item) => !item.group), [results]);

  useEffect(() => {
    const q = typing ? query.trim() : '';
    if (!liveSearch || !includePlaces || q.length < 3) {
      setLiveResults([]);
      setLoadingPlaces(false);
      return undefined;
    }
    let cancelled = false;
    setLoadingPlaces(true);
    const timer = window.setTimeout(() => {
      searchPlacesAPI(q, lang).then((res) => {
        if (cancelled) return;
        setLoadingPlaces(false);
        setLiveResults(Array.isArray(res?.data?.places) ? res.data.places : []);
      });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [liveSearch, includePlaces, typing, query, lang]);

  useEffect(() => {
    const onDoc = (event) => {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false);
        setTyping(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, []);

  const emit = (nextValue, item) => {
    if (item) {
      const selectedName = item.nameEn || item.address || item.label || nextValue;
      onChange(selectedName, toLocationPlace(item, selectedName));
      return;
    }
    if (typeof nextValue === 'object' && nextValue) {
      const selectedName = formatTransferLocation(nextValue, 'en') || nextValue.nameEn || nextValue.address || '';
      if (!selectedName || selectedName === '[object Object]') return;
      onChange(selectedName, toLocationPlace(nextValue, selectedName));
      return;
    }
    if (includePlaces) {
      const dest = findDestination(nextValue);
      if (dest && !isAirportItem(dest)) {
        onChange(dest.nameEn, toLocationPlace({ ...dest, kind: 'place' }, dest.nameEn));
        return;
      }
    }
    onChange(String(nextValue || ''), toLocationPlace(null, String(nextValue || '')));
  };

  const commit = (next) => {
    if (typeof next === 'object' && next) {
      setTyping(false);
      setOpen(false);
      return;
    }
    const resolved = isAirportSearch && !includePlaces
      ? (displayAirportName(next, 'en') || resolveDestinationValue(next))
      : resolveDestinationValue(next);
    if (!resolved || resolved === '[object Object]') {
      if (typing && !String(query || '').trim()) emit('', null);
      setTyping(false);
      setOpen(false);
      return;
    }
    emit(resolved, selectableResults.find((item) => item.nameEn === resolved || item.address === resolved) || null);
    setTyping(false);
    setOpen(false);
  };

  const selectItem = (item) => {
    selectedRef.current = true;
    emit(item.nameEn || item.address || item.label, item);
    setQuery('');
    setTyping(false);
    setOpen(false);
    window.setTimeout(() => inputRef.current?.blur(), 0);
  };

  const renderOptionCopy = (meta) => (
    <>
      <span className="dest-ac-copy">
        <span className="dest-ac-name">{meta.title}</span>
        {meta.region ? <span className="dest-ac-region">{meta.region}</span> : null}
      </span>
      {meta.iata ? <span className="dest-ac-iata">{meta.iata}</span> : null}
    </>
  );

  return (
    <div className="dest-ac" ref={wrapRef}>
      <input
        ref={inputRef}
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
          window.requestAnimationFrame(() => inputRef.current?.select());
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
            commit(typing ? query : value);
          }, 0);
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setOpen(true);
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, Math.max(selectableResults.length - 1, 0)));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter' && open && selectableResults[active]) {
            e.preventDefault();
            selectItem(selectableResults[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul id={`${id}-list`} className={`dest-ac-list${isAr ? ' is-rtl' : ''}`} role="listbox">
          {results.length ? results.map((item) => {
            if (item.group) {
              return (
                <li key={`group-${item.group}`} className="dest-ac-group" role="presentation">
                  {item.label}
                </li>
              );
            }
            const selectableIndex = selectableResults.findIndex((row) => placeKey(row) === placeKey(item));
            const meta = optionCopy(item, lang, t, isTransferSearch);
            const isSelected = Boolean(selectedOption?.id && item.id === selectedOption.id);
            return (
            <li
              key={placeKey(item)}
              role="option"
              aria-selected={selectableIndex === active}
              className={`dest-ac-item${selectableIndex === active ? ' is-active' : ''}${isSelected ? ' is-selected' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                selectItem(item);
              }}
              onMouseEnter={() => setActive(selectableIndex)}
            >
              {renderOptionCopy(meta)}
            </li>
            );
          }) : (
            <li className="dest-ac-empty">{loadingPlaces ? t('booking.searchingPlaces') : t('booking.noResults')}</li>
          )}
        </ul>
      )}
    </div>
  );
}
