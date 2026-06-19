const OWNER_CMS_ROW_COUNT = 150;
const OWNER_CMS_COLUMN_COUNT = 20;

function linesToOptions(block) {
  return String(block)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

const securityOptions = linesToOptions(`
James
James & Kyra
James & Ryan
James & Locksmiths
James & Suvam
James & Justin
James & Derick
James & Kenna
James & Justin, Suvam
Kenna
Kenna & Kyra
Kenna & Ryan
Kenna & Locksmiths
Kenna & Justin
Kenna & Suvam
Kenna & Derick
Kenna & Justin, Suvam
Derick
Derick & Kyra
Derick & Ryan
Derick & Locksmiths
Derick & Justin
Derick & Suvam
Derick & James
Derick & Kenna
Derick & Justin, Suvam
Justin
Justin & Kyra
Justin & Ryan
Justin & Locksmiths
Justin & Derick
Justin & Suvam
Justin & Kenna
Justin & James
Suvam
Suvam & Kyra
Suvam & Ryan
Suvam & Locksmiths
Suvam & Derick
Suvam & Kenna
Suvam & Justin
Suvam & James
Locksmiths
Ryan
Kyra
`).sort((a, b) => a.localeCompare(b));

export const ownerCmsColumns = [
  { key: 'wo', label: 'WO', type: 'text', width: 130, placeholder: 'WO # / work order' },
  { key: 'location', label: 'Location', type: 'select', width: 220, options: linesToOptions(`
0001 Park
0002 Voice Box
0003 Gardner Hall
0004 J. T. Kingsbury Hall
0005 George Thomas BLDG
0008 Alfred C. Emery BLDG
0009 John Widtsoe BLDG
0010 Physics
0011 William Browning
0012 Sutton BLDG
0013 LeRoy Cowles
0014 James Talmage
0017 Performing Arts
0019 INSCC
0025 Social & Behavioral Science
0026 College of Social Work
0027 SBS Lecture Hall
0028 Marriott CNTR for Dance
0029 Einar Neilson Fieldhouse
0030 Cauldron Legacy Plaza VC
0032 Rice-Eccles Stadium
0035 UMFA
0036 Fine Arts
0037 Architechure
0038 Art
0040 Student Services
0043 Naval Science
0044 Office BLDG 0044
0045 Humanities BLDG
0046 Lassonde Studios
0047 Impact Center/Epicenter
0048 Gardner Commons
0049 LNCO
0051 Sill Center
0052 Alumni House
0053 A. Ray Olpin Union
0056 Civil & Materials Engineering
0057 Layton Engineering (Hedco)
0060 Experimental Studies BLDG
0061 Meldrum Civil Eng. BLDG
0062 Warnock Engineering BLDG
0064 Merrill Engineering
0066 Pioneer Memoral Theatre
0067 University Campus Store
0069 Business parking structure
0070 New College of Law BLDG
0071 Sorenson Dance & Education
0072 Building 72 (EAE)
0073 Price Theatre Arts BLDG
0074 Business Classroom
0077 C Roland Christensen CNTR
0079 Eccles Business BLDG
0080 Garff Education
0082 Aline Wilmot Skaggs Biology
0083 James Fletcher
0084 Biology
0085 Henry Eyring Chemistry BLDG
0086 Marriott Library
0087 Thatcher BLDG Chemistry
0090 Huntsman CNTR Arena
0091 HPER East
0092 HPER North
0093 HPER Natatorium
0094 HPER West
0097 Dumke Gymnastics CNTR
0098 Burbidge
0099 Hunstman Basketball Facility
0109 Dumke Softball Stadium
0110 Eccles Student Life CNTR
0112 Marriott Residential
0114 Kahlert Village
0120 Ski BLDG
0151 Sorenson Molecular Biotech BLDG
0170 West Institute
0179 Eccles Broadcast CNTR
0180 Space Planning & Mangement
0184 Sponsored Projects
0197 Rosenblatt House
0198 Eccles House
0200 University Kindercare
0202 Public Safety
0205 George S Eccles Tennis CNTR
0210 Dee Glen Smith Athletic CNTR
0211 Golf BLDG
0212 Spence Eccles Field House
0213 Library Storage
0255 Sugarhouse Sleepwake
0306 Grounds Building
0326 Red Butte Horticulture Compound
0350 V. Randall Turpin Univ Serv Bld
0366 Primary Childern's ATM
0372 Kennecott BLDG
0379 Building 379
0425 250 Tower (HR)
0482 102 Towers (UIT)
0483 525 Plaza
0489 Business Services BLDG
0500 Nora Eccles Harrison
0512 Research Administration BLDG
0522 West Pavilion [A]
0523 John A. Moran Eye CNTR
0524 West Medical Garage O2 Plant
0525 University Hospital
0526 Hospital Generating Plant
0529 Eccles Critical Care Pavilion [B]
0530 Maxwell Wintrobe Research BLDG
0533 Human Genetics
0550 Clinical Neurosciences BLDG
0554 HCI (north)
0555 HCI (south)
0556 HCH
0557 HCH - Phase 5
0561 Helipad Parking Terrace
0562 Health Sciences Prkg Terrace
0565 E. E. Jones Medical Science BLDG
0570 Bio-Polymers Research BLDG
0575 Eccles Health Sciences Educ HSEB
0581 L.S. Skaggs Jr. Research BLDG
0582 L.S. Skaggs Hall
0585 HSC Core Research Facility
0587 OCM
0588 College of Nursing BLDG
0589 Eccles Health Sciences Library
0590 Regulated Waste Mnmgt Fac.
0601 Fort Douglas Duplex - Marketing
0602 Fort Douglas Duplex - Business
0603 Black Cultural Center
0605 Enviromental Health & Safety
0619 Fort Douglas
0621 Fort Douglas House
0623 Fort Douglas House - Swoop/IT
0624 Fort Douglas House - AUX
0638 Fort Douglas PX
0659 Fort Douglas Public Saftey
0685 Madsen Health CNTR
0720 Student Apts Maintenance Office
0721 Student Apts Main Office
0775 East Village Housing
0779 West Village Central Plant
0780 West Village Multi Purpose Bldg
0785 West Village Daycare
0791 West Village Housing Bldg C
0792 West Village Housing Bldg E
0796 West Village Housing Bldg. A
0797 West Village Housing Bldg. B
0798 West Village Housing Bldg. C
0801 University Guest House
0815 Heritage CNTR
0820 Benchmark Plaza 820
0822 Benchmark Plaza 822
0840 College of Dentistry
0842 310 Wakara (Myriad)
0843 305 Chipeta (Myriad)
0846 Red Butte - Orangerie
0849 Red Butte - Visitor Center
0851 Orthopaedic CNTR
0853 Dumke Health Professions Ed. BLDG
0854 505 Wakara Way & Credit Union
0856 423 Wakara Way
0857 421 Wakara Way
0859 419 Wakara Way (Bright Horizons)
0860 417 Wakara Way (Biomed Research)
0865 295 Chipeta (Williams)
0869 303 Chipeta
0872 Natural History Museum of Utah
0874 383 Colorow
0876 375 Chipeta Way (SleepWake)
0881 HMHI - Huntsman Mental Health
0886 615 Arapeen (Paradigm I)
0887 675 Arapeen (Paradigm II)
0888 Imag & Neurosci CNTR (729 Arapeen)
0890 540 Arapeen
0896 650 Komas (Data CNTR.)
0901 UUHN - Greenwood CNTR (Midvale)
0902 UUHN - Parkway CNTR (Orem)
0903 UUHN - Westridge CNTR (W Valley)
0904 UUHN - Redwood CNTR (SLC)
0908 UUHN - Stansbury Med CNTR (Tooele)
0916 UUHN - Redstone CNTR (Park City)
0918 UUHN - Centerville Clinic
0947 Commuter Services
3031 HMHI - Meadowbrook YRT/TSS
3100 FS1 - Mid Valley I
3106 HMHI - Murray (Box Elder Street)
3110 FS3 - Mid Valley I
3113 FS4 - Mid Valley II
3402 American Fork Dialysis CNTR
3417 HMHI - Park City
3487 Sandy One/Campus Store
3536 DEQ Rose Park Clinic
3574 DDC
3621 Thomas S. Monson Center (Wall Man.)
3632 Orrin Hatch Center (Washington DC)
3701 South Jordan Health CNTR
3704 NAV Care (Call CNTR)
3715 HMHI - Farmington
3716 Farmington Health CNTR
3718 HMHI - Home
3719 The Draw
3722 Sugar House Health CNTR
3881 Huntsman Crisis Care Center
3901 Redwood Depot Storage (Bldg E & F)
5050 Helix
5100 Acute Care Center [E]
5150 Rehab
`) },
  { key: 'district', label: 'District', type: 'select', width: 180, options: linesToOptions(`
Auxilary
Dist 1 Presidents
Dist 2 Sciences
Dist 3 Venues
Dist 4 Engineering
Dist 5 Academic
Dist 6 Health Sciences
General Use
Hospital
Clinics
Huntsman Cancer
Housing
Off Campus
Open Space
Parking Garage/Lots
PDC
Research Park
UofU
Utility Sytems
`) },
  { key: 'date_created', label: 'Date Created', type: 'date', width: 140 },
  { key: 'walk_scheduled', label: 'Walk Scheduled', type: 'date', width: 140 },
  { key: 'install_date', label: 'Install Date', type: 'date', width: 140 },
  { key: 'deadline', label: 'Deadline', type: 'date', width: 140 },
  { key: 'bill_by_year_end', label: 'Bill by year end', type: 'date', width: 150 },
  { key: 'category', label: 'Category', type: 'select', width: 180, options: linesToOptions(`
COST ESTIAMTE
CCURE
VIDEO
CCURE & VIDEO
Panic Button
Lock Down Button
MISC
Mobile
CCURE & ADA
ADA & ELECTRICAL
CCURE & CCTV
`) },
  { key: 'requestor_name', label: 'Requestor Name', type: 'text', width: 180, placeholder: 'Requestor name' },
  { key: 'dm_notified', label: 'DM Notified', type: 'select', width: 120, options: ['Yes', 'No', 'NA'] },
  { key: 'security', label: 'Security', type: 'select', width: 290, options: securityOptions },
  { key: 'child_wo', label: 'Child WO', type: 'select', width: 110, options: ['Yes', 'No', 'NA'] },
  { key: 'vendor', label: 'Vendor', type: 'select', width: 160, options: linesToOptions(`
AVTEC
Beacon
Convergint
DSI
EverBase
G4S
Ideacom
IES
PTI
S101
Stone
Pavion
Yamas
USHOP
Misc
SMT
Accent Auto
Bid Walk
`) },
  { key: 'status', label: 'Status', type: 'select', width: 220, options: linesToOptions(`
Cost Estimate
Intro/SOW
Schedule Walk
Walk Booked
Walk Complete
Prepare Quote
Cost Sent
On Hold
Client Approved
Parts Ordered
Booked
Waiting
Install Complete
Failed
Passed
Install CRO
Need Charges
Time Posted
Ready to Close
Closed
`) },
  { key: 'financial', label: 'Financial', type: 'select', width: 200, options: linesToOptions(`
Cost Estimate
Firm Bid
T&M
Pending SSAC
Chartfield
PO Request Sent
Bid Request Sent
PO Received
CO Sent
Increase Requested
PO Increased
Invoice Requested
Draw Approved
Need Invoice Posted
All Invoices Posted
PM Fee Added
`) },
  { key: 'eval_form', label: 'Eval Form', type: 'select', width: 140, options: linesToOptions(`
Inspect
Fill Out
Vendor
Trent
Uploaded
`) },
  { key: 'panel_needed', label: 'Panel Needed', type: 'select', width: 130, options: ['Yes', 'No', 'NA'] },
  { key: 'sow', label: 'SOW', type: 'textarea', width: 320, placeholder: 'Scope of work' },
  { key: 'notes', label: 'Notes', type: 'textarea', width: 420, placeholder: 'Notes' }
];

export const ownerCmsColumnCount = OWNER_CMS_COLUMN_COUNT;
export const ownerCmsRowCount = OWNER_CMS_ROW_COUNT;

export function buildBlankOwnerCmsGrid() {
  return Array.from({ length: OWNER_CMS_ROW_COUNT }, () => Array.from({ length: OWNER_CMS_COLUMN_COUNT }, () => ''));
}

export function normalizeOwnerCmsGrid(cells) {
  const grid = buildBlankOwnerCmsGrid();
  if (!Array.isArray(cells)) return grid;

  for (let rowIndex = 0; rowIndex < Math.min(cells.length, OWNER_CMS_ROW_COUNT); rowIndex += 1) {
    const row = cells[rowIndex];
    if (!Array.isArray(row)) continue;
    for (let colIndex = 0; colIndex < Math.min(row.length, OWNER_CMS_COLUMN_COUNT); colIndex += 1) {
      const value = row[colIndex];
      grid[rowIndex][colIndex] = value === null || value === undefined ? '' : String(value);
    }
  }

  return grid;
}

export function buildBlankArchivedOwnerCmsRows() {
  return [];
}

export function normalizeOwnerCmsArchivedRows(rows) {
  if (!Array.isArray(rows)) return [];

  return rows.map((row, index) => {
    if (Array.isArray(row)) {
      return {
        row_number: index + 1,
        archived_at: null,
        cells: normalizeOwnerCmsGrid([row])[0]
      };
    }

    if (isPlainObject(row)) {
      return {
        row_number: Number.isInteger(Number(row.row_number)) ? Number(row.row_number) : index + 1,
        archived_at: row.archived_at || null,
        cells: normalizeOwnerCmsGrid([Array.isArray(row.cells) ? row.cells : []])[0]
      };
    }

    return {
      row_number: index + 1,
      archived_at: null,
      cells: Array.from({ length: OWNER_CMS_COLUMN_COUNT }, () => '')
    };
  });
}
