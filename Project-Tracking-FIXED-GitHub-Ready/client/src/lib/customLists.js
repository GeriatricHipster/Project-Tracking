const STORAGE_PREFIX = 'psg-custom-list:';

function storageKey(key) {
  return `${STORAGE_PREFIX}${key}`;
}

function readStorage(key) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => String(item || '').trim().length > 0) : [];
  } catch {
    return [];
  }
}

function writeStorage(key, values) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(values));
  } catch {
    // ignore storage failures
  }
}

export function getCustomList(key) {
  return readStorage(key);
}

export function getMergedList(key, defaults = []) {
  const merged = new Set();
  [...defaults, ...readStorage(key)].forEach((value) => {
    const text = String(value || '').trim();
    if (text) merged.add(text);
  });
  return Array.from(merged);
}

export function addCustomListValue(key, value) {
  const text = String(value || '').trim();
  if (!text) return getMergedList(key, []);
  const next = getMergedList(key, []);
  if (!next.includes(text)) {
    next.push(text);
    writeStorage(key, next.filter(Boolean));
  }
  return next;
}

export function moveCustomListValueToTop(key, value, defaults = []) {
  const text = String(value || '').trim();
  if (!text) return getMergedList(key, defaults);
  const next = getMergedList(key, defaults).filter((item) => item !== text);
  next.unshift(text);
  writeStorage(key, next.filter(Boolean));
  return next;
}
