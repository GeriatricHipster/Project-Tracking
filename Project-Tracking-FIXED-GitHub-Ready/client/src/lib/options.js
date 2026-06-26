export function sortUnique(values) {
  return [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function readStoredList(storageKey, fallback = []) {
  if (typeof window === 'undefined') return [...fallback];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [...fallback];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...fallback];
    return sortUnique([...fallback, ...parsed]);
  } catch {
    return [...fallback];
  }
}

export function writeStoredList(storageKey, values) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(sortUnique(values)));
}

export function appendStoredListValue(storageKey, fallback, value) {
  const text = String(value || '').trim();
  if (!text) return fallback;
  const next = sortUnique([...fallback, text]);
  writeStoredList(storageKey, next);
  return next;
}

export const backgroundOptions = [
  { value: 'midnight', label: 'Midnight Neon' },
  { value: 'sunrise', label: 'Sunrise Glow' },
  { value: 'ember', label: 'Crimson Ember' },
  { value: 'forest', label: 'Forest Pulse' },
  { value: 'ocean', label: 'Ocean Surge' },
  { value: 'violet', label: 'Violet Wave' }
];

export const taskNameOptions = [
  'Parts Procurement',
  'Preprogramming (Vendor)',
  'Preprogramming (Ccure Team) clearances/schedules etc.',
  'CCure Operator Established',
  'UIT (IP Addresses, Firewall)',
  'Conduit Install',
  'Cable Install',
  'ADA Install',
  'Ccure Hardware Install',
  'Camera Hardware Install',
  'Panel Install',
  'Fire Integration',
  'Alarm Panel Install/Integration',
  'Elevator Integration',
  'Final Programming',
  'Vendor Testing',
  'CCure Member Testing',
  'Camera Member Testing',
  'Key Shop Hardware Change',
  'Punchlist',
  'Closeout',
  'Other'
];

export const securitySystemOptions = sortUnique([
  'Derick',
  'Derick & James',
  'Derick & Justin',
  'Derick & Justin, Suvam',
  'Derick & Kenna',
  'Derick & Kyra',
  'Derick & Ryan',
  'Derick & Suvam',
  'James',
  'James & Derick',
  'James & Justin',
  'James & Justin, Suvam',
  'James & Kenna',
  'James & Kyra',
  'James & Locksmiths',
  'James & Ryan',
  'James & Suvam',
  'Justin',
  'Justin & Derick',
  'Justin & James',
  'Justin & Kenna',
  'Justin & Kyra',
  'Justin & Ryan',
  'Justin & Suvam',
  'Justin & Locksmiths',
  'Kenna',
  'Kenna & Derick',
  'Kenna & Justin',
  'Kenna & Justin, Suvam',
  'Kenna & Kyra',
  'Kenna & Locksmiths',
  'Kenna & Ryan',
  'Kenna & Suvam',
  'Kyra',
  'Ryan',
  'Suvam',
  'Suvam & Derick',
  'Suvam & James',
  'Suvam & Justin',
  'Suvam & Kyra',
  'Suvam & Locksmiths',
  'Suvam & Ryan',
  'Suvam & Kenna'
]);

export const locksmithOptions = sortUnique(['Bill', 'Bennett', 'Chris', 'Jim']);

export const tradeOptions = sortUnique(['CCure', 'CCure & Cameras', 'Cameras', 'Lock smiths']);

export const vendorOptions = sortUnique([
  'Accent Automatic',
  'Beacon',
  'Convergint',
  'DSI',
  'Everbase',
  'G4S',
  'IC&E',
  'Ideacom',
  'IES',
  'Nelson Fire',
  'OTIS',
  'Pavion',
  'PTI (Bosch)',
  'Pye Barker',
  'S101',
  'Schindler',
  'SMT',
  'Stone Security',
  'Thyssenkrupp',
  'Utah Yamas'
]);

export const memberTradeOptions = ['CCure Team', 'Camera Team', 'Lock Smith', 'Vendor'];
