import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { toArabicIndic } from '../../i18n/format';

function pad(n) {
  return String(n).padStart(2, '0');
}

export function getLocalDateValue(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isTravelDateTimePast(dateValue, timeValue) {
  if (!dateValue || !timeValue) return false;
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);
  if (!year || !month || !day) return false;
  const selected = new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0);
  return selected.getTime() < Date.now();
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

function formatSlashDate(value, lang) {
  const selected = value instanceof Date ? value : parseDateValue(value);
  if (!selected) return '';
  const day = pad(selected.getDate());
  const month = pad(selected.getMonth() + 1);
  const year = String(selected.getFullYear());
  const shown = `${day}/${month}/${year}`;
  return lang === 'ar' ? toArabicIndic(shown) : shown;
}

export function LocaleDateInput({ value, min, onChange, className }) {
  const { lang, t } = useLanguage();
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
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, []);

  const months = t('dates.months');
  const weekdays = t('dates.weekdays');
  const year = view.getFullYear();
  const month = view.getMonth();
  const start = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(start).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const label = selected ? formatSlashDate(selected, lang) : t('dates.pickDate');

  return (
    <div className="book-picker" ref={wrapRef}>
      <button type="button" className={`${className} book-picker-trigger`} onClick={() => setOpen((v) => !v)}>
        <span className="book-date-value" dir="ltr">{label}</span>
      </button>
      {open && (
        <div className="book-cal" role="dialog" aria-label={t('booking.travelDate')}>
          <div className="book-cal-head">
            <button type="button" onClick={() => setView(new Date(year, month - 1, 1))} aria-label="Previous month">‹</button>
            <strong>
              {months[month]} <span className="book-date-value" dir="ltr">{lang === 'ar' ? toArabicIndic(year) : year}</span>
            </strong>
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
                  <span className="book-date-value" dir="ltr">{lang === 'ar' ? toArabicIndic(day) : day}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function LocaleTimeInput({ value, onChange, className, min }) {
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
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, []);

  const label = value
    ? (lang === 'ar' ? `${toArabicIndic(hour)}:${toArabicIndic(minute)}` : `${hour}:${minute}`)
    : t('dates.pickTime');

  const minHour = min ? Number(min.slice(0, 2)) : null;
  const minMinute = min ? Number(min.slice(3, 5)) : null;
  const isHourDisabled = (h) => minHour != null && Number(h) < minHour;
  const isMinuteDisabled = (m) => {
    if (minHour == null) return false;
    const selectedHour = Number(hour || '00');
    if (selectedHour < minHour) return true;
    return selectedHour === minHour && Number(m) < minMinute;
  };

  const pick = (nextHour, nextMinute) => {
    if (isHourDisabled(nextHour)) return;
    if (Number(nextHour) === minHour && Number(nextMinute) < minMinute) {
      const nextAllowed = minutes.find((item) => Number(item) >= minMinute) || minutes[minutes.length - 1];
      onChange(`${nextHour}:${nextAllowed}`);
      return;
    }
    onChange(`${nextHour}:${nextMinute}`);
  };

  return (
    <div className="book-picker" ref={wrapRef}>
      <button type="button" className={`${className} book-picker-trigger`} onClick={() => setOpen((v) => !v)}>
        <span className="book-date-value" dir="ltr">{label}</span>
      </button>
      {open && (
        <div className="book-clock" role="dialog" aria-label={t('booking.travelTime')}>
          <div className="book-clock-col">
            {hours.map((h) => (
              <button
                key={h}
                type="button"
                disabled={isHourDisabled(h)}
                className={hour === h ? 'is-active' : ''}
                onClick={() => pick(h, minute && minutes.includes(minute) ? minute : '00')}
              >
                <span className="book-date-value" dir="ltr">{lang === 'ar' ? toArabicIndic(h) : h}</span>
              </button>
            ))}
          </div>
          <div className="book-clock-col">
            {minutes.map((m) => (
              <button
                key={m}
                type="button"
                disabled={isMinuteDisabled(m)}
                className={minute === m ? 'is-active' : ''}
                onClick={() => {
                  pick(hour || '00', m);
                  setOpen(false);
                }}
              >
                <span className="book-date-value" dir="ltr">{lang === 'ar' ? toArabicIndic(m) : m}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
