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
