export function dateOnly(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export function parseDateInput(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{2}-\d{2}-\d{4}$/.test(text)) {
    const [month, day, year] = text.split('-');
    return `${year}-${month}-${day}`;
  }
  return text;
}

export function formatDateInput(value) {
  const text = dateOnly(value);
  if (!text) return '';
  const [year, month, day] = text.split('-');
  return `${month}-${day}-${year}`;
}

export function toUtcDate(value) {
  const text = dateOnly(value);
  const [year, month, day] = text.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function daysBetween(start, end) {
  const startTime = toUtcDate(start).getTime();
  const endTime = toUtcDate(end).getTime();
  return Math.round((endTime - startTime) / 86400000);
}

export function addDays(date, days) {
  const next = toUtcDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function todayIso() {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  return utc.toISOString().slice(0, 10);
}

export function formatDate(value) {
  const text = dateOnly(value);
  if (!text) return '';
  const [year, month, day] = text.split('-');
  return `${month}/${day}/${year}`;
}

export function minIsoDate(values) {
  return values.filter(Boolean).sort()[0];
}

export function maxIsoDate(values) {
  return values.filter(Boolean).sort().at(-1);
}
