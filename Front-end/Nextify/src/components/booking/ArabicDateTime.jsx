import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { toArabicIndic } from '../../i18n/format';

function pad(n) {
  return String(n).padStart(2, '0');
}

function toDateValue(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseDateValue(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function LocaleDateInput({ value, min, onChange, className }) {
  const { lang, t, formatNumber } = useLanguage();
  const wrapRef = useRef(null);
  const selected = parseDateValue(value);
  const minDate = parseDateValue(min);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => selected || new Date());

  useEffect(() => {
    if (selected) setView(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [value]);

  useEffect(() => {
    const onDoc = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (lang !== 'ar') {
    return (
      <input type="date" min={min} dir="ltr" lang="en-GB" className={className} value={value} onChange={(e) => onChange(e.target.value)} />
    );
  }

  const months = t('dates.months');
  const weekdays = t('dates.weekdays');
  const year = view.getFullYear();
  const month = view.getMonth();
  const start = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(start).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const label = selected
    ? `${formatNumber(selected.getDate())} ${months[selected.getMonth()]} ${formatNumber(selected.getFullYear())}`
    : t('dates.pickDate');

  return (
    <div className="book-picker" ref={wrapRef}>
      <button type="button" className={`${className} book-picker-trigger`} onClick={() => setOpen((v) => !v)}>
        {label}
      </button>
      {open && (
        <div className="book-cal" role="dialog" aria-label={t('booking.travelDate')}>
          <div className="book-cal-head">
            <button type="button" onClick={() => setView(new Date(year, month - 1, 1))} aria-label="Previous month">‹</button>
            <strong>{months[month]} {formatNumber(year)}</strong>
            <button type="button" onClick={() => setView(new Date(year, month + 1, 1))} aria-label="Next month">›</button>
          </div>
          <div className="book-cal-grid">
            {weekdays.map((day) => (
              <span key={day} className="book-cal-dow">{day}</span>
            ))}
            {cells.map((day, index) => {
              if (!day) return <span key={`e-${index}`} />;
              const dateValue = toDateValue(year, month, day);
              const disabled = minDate && new Date(year, month, day) < minDate;
              const active = value === dateValue;
              return (
                <button
                  key={dateValue}
                  type="button"
                  disabled={disabled}
                  className={`book-cal-day${active ? ' is-active' : ''}`}
                  onClick={() => {
                    onChange(dateValue);
                    setOpen(false);
                  }}
                >
                  {formatNumber(day)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function LocaleTimeInput({ value, onChange, className }) {
  const { lang, t } = useLanguage();
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => pad(i)), []);
  const minutes = useMemo(() => Array.from({ length: 12 }, (_, i) => pad(i * 5)), []);
  const [hour, minute] = (value || '00:00').split(':');

  useEffect(() => {
    const onDoc = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (lang !== 'ar') {
    return (
      <input type="time" dir="ltr" lang="en-GB" className={className} value={value} onChange={(e) => onChange(e.target.value)} />
    );
  }

  const label = value
    ? `${toArabicIndic(hour)}:${toArabicIndic(minute)}`
    : t('dates.pickTime');

  const pick = (nextHour, nextMinute) => {
    onChange(`${nextHour}:${nextMinute}`);
  };

  return (
    <div className="book-picker" ref={wrapRef}>
      <button type="button" className={`${className} book-picker-trigger`} onClick={() => setOpen((v) => !v)}>
        {label}
      </button>
      {open && (
        <div className="book-clock" role="dialog" aria-label={t('booking.travelTime')}>
          <div className="book-clock-col">
            {hours.map((h) => (
              <button
                key={h}
                type="button"
                className={hour === h ? 'is-active' : ''}
                onClick={() => pick(h, minute && minutes.includes(minute) ? minute : '00')}
              >
                {toArabicIndic(h)}
              </button>
            ))}
          </div>
          <div className="book-clock-col">
            {minutes.map((m) => (
              <button
                key={m}
                type="button"
                className={minute === m ? 'is-active' : ''}
                onClick={() => {
                  pick(hour || '00', m);
                  setOpen(false);
                }}
              >
                {toArabicIndic(m)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
