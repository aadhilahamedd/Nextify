import { findFleetVehicle } from '../data/fleetVehicles.js';
import {
  parsePriceNumber,
  resolveUsdDisplay,
  roundSarDisplay,
  roundUsdDisplay,
} from '../utils/currency.js';

const ARABIC_DIGITS = {
  0: '٠',
  1: '١',
  2: '٢',
  3: '٣',
  4: '٤',
  5: '٥',
  6: '٦',
  7: '٧',
  8: '٨',
  9: '٩',
};

export function toArabicIndic(value) {
  return String(value).replace(/[0-9]/g, (d) => ARABIC_DIGITS[d] ?? d).replace(/,/g, '٬');
}

export function formatNumberForLang(value, lang = 'en', options) {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const formatted = n.toLocaleString('en-US', options ?? { maximumFractionDigits: n % 1 ? 2 : 0 });
  return lang === 'ar' ? toArabicIndic(formatted) : formatted;
}

export function formatSarForLang(amount, lang = 'en') {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '';
  const num = formatNumberForLang(n, lang);
  return lang === 'ar' ? `${num} ر.س` : `SAR ${num}`;
}

export function formatUsdForLang(amount, lang = 'en') {
  const n = roundUsdDisplay(amount);
  if (n == null || !Number.isFinite(n)) return '';
  const hasDecimals = Math.abs(n % 1) > 1e-9;
  const num = formatNumberForLang(n, lang, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `$${num}`;
}

export function formatDateForLang(value, lang = 'en') {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTimeForLang(value, lang = 'en') {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCarDayPriceForLang(car, lang = 'en') {
  if (!car) return '';
  const fleet = findFleetVehicle(car);
  const rawPrice = String(car.price || '').trim();
  const hasExplicitSar = /\bsar\b/i.test(rawPrice) || /^\d[\d,]*(?:\.\d+)?$/.test(rawPrice);
  const parsedCarSar = hasExplicitSar ? parsePriceNumber(rawPrice) : null;
  const hasCarSar = parsedCarSar != null && parsedCarSar > 0;
  const fromFleet = !hasCarSar && fleet?.full != null;
  const sar = hasCarSar ? parsedCarSar : (fromFleet ? fleet.full : parsePriceNumber(rawPrice));
  const { amount: usd } = resolveUsdDisplay(sar, car.priceUsd);
  if (sar == null && usd == null) return car.price || '';
  const parts = [];
  if (sar != null) parts.push(formatSarForLang(hasCarSar || fromFleet ? sar : roundSarDisplay(sar), lang));
  if (usd != null) parts.push(formatUsdForLang(usd, lang));
  return parts.join(' · ');
}
