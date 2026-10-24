export const SAR_PER_USD = 3.75;

export function parsePriceNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

export function sarToUsd(sar) {
  const n = Number(sar);
  if (!Number.isFinite(n)) return null;
  return Math.round((n / SAR_PER_USD) * 100) / 100;
}

export function formatMoney(amount, currency) {
  if (amount == null || !Number.isFinite(Number(amount))) return '';
  const n = Number(amount);
  const formatted = n.toLocaleString(undefined, { maximumFractionDigits: n % 1 ? 2 : 0 });
  return currency === 'USD' ? `$${formatted}` : `SAR ${formatted}`;
}

export function formatSarAndUsd(sarAmount, usdAmount) {
  const sar = parsePriceNumber(sarAmount);
  const usd = parsePriceNumber(usdAmount) ?? (sar != null ? sarToUsd(sar) : null);
  if (sar == null && usd == null) return '';
  if (sar == null) return formatMoney(usd, 'USD');
  if (usd == null) return formatMoney(sar, 'SAR');
  return `${formatMoney(sar, 'SAR')} · ${formatMoney(usd, 'USD')}`;
}

export function formatCarDayPrice(car) {
  if (!car) return '';
  if (car.price && car.priceUsd) {
    const sar = String(car.price).includes('SAR') ? car.price : `SAR ${car.price}`;
    const usd = String(car.priceUsd).includes('$') ? car.priceUsd : `$${car.priceUsd}`;
    return `${sar} · ${usd}`;
  }
  const dual = formatSarAndUsd(car.price, car.priceUsd);
  if (dual) return dual;
  return car.price || '';
}
