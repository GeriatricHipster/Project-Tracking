require('dotenv').config();

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
const multer = require('multer');
const nodemailer = require('nodemailer');
const { Server } = require('socket.io');
const { pool, query, tx } = require('./db');

const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'local-development-secret-change-me';
const APP_NAME = process.env.APP_NAME || 'PSG and SS Tracking';
const EMAIL_PROVIDER = String(process.env.EMAIL_PROVIDER || 'gmail').trim().toLowerCase();
const SMTP_HOST = String(process.env.SMTP_HOST || 'smtp.gmail.com').trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false').trim().toLowerCase() === 'true';
const SMTP_REQUIRE_TLS = String(process.env.SMTP_REQUIRE_TLS || 'true').trim().toLowerCase() !== 'false';
const SMTP_USER = String(process.env.SMTP_USER || '').trim();
const SMTP_PASS = String(process.env.SMTP_PASS || '').trim();
const EMAIL_FROM = String(process.env.EMAIL_FROM || SMTP_USER).trim();
const EMAIL_FROM_NAME = String(process.env.EMAIL_FROM_NAME || APP_NAME).trim();
const EMAIL_ASSIGNMENT_INVITE_DAYS = Number(process.env.EMAIL_ASSIGNMENT_INVITE_DAYS || 7);
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const roleRank = {
  portfolio_viewer: 0,
  viewer: 0,
  editor: 1,
  manager: 2,
  owner: 3
};

const statuses = new Set(['not_started', 'in_progress', 'blocked', 'complete']);
const projectLifecycleStatuses = new Set(['active', 'completed', 'archived']);
const priorities = new Set(['low', 'normal', 'high', 'critical']);
const roles = new Set(['owner', 'manager', 'editor', 'viewer']);
const inviteRoles = new Set(['manager', 'editor', 'viewer']);
const vendors = new Set(['Accent Automatic', 'Beacon', 'Convergint', 'DSI', 'Everbase', 'G4S', 'Ideacom', 'IES', 'Nelson Fire', 'OTIS', 'Pavion', 'Pye Barker', 'PTI (Bosch)', 'S101', 'Schindler', 'SMT', 'Stone Security', 'Thyssenkrupp', 'Utah Yamas']);
const trades = new Set(['CCure', 'Cameras', 'CCure & Cameras']);
const securityTeamMembers = new Set(['Derick', 'Eric', 'James', 'Justin', 'Kenna', 'Kyra', 'Ryan', 'Suvam']);
const projectManagers = new Set(['Kurt', 'Austin']);
const userTrades = new Set(['CCure Team', 'Camera Team', 'Lock Smith', 'Vendor', 'PM', 'Manger', 'Supervisor']);
const siteRoles = new Set(['owner', 'manager', 'member']);
const dependencyTypes = new Set(['FS', 'SS', 'FF', 'SF']);
const managerSiteRoles = new Set(['owner', 'manager']);
const ownerCmsWorkOrderSheets = [
  { sheet_key: 'kurts_cms_wos', sheet_name: 'Kurts CMS WOs' },
  { sheet_key: 'austins_cms_wos', sheet_name: 'Austins CMS WOs' }
];
const ownerCmsWorkOrderSheetMap = new Map(ownerCmsWorkOrderSheets.map((sheet) => [sheet.sheet_key, sheet]));
const configuredBlueprintBytes = Number(process.env.MAX_BLUEPRINT_BYTES || 25 * 1024 * 1024);
const MAX_BLUEPRINT_BYTES = Number.isFinite(configuredBlueprintBytes) && configuredBlueprintBytes > 0
  ? configuredBlueprintBytes
  : 25 * 1024 * 1024;

const defaultChecklistItems = [
  { item_key: 'ips_requested', label: 'IPs requested', sort_order: 1 },
  { item_key: 'panel_ordered', label: 'Panel ordered', sort_order: 2 },
  { item_key: 'clearances_programmed', label: 'Clearances programmed', sort_order: 3 },
  { item_key: 'doors_programmed', label: 'Doors programmed', sort_order: 4 },
  { item_key: 'ccure_operator_established', label: 'CCure Operator established', sort_order: 5 }
];

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    credentials: true
  }
});

function allowOrigin(origin, callback) {
  if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error(`Origin ${origin} is not allowed by CLIENT_ORIGIN.`));
}

app.use(helmet());
app.use(cors({ origin: allowOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const blueprintUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BLUEPRINT_BYTES },
  fileFilter(req, file, callback) {
    const allowedTypes = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/csv',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/vnd.dwg',
      'application/acad',
      'application/x-acad',
      'application/dwg',
      'application/x-dwg',
      'application/octet-stream'
    ]);

    const allowedExtensions = new Set([
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.csv',
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.gif',
      '.bmp',
      '.tif',
      '.tiff',
      '.dwg',
      '.txt',
      '.ppt',
      '.pptx'
    ]);

    const extension = path.extname(file.originalname || '').toLowerCase();

    if (!allowedTypes.has(file.mimetype) && !allowedExtensions.has(extension)) {
      callback(httpError(400, 'Project file uploads must be PDF, Word, Excel, CSV, image, PowerPoint, DWG, text, or common drawing files.'));
      return;
    }

    callback(null, true);
  }
});

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseId(value, label = 'id') {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw httpError(400, `${label} must be a positive integer.`);
  }
  return number;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeInviteCode(value) {
  const code = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!/^[A-Z0-9]{6,32}$/.test(code)) {
    throw httpError(400, 'Invitation code must be 6 to 32 letters or numbers.');
  }
  return code;
}

function formatInviteCode(code) {
  return String(code || '').replace(/(.{4})/g, '$1-').replace(/-$/, '');
}

function generateInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(10);
  let code = '';
  for (const byte of bytes) {
    code += alphabet[byte % alphabet.length];
  }
  return code;
}

function getAppUrl(req) {
  const configured = String(process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;

  const origin = String(req.get('origin') || '').trim().replace(/\/+$/, '');
  if (origin && origin !== '*') return origin;

  const host = req.get('x-forwarded-host') || req.get('host');
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
  return host ? `${proto}://${host}` : '';
}

function clampInteger(value, { label, defaultValue, min, max }) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw httpError(400, `${label} must be a whole number from ${min} to ${max}.`);
  }
  return number;
}

function buildInviteUrl(req, code) {
  const appUrl = getAppUrl(req);
  return appUrl ? `${appUrl}/?invite=${encodeURIComponent(code)}` : '';
}

function buildProjectUrl(req, projectId) {
  const appUrl = getAppUrl(req);
  return appUrl ? `${appUrl}/?project=${encodeURIComponent(projectId)}` : '';
}


function safeText(value, fallback = 'Not set') {
  const textValue = String(value || '').trim();
  return textValue || fallback;
}

function buildEmailInviteMessage({ req, project, invite, actor, targetUser = null, assignmentRole = null }) {
  const formattedCode = formatInviteCode(invite.code);
  const inviteUrl = buildInviteUrl(req, invite.code);
  const expiresAt = invite.expires_at ? new Date(invite.expires_at).toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' }) : 'No expiration';
  const roleText = assignmentRole || invite.role;
  const targetEmail = targetUser?.email ? normalizeEmail(targetUser.email) : '';
  const targetName = safeText(targetUser?.name, 'Assigned user');
  const subject = `${APP_NAME} project invitation: ${safeText(project.name)}`;
  const intro = targetUser
    ? `${actor.name} assigned ${targetName} (${targetEmail || 'no email on file'}) to ${safeText(project.name)} as ${roleText}.`
    : `${actor.name} created an invitation code for ${safeText(project.name)}.`;

  const textBody = [
    `${APP_NAME} project invitation`,
    intro,
    `Project: ${safeText(project.name)}`,
    `Location: ${safeText(project.location)}`,
    `Dates: ${project.start_date} to ${project.end_date}`,
    `Project role: ${roleText}`,
    `Assigned email: ${targetEmail || 'Not targeted'}`,
    `Code: ${formattedCode}`,
    `Expires: ${expiresAt}`,
    `Uses: ${invite.max_uses}`,
    inviteUrl ? `Open invite: ${inviteUrl}` : null,
    targetUser ? `This invitation is intended for ${targetEmail || targetName}.` : 'Only people with a PSG and SS Tracking account can accept this code.'
  ].filter(Boolean).join('\n');

  const htmlLines = [
    `<h2>${APP_NAME} project invitation</h2>`,
    `<p>${intro}</p>`,
    '<table style="border-collapse:collapse;line-height:1.5">',
    `<tr><td style="padding:2px 12px 2px 0;font-weight:bold">Project</td><td>${safeText(project.name)}</td></tr>`,
    `<tr><td style="padding:2px 12px 2px 0;font-weight:bold">Location</td><td>${safeText(project.location)}</td></tr>`,
    `<tr><td style="padding:2px 12px 2px 0;font-weight:bold">Dates</td><td>${project.start_date} to ${project.end_date}</td></tr>`,
    `<tr><td style="padding:2px 12px 2px 0;font-weight:bold">Project role</td><td>${roleText}</td></tr>`,
    `<tr><td style="padding:2px 12px 2px 0;font-weight:bold">Assigned email</td><td>${targetEmail || 'Not targeted'}</td></tr>`,
    `<tr><td style="padding:2px 12px 2px 0;font-weight:bold">Code</td><td style="font-size:20px;letter-spacing:2px">${formattedCode}</td></tr>`,
    `<tr><td style="padding:2px 12px 2px 0;font-weight:bold">Expires</td><td>${expiresAt}</td></tr>`,
    `<tr><td style="padding:2px 12px 2px 0;font-weight:bold">Uses</td><td>${invite.max_uses}</td></tr>`,
    inviteUrl ? `<tr><td style="padding:2px 12px 2px 0;font-weight:bold">Invite link</td><td><a href="${inviteUrl}">${inviteUrl}</a></td></tr>` : '',
    '</table>',
    `<p>${targetUser ? `This invitation is intended for ${targetEmail || targetName}.` : 'Only people with a PSG and SS Tracking account can accept this code.'}</p>`
  ].filter(Boolean);

  return {
    subject,
    text: textBody,
    html: htmlLines.join('')
  };
}

let cachedEmailTransport = null;

function getEmailTransport() {
  if (EMAIL_PROVIDER !== 'gmail' && EMAIL_PROVIDER !== 'smtp') {
    throw httpError(400, 'Email invitations are not set up. Set EMAIL_PROVIDER to gmail and add SMTP settings in Render.');
  }
  if (!SMTP_USER || !SMTP_PASS) {
    throw httpError(400, 'Email invitations are not set up. Add SMTP_USER and SMTP_PASS in Render and redeploy.');
  }
  if (!cachedEmailTransport) {
    cachedEmailTransport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      requireTLS: SMTP_REQUIRE_TLS,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
  }
  return cachedEmailTransport;
}

async function sendEmailInviteMessage({ req, project, invite, actor, targetUser = null, assignmentRole = null }) {
  if (!SMTP_USER || !SMTP_PASS) {
    return {
      sent: false,
      mode: 'smtp',
      error: 'Email invitations are not set up. Add SMTP_USER and SMTP_PASS in Render and redeploy.'
    };
  }

  const recipient = normalizeEmail(targetUser?.email || invite.target_email);
  if (!recipient) {
    return {
      sent: false,
      mode: 'smtp',
      error: 'No email address was found for this invitation.'
    };
  }

  try {
    const transport = getEmailTransport();
    const message = buildEmailInviteMessage({ req, project, invite, actor, targetUser, assignmentRole });
    await transport.sendMail({
      from: EMAIL_FROM_NAME ? `"${EMAIL_FROM_NAME}" <${EMAIL_FROM || SMTP_USER}>` : (EMAIL_FROM || SMTP_USER),
      to: recipient,
      replyTo: EMAIL_FROM || SMTP_USER,
      subject: message.subject,
      text: message.text,
      html: message.html
    });
    return { sent: true, mode: 'smtp', recipient };
  } catch (error) {
    return {
      sent: false,
      mode: 'smtp',
      error: error.message || 'Email send failed.'
    };
  }
}

async function selectProjectForInvite(client, projectId) {
  const projectResult = await client.query(
    `SELECT id, name, location, description, project_status,
      to_char(start_date, 'YYYY-MM-DD') AS start_date,
      to_char(end_date, 'YYYY-MM-DD') AS end_date
     FROM projects
     WHERE id = $1`,
    [projectId]
  );
  if (!projectResult.rowCount) throw httpError(404, 'Project not found.');
  return projectResult.rows[0];
}

async function createInviteCode(client, { projectId, role, maxUses, expiresInDays, actorId, targetUserId = null, targetEmail = null, auditAction = 'email_invite_code_created' }) {
  let invite;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateInviteCode();
    const insertResult = await client.query(
      `INSERT INTO project_invite_codes
        (project_id, code, role, max_uses, expires_at, created_by, target_user_id, target_email)
       VALUES ($1, $2, $3, $4, now() + ($5::int * interval '1 day'), $6, $7, $8)
       ON CONFLICT (code) DO NOTHING
       RETURNING id, project_id, code, role, max_uses, uses_count, expires_at, revoked_at, created_by, target_user_id, target_email, created_at`,
      [projectId, code, role, maxUses, expiresInDays, actorId, targetUserId, targetEmail]
    );
    if (insertResult.rowCount) {
      invite = insertResult.rows[0];
      break;
    }
  }

  if (!invite) throw httpError(500, 'Could not create a unique invitation code. Please try again.');

  await writeAudit(client, {
    projectId,
    userId: actorId,
    action: auditAction,
    entityType: 'project_invite_code',
    entityId: invite.id,
    after: { ...invite, formatted_code: formatInviteCode(invite.code) }
  });

  return invite;
}

function publicInvite(req, invite) {
  if (!invite) return null;
  return {
    ...invite,
    formatted_code: formatInviteCode(invite.code),
    invite_url: buildInviteUrl(req, invite.code)
  };
}



function cleanText(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function requireText(value, label) {
  const text = cleanText(value);
  if (!text) throw httpError(400, `${label} is required.`);
  return text;
}

function normalizeBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(text)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(text)) return false;
  throw httpError(400, 'Boolean value expected.');
}

function normalizeDate(value, label) {
  const text = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw httpError(400, `${label} must be a YYYY-MM-DD date.`);
  }
  const timestamp = Date.parse(`${text}T00:00:00.000Z`);
  if (Number.isNaN(timestamp)) {
    throw httpError(400, `${label} is not a valid date.`);
  }
  return text;
}

function addDaysIso(value, days) {
  const dateText = normalizeDate(value, 'date');
  const [year, month, day] = dateText.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function ensureDateOrder(startDate, endDate) {
  if (Date.parse(`${startDate}T00:00:00.000Z`) > Date.parse(`${endDate}T00:00:00.000Z`)) {
    throw httpError(400, 'End date must be on or after start date.');
  }
}

function requireEnum(value, allowed, label) {
  const text = requireText(value, label);
  if (!allowed.has(text)) {
    throw httpError(400, `${label} must be one of: ${Array.from(allowed).join(', ')}.`);
  }
  return text;
}

function normalizeOptionalEnum(value, allowed, label) {
  if (value === undefined) return undefined;
  const text = String(value || '').trim();
  if (!text || !allowed.has(text)) {
    throw httpError(400, `${label} must be one of: ${Array.from(allowed).join(', ')}.`);
  }
  return text;
}

function normalizeTaskChoice(value, allowed, label, partial = false) {
  if (partial && value === undefined) return undefined;
  const text = cleanText(value);
  if (!text) return null;
  if (!allowed.has(text)) {
    throw httpError(400, `${label} must be one of: ${Array.from(allowed).join(', ')}.`);
  }
  return text;
}

function normalizeVendor(value, partial = false) {
  return normalizeTaskChoice(value, vendors, 'vendor', partial);
}

function normalizeProjectNotes(value) {
  const text = String(value ?? '');
  if (text.length > 10000) {
    throw httpError(400, 'Project notes must be 10,000 characters or fewer.');
  }
  return text;
}

function normalizeProjectNoteBody(value) {
  const text = String(value ?? '').trim();
  if (!text) {
    throw httpError(400, 'Project note text is required.');
  }
  if (text.length > 10000) {
    throw httpError(400, 'Project notes must be 10,000 characters or fewer.');
  }
  return text;
}

function normalizeProgress(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 100) {
    throw httpError(400, 'percent_complete must be an integer from 0 to 100.');
  }
  return number;
}

function normalizeOptionalId(value, label) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return parseId(value, label);
}

function normalizeAssignedTo(value, partial = false) {
  if (partial && value === undefined) return undefined;
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  if (/^\d+$/.test(text)) return parseId(text, 'assigned_to');
  return null;
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function publicUser(user) {
  const siteRole = user.site_role || 'member';
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    trade: user.trade || '',
    site_role: siteRole,
    access_revoked: Boolean(user.access_revoked),
    can_manage_site: managerSiteRoles.has(siteRole)
  };
}

async function requireAuth(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw httpError(401, 'Authentication token required.');

    const payload = jwt.verify(token, JWT_SECRET);
    const result = await query('SELECT id, name, email, trade, site_role, access_revoked FROM users WHERE id = $1', [payload.sub]);
    if (!result.rowCount) throw httpError(401, 'User no longer exists.');
    if (result.rows[0].access_revoked) throw httpError(403, 'Your site access has been revoked. Contact a manager or owner.');

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(httpError(401, 'Invalid or expired authentication token.'));
      return;
    }
    next(error);
  }
}

async function getMembership(projectId, userId, db = { query }) {
  const result = await db.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
  return result.rows[0] || null;
}

async function hasPortfolioViewAccess(userId, db = { query }) {
  const result = await db.query(
    `SELECT 1
     FROM users
     WHERE id = $1 AND access_revoked = false AND site_role IN ('owner', 'manager')
     LIMIT 1`,
    [userId]
  );
  return result.rowCount > 0;
}

async function requireProjectAccess(projectId, userId, db = { query }) {
  const membership = await getMembership(projectId, userId, db);
  if (membership) return { role: membership.role, membership, portfolio: false };

  if (await hasPortfolioViewAccess(userId, db)) {
    const exists = await db.query('SELECT 1 FROM projects WHERE id = $1', [projectId]);
    if (!exists.rowCount) throw httpError(404, 'Project not found.');
    return { role: 'portfolio_viewer', membership: null, portfolio: true };
  }

  throw httpError(403, 'You are not assigned to this project.');
}

function higherProjectRole(roleA, roleB) {
  return roleRank[roleA] >= roleRank[roleB] ? roleA : roleB;
}

async function requireProjectMembership(projectId, userId, minimumRole = 'viewer', db = { query }) {
  const membership = await getMembership(projectId, userId, db);
  if (!membership) throw httpError(403, 'You are not assigned to this project.');
  if (roleRank[membership.role] < roleRank[minimumRole]) {
    throw httpError(403, `This action requires ${minimumRole} access or higher.`);
  }
  return membership;
}


function requireSiteManagement(user) {
  const siteRole = user?.site_role || 'member';
  if (!managerSiteRoles.has(siteRole)) {
    throw httpError(403, 'Site member management requires site manager or site owner access.');
  }
  return siteRole;
}

function requireSiteOwner(user) {
  const siteRole = user?.site_role || 'member';
  if (siteRole !== 'owner') {
    throw httpError(403, 'This area is only available to site owners.');
  }
  return siteRole;
}

const OWNER_CMS_ROW_COUNT = 300;
const OWNER_CMS_COLUMN_COUNT = 20;

function buildBlankOwnerCmsGrid() {
  return Array.from({ length: OWNER_CMS_ROW_COUNT }, () => Array.from({ length: OWNER_CMS_COLUMN_COUNT }, () => ''));
}

function normalizeOwnerCmsGrid(cells) {
  const blank = buildBlankOwnerCmsGrid();
  if (!Array.isArray(cells)) return blank;

  for (let rowIndex = 0; rowIndex < Math.min(cells.length, OWNER_CMS_ROW_COUNT); rowIndex += 1) {
    const row = cells[rowIndex];
    if (!Array.isArray(row)) continue;
    for (let colIndex = 0; colIndex < Math.min(row.length, OWNER_CMS_COLUMN_COUNT); colIndex += 1) {
      const value = row[colIndex];
      blank[rowIndex][colIndex] = value === null || value === undefined ? '' : String(value);
    }
  }

  return blank;
}

function normalizeOwnerCmsArchivedRows(rows) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row, index) => {
      if (Array.isArray(row)) {
        return {
          row_number: index + 1,
          archived_at: null,
          cells: normalizeOwnerCmsGrid([row])[0]
        };
      }

      if (row && typeof row === 'object') {
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
    })
    .filter((row) => row.cells.some((value) => String(value || '').trim().length > 0));
}

function rowHasContent(row) {
  return Array.isArray(row) && row.some((value) => String(value || '').trim().length > 0);
}

async function archiveStaleCompletedProjects(db = { query }) {
  await db.query(
    `UPDATE projects
     SET project_status = 'archived',
         archived_at = COALESCE(archived_at, now())
     WHERE project_status = 'completed'
       AND COALESCE(completed_at, updated_at, created_at) <= now() - interval '30 days'`
  );
}

function requireOwnerCmsSheet(sheetKey) {
  const sheet = ownerCmsWorkOrderSheetMap.get(String(sheetKey || '').trim());
  if (!sheet) {
    throw httpError(404, 'CMS work order sheet not found.');
  }
  return sheet;
}

function ensureSiteActorCanManageTarget(actorRole, targetUser, requestedRole = null) {
  if (actorRole === 'owner') return;
  if (targetUser.site_role === 'owner' || requestedRole === 'owner') {
    throw httpError(403, 'Only site owners can manage site owners.');
  }
}

async function ensureLastSiteOwnerSafe(db, targetUserId, options = {}) {
  const target = await db.query('SELECT id, site_role, access_revoked FROM users WHERE id = $1', [targetUserId]);
  if (!target.rowCount) throw httpError(404, 'User not found.');

  const current = target.rows[0];
  const nextRole = options.nextRole === undefined ? current.site_role : options.nextRole;
  const nextRevoked = options.nextRevoked === undefined ? current.access_revoked : options.nextRevoked;
  const deleting = Boolean(options.deleting);

  const wouldRemoveActiveOwner = current.site_role === 'owner' && !current.access_revoked && (
    deleting || nextRole !== 'owner' || nextRevoked === true
  );

  if (!wouldRemoveActiveOwner) return current;

  const owners = await db.query(
    "SELECT count(*)::int AS count FROM users WHERE site_role = 'owner' AND access_revoked = false AND id <> $1",
    [targetUserId]
  );
  if (owners.rows[0].count < 1) {
    throw httpError(400, 'The site must keep at least one active owner. Assign another owner before making this change.');
  }
  return current;
}

async function ensureNotLastProjectOwner(db, targetUserId) {
  const result = await db.query(
    `SELECT p.id, p.name
     FROM projects p
     JOIN project_members target_pm ON target_pm.project_id = p.id
      AND target_pm.user_id = $1
      AND target_pm.role = 'owner'
     WHERE NOT EXISTS (
       SELECT 1
       FROM project_members other_pm
       WHERE other_pm.project_id = p.id
        AND other_pm.user_id <> $1
        AND other_pm.role = 'owner'
     )
     ORDER BY p.name
     LIMIT 5`,
    [targetUserId]
  );

  if (result.rowCount) {
    const names = result.rows.map((row) => row.name).join(', ');
    throw httpError(400, `This user is the only owner on: ${names}. Add another project owner before deleting the user.`);
  }
}

function safeDownloadName(value) {
  const cleaned = String(value || 'blueprint').replace(/[\\/\r\n\t]/g, ' ').trim();
  return cleaned || 'blueprint';
}

async function runBlueprintUpload(req, res) {
  await new Promise((resolve, reject) => {
    blueprintUpload.single('blueprint')(req, res, (error) => {
      if (error) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          error.status = 400;
          error.message = `Blueprint file is too large. Maximum size is ${Math.round(MAX_BLUEPRINT_BYTES / (1024 * 1024))} MB.`;
        }
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

async function writeAudit(db, entry) {
  await db.query(
    `INSERT INTO audit_log
      (project_id, task_id, user_id, action, entity_type, entity_id, before_data, after_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)`,
    [
      entry.projectId || null,
      entry.taskId || null,
      entry.userId || null,
      entry.action,
      entry.entityType,
      entry.entityId || null,
      entry.before === undefined ? null : JSON.stringify(entry.before),
      entry.after === undefined ? null : JSON.stringify(entry.after)
    ]
  );
}

function emitProjectChange(projectId, payload) {
  io.to(`project:${projectId}`).emit('project:changed', {
    projectId,
    at: new Date().toISOString(),
    ...payload
  });
}


async function ensureProjectChecklist(db, projectId) {
  const values = [];
  const placeholders = defaultChecklistItems.map((item, index) => {
    const offset = index * 4;
    values.push(projectId, item.item_key, item.label, item.sort_order);
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
  });

  await db.query(
    `INSERT INTO project_checklist_items (project_id, item_key, label, sort_order)
     VALUES ${placeholders.join(', ')}
     ON CONFLICT (project_id, item_key) DO NOTHING`,
    values
  );
}

async function loadProjectChecklist(projectId) {
  await ensureProjectChecklist({ query }, projectId);
  const result = await query(
    `SELECT
       pci.id,
       pci.project_id,
       pci.item_key,
       pci.label,
       pci.is_checked,
       pci.sort_order,
       pci.updated_by,
       updater.name AS updated_by_name,
       pci.updated_at
     FROM project_checklist_items pci
     LEFT JOIN users updater ON updater.id = pci.updated_by
     WHERE pci.project_id = $1
     ORDER BY pci.sort_order ASC, pci.id ASC`,
    [projectId]
  );
  return result.rows;
}

let blueprintColumnInfoPromise = null;
async function getBlueprintColumnInfo(db = { query }) {
  if (!blueprintColumnInfoPromise) {
    blueprintColumnInfoPromise = db.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'project_blueprints'`
    ).then((result) => {
      const columns = new Set(result.rows.map((row) => row.column_name));
      return {
        hasOriginalName: columns.has('original_name'),
        hasFileName: columns.has('file_name'),
        hasSizeBytes: columns.has('size_bytes'),
        hasFileSize: columns.has('file_size')
      };
    }).catch(() => ({ hasOriginalName: true, hasFileName: false, hasSizeBytes: true, hasFileSize: false }));
  }
  return blueprintColumnInfoPromise;
}

async function loadProjectBlueprints(projectId) {
  const result = await query(
    `SELECT
       pb.id,
       pb.project_id,
       COALESCE(pb.original_name, pb.file_name, concat('blueprint-', pb.id)) AS original_name,
       pb.mime_type,
       COALESCE(pb.size_bytes, pb.file_size, 1) AS size_bytes,
       pb.uploaded_by,
       uploader.name AS uploaded_by_name,
       pb.created_at
     FROM project_blueprints pb
     LEFT JOIN users uploader ON uploader.id = pb.uploaded_by
     WHERE pb.project_id = $1
     ORDER BY pb.created_at DESC, pb.id DESC`,
    [projectId]
  );
  return result.rows;
}

const taskSelect = `
  t.id,
  t.project_id,
  t.parent_task_id,
  t.name,
  t.description,
  t.trade,
  t.vendor,
  t.vendor_secondary,
  t.security_team_member,
  t.pm,
  t.assigned_to,
  assignee.name AS assigned_to_name,
  assignee.email AS assigned_to_email,
  t.assignee_secondary,
  t.assignee_tertiary,
  t.assignee_quaternary,
  t.status,
  t.priority,
  to_char(t.start_date, 'YYYY-MM-DD') AS start_date,
  to_char(t.end_date, 'YYYY-MM-DD') AS end_date,
  t.percent_complete,
  t.color,
  t.sort_order,
  t.created_by,
  creator.name AS created_by_name,
  t.created_at,
  t.updated_at
`;

async function selectTaskById(db, taskId) {
  const result = await db.query(
    `SELECT ${taskSelect}
     FROM tasks t
     LEFT JOIN users assignee ON assignee.id = t.assigned_to
     LEFT JOIN users creator ON creator.id = t.created_by
     WHERE t.id = $1`,
    [taskId]
  );
  return result.rows[0] || null;
}

async function verifyAssignee(db, projectId, assigneeId) {
  if (!assigneeId) return;
  const member = await db.query('SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, assigneeId]);
  if (!member.rowCount) throw httpError(400, 'Assigned user must be a project member.');
}

async function verifyParentTask(db, projectId, parentTaskId, taskId = null) {
  if (!parentTaskId) return;
  if (taskId && parentTaskId === taskId) throw httpError(400, 'A task cannot be its own parent.');
  const parent = await db.query('SELECT 1 FROM tasks WHERE id = $1 AND project_id = $2', [parentTaskId, projectId]);
  if (!parent.rowCount) throw httpError(400, 'Parent task must belong to the same project.');
}

async function loadProjectPayload(projectId, userId) {
  await archiveStaleCompletedProjects();
  const access = await requireProjectAccess(projectId, userId);

  const projectResult = await query(
    `SELECT
       p.id,
       p.name,
       p.location,
       p.description,
       p.notes,
       p.project_status,
       to_char(p.start_date, 'YYYY-MM-DD') AS start_date,
       to_char(p.end_date, 'YYYY-MM-DD') AS end_date,
       p.created_by,
       p.created_at,
       p.updated_at,
       creator.name AS created_by_name
     FROM projects p
     LEFT JOIN users creator ON creator.id = p.created_by
     WHERE p.id = $1`,
    [projectId]
  );

  if (!projectResult.rowCount) throw httpError(404, 'Project not found.');

  const tasksResult = await query(
    `SELECT ${taskSelect}
     FROM tasks t
     LEFT JOIN users assignee ON assignee.id = t.assigned_to
     LEFT JOIN users creator ON creator.id = t.created_by
     WHERE t.project_id = $1
     ORDER BY t.sort_order ASC, t.start_date ASC, t.id ASC`,
    [projectId]
  );

  const dependenciesResult = await query(
    `SELECT
       d.id,
       d.project_id,
       d.predecessor_task_id,
       d.successor_task_id,
       d.type,
       d.lag_days,
       d.created_at,
       pred.name AS predecessor_name,
       succ.name AS successor_name
     FROM task_dependencies d
     JOIN tasks pred ON pred.id = d.predecessor_task_id
     JOIN tasks succ ON succ.id = d.successor_task_id
     WHERE d.project_id = $1
     ORDER BY d.id ASC`,
    [projectId]
  );

  const membersResult = await query(
    `SELECT
       pm.project_id,
       pm.user_id,
       pm.role,
       pm.created_at,
       u.name,
       u.email,
       u.access_revoked
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1
     ORDER BY CASE pm.role WHEN 'owner' THEN 1 WHEN 'manager' THEN 2 WHEN 'editor' THEN 3 ELSE 4 END, u.name`,
    [projectId]
  );

  const auditResult = await query(
    `SELECT
       al.id,
       al.project_id,
       al.task_id,
       al.user_id,
       al.action,
       al.entity_type,
       al.entity_id,
       al.before_data,
       al.after_data,
       al.created_at,
       u.name AS user_name,
       u.email AS user_email
     FROM audit_log al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE al.project_id = $1
     ORDER BY al.created_at DESC
     LIMIT 60`,
    [projectId]
  );

  const notesResult = await query(
    `SELECT
       pne.id,
       pne.project_id,
       pne.body,
       pne.created_by,
       pne.updated_by,
       pne.created_at,
       pne.updated_at,
       creator.name AS created_by_name,
       updater.name AS updated_by_name
     FROM project_note_entries pne
     LEFT JOIN users creator ON creator.id = pne.created_by
     LEFT JOIN users updater ON updater.id = pne.updated_by
     WHERE pne.project_id = $1
     ORDER BY pne.created_at DESC, pne.id DESC`,
    [projectId]
  );

  const checklist = await loadProjectChecklist(projectId);
  const blueprints = await loadProjectBlueprints(projectId);

  return {
    project: { ...projectResult.rows[0], role: access.role },
    tasks: tasksResult.rows,
    dependencies: dependenciesResult.rows,
    members: membersResult.rows,
    notes_entries: notesResult.rows,
    checklist,
    blueprints,
    audit: auditResult.rows
  };
}

function buildTaskInput(body, partial = false) {
  const input = {};

  if (!partial || body.name !== undefined) input.name = requireText(body.name, 'Task name');
  if (!partial || body.description !== undefined) input.description = cleanText(body.description);
  if (!partial || body.trade !== undefined) {
    const tradeText = cleanText(body.trade);
    input.trade = tradeText || null;
  }
  if (!partial || body.vendor !== undefined) input.vendor = normalizeVendor(body.vendor, partial);
  if (!partial || body.vendor_secondary !== undefined) input.vendor_secondary = normalizeVendor(body.vendor_secondary, partial);
  if (!partial || body.security_team_member !== undefined) input.security_team_member = normalizeTaskChoice(body.security_team_member, securityTeamMembers, 'security_team_member', partial);
  if (!partial || body.pm !== undefined) input.pm = normalizeTaskChoice(body.pm, projectManagers, 'pm', partial);
  if (!partial || body.assigned_to !== undefined) input.assigned_to = normalizeAssignedTo(body.assigned_to, partial);
  if (!partial || body.assignee_secondary !== undefined) input.assignee_secondary = cleanText(body.assignee_secondary);
  if (!partial || body.assignee_tertiary !== undefined) input.assignee_tertiary = cleanText(body.assignee_tertiary);
  if (!partial || body.assignee_quaternary !== undefined) input.assignee_quaternary = cleanText(body.assignee_quaternary);
  if (!partial || body.parent_task_id !== undefined) input.parent_task_id = normalizeOptionalId(body.parent_task_id, 'parent_task_id');

  if (!partial || body.status !== undefined) {
    input.status = partial ? normalizeOptionalEnum(body.status, statuses, 'status') : requireEnum(body.status || 'not_started', statuses, 'status');
  }

  if (!partial || body.priority !== undefined) {
    input.priority = partial ? normalizeOptionalEnum(body.priority, priorities, 'priority') : requireEnum(body.priority || 'normal', priorities, 'priority');
  }

  if (!partial || body.start_date !== undefined) {
    const rawStart = cleanText(body.start_date);
    input.start_date = rawStart && /^\d{4}-\d{2}-\d{2}$/.test(rawStart) ? normalizeDate(rawStart, 'start_date') : todayIso();
  }
  if (!partial || body.end_date !== undefined) {
    const rawEnd = cleanText(body.end_date);
    input.end_date = rawEnd && /^\d{4}-\d{2}-\d{2}$/.test(rawEnd) ? normalizeDate(rawEnd, 'end_date') : (input.start_date || todayIso());
  }

  if (!partial || body.percent_complete !== undefined) {
    input.percent_complete = body.percent_complete === undefined ? 0 : normalizeProgress(body.percent_complete);
  }

  if (!partial || body.color !== undefined) {
    const color = cleanText(body.color) || '#2563eb';
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw httpError(400, 'color must be a hex color like #2563eb.');
    input.color = color;
  }

  if (!partial || body.sort_order !== undefined) {
    if (body.sort_order === undefined || body.sort_order === null || body.sort_order === '') {
      input.sort_order = 0;
    } else {
      const sortOrder = Number(body.sort_order);
      if (!Number.isInteger(sortOrder)) throw httpError(400, 'sort_order must be an integer.');
      input.sort_order = sortOrder;
    }
  }

  return input;
}

async function wouldCreateCycle(db, projectId, predecessorTaskId, successorTaskId) {
  const result = await db.query(
    'SELECT predecessor_task_id, successor_task_id FROM task_dependencies WHERE project_id = $1',
    [projectId]
  );

  const graph = new Map();
  for (const row of result.rows) {
    if (!graph.has(row.predecessor_task_id)) graph.set(row.predecessor_task_id, []);
    graph.get(row.predecessor_task_id).push(row.successor_task_id);
  }

  const stack = [successorTaskId];
  const visited = new Set();

  while (stack.length) {
    const current = stack.pop();
    if (current === predecessorTaskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of graph.get(current) || []) stack.push(next);
  }

  return false;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'buildtrack-server', at: new Date().toISOString() });
});

app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const name = requireText(req.body.name, 'Name');
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const trade = normalizeOptionalEnum(req.body.trade, userTrades, 'trade');

  if (!/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, 'A valid email is required.');
  if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters.');

  const passwordHash = await bcrypt.hash(password, 12);
  const countResult = await query('SELECT count(*)::int AS count FROM users');
  const siteRole = countResult.rows[0].count === 0 ? 'owner' : 'member';

  try {
    const result = await query(
      'INSERT INTO users (name, email, password_hash, site_role, trade) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, site_role, access_revoked, trade',
      [name, email, passwordHash, siteRole, trade]
    );
    const user = result.rows[0];
    res.status(201).json({ user: publicUser(user), token: signToken(user) });
  } catch (error) {
    if (error.code === '23505') throw httpError(409, 'An account with that email already exists.');
    throw error;
  }
}));

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  const result = await query('SELECT id, name, email, password_hash, site_role, access_revoked, trade FROM users WHERE email = $1', [email]);
  if (!result.rowCount) throw httpError(401, 'Invalid email or password.');

  const user = result.rows[0];
  if (user.access_revoked) throw httpError(403, 'Your site access has been revoked. Contact a manager or owner.');
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw httpError(401, 'Invalid email or password.');

  res.json({ user: publicUser(user), token: signToken(user) });
}));

app.get('/api/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
}));


app.get('/api/owner/cms-wos', requireAuth, asyncHandler(async (req, res) => {
  requireSiteOwner(req.user);

  const result = await tx(async (client) => {
    await client.query(
      `INSERT INTO owner_cms_work_orders (sheet_key, sheet_name, cells, archived_cells)
       VALUES
         ('kurts_cms_wos', 'Kurts CMS WOs', '[]'::jsonb, '[]'::jsonb),
         ('austins_cms_wos', 'Austins CMS WOs', '[]'::jsonb, '[]'::jsonb)
       ON CONFLICT (sheet_key) DO UPDATE SET
         sheet_name = EXCLUDED.sheet_name,
         archived_cells = COALESCE(owner_cms_work_orders.archived_cells, '[]'::jsonb)`
    );

    const rows = await client.query(
      `SELECT sheet_key, sheet_name, cells, archived_cells, created_at, updated_at
       FROM owner_cms_work_orders
       ORDER BY sheet_name ASC`
    );

    return rows.rows.map((sheet) => ({
      ...sheet,
      cells: normalizeOwnerCmsGrid(sheet.cells),
      archived_rows: normalizeOwnerCmsArchivedRows(sheet.archived_cells)
    }));
  });

  res.json({ sheets: result });
}));

app.patch('/api/owner/cms-wos/:sheetKey/cell', requireAuth, asyncHandler(async (req, res) => {
  requireSiteOwner(req.user);
  const sheet = requireOwnerCmsSheet(req.params.sheetKey);
  const rowIndex = clampInteger(req.body.row_index ?? req.body.rowIndex, {
    label: 'row_index',
    defaultValue: 0,
    min: 0,
    max: OWNER_CMS_ROW_COUNT - 1
  });
  const colIndex = clampInteger(req.body.col_index ?? req.body.colIndex, {
    label: 'col_index',
    defaultValue: 0,
    min: 0,
    max: OWNER_CMS_COLUMN_COUNT - 1
  });
  const cellValue = String(req.body.value ?? '');

  const updated = await tx(async (client) => {
    const current = await client.query(
      'SELECT sheet_key, sheet_name, cells, archived_cells FROM owner_cms_work_orders WHERE sheet_key = $1 FOR UPDATE',
      [sheet.sheet_key]
    );
    if (!current.rowCount) throw httpError(404, 'CMS work order sheet not found.');

    const normalized = normalizeOwnerCmsGrid(current.rows[0].cells);
    normalized[rowIndex][colIndex] = cellValue;
    const archivedRows = normalizeOwnerCmsArchivedRows(current.rows[0].archived_cells);

    const saveResult = await client.query(
      `UPDATE owner_cms_work_orders
       SET cells = $1,
           archived_cells = $2
       WHERE sheet_key = $3
       RETURNING sheet_key, sheet_name, cells, archived_cells, created_at, updated_at`,
      [JSON.stringify(normalized), JSON.stringify(archivedRows), sheet.sheet_key]
    );

    return {
      ...saveResult.rows[0],
      cells: normalizeOwnerCmsGrid(saveResult.rows[0].cells),
      archived_rows: normalizeOwnerCmsArchivedRows(saveResult.rows[0].archived_cells)
    };
  });

  res.json({ sheet: updated });
}));

app.post('/api/owner/cms-wos/:sheetKey/rows/:rowIndex/archive', requireAuth, asyncHandler(async (req, res) => {
  requireSiteOwner(req.user);
  const sheet = requireOwnerCmsSheet(req.params.sheetKey);
  const rowIndex = clampInteger(req.params.rowIndex, {
    label: 'rowIndex',
    defaultValue: 0,
    min: 0,
    max: OWNER_CMS_ROW_COUNT - 1
  });

  const updated = await tx(async (client) => {
    const current = await client.query(
      'SELECT sheet_key, sheet_name, cells, archived_cells FROM owner_cms_work_orders WHERE sheet_key = $1 FOR UPDATE',
      [sheet.sheet_key]
    );
    if (!current.rowCount) throw httpError(404, 'CMS work order sheet not found.');

    const activeRows = normalizeOwnerCmsGrid(current.rows[0].cells);
    const archivedRows = normalizeOwnerCmsArchivedRows(current.rows[0].archived_cells);
    const row = activeRows[rowIndex];
    if (!row) throw httpError(404, 'Row not found.');

    if (!rowHasContent(row)) {
      throw httpError(400, 'That row is already blank.');
    }

    archivedRows.unshift({
      row_number: rowIndex + 1,
      archived_at: new Date().toISOString(),
      cells: [...row]
    });
    activeRows[rowIndex] = Array.from({ length: OWNER_CMS_COLUMN_COUNT }, () => '');

    const saveResult = await client.query(
      `UPDATE owner_cms_work_orders
       SET cells = $1,
           archived_cells = $2
       WHERE sheet_key = $3
       RETURNING sheet_key, sheet_name, cells, archived_cells, created_at, updated_at`,
      [JSON.stringify(activeRows), JSON.stringify(archivedRows), sheet.sheet_key]
    );

    return {
      ...saveResult.rows[0],
      cells: normalizeOwnerCmsGrid(saveResult.rows[0].cells),
      archived_rows: normalizeOwnerCmsArchivedRows(saveResult.rows[0].archived_cells)
    };
  });

  res.json({ sheet: updated });
}));

app.post('/api/owner/cms-wos/:sheetKey/rows/:rowIndex/insert', requireAuth, asyncHandler(async (req, res) => {
  requireSiteOwner(req.user);
  const sheet = requireOwnerCmsSheet(req.params.sheetKey);
  const rowIndex = clampInteger(req.params.rowIndex, {
    label: 'rowIndex',
    defaultValue: 0,
    min: 0,
    max: OWNER_CMS_ROW_COUNT - 1
  });
  const direction = String(req.body.direction || 'below').toLowerCase() === 'above' ? 'above' : 'below';

  const updated = await tx(async (client) => {
    const current = await client.query(
      'SELECT sheet_key, sheet_name, cells, archived_cells FROM owner_cms_work_orders WHERE sheet_key = $1 FOR UPDATE',
      [sheet.sheet_key]
    );
    if (!current.rowCount) throw httpError(404, 'CMS work order sheet not found.');

    const activeRows = normalizeOwnerCmsGrid(current.rows[0].cells);
    const insertAt = direction === 'above' ? rowIndex : rowIndex + 1;
    if (insertAt < 0 || insertAt > activeRows.length) throw httpError(400, 'Unable to insert row at that position.');

    activeRows.splice(insertAt, 0, Array.from({ length: OWNER_CMS_COLUMN_COUNT }, () => ''));
    while (activeRows.length > OWNER_CMS_ROW_COUNT) activeRows.pop();

    const saveResult = await client.query(
      `UPDATE owner_cms_work_orders
       SET cells = $1
       WHERE sheet_key = $2
       RETURNING sheet_key, sheet_name, cells, archived_cells, created_at, updated_at`,
      [JSON.stringify(activeRows), sheet.sheet_key]
    );

    return {
      ...saveResult.rows[0],
      cells: normalizeOwnerCmsGrid(saveResult.rows[0].cells),
      archived_rows: normalizeOwnerCmsArchivedRows(saveResult.rows[0].archived_cells)
    };
  });

  res.json({ sheet: updated });
}));

app.post('/api/owner/cms-wos/:sheetKey/archived/:archiveIndex/restore', requireAuth, asyncHandler(async (req, res) => {
  requireSiteOwner(req.user);
  const sheet = requireOwnerCmsSheet(req.params.sheetKey);
  const archiveIndex = clampInteger(req.params.archiveIndex, {
    label: 'archiveIndex',
    defaultValue: 0,
    min: 0,
    max: 999999
  });

  const updated = await tx(async (client) => {
    const current = await client.query(
      'SELECT sheet_key, sheet_name, cells, archived_cells FROM owner_cms_work_orders WHERE sheet_key = $1 FOR UPDATE',
      [sheet.sheet_key]
    );
    if (!current.rowCount) throw httpError(404, 'CMS work order sheet not found.');

    const activeRows = normalizeOwnerCmsGrid(current.rows[0].cells);
    const archivedRows = normalizeOwnerCmsArchivedRows(current.rows[0].archived_cells);
    const archivedRow = archivedRows[archiveIndex];
    if (!archivedRow) throw httpError(404, 'Archived row not found.');

    let targetIndex = archivedRow.row_number ? Number(archivedRow.row_number) - 1 : activeRows.findIndex((row) => !rowHasContent(row));
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= OWNER_CMS_ROW_COUNT || rowHasContent(activeRows[targetIndex])) {
      targetIndex = activeRows.findIndex((row) => !rowHasContent(row));
    }
    if (targetIndex < 0) throw httpError(400, 'No empty rows are available to restore this entry.');

    activeRows[targetIndex] = [...archivedRow.cells];
    archivedRows.splice(archiveIndex, 1);

    const saveResult = await client.query(
      `UPDATE owner_cms_work_orders
       SET cells = $1,
           archived_cells = $2
       WHERE sheet_key = $3
       RETURNING sheet_key, sheet_name, cells, archived_cells, created_at, updated_at`,
      [JSON.stringify(activeRows), JSON.stringify(archivedRows), sheet.sheet_key]
    );

    return {
      ...saveResult.rows[0],
      cells: normalizeOwnerCmsGrid(saveResult.rows[0].cells),
      archived_rows: normalizeOwnerCmsArchivedRows(saveResult.rows[0].archived_cells)
    };
  });

  res.json({ sheet: updated });
}));

app.delete('/api/owner/cms-wos/:sheetKey/archived/:archiveIndex', requireAuth, asyncHandler(async (req, res) => {
  requireSiteOwner(req.user);
  const sheet = requireOwnerCmsSheet(req.params.sheetKey);
  const archiveIndex = clampInteger(req.params.archiveIndex, {
    label: 'archiveIndex',
    defaultValue: 0,
    min: 0,
    max: 999999
  });

  const updated = await tx(async (client) => {
    const current = await client.query(
      'SELECT sheet_key, sheet_name, cells, archived_cells FROM owner_cms_work_orders WHERE sheet_key = $1 FOR UPDATE',
      [sheet.sheet_key]
    );
    if (!current.rowCount) throw httpError(404, 'CMS work order sheet not found.');

    const activeRows = normalizeOwnerCmsGrid(current.rows[0].cells);
    const archivedRows = normalizeOwnerCmsArchivedRows(current.rows[0].archived_cells);
    if (!archivedRows[archiveIndex]) throw httpError(404, 'Archived row not found.');
    archivedRows.splice(archiveIndex, 1);

    const saveResult = await client.query(
      `UPDATE owner_cms_work_orders
       SET cells = $1,
           archived_cells = $2
       WHERE sheet_key = $3
       RETURNING sheet_key, sheet_name, cells, archived_cells, created_at, updated_at`,
      [JSON.stringify(activeRows), JSON.stringify(archivedRows), sheet.sheet_key]
    );

    return {
      ...saveResult.rows[0],
      cells: normalizeOwnerCmsGrid(saveResult.rows[0].cells),
      archived_rows: normalizeOwnerCmsArchivedRows(saveResult.rows[0].archived_cells)
    };
  });

  res.json({ sheet: updated });
}));

app.get('/api/projects', requireAuth, asyncHandler(async (req, res) => {
  await archiveStaleCompletedProjects();
  const result = await query(
    `WITH portfolio_access AS (
       SELECT (
         EXISTS (
           SELECT 1
           FROM users
           WHERE id = $1 AND access_revoked = false AND site_role IN ('owner', 'manager')
         )
       ) AS can_view_all
     ),
     accessible_projects AS (
       SELECT
         p.id,
         p.name,
         p.location,
         p.description,
         p.project_status,
         to_char(p.start_date, 'YYYY-MM-DD') AS start_date,
         to_char(p.end_date, 'YYYY-MM-DD') AS end_date,
         p.created_at,
         p.updated_at,
         coalesce(pm.role, 'portfolio_viewer') AS role
       FROM projects p
       CROSS JOIN portfolio_access pa
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       WHERE pa.can_view_all = true OR pm.user_id = $1
     ),
     task_stats AS (
       SELECT
         project_id,
         count(*)::int AS task_count,
         coalesce(round(avg(percent_complete))::int, 0) AS average_progress,
         count(*) FILTER (WHERE status = 'not_started')::int AS not_started_task_count,
         count(*) FILTER (WHERE status = 'in_progress')::int AS in_progress_task_count,
         count(*) FILTER (WHERE status = 'blocked')::int AS blocked_task_count,
         count(*) FILTER (WHERE status = 'complete')::int AS complete_task_count,
         coalesce(array_to_string(array_agg(DISTINCT pm ORDER BY pm) FILTER (WHERE pm IS NOT NULL), ', '), '') AS pm_summary
       FROM tasks
       WHERE project_id IN (SELECT id FROM accessible_projects)
       GROUP BY project_id
     ),
     member_stats AS (
       SELECT
         pm.project_id,
         count(*)::int AS member_count,
         coalesce(
           json_agg(
             json_build_object(
               'user_id', u.id,
               'name', u.name,
               'email', u.email,
               'role', pm.role,
               'access_revoked', u.access_revoked
             )
             ORDER BY CASE pm.role WHEN 'owner' THEN 1 WHEN 'manager' THEN 2 WHEN 'editor' THEN 3 ELSE 4 END, u.name
           ) FILTER (WHERE u.id IS NOT NULL),
           '[]'::json
         ) AS members
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id IN (SELECT id FROM accessible_projects)
       GROUP BY pm.project_id
     ),
     project_rows AS (
       SELECT
         ap.id,
         ap.name,
         ap.location,
         ap.description,
         ap.project_status,
         ap.start_date,
         ap.end_date,
         ap.created_at,
         ap.updated_at,
         ap.role,
         coalesce(ts.task_count, 0) AS task_count,
         coalesce(ts.average_progress, 0) AS average_progress,
         coalesce(ts.not_started_task_count, 0) AS not_started_task_count,
         coalesce(ts.in_progress_task_count, 0) AS in_progress_task_count,
         coalesce(ts.blocked_task_count, 0) AS blocked_task_count,
         coalesce(ts.complete_task_count, 0) AS complete_task_count,
         coalesce(ts.pm_summary, '') AS pm_summary,
         coalesce(ms.member_count, 0) AS member_count,
         coalesce(ms.members, '[]'::json) AS members,
         CASE
           WHEN coalesce(ts.blocked_task_count, 0) > 0 THEN 'blocked'
           WHEN coalesce(ts.task_count, 0) = 0 THEN 'not_started'
           WHEN coalesce(ts.complete_task_count, 0) = coalesce(ts.task_count, 0) THEN 'complete'
           WHEN coalesce(ts.in_progress_task_count, 0) > 0 OR coalesce(ts.average_progress, 0) > 0 THEN 'in_progress'
           ELSE 'not_started'
         END AS schedule_status
       FROM accessible_projects ap
       LEFT JOIN task_stats ts ON ts.project_id = ap.id
       LEFT JOIN member_stats ms ON ms.project_id = ap.id
     )
     SELECT
       project_rows.*,
       CASE
         WHEN project_status = 'archived' THEN 'archived'
         WHEN project_status = 'completed' THEN 'completed'
         ELSE schedule_status
       END AS status
     FROM project_rows
     ORDER BY updated_at DESC`,
    [req.user.id]
  );

  res.json({ projects: result.rows });
}));


app.get('/api/site/users', requireAuth, asyncHandler(async (req, res) => {
  requireSiteManagement(req.user);

  const result = await query(
    `WITH member_projects AS (
       SELECT
         pm.user_id,
         count(*)::int AS project_count,
         coalesce(
           json_agg(
             json_build_object(
               'id', p.id,
               'name', p.name,
               'location', p.location,
               'project_status', p.project_status,
               'role', pm.role,
               'start_date', to_char(p.start_date, 'YYYY-MM-DD'),
               'end_date', to_char(p.end_date, 'YYYY-MM-DD')
             )
             ORDER BY p.name
           ) FILTER (WHERE p.id IS NOT NULL),
           '[]'::json
         ) AS projects
       FROM project_members pm
       JOIN projects p ON p.id = pm.project_id
       GROUP BY pm.user_id
     )
     SELECT
       u.id,
       u.name,
       u.email,
       u.trade,
       u.site_role,
       u.access_revoked,
       u.created_at,
       u.updated_at,
       coalesce(mp.project_count, 0) AS project_count,
       coalesce(mp.projects, '[]'::json) AS projects
     FROM users u
     LEFT JOIN member_projects mp ON mp.user_id = u.id
     ORDER BY u.access_revoked ASC,
       CASE u.site_role WHEN 'owner' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END,
       u.name ASC`
  );

  res.json({ users: result.rows });
}));

app.patch('/api/site/users/:userId', requireAuth, asyncHandler(async (req, res) => {
  const targetUserId = parseId(req.params.userId, 'userId');
  const actorRole = requireSiteManagement(req.user);

  const updatedUser = await tx(async (client) => {
    const targetResult = await client.query(
      'SELECT id, name, email, trade, site_role, access_revoked FROM users WHERE id = $1',
      [targetUserId]
    );
    if (!targetResult.rowCount) throw httpError(404, 'User not found.');
    const targetUser = targetResult.rows[0];

    let nextRole;
    if (req.body.site_role !== undefined || req.body.role !== undefined) {
      nextRole = requireEnum(req.body.site_role ?? req.body.role, siteRoles, 'site_role');
    }
    let nextRevoked;
    if (req.body.access_revoked !== undefined || req.body.revoked !== undefined) {
      nextRevoked = normalizeBoolean(req.body.access_revoked ?? req.body.revoked, targetUser.access_revoked);
    }

    ensureSiteActorCanManageTarget(actorRole, targetUser, nextRole);
    if (targetUserId === req.user.id && nextRevoked === true) {
      throw httpError(400, 'You cannot revoke your own access.');
    }
    if (targetUserId === req.user.id && nextRole && nextRole !== targetUser.site_role) {
      throw httpError(400, 'Ask another site owner to change your own site role.');
    }

    let passwordHash = null;
    if (req.body.password !== undefined || req.body.new_password !== undefined) {
      const password = String(req.body.password ?? req.body.new_password ?? '');
      if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters.');
      passwordHash = await bcrypt.hash(password, 12);
    }

    await ensureLastSiteOwnerSafe(client, targetUserId, {
      nextRole: nextRole === undefined ? targetUser.site_role : nextRole,
      nextRevoked: nextRevoked === undefined ? targetUser.access_revoked : nextRevoked
    });
    if (nextRevoked === true && targetUser.access_revoked === false) {
      await ensureNotLastProjectOwner(client, targetUserId);
    }

    const values = [];
    const sets = [];
    if (nextRole !== undefined) {
      values.push(nextRole);
      sets.push(`site_role = $${values.length}`);
    }
    if (nextRevoked !== undefined) {
      values.push(nextRevoked);
      sets.push(`access_revoked = $${values.length}`);
    }
    if (passwordHash) {
      values.push(passwordHash);
      sets.push(`password_hash = $${values.length}`);
    }
    if (!sets.length) return targetUser;

    values.push(targetUserId);
    const updateResult = await client.query(
      `UPDATE users
       SET ${sets.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, name, email, trade, site_role, access_revoked, created_at, updated_at`,
      values
    );

    await writeAudit(client, {
      userId: req.user.id,
      action: 'site_user_updated',
      entityType: 'site_user',
      entityId: targetUserId,
      before: targetUser,
      after: updateResult.rows[0]
    });

    return updateResult.rows[0];
  });

  res.json({ user: updatedUser });
}));

app.delete('/api/site/users/:userId', requireAuth, asyncHandler(async (req, res) => {
  const targetUserId = parseId(req.params.userId, 'userId');
  const actorRole = requireSiteManagement(req.user);

  await tx(async (client) => {
    const targetResult = await client.query(
      'SELECT id, name, email, trade, site_role, access_revoked FROM users WHERE id = $1',
      [targetUserId]
    );
    if (!targetResult.rowCount) throw httpError(404, 'User not found.');
    const targetUser = targetResult.rows[0];

    if (targetUserId === req.user.id) throw httpError(400, 'You cannot delete your own user account.');
    ensureSiteActorCanManageTarget(actorRole, targetUser);
    await ensureLastSiteOwnerSafe(client, targetUserId, { deleting: true });
    await ensureNotLastProjectOwner(client, targetUserId);

    await writeAudit(client, {
      userId: req.user.id,
      action: 'site_user_deleted',
      entityType: 'site_user',
      entityId: targetUserId,
      before: targetUser
    });
    await client.query('DELETE FROM users WHERE id = $1', [targetUserId]);
  });

  res.status(204).send();
}));

app.post('/api/projects', requireAuth, asyncHandler(async (req, res) => {
  const name = requireText(req.body.name, 'Project name');
  const location = cleanText(req.body.location);
  const description = cleanText(req.body.description);
  const startDate = normalizeDate(req.body.start_date, 'start_date');
  const endDate = normalizeDate(req.body.end_date, 'end_date');
  ensureDateOrder(startDate, endDate);

  const project = await tx(async (client) => {
    const result = await client.query(
      `INSERT INTO projects (name, location, description, start_date, end_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, location, description, notes, project_status, to_char(start_date, 'YYYY-MM-DD') AS start_date,
         to_char(end_date, 'YYYY-MM-DD') AS end_date, created_by, created_at, updated_at`,
      [name, location, description, startDate, endDate, req.user.id]
    );

    const inserted = result.rows[0];
    await client.query('INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)', [
      inserted.id,
      req.user.id,
      'owner'
    ]);
    await ensureProjectChecklist(client, inserted.id);

    await writeAudit(client, {
      projectId: inserted.id,
      userId: req.user.id,
      action: 'created',
      entityType: 'project',
      entityId: inserted.id,
      after: inserted
    });

    return { ...inserted, role: 'owner', task_count: 0, average_progress: 0, member_count: 1, members: [{ user_id: req.user.id, name: req.user.name, email: req.user.email, role: 'owner' }] };
  });

  emitProjectChange(project.id, { actorId: req.user.id, message: 'Project created.' });
  res.status(201).json({ project });
}));

app.get('/api/projects/:projectId', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');
  const payload = await loadProjectPayload(projectId, req.user.id);
  res.json(payload);
}));

app.patch('/api/projects/:projectId', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');

  const updatedProject = await tx(async (client) => {
    await requireProjectMembership(projectId, req.user.id, 'manager', client);

    const beforeResult = await client.query(
      `SELECT id, name, location, description, notes, project_status, to_char(start_date, 'YYYY-MM-DD') AS start_date,
        to_char(end_date, 'YYYY-MM-DD') AS end_date, created_by, created_at, updated_at
       FROM projects WHERE id = $1`,
      [projectId]
    );
    if (!beforeResult.rowCount) throw httpError(404, 'Project not found.');
    const before = beforeResult.rows[0];

    const values = [];
    const sets = [];
    const nextStart = req.body.start_date !== undefined ? normalizeDate(req.body.start_date, 'start_date') : before.start_date;
    const nextEnd = req.body.end_date !== undefined ? normalizeDate(req.body.end_date, 'end_date') : before.end_date;
    ensureDateOrder(nextStart, nextEnd);

    if (req.body.name !== undefined) {
      values.push(requireText(req.body.name, 'Project name'));
      sets.push(`name = $${values.length}`);
    }
    if (req.body.location !== undefined) {
      values.push(cleanText(req.body.location));
      sets.push(`location = $${values.length}`);
    }
    if (req.body.description !== undefined) {
      values.push(cleanText(req.body.description));
      sets.push(`description = $${values.length}`);
    }
    if (req.body.project_status !== undefined || req.body.lifecycle_status !== undefined) {
      const requestedStatus = req.body.project_status !== undefined ? req.body.project_status : req.body.lifecycle_status;
      const nextStatus = requireEnum(requestedStatus, projectLifecycleStatuses, 'project_status');
      values.push(nextStatus);
      sets.push(`project_status = $${values.length}`);
      if (nextStatus === 'completed') {
        sets.push('completed_at = COALESCE(completed_at, now())');
        sets.push('archived_at = NULL');
      } else if (nextStatus === 'active') {
        sets.push('completed_at = NULL');
        sets.push('archived_at = NULL');
      } else if (nextStatus === 'archived') {
        sets.push('archived_at = COALESCE(archived_at, now())');
      }
    }
    if (req.body.start_date !== undefined) {
      values.push(nextStart);
      sets.push(`start_date = $${values.length}`);
    }
    if (req.body.end_date !== undefined) {
      values.push(nextEnd);
      sets.push(`end_date = $${values.length}`);
    }

    if (!sets.length) return before;

    values.push(projectId);
    const updateResult = await client.query(
      `UPDATE projects
       SET ${sets.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, name, location, description, notes, project_status, to_char(start_date, 'YYYY-MM-DD') AS start_date,
         to_char(end_date, 'YYYY-MM-DD') AS end_date, created_by, created_at, updated_at`,
      values
    );

    const after = updateResult.rows[0];
    await writeAudit(client, {
      projectId,
      userId: req.user.id,
      action: 'updated',
      entityType: 'project',
      entityId: projectId,
      before,
      after
    });

    return after;
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: 'Project details updated.' });
  res.json({ project: updatedProject });
}));


async function createProjectNote(client, projectId, userId, body) {
  await requireProjectMembership(projectId, userId, 'viewer', client);
  const payload = body || {};
  const noteBody = normalizeProjectNoteBody(payload.notes ?? payload.body ?? payload.text);
  const result = await client.query(
    `INSERT INTO project_note_entries (project_id, body, created_by, updated_by)
     VALUES ($1, $2, $3, $3)
     RETURNING id, project_id, body, created_by, updated_by, created_at, updated_at`,
    [projectId, noteBody, userId]
  );
  await client.query('UPDATE projects SET updated_at = now() WHERE id = $1', [projectId]);
  await writeAudit(client, {
    projectId,
    userId,
    action: 'project_note_created',
    entityType: 'project_note',
    entityId: result.rows[0].id,
    after: result.rows[0]
  });
  return result.rows[0];
}

app.post('/api/projects/:projectId/notes', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');
  const note = await tx(async (client) => createProjectNote(client, projectId, req.user.id, req.body));
  emitProjectChange(projectId, { actorId: req.user.id, message: 'Project note added.' });
  res.status(201).json({ note });
}));

app.patch('/api/projects/:projectId/notes', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');
  const note = await tx(async (client) => createProjectNote(client, projectId, req.user.id, req.body));
  emitProjectChange(projectId, { actorId: req.user.id, message: 'Project note added.' });
  res.status(201).json({ note });
}));

app.patch('/api/projects/:projectId/notes/:noteId', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');
  const noteId = parseId(req.params.noteId, 'noteId');
  const payload = req.body || {};
  const body = normalizeProjectNoteBody(payload.body ?? payload.notes ?? payload.text);

  const updated = await tx(async (client) => {
    await requireProjectMembership(projectId, req.user.id, 'viewer', client);
    const before = await client.query('SELECT * FROM project_note_entries WHERE id = $1 AND project_id = $2', [noteId, projectId]);
    if (!before.rowCount) throw httpError(404, 'Project note not found.');
    const result = await client.query(
      `UPDATE project_note_entries
       SET body = $1, updated_by = $2, updated_at = now()
       WHERE id = $3 AND project_id = $4
       RETURNING id, project_id, body, created_by, updated_by, created_at, updated_at`,
      [body, req.user.id, noteId, projectId]
    );
    await client.query('UPDATE projects SET updated_at = now() WHERE id = $1', [projectId]);
    await writeAudit(client, {
      projectId,
      userId: req.user.id,
      action: 'project_note_updated',
      entityType: 'project_note',
      entityId: noteId,
      before: before.rows[0],
      after: result.rows[0]
    });
    return result.rows[0];
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: 'Project note updated.' });
  res.json({ note: updated });
}));

app.delete('/api/projects/:projectId/notes/:noteId', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');
  const noteId = parseId(req.params.noteId, 'noteId');

  await tx(async (client) => {
    await requireProjectMembership(projectId, req.user.id, 'viewer', client);
    const before = await client.query('SELECT * FROM project_note_entries WHERE id = $1 AND project_id = $2', [noteId, projectId]);
    if (!before.rowCount) throw httpError(404, 'Project note not found.');
    await client.query('DELETE FROM project_note_entries WHERE id = $1 AND project_id = $2', [noteId, projectId]);
    await client.query('UPDATE projects SET updated_at = now() WHERE id = $1', [projectId]);
    await writeAudit(client, {
      projectId,
      userId: req.user.id,
      action: 'project_note_deleted',
      entityType: 'project_note',
      entityId: noteId,
      before: before.rows[0]
    });
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: 'Project note deleted.' });
  res.status(204).send();
}));

app.delete('/api/projects/:projectId', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');
  requireSiteOwner(req.user);

  await tx(async (client) => {
    const beforeResult = await client.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!beforeResult.rowCount) throw httpError(404, 'Project not found.');
    await writeAudit(client, {
      projectId,
      userId: req.user.id,
      action: 'deleted',
      entityType: 'project',
      entityId: projectId,
      before: beforeResult.rows[0]
    });
    await client.query('DELETE FROM projects WHERE id = $1', [projectId]);
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: 'Project deleted.' });
  res.status(204).send();
}));

app.post('/api/projects/:projectId/members', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');
  const email = normalizeEmail(req.body.email);
  const role = requireEnum(req.body.role || 'editor', roles, 'role');

  const created = await tx(async (client) => {
    const membership = await requireProjectMembership(projectId, req.user.id, 'manager', client);
    if (role === 'owner' && membership.role !== 'owner') {
      throw httpError(403, 'Only project owners can add another owner.');
    }

    const userResult = await client.query('SELECT id, name, email, access_revoked FROM users WHERE email = $1', [email]);
    if (!userResult.rowCount) {
      throw httpError(404, 'That user has not registered yet. Ask them to create an account first, then add them again.');
    }
    const user = userResult.rows[0];
    if (user.access_revoked) {
      throw httpError(400, 'That user is currently revoked at the site level. Restore site access before assigning them to a project.');
    }

    const beforeMember = await client.query('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, user.id]);
    const action = beforeMember.rowCount ? 'member_updated' : 'member_added';

    await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [projectId, user.id, role]
    );

    const row = { project_id: projectId, user_id: user.id, role, name: user.name, email: user.email, access_revoked: false };

    await writeAudit(client, {
      projectId,
      userId: req.user.id,
      action,
      entityType: 'project_member',
      entityId: user.id,
      before: beforeMember.rows[0] || null,
      after: row
    });

    return { member: row };
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: 'Project member updated.' });
  res.status(201).json({ member: created.member });
}));

app.patch('/api/projects/:projectId/members/:userId', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');
  const targetUserId = parseId(req.params.userId, 'userId');
  const role = requireEnum(req.body.role, roles, 'role');

  const updated = await tx(async (client) => {
    await requireProjectMembership(projectId, req.user.id, 'manager', client);

    const before = await client.query('SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2', [
      projectId,
      targetUserId
    ]);
    if (!before.rowCount) throw httpError(404, 'Project member not found.');

    const targetResult = await client.query('SELECT id, name, email, access_revoked FROM users WHERE id = $1', [targetUserId]);
    if (!targetResult.rowCount) throw httpError(404, 'User not found.');
    const targetUser = targetResult.rows[0];

    if (before.rows[0].role === 'owner' && role !== 'owner') {
      const ownerCount = await client.query(
        "SELECT count(*)::int AS count FROM project_members WHERE project_id = $1 AND role = 'owner'",
        [projectId]
      );
      if (ownerCount.rows[0].count <= 1) throw httpError(400, 'A project must keep at least one owner.');
    }

    const result = await client.query(
      `UPDATE project_members SET role = $1 WHERE project_id = $2 AND user_id = $3
       RETURNING project_id, user_id, role, created_at`,
      [role, projectId, targetUserId]
    );

    const row = { ...result.rows[0], name: targetUser.name, email: targetUser.email, access_revoked: targetUser.access_revoked };

    await writeAudit(client, {
      projectId,
      userId: req.user.id,
      action: 'member_role_updated',
      entityType: 'project_member',
      entityId: targetUserId,
      before: before.rows[0],
      after: row
    });

    return { member: row };
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: 'Project member role changed.' });
  res.json({ member: updated.member });
}));

app.delete('/api/projects/:projectId/members/:userId', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');
  const targetUserId = parseId(req.params.userId, 'userId');

  await tx(async (client) => {
    await requireProjectMembership(projectId, req.user.id, 'manager', client);
    const before = await client.query('SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2', [
      projectId,
      targetUserId
    ]);
    if (!before.rowCount) throw httpError(404, 'Project member not found.');

    if (before.rows[0].role === 'owner') {
      const ownerCount = await client.query(
        "SELECT count(*)::int AS count FROM project_members WHERE project_id = $1 AND role = 'owner'",
        [projectId]
      );
      if (ownerCount.rows[0].count <= 1) throw httpError(400, 'A project must keep at least one owner.');
    }

    await client.query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, targetUserId]);
    await writeAudit(client, {
      projectId,
      userId: req.user.id,
      action: 'member_removed',
      entityType: 'project_member',
      entityId: targetUserId,
      before: before.rows[0]
    });
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: 'Project member removed.' });
  res.status(204).send();
}));




app.patch('/api/projects/:projectId/checklist/:itemKey', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');
  const itemKey = requireText(req.params.itemKey, 'Checklist item key');
  const isChecked = normalizeBoolean(req.body.is_checked ?? req.body.checked, false);

  const item = await tx(async (client) => {
    await requireProjectMembership(projectId, req.user.id, 'editor', client);
    await ensureProjectChecklist(client, projectId);

    const before = await client.query(
      'SELECT * FROM project_checklist_items WHERE project_id = $1 AND item_key = $2',
      [projectId, itemKey]
    );
    if (!before.rowCount) throw httpError(404, 'Checklist item not found.');

    const result = await client.query(
      `UPDATE project_checklist_items
       SET is_checked = $1, updated_by = $2
       WHERE project_id = $3 AND item_key = $4
       RETURNING id, project_id, item_key, label, is_checked, sort_order, updated_by, updated_at`,
      [isChecked, req.user.id, projectId, itemKey]
    );

    await writeAudit(client, {
      projectId,
      userId: req.user.id,
      action: 'checklist_updated',
      entityType: 'project_checklist_item',
      entityId: result.rows[0].id,
      before: before.rows[0],
      after: result.rows[0]
    });

    return result.rows[0];
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: `Checklist updated: ${item.label}` });
  res.json({ item });
}));

app.get('/api/projects/:projectId/blueprints', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');
  await requireProjectAccess(projectId, req.user.id);
  res.json({ blueprints: await loadProjectBlueprints(projectId) });
}));

app.post('/api/projects/:projectId/blueprints', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');
  await requireProjectMembership(projectId, req.user.id, 'editor');
  await runBlueprintUpload(req, res);

  if (!req.file) throw httpError(400, 'Drag in or choose a blueprint file to upload.');
  const originalName = safeDownloadName(req.file.originalname);
  const mimeType = req.file.mimetype || 'application/octet-stream';

  const blueprint = await tx(async (client) => {
    await requireProjectMembership(projectId, req.user.id, 'editor', client);
    const columns = await getBlueprintColumnInfo(client);
    const insertColumns = ['project_id'];
    const values = [projectId];
    const placeholders = ['$1'];

    function pushColumn(columnName, value) {
      insertColumns.push(columnName);
      values.push(value);
      placeholders.push(`$${values.length}`);
    }

    if (columns.hasOriginalName) pushColumn('original_name', originalName);
    if (columns.hasFileName) pushColumn('file_name', originalName);
    pushColumn('mime_type', mimeType);
    if (columns.hasSizeBytes) pushColumn('size_bytes', req.file.size);
    if (columns.hasFileSize) pushColumn('file_size', req.file.size);
    pushColumn('file_data', req.file.buffer);
    pushColumn('uploaded_by', req.user.id);

    const result = await client.query(
      `INSERT INTO project_blueprints (${insertColumns.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING *`,
      values
    );

    const row = result.rows[0];
    const normalized = {
      ...row,
      original_name: row.original_name || row.file_name || originalName,
      size_bytes: row.size_bytes || row.file_size || req.file.size,
      uploaded_by_name: req.user.name
    };

    await writeAudit(client, {
      projectId,
      userId: req.user.id,
      action: 'blueprint_uploaded',
      entityType: 'project_blueprint',
      entityId: row.id,
      after: { ...normalized, file_data: undefined }
    });

    return normalized;
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: `Blueprint uploaded: ${blueprint.original_name}` });
  res.status(201).json({ blueprint });
}));

app.get('/api/blueprints/:blueprintId/download', requireAuth, asyncHandler(async (req, res) => {
  const blueprintId = parseId(req.params.blueprintId, 'blueprintId');
  const result = await query(
    `SELECT id, project_id, original_name, mime_type, size_bytes, file_data
     FROM project_blueprints
     WHERE id = $1`,
    [blueprintId]
  );
  if (!result.rowCount) throw httpError(404, 'Blueprint not found.');
  const blueprint = result.rows[0];
  await requireProjectAccess(blueprint.project_id, req.user.id);

  const fileName = safeDownloadName(blueprint.original_name);
  res.setHeader('Content-Type', blueprint.mime_type || 'application/octet-stream');
  res.setHeader('Content-Length', String(blueprint.size_bytes));
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  res.send(blueprint.file_data);
}));

app.delete('/api/blueprints/:blueprintId', requireAuth, asyncHandler(async (req, res) => {
  const blueprintId = parseId(req.params.blueprintId, 'blueprintId');
  let projectId;

  await tx(async (client) => {
    const before = await client.query(
      `SELECT id, project_id, original_name, mime_type, size_bytes, uploaded_by, created_at
       FROM project_blueprints WHERE id = $1`,
      [blueprintId]
    );
    if (!before.rowCount) throw httpError(404, 'Blueprint not found.');
    projectId = before.rows[0].project_id;
    await requireProjectMembership(projectId, req.user.id, 'editor', client);

    await client.query('DELETE FROM project_blueprints WHERE id = $1', [blueprintId]);
    await writeAudit(client, {
      projectId,
      userId: req.user.id,
      action: 'blueprint_deleted',
      entityType: 'project_blueprint',
      entityId: blueprintId,
      before: before.rows[0]
    });
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: 'Blueprint deleted.' });
  res.status(204).send();
}));

app.post('/api/projects/:projectId/tasks', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');
  const input = buildTaskInput(req.body, false);
  ensureDateOrder(input.start_date, input.end_date);

  const task = await tx(async (client) => {
    await requireProjectMembership(projectId, req.user.id, 'editor', client);
    await verifyAssignee(client, projectId, input.assigned_to);
    await verifyParentTask(client, projectId, input.parent_task_id);

    let sortOrder = input.sort_order;
    if (!sortOrder) {
      const maxResult = await client.query('SELECT coalesce(max(sort_order), 0)::int + 1 AS next_order FROM tasks WHERE project_id = $1', [
        projectId
      ]);
      sortOrder = maxResult.rows[0].next_order;
    }

    const insertResult = await client.query(
      `INSERT INTO tasks
        (project_id, parent_task_id, name, description, trade, vendor, vendor_secondary, security_team_member, pm, assigned_to, assignee_secondary, assignee_tertiary, assignee_quaternary, status, priority, start_date, end_date,
         percent_complete, color, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING id`,
      [
        projectId,
        input.parent_task_id ?? null,
        input.name,
        input.description,
        input.trade,
        input.vendor,
        input.vendor_secondary,
        input.security_team_member,
        input.pm,
        input.assigned_to ?? null,
        input.assignee_secondary ?? null,
        input.assignee_tertiary ?? null,
        input.assignee_quaternary ?? null,
        input.status,
        input.priority,
        input.start_date,
        input.end_date,
        input.percent_complete,
        input.color,
        sortOrder,
        req.user.id
      ]
    );

    const inserted = await selectTaskById(client, insertResult.rows[0].id);
    await writeAudit(client, {
      projectId,
      taskId: inserted.id,
      userId: req.user.id,
      action: 'created',
      entityType: 'task',
      entityId: inserted.id,
      after: inserted
    });

    return inserted;
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: `Task created: ${task.name}` });
  res.status(201).json({ task });
}));

app.patch('/api/tasks/:taskId', requireAuth, asyncHandler(async (req, res) => {
  const taskId = parseId(req.params.taskId, 'taskId');
  const input = buildTaskInput(req.body, true);

  const updatedTask = await tx(async (client) => {
    const before = await selectTaskById(client, taskId);
    if (!before) throw httpError(404, 'Task not found.');
    await requireProjectMembership(before.project_id, req.user.id, 'editor', client);

    const nextStart = input.start_date !== undefined ? input.start_date : before.start_date;
    const nextEnd = input.end_date !== undefined ? input.end_date : before.end_date;
    ensureDateOrder(nextStart, nextEnd);

    await verifyAssignee(client, before.project_id, input.assigned_to);
    await verifyParentTask(client, before.project_id, input.parent_task_id, taskId);

    const values = [];
    const sets = [];
    for (const [column, value] of Object.entries(input)) {
      if (value === undefined) continue;
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    }

    if (!sets.length) return before;

    values.push(taskId);
    await client.query(`UPDATE tasks SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
    const after = await selectTaskById(client, taskId);

    await writeAudit(client, {
      projectId: before.project_id,
      taskId,
      userId: req.user.id,
      action: 'updated',
      entityType: 'task',
      entityId: taskId,
      before,
      after
    });

    return after;
  });

  emitProjectChange(updatedTask.project_id, { actorId: req.user.id, message: `Task updated: ${updatedTask.name}` });
  res.json({ task: updatedTask });
}));

app.delete('/api/tasks/:taskId', requireAuth, asyncHandler(async (req, res) => {
  const taskId = parseId(req.params.taskId, 'taskId');
  let projectId;

  await tx(async (client) => {
    const before = await selectTaskById(client, taskId);
    if (!before) throw httpError(404, 'Task not found.');
    projectId = before.project_id;
    await requireProjectMembership(projectId, req.user.id, 'editor', client);

    await writeAudit(client, {
      projectId,
      taskId,
      userId: req.user.id,
      action: 'deleted',
      entityType: 'task',
      entityId: taskId,
      before
    });
    await client.query('DELETE FROM tasks WHERE id = $1', [taskId]);
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: 'Task deleted.' });
  res.status(204).send();
}));

app.post('/api/projects/:projectId/dependencies', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');
  const predecessorTaskId = parseId(req.body.predecessor_task_id, 'predecessor_task_id');
  const successorTaskId = parseId(req.body.successor_task_id, 'successor_task_id');
  const type = requireEnum(req.body.type || 'FS', dependencyTypes, 'type');
  const lagDays = Number(req.body.lag_days || 0);
  if (!Number.isInteger(lagDays)) throw httpError(400, 'lag_days must be an integer.');
  if (predecessorTaskId === successorTaskId) throw httpError(400, 'A task cannot depend on itself.');

  const dependency = await tx(async (client) => {
    await requireProjectMembership(projectId, req.user.id, 'editor', client);

    const tasks = await client.query('SELECT id FROM tasks WHERE project_id = $1 AND id = ANY($2::int[])', [
      projectId,
      [predecessorTaskId, successorTaskId]
    ]);
    if (tasks.rowCount !== 2) throw httpError(400, 'Both dependency tasks must belong to the project.');

    if (await wouldCreateCycle(client, projectId, predecessorTaskId, successorTaskId)) {
      throw httpError(409, 'That dependency would create a schedule cycle.');
    }

    const insertResult = await client.query(
      `INSERT INTO task_dependencies (project_id, predecessor_task_id, successor_task_id, type, lag_days)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [projectId, predecessorTaskId, successorTaskId, type, lagDays]
    );

    if (!insertResult.rowCount) throw httpError(409, 'That dependency already exists.');
    const row = insertResult.rows[0];
    await writeAudit(client, {
      projectId,
      userId: req.user.id,
      action: 'dependency_created',
      entityType: 'task_dependency',
      entityId: row.id,
      after: row
    });

    return row;
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: 'Task dependency updated.' });
  res.status(201).json({ dependency });
}));

app.delete('/api/dependencies/:dependencyId', requireAuth, asyncHandler(async (req, res) => {
  const dependencyId = parseId(req.params.dependencyId, 'dependencyId');
  let projectId;

  await tx(async (client) => {
    const before = await client.query('SELECT * FROM task_dependencies WHERE id = $1', [dependencyId]);
    if (!before.rowCount) throw httpError(404, 'Dependency not found.');
    projectId = before.rows[0].project_id;
    await requireProjectMembership(projectId, req.user.id, 'editor', client);
    await client.query('DELETE FROM task_dependencies WHERE id = $1', [dependencyId]);
    await writeAudit(client, {
      projectId,
      userId: req.user.id,
      action: 'dependency_deleted',
      entityType: 'task_dependency',
      entityId: dependencyId,
      before: before.rows[0]
    });
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: 'Task dependency removed.' });
  res.status(204).send();
}));

app.get('/api/tasks/:taskId/comments', requireAuth, asyncHandler(async (req, res) => {
  const taskId = parseId(req.params.taskId, 'taskId');
  const task = await selectTaskById({ query }, taskId);
  if (!task) throw httpError(404, 'Task not found.');
  await requireProjectAccess(task.project_id, req.user.id);

  const result = await query(
    `SELECT c.id, c.task_id, c.user_id, c.body, c.created_at, u.name AS user_name
     FROM task_comments c
     LEFT JOIN users u ON u.id = c.user_id
     WHERE c.task_id = $1
     ORDER BY c.created_at DESC`,
    [taskId]
  );
  res.json({ comments: result.rows });
}));

app.post('/api/tasks/:taskId/comments', requireAuth, asyncHandler(async (req, res) => {
  const taskId = parseId(req.params.taskId, 'taskId');
  const body = requireText(req.body.body, 'Comment');

  const comment = await tx(async (client) => {
    const task = await selectTaskById(client, taskId);
    if (!task) throw httpError(404, 'Task not found.');
    await requireProjectMembership(task.project_id, req.user.id, 'viewer', client);

    const result = await client.query(
      `INSERT INTO task_comments (task_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, task_id, user_id, body, created_at`,
      [taskId, req.user.id, body]
    );

    await writeAudit(client, {
      projectId: task.project_id,
      taskId,
      userId: req.user.id,
      action: 'commented',
      entityType: 'task_comment',
      entityId: result.rows[0].id,
      after: result.rows[0]
    });

    return { ...result.rows[0], user_name: req.user.name };
  });

  const task = await selectTaskById({ query }, taskId);
  emitProjectChange(task.project_id, { actorId: req.user.id, message: 'Task comment added.' });
  res.status(201).json({ comment });
}));

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) throw httpError(401, 'Socket authentication token required.');
    const payload = jwt.verify(token, JWT_SECRET);
    const result = await query('SELECT id, name, email, trade, site_role, access_revoked FROM users WHERE id = $1', [payload.sub]);
    if (!result.rowCount) throw httpError(401, 'Socket user not found.');
    if (result.rows[0].access_revoked) throw httpError(403, 'Socket user access has been revoked.');
    socket.user = result.rows[0];
    next();
  } catch (error) {
    next(error);
  }
});

io.on('connection', (socket) => {
  socket.on('joinProject', async (projectId, callback) => {
    try {
      const id = parseId(projectId, 'projectId');
      const access = await requireProjectAccess(id, socket.user.id);
      socket.join(`project:${id}`);
      if (callback) callback({ ok: true, role: access.role });
    } catch (error) {
      if (callback) callback({ ok: false, error: error.message });
    }
  });

  socket.on('leaveProject', (projectId) => {
    try {
      const id = parseId(projectId, 'projectId');
      socket.leave(`project:${id}`);
    } catch (error) {
      // Ignore malformed leave events.
    }
  });
});


const clientDistPath = path.resolve(__dirname, '..', '..', 'client', 'dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');
if (fs.existsSync(clientIndexPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      next();
      return;
    }
    res.sendFile(clientIndexPath, (error) => {
      if (error) next(error);
    });
  });
}
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

app.use((error, req, res, next) => {
  const status = error.status || 500;
  if (status >= 500) {
    console.error(error);
  }
  res.status(status).json({
    error: error.message || 'Server error.'
  });
});

server.listen(PORT, () => {
  console.log(`PSG and SS Tracking server listening on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});
