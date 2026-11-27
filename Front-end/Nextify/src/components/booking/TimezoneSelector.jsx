import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_BOOKING_TIMEZONE,
  formatTimezoneLabel,
  getAllSupportedTimezones,
} from './dateTimeUtils';

export default function TimezoneSelector({
  value = DEFAULT_BOOKING_TIMEZONE,
  onChange,
  className = 'form-control book-input',
}) {
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const allTimezones = useMemo(() => getAllSupportedTimezones(), []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allTimezones;
    return allTimezones.filter(
      (item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    );
  }, [allTimezones, query]);

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

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery('');
    }
  }, [open]);

  return (
    <div className="book-picker" ref={wrapRef}>
      <button
        type="button"
        className={`${className} book-picker-trigger`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="book-date-value" dir="ltr" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {formatTimezoneLabel(value)}
        </span>
      </button>
      {open && (
        <div
          className="book-cal"
          role="dialog"
          aria-label="Booking timezone"
          style={{ width: '100%', minWidth: 260, maxWidth: 380, padding: 10 }}
        >
          <input
            ref={inputRef}
            type="text"
            className="form-control book-input"
            placeholder="Search timezone (e.g. Riyadh, London, India, Dubai)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ marginBottom: 8, fontSize: '0.88rem', padding: '8px 10px' }}
          />
          <div
            role="listbox"
            style={{
              maxHeight: 220,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                No matching timezones found
              </div>
            ) : (
              filtered.slice(0, 80).map((tz) => {
                const active = tz.id === value;
                return (
                  <button
                    key={tz.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(tz.id);
                      setOpen(false);
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: active ? '1px solid #c8a261' : '1px solid transparent',
                      background: active ? 'rgba(200, 162, 97, 0.18)' : 'transparent',
                      color: active ? '#f6d26e' : '#ffffff',
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                    }}
                  >
                    <span dir="ltr">{tz.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
