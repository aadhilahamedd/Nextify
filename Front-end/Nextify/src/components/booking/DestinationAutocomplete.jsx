import React, { useEffect, useMemo, useRef, useState } from 'react';
import { displayDestinationName, resolveDestinationValue, searchSaudiDestinations } from '../../data/saudiDestinations';
import { displayAirportName, searchSaudiAirports, toLocationPlace } from '../../data/saudiAirports';
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
  const selectedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(0);
  const [liveResults, setLiveResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const isAirportSearch = variant === 'airports' || variant === 'airportOrPlace';
  const includePlaces = variant !== 'airports';
  const displayValue = typing
    ? query
    : (isAirportSearch ? displayAirportName(value, lang) : displayDestinationName(value, lang)) || value || '';

  const localResults = useMemo(() => {
    const q = typing ? query : '';
    if (variant === 'airports') {
      return searchSaudiAirports(q, 12).map((item) => ({ ...item, kind: 'airport' }));
    }
    if (variant === 'airportOrPlace') {
      const airports = searchSaudiAirports(q, 8).map((item) => ({ ...item, kind: 'airport' }));
      const places = searchSaudiDestinations(q, 8)
        .filter((item) => !isAirportItem(item) && !airports.some((airport) => airport.nameEn === item.nameEn))
        .map((item) => ({ ...item, kind: 'place' }));
      return [...airports, ...places].slice(0, 12);
    }
    return searchSaudiDestinations(q, 10)
      .filter((item) => !excludeAirports || !isAirportItem(item))
      .map((item) => ({ ...item, kind: 'place' }));
  }, [typing, query, variant, excludeAirports]);

  const results = useMemo(() => {
    if (!liveSearch || !includePlaces) return localResults;
    const seen = new Set(localResults.map((item) => String(item.nameEn || '').toLowerCase()));
    const extra = liveResults.filter((item) => {
      if (excludeAirports && isAirportItem(item)) return false;
      const key = String(item.nameEn || item.address || '').toLowerCase();
      if (key && seen.has(key)) return false;
      if (key) seen.add(key);
      return true;
    });
    return [...localResults.slice(0, 6), ...extra].slice(0, 12);
  }, [localResults, liveResults, liveSearch, includePlaces, excludeAirports]);

  useEffect(() => {
    const q = typing ? query.trim() : '';
    if (!liveSearch || !includePlaces || q.length < 3) {
      setLiveResults([]);
      setSearching(false);
      return undefined;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(() => {
      searchPlacesAPI(q, lang).then((res) => {
        if (cancelled) return;
        setSearching(false);
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
    onChange(nextValue, item ? toLocationPlace(item, nextValue) : toLocationPlace(null, nextValue));
  };

  const commit = (next) => {
    const resolved = isAirportSearch && !includePlaces
      ? (displayAirportName(next, 'en') || resolveDestinationValue(next))
      : resolveDestinationValue(next);
    emit(resolved, results.find((item) => item.nameEn === resolved || item.address === resolved) || null);
    setTyping(false);
    setOpen(false);
  };

  const selectItem = (item) => {
    selectedRef.current = true;
    emit(item.nameEn || item.address || item.label, item);
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
          emit(e.target.value, null);
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
          {results.length ? results.map((item, index) => (
            <li
              key={placeKey(item)}
              role="option"
              aria-selected={index === active}
              className={`dest-ac-item${index === active ? ' is-active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                selectItem(item);
              }}
              onMouseEnter={() => setActive(index)}
            >
              <span className="dest-ac-copy">
                <span className="dest-ac-name">{lang === 'ar' ? (item.nameAr || item.nameEn || item.address) : (item.nameEn || item.address)}</span>
                <span className="dest-ac-region">
                  {item.kind === 'airport'
                    ? `${lang === 'ar' ? item.cityAr : item.cityEn}${item.iata ? ` · ${item.iata}` : ''}`
                    : ([item.cityEn, lang === 'ar' ? item.regionAr : item.regionEn].filter(Boolean).join(' · ') || item.address || '')}
                </span>
              </span>
              {item.kind === 'airport' && item.iata ? (
                <span className="dest-ac-iata">{item.iata}</span>
              ) : null}
            </li>
          )) : (
            <li className="dest-ac-empty">{searching ? t('booking.searchingPlaces') : t('booking.noResults')}</li>
          )}
        </ul>
      )}
    </div>
  );
}
