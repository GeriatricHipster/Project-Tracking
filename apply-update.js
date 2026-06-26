#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const packageDir = __dirname;

const files = {
  dates: 'client/src/lib/dates.js',
  taskForm: 'client/src/components/TaskForm.jsx',
  dashboard: 'client/src/components/Dashboard.jsx',
  styles: 'client/src/styles.css',
  server: 'server/src/server.js'
};

const updatedDatesJs = fs.readFileSync(path.join(packageDir, 'dates.js.replacement'), 'utf8');
const updatedNormalizeDate = fs.readFileSync(path.join(packageDir, 'normalizeDate.replacement.txt'), 'utf8').trimEnd();
const buildingSelectReplacement = fs.readFileSync(path.join(packageDir, 'buildingSelect.replacement.txt'), 'utf8').trim();
const buildingCss = fs.readFileSync(path.join(packageDir, 'buildingCss.replacement.css'), 'utf8');

function die(message) {
  console.error(`\nERROR: ${message}`);
  process.exit(1);
}

function resolveFile(relativePath) {
  return path.join(repoRoot, relativePath);
}

function assertRepoShape() {
  const required = Object.values(files);
  const missing = required.filter((relativePath) => !fs.existsSync(resolveFile(relativePath)));
  if (missing.length) {
    die([
      'This script must be run from the root of the Project-Tracking repository.',
      'Missing expected files:',
      ...missing.map((file) => `  - ${file}`)
    ].join('\n'));
  }
}

function read(relativePath) {
  return fs.readFileSync(resolveFile(relativePath), 'utf8');
}

function write(relativePath, content) {
  fs.writeFileSync(resolveFile(relativePath), content);
  console.log(`Updated ${relativePath}`);
}

function replaceRequired(content, search, replacement, label) {
  if (content.includes(replacement)) {
    console.log(`Already updated: ${label}`);
    return content;
  }

  if (!content.includes(search)) {
    die(`Could not find expected text for ${label}. The file may have changed since this update package was created.`);
  }

  return content.replace(search, replacement);
}

function replaceNormalizeDate(serverJs) {
  if (serverJs.includes('must be a MM-DD-YYYY date.') && serverJs.includes('let match = text.match(/^(\\d{1,2})[-/](\\d{1,2})[-/](\\d{4})$/);')) {
    console.log('Already updated: server date validation');
    return serverJs;
  }

  const pattern = /function normalizeDate\(value, label\) \{[\s\S]*?\}\s*function ensureDateOrder\(startDate, endDate\) \{/;
  if (!pattern.test(serverJs)) {
    die('Could not find normalizeDate() in server/src/server.js.');
  }

  return serverJs.replace(pattern, `${updatedNormalizeDate} function ensureDateOrder(startDate, endDate) {`);
}

function addCustomBuildingFunction(dashboardJs) {
  if (dashboardJs.includes('function addCustomBuilding()')) {
    console.log('Already updated: addCustomBuilding helper');
    return dashboardJs;
  }

  const pattern = /(function chooseCustomBuilding\(\) \{[\s\S]*?return next;\s*\})\s*async function submit\(event\) \{/;
  if (!pattern.test(dashboardJs)) {
    die('Could not find chooseCustomBuilding() in Dashboard.jsx.');
  }

  return dashboardJs.replace(
    pattern,
    `$1 function addCustomBuilding() { const custom = chooseCustomBuilding(); if (custom) { updateField('location', custom); } } async function submit(event) {`
  );
}

function replaceBuildingSelect(dashboardJs) {
  if (dashboardJs.includes('className="select-with-button"') && dashboardJs.includes('onClick={addCustomBuilding}>Add</button>')) {
    console.log('Already updated: building Add button');
    return dashboardJs;
  }

  const pattern = /<label>\s*Building\s*<select\s+value=\{form\.location\}\s+onChange=\{\(event\) => \{[\s\S]*?<option value="__custom__">Add new building\.\.\.<\/option>\s*<\/select>\s*<\/label>/;

  if (pattern.test(dashboardJs)) {
    return dashboardJs.replace(pattern, buildingSelectReplacement);
  }

  const customOptionIndex = dashboardJs.indexOf('Add new building...');
  const fallbackStart = customOptionIndex >= 0 ? dashboardJs.lastIndexOf('<label> Building <select', customOptionIndex) : -1;
  const fallbackEndMarker = '<option value="__custom__">Add new building...</option> </select> </label>';
  const fallbackEnd = fallbackStart >= 0 ? dashboardJs.indexOf(fallbackEndMarker, fallbackStart) : -1;

  if (fallbackStart >= 0 && fallbackEnd >= 0) {
    return dashboardJs.slice(0, fallbackStart) + buildingSelectReplacement + dashboardJs.slice(fallbackEnd + fallbackEndMarker.length);
  }

  die('Could not find the Building dropdown block in Dashboard.jsx.');
}

function appendBuildingCss(stylesCss) {
  if (stylesCss.includes('.select-with-button')) {
    console.log('Already updated: select-with-button styles');
    return stylesCss;
  }

  return stylesCss.replace(/\s*$/, '') + buildingCss;
}

function main() {
  assertRepoShape();

  write(files.dates, updatedDatesJs);

  const taskFormSearch = 'start_date: parseDisplayDate(form.start_date), end_date: parseDisplayDate(form.end_date),';
  const taskFormReplacement = "start_date: parseDisplayDate(form.start_date, 'start_date'), end_date: parseDisplayDate(form.end_date, 'end_date'),";
  write(files.taskForm, replaceRequired(read(files.taskForm), taskFormSearch, taskFormReplacement, 'TaskForm date labels'));

  const dashboardDateSearch = 'start_date: parseDisplayDate(form.start_date), end_date: parseDisplayDate(form.end_date)';
  const dashboardDateReplacement = "start_date: parseDisplayDate(form.start_date, 'start_date'), end_date: parseDisplayDate(form.end_date, 'end_date')";
  let dashboardJs = replaceRequired(read(files.dashboard), dashboardDateSearch, dashboardDateReplacement, 'Dashboard date labels');
  dashboardJs = addCustomBuildingFunction(dashboardJs);
  dashboardJs = replaceBuildingSelect(dashboardJs);
  write(files.dashboard, dashboardJs);

  write(files.styles, appendBuildingCss(read(files.styles)));
  write(files.server, replaceNormalizeDate(read(files.server)));

  console.log('\nUpdate complete. Recommended commit message:');
  console.log('Use MM-DD-YYYY dates and add building button');
}

main();
