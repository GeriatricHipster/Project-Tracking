function pad2(value) {
  return String(value).padStart(2, '0');
}

function parseDateParts(value) {
  const text = String(value || '').trim();
  if (!text) return null;

  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  let year;
  let month;
  let day;

  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else {
    match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (!match) return null;

    month = Number(match[1]);
    day = Number(match[2]);
    year = Number(match[3]);
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 1000 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function toIsoDate(parts) {
  return `${String(parts.year).padStart(4, '0')}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function dateOnly(value) {
  const parts = parseDateParts(value);
  return parts ? toIsoDate(parts) : '';
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
  return formatDisplayDate(value);
}

export function formatDisplayDate(value) {
  const parts = parseDateParts(value);
  return parts ? `${pad2(parts.month)}-${pad2(parts.day)}-${String(parts.year).padStart(4, '0')}` : '';
}

export function parseDisplayDate(value, label = 'Date') {
  const parts = parseDateParts(value);

  if (!parts) {
    throw new Error(`${label} must be a MM-DD-YYYY date.`);
  }

  return toIsoDate(parts);
}

export function minIsoDate(values) {
  return values.map(dateOnly).filter(Boolean).sort()[0];
}

export function maxIsoDate(values) {
  return values.map(dateOnly).filter(Boolean).sort().at(-1);
}
