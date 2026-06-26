function pad2(value) {
  return String(value).padStart(2, '0');
}

function normalizeParts(year, month, day) {
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const candidate = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));

  if (
    !Number.isInteger(yearNumber) ||
    !Number.isInteger(monthNumber) ||
    !Number.isInteger(dayNumber) ||
    yearNumber < 1000 ||
    monthNumber < 1 ||
    monthNumber > 12 ||
    dayNumber < 1 ||
    candidate.getUTCFullYear() !== yearNumber ||
    candidate.getUTCMonth() !== monthNumber - 1 ||
    candidate.getUTCDate() !== dayNumber
  ) {
    return null;
  }

  return { year: yearNumber, month: monthNumber, day: dayNumber };
}

function parseDateParts(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return normalizeParts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }

  const text = String(value ?? '').trim();
  if (!text) return null;

  let match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);

  if (match) {
    return normalizeParts(match[1], match[2], match[3]);
  }

  match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[T\s].*)?$/);

  if (match) {
    return normalizeParts(match[3], match[1], match[2]);
  }

  const parsed = new Date(text);

  if (!Number.isNaN(parsed.getTime())) {
    return normalizeParts(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate());
  }

  return null;
}

function toIsoDate(parts) {
  return `${String(parts.year).padStart(4, '0')}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function dateOnly(value) {
  const parts = parseDateParts(value);
  return parts ? toIsoDate(parts) : '';
}

export function toUtcDate(value) {
  const parts = parseDateParts(value);
  if (!parts) return null;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

export function daysBetween(start, end) {
  const startDate = toUtcDate(start);
  const endDate = toUtcDate(end);

  if (!startDate || !endDate) {
    return 0;
  }

  return Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
}

export function addDays(date, days) {
  const next = toUtcDate(date) || toUtcDate(todayIso());
  next.setUTCDate(next.getUTCDate() + Number(days || 0));
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
