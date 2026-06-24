const taskNameBaseOptions = [
  'Parts Procurement',
  'Preprogramming (Vendor)',
  'Preprogramming (Ccure Team) clearances/schedules etc.',
  'Ccure Operator Established',
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
  'CCure/Camera Testing',
  'Key Shop Hardware Change',
  'Punchlist',
  'Closeout'
];

const assigneeSeedOptions = [
  'James',
  'James & Kyra',
  'James & Ryan',
  'James & Locksmiths',
  'James & Suvam',
  'James & Justin',
  'James & Derick',
  'James & Kenna',
  'James & Justin, Suvam',
  'Kenna',
  'Kenna & Kyra',
  'Kenna & Ryan',
  'Kenna & Locksmiths',
  'Kenna & Justin',
  'Kenna & Suvam',
  'Kenna & Derick',
  'Kenna & Justin, Suvam',
  'Derick',
  'Derick & Kyra',
  'Derick & Ryan',
  'Derick & Locksmiths',
  'Derick & Justin',
  'Derick & Suvam',
  'Derick & James',
  'Derick & Kenna',
  'Derick & Justin, Suvam',
  'Justin',
  'Justin & Kyra',
  'Justin & Ryan',
  'Justin & Locksmiths',
  'Justin & Derick',
  'Justin & Suvam',
  'Justin & Kenna',
  'Justin & James',
  'Suvam',
  'Suvam & Kyra',
  'Suvam & Ryan',
  'Suvam & Locksmiths',
  'Suvam & Derick',
  'Suvam & Kenna',
  'Suvam & Justin',
  'Suvam & James',
  'Ryan',
  'Kyra',
  'Bill',
  'Bennett',
  'Jim',
  'Chris'
];

const vendorSeedOptions = [
  'Utah Yamas',
  'IES',
  'Ideacom',
  'Everbase',
  'Convergint',
  'S101',
  'Stone Security',
  'Pavion',
  'Beacon',
  'Accent Automatic',
  'Pye Barker',
  'SMT',
  'IC&E',
  'Nelson Fire',
  'DSI',
  'G4S',
  'PTI (Bosch)',
  'OTIS',
  'Schindler',
  'Thyssenkrupp'
];

function sortUnique(values) {
  return Array.from(new Set(values)).sort((a, b) => String(a).localeCompare(String(b)));
}

export const taskNameOptions = [...taskNameBaseOptions, 'Other'];
export const assigneeOptions = sortUnique(assigneeSeedOptions);
export const vendorOptions = sortUnique(vendorSeedOptions);
export const tradeOptions = ['CCure', 'Cameras', 'CCure & Cameras'];
export const projectManagerOptions = ['Kurt', 'Austin'];
