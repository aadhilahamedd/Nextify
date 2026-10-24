import React, { useEffect, useMemo, useRef, useState } from 'react';
import { displayDestinationName, resolveDestinationValue, searchSaudiDestinations } from '../../data/saudiDestinations';
import { useLanguage } from '../../i18n/LanguageContext';

export default function DestinationAutocomplete({
  value,
  onChange,
  placeholder,
  className = 'form-control book-input',
  id = 'booking-destination',
}) {
  const { lang, t, isAr } = useLanguage();
  const wrapRef = useRef(null);
  const selectedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(0);

  const displayValue = typing ? query : displayDestinationName(value, lang) || value || '';

  const results = useMemo(() => searchSaudiDestinations(typing ? query : '', 10), [typing, query]);

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

  const commit = (next) => {
    onChange(resolveDestinationValue(next));
    setTyping(false);
    setOpen(false);
  };

  const selectItem = (item) => {
    selectedRef.current = true;
    onChange(item.nameEn);
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
          onChange(e.target.value);
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
              key={item.id}
              role="option"
              aria-selected={index === active}
              className={`dest-ac-item${index === active ? ' is-active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                selectItem(item);
              }}
              onMouseEnter={() => setActive(index)}
            >
              <span className="dest-ac-name">{lang === 'ar' ? item.nameAr : item.nameEn}</span>
              <span className="dest-ac-region">{lang === 'ar' ? item.regionAr : item.regionEn}</span>
            </li>
          )) : (
            <li className="dest-ac-empty">{t('booking.noResults')}</li>
          )}
        </ul>
      )}
    </div>
  );
}
