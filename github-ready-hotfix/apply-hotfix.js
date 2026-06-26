#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const packageDir = __dirname;
const changedFiles = new Set();
const warnings = [];

const files = {
  dates: 'client/src/lib/dates.js',
  taskForm: 'client/src/components/TaskForm.jsx',
  dashboard: 'client/src/components/Dashboard.jsx',
  styles: 'client/src/styles.css',
  server: 'server/src/server.js'
};

const datesReplacement = fs.readFileSync(
  path.join(packageDir, 'replacement-files', 'client', 'src', 'lib', 'dates.js'),
  'utf8'
);
const normalizeDateReplacement = fs.readFileSync(
  path.join(packageDir, 'normalizeDate.replacement.txt'),
  'utf8'
).trimEnd();

function relativePath(file) {
  return path.relative(repoRoot, file) || file;
}

function filePath(relative) {
  return path.join(repoRoot, relative);
}

function exists(relative) {
  return fs.existsSync(filePath(relative));
}

function read(relative) {
  const absolute = filePath(relative);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Missing expected file: ${relative}. Run this from the root of the Project-Tracking repo.`);
  }
  return fs.readFileSync(absolute, 'utf8');
}

function write(relative, content) {
  const absolute = filePath(relative);
  const current = fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : null;

  if (current !== content) {
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content, 'utf8');
    changedFiles.add(relative);
  }
}

function warn(message) {
  warnings.push(message);
}

function updateParseDisplayDateLabels(content) {
  return content
    .replace(
      /start_date:\s*parseDisplayDate\(form\.start_date(?:,\s*['"]start_date['"])?\)/g,
      "start_date: parseDisplayDate(form.start_date, 'start_date')"
    )
    .replace(
      /end_date:\s*parseDisplayDate\(form\.end_date(?:,\s*['"]end_date['"])?\)/g,
      "end_date: parseDisplayDate(form.end_date, 'end_date')"
    );
}

function addCustomBuildingFunction(dashboard) {
  if (dashboard.includes('function addCustomBuilding()')) {
    return dashboard;
  }

  const patterns = [
    /(function chooseCustomBuilding\(\)\s*\{[\s\S]*?return next;\s*\})\s*(?=async function submit)/,
    /(function chooseCustomBuilding\(\)\s*\{[\s\S]*?return next;\s*\})\s*/
  ];

  const helper = [
    '',
    'function addCustomBuilding() {',
    '  const custom = chooseCustomBuilding();',
    '  if (custom) {',
    "    updateField('location', custom);",
    '  }',
    '}',
    ''
  ].join('\n');

  for (const pattern of patterns) {
    if (pattern.test(dashboard)) {
      return dashboard.replace(pattern, `$1${helper}`);
    }
  }

  warn('Could not find chooseCustomBuilding() in Dashboard.jsx, so the Add Building helper was not inserted.');
  return dashboard;
}

function addBuildingButton(dashboard) {
  if (dashboard.includes('className="select-with-button"')) {
    return dashboard;
  }

  const replacement = [
    '<label>',
    '  Building',
    '  <div className="select-with-button">',
    '    <select',
    '      value={form.location}',
    '      onChange={(event) => {',
    '        const next = event.target.value;',
    '',
    "        if (next === '__custom__') {",
    '          addCustomBuilding();',
    '          return;',
    '        }',
    '',
    "        updateField('location', next);",
    '      }}',
    '    >',
    '      <option value="">Unassigned</option>',
    '      {buildingChoices.map((building) => (',
    '        <option key={building} value={building}>',
    '          {building}',
    '        </option>',
    '      ))}',
    '      <option value="__custom__">Add new building...</option>',
    '    </select>',
    '',
    '    <button',
    '      className="ghost-button compact"',
    '      type="button"',
    '      onClick={addCustomBuilding}',
    '    >',
    '      Add',
    '    </button>',
    '  </div>',
    '</label>'
  ].join('\n');

  const patterns = [
    /<label>\s*Building\s*<select\s+value=\{form\.location\}[\s\S]*?<option value="__custom__">Add new building\.\.\.<\/option>\s*<\/select>\s*<\/label>/,
    /<label>\s*Building\s*<select[\s\S]*?<option value="__custom__">Add new building\.\.\.<\/option>\s*<\/select>\s*<\/label>/
  ];

  for (const pattern of patterns) {
    if (pattern.test(dashboard)) {
      return dashboard.replace(pattern, replacement);
    }
  }

  warn('Could not find the Create Project Building dropdown block, so the Add button was not inserted.');
  return dashboard;
}

function updateDashboard() {
  if (!exists(files.dashboard)) {
    warn(`${files.dashboard} was not found.`);
    return;
  }

  let dashboard = read(files.dashboard);
  dashboard = updateParseDisplayDateLabels(dashboard);
  dashboard = addCustomBuildingFunction(dashboard);
  dashboard = addBuildingButton(dashboard);
  write(files.dashboard, dashboard);
}

function updateTaskForm() {
  if (!exists(files.taskForm)) {
    warn(`${files.taskForm} was not found.`);
    return;
  }

  write(files.taskForm, updateParseDisplayDateLabels(read(files.taskForm)));
}

function updateStyles() {
  if (!exists(files.styles)) {
    warn(`${files.styles} was not found.`);
    return;
  }

  let styles = read(files.styles);

  if (!styles.includes('.select-with-button')) {
    styles = `${styles.trimEnd()}

/* Create project building dropdown plus Add button */
.select-with-button {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: stretch;
}

.select-with-button select {
  width: 100%;
}

.select-with-button .ghost-button {
  white-space: nowrap;
}

@media (max-width: 760px) {
  .select-with-button {
    grid-template-columns: 1fr;
  }
}
`;
  }

  write(files.styles, styles);
}

function updateServer() {
  if (!exists(files.server)) {
    warn(`${files.server} was not found.`);
    return;
  }

  const server = read(files.server);
  const pattern = /function normalizeDate\(value, label\)\s*\{[\s\S]*?\}\s*function ensureDateOrder/;

  if (!pattern.test(server)) {
    warn('Could not find normalizeDate() in server/src/server.js, so server date validation was not updated.');
    return;
  }

  write(files.server, server.replace(pattern, `${normalizeDateReplacement} function ensureDateOrder`));
}

function assertRepoRoot() {
  const minimumRequired = [files.dates, files.dashboard, files.server];
  const missing = minimumRequired.filter((file) => !exists(file));

  if (missing.length) {
    throw new Error([
      'This hotfix must be run from the root of your Project-Tracking repository.',
      'Missing expected files:',
      ...missing.map((file) => `  - ${file}`)
    ].join('\n'));
  }
}

function main() {
  assertRepoRoot();

  write(files.dates, datesReplacement);
  updateTaskForm();
  updateDashboard();
  updateStyles();
  updateServer();

  console.log('Project-Tracking hotfix applied.');

  if (changedFiles.size) {
    console.log('\nChanged files:');
    for (const file of Array.from(changedFiles).sort()) {
      console.log(`- ${file}`);
    }
  } else {
    console.log('\nNo file changes were needed.');
  }

  if (warnings.length) {
    console.log('\nWarnings:');
    for (const message of warnings) {
      console.log(`- ${message}`);
    }
  }

  console.log('\nRecommended commit message:');
  console.log('Fix project view date parsing and building dropdown button');
}

try {
  main();
} catch (error) {
  console.error(`\nERROR: ${error.message}`);
  console.error(`\nCurrent directory: ${repoRoot}`);
  console.error('Run this command from the folder that contains client/, server/, and package.json.');
  process.exit(1);
}
