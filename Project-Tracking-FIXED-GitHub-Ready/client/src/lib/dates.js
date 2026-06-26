function pad2(value) {
  return String(value).padStart(2, '0');
}

function todayUtcParts() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate()
  };
}

function toIsoDate(parts) {
  return `${String(parts.year).padStart(4, '0')}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function isValidDateParts(parts) {
  if (!parts) return false;

  const { year, month, day } = parts;
  const candidate = new Date(Date.UTC(year, month - 1, day));

  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    year >= 1000 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function parseDateParts(value) {
  if (value instanceof Date) {
    const time = value.getTime();
    if (Number.isNaN(time)) return null;
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate()
    };
  }

  const text = String(value ?? '').trim();
  if (!text) return null;

  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (match) {
    const parts = {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3])
    };
    return isValidDateParts(parts) ? parts : null;
  }

  match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s.*)?$/);
  if (match) {
    const parts = {
      year: Number(match[3]),
      month: Number(match[1]),
      day: Number(match[2])
    };
    return isValidDateParts(parts) ? parts : null;
  }

  return null;
}

function fallbackIsoDate() {
  return toIsoDate(todayUtcParts());
}

export function dateOnly(value) {
  const parts = parseDateParts(value);
  return parts ? toIsoDate(parts) : '';
}

export function toUtcDate(value) {
  const text = dateOnly(value) || fallbackIsoDate();
  const [year, month, day] = text.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function daysBetween(start, end) {
  const startText = dateOnly(start);
  const endText = dateOnly(end);

  if (!startText || !endText) return 0;

  const startTime = toUtcDate(startText).getTime();
  const endTime = toUtcDate(endText).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return 0;
  return Math.round((endTime - startTime) / 86400000);
}

export function addDays(date, days) {
  const next = toUtcDate(date);
  const safeDays = Number.isFinite(Number(days)) ? Number(days) : 0;
  next.setUTCDate(next.getUTCDate() + safeDays);
  return next.toISOString().slice(0, 10);
}

export function todayIso() {
  return fallbackIsoDate();
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
