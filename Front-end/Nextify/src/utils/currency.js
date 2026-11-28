export const SAR_PER_USD = 3.75;

export function parsePriceNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

export function parseOptionalPositiveUsd(raw) {
  if (raw === undefined || raw === null) {
    return { valid: true, value: null };
  }
  const str = String(raw).trim();
  if (str === '') {
    return { valid: true, value: null };
  }
  const cleaned = str.replace(/^\$\s*/, '').replace(/,/g, '');
  if (!/^\d+(?:\.\d+)?$/.test(cleaned)) {
    return { valid: false, message: 'USD price must be a valid positive number.' };
  }
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num <= 0) {
    return { valid: false, message: 'USD price must be a valid positive number.' };
  }
  return { valid: true, value: Math.round(num * 100) / 100 };
}

export function sarToUsd(sar) {
  const n = Number(sar);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round((n / SAR_PER_USD) * 100) / 100;
}

export function roundUsdDisplay(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

export function roundSarDisplay(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  return Math.round(n / 50) * 50;
}

export function resolveUsdDisplay(sarAmount, usdOverride) {
  const overrideCheck = parseOptionalPositiveUsd(usdOverride);
  if (overrideCheck.valid && overrideCheck.value != null) {
    return { amount: overrideCheck.value, isOverride: true };
  }
  const sar = parsePriceNumber(sarAmount);
  if (sar == null || sar <= 0) {
    return { amount: null, isOverride: false };
  }
  return { amount: sarToUsd(sar), isOverride: false };
}

export function formatMoney(amount, currency) {
  if (amount == null || !Number.isFinite(Number(amount))) return '';
  const n = Number(amount);
  const hasDecimals = Math.abs(n % 1) > 1e-9;
  const formatted = n.toLocaleString('en-US', {
    minimumFractionDigits: currency === 'USD' && hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return currency === 'USD' ? `$${formatted}` : `SAR ${formatted}`;
}

export function formatSarAndUsd(sarAmount, usdAmount) {
  const sar = parsePriceNumber(sarAmount);
  const { amount: usd } = resolveUsdDisplay(sar, usdAmount);
  if (sar == null && usd == null) return '';
  if (sar == null) return formatMoney(usd, 'USD');
  if (usd == null) return formatMoney(sar, 'SAR');
  return `${formatMoney(sar, 'SAR')} · ${formatMoney(usd, 'USD')}`;
}

export function formatCarDayPrice(car) {
  if (!car) return '';
  const dual = formatSarAndUsd(car.price, car.priceUsd);
  if (dual) return dual;
  return car.price || '';
}
