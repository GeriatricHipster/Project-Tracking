require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
const nodemailer = require('nodemailer');
const { Server } = require('socket.io');
const { pool, query, tx } = require('./db');

const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'local-development-secret-change-me';
const APP_NAME = process.env.APP_NAME || 'BuildTrack Cloud';
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
const projectLifecycleStatuses = new Set(['active', 'completed']);
const priorities = new Set(['low', 'normal', 'high', 'critical']);
const roles = new Set(['owner', 'manager', 'editor', 'viewer']);
const dependencyTypes = new Set(['FS', 'SS', 'FF', 'SF']);

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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function emailProvider() {
  const configured = String(process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
  if (configured === 'graph' || configured === 'microsoft_graph') return 'graph';
  if (configured === 'smtp' || configured === 'outlook_smtp') return 'smtp';

  if (
    process.env.MICROSOFT_TENANT_ID &&
    process.env.MICROSOFT_CLIENT_ID &&
    process.env.MICROSOFT_CLIENT_SECRET &&
    (process.env.OUTLOOK_FROM_EMAIL || process.env.MICROSOFT_FROM_EMAIL)
  ) {
    return 'graph';
  }

  if (process.env.OUTLOOK_SMTP_USER && process.env.OUTLOOK_SMTP_PASS) return 'smtp';
  return 'none';
}

function getAppBaseUrl(req) {
  const configured = cleanText(process.env.APP_URL || process.env.PUBLIC_APP_URL);
  if (configured) return configured.replace(/\/$/, '');

  const origin = cleanText(req.get('origin'));
  if (origin && origin !== 'null') return origin.replace(/\/$/, '');

  const host = req.get('host');
  if (!host) return '';
  return `${req.protocol}://${host}`.replace(/\/$/, '');
}

function buildInvitationMessage({ recipient, sender, project, role, projectUrl }) {
  const subject = `${APP_NAME}: ${sender.name} invited you to ${project.name}`;
  const locationLine = project.location ? `Location: ${project.location}` : 'Location: Not listed';
  const dateLine = `Schedule: ${project.start_date} to ${project.end_date}`;
  const text = [
    `Hello ${recipient.name},`,
    '',
    `${sender.name} has added you to the project "${project.name}" in ${APP_NAME}.`,
    `Your role: ${role}`,
    locationLine,
    dateLine,
    '',
    `Open the project: ${projectUrl}`,
    '',
    'If you have not created your BuildTrack Cloud account yet, register with this same email address first, then open the link again.'
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5; max-width: 640px;">
      <h2 style="margin: 0 0 12px;">You have been invited to a project</h2>
      <p>Hello ${escapeHtml(recipient.name)},</p>
      <p><strong>${escapeHtml(sender.name)}</strong> has added you to <strong>${escapeHtml(project.name)}</strong> in ${escapeHtml(APP_NAME)}.</p>
      <table style="border-collapse: collapse; margin: 16px 0; width: 100%;">
        <tr><td style="padding: 6px 0; font-weight: bold;">Role</td><td style="padding: 6px 0;">${escapeHtml(role)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Location</td><td style="padding: 6px 0;">${escapeHtml(project.location || 'Not listed')}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold;">Schedule</td><td style="padding: 6px 0;">${escapeHtml(project.start_date)} to ${escapeHtml(project.end_date)}</td></tr>
      </table>
      <p><a href="${escapeHtml(projectUrl)}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 10px 14px; border-radius: 10px; font-weight: bold;">Open project</a></p>
      <p style="color: #6b7280; font-size: 13px;">If you have not created your account yet, register with this same email address first, then open the link again.</p>
    </div>`;

  return { subject, text, html };
}

async function getMicrosoftGraphAccessToken() {
  const tenantId = cleanText(process.env.MICROSOFT_TENANT_ID);
  const clientId = cleanText(process.env.MICROSOFT_CLIENT_ID);
  const clientSecret = cleanText(process.env.MICROSOFT_CLIENT_SECRET);
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Microsoft Graph email is missing MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, or MICROSOFT_CLIENT_SECRET.');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Microsoft Graph token request failed: ${message.slice(0, 240)}`);
  }

  const payload = await response.json();
  if (!payload.access_token) throw new Error('Microsoft Graph did not return an access token.');
  return payload.access_token;
}

async function sendViaMicrosoftGraph({ to, subject, text, html }) {
  const from = cleanText(process.env.OUTLOOK_FROM_EMAIL || process.env.MICROSOFT_FROM_EMAIL);
  if (!from) throw new Error('Microsoft Graph email is missing OUTLOOK_FROM_EMAIL.');

  const token = await getMicrosoftGraphAccessToken();
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: html || escapeHtml(text).replace(/\n/g, '<br>')
        },
        toRecipients: [{ emailAddress: { address: to } }]
      },
      saveToSentItems: true
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Microsoft Graph sendMail failed: ${message.slice(0, 240)}`);
  }
}

async function sendViaOutlookSmtp({ to, subject, text, html }) {
  const smtpUser = cleanText(process.env.OUTLOOK_SMTP_USER || process.env.OUTLOOK_FROM_EMAIL);
  const smtpPass = cleanText(process.env.OUTLOOK_SMTP_PASS);
  if (!smtpUser || !smtpPass) throw new Error('Outlook SMTP email is missing OUTLOOK_SMTP_USER or OUTLOOK_SMTP_PASS.');

  const port = Number(process.env.OUTLOOK_SMTP_PORT || 587);
  const secure = normalizeBoolean(process.env.OUTLOOK_SMTP_SECURE, false);
  const transporter = nodemailer.createTransport({
    host: process.env.OUTLOOK_SMTP_HOST || 'smtp.office365.com',
    port,
    secure,
    requireTLS: !secure,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  await transporter.sendMail({
    from: process.env.OUTLOOK_FROM_EMAIL || smtpUser,
    to,
    subject,
    text,
    html
  });
}

async function sendProjectInvitationEmail({ req, sender, recipient, project, role }) {
  const provider = emailProvider();
  if (provider === 'none') {
    return {
      sent: false,
      provider,
      warning: 'Member was added, but email is not configured yet. Add Outlook email settings in Render to send invitations.'
    };
  }

  const appBaseUrl = getAppBaseUrl(req);
  const projectUrl = appBaseUrl ? `${appBaseUrl}/?project=${project.id}` : '';
  const message = buildInvitationMessage({ recipient, sender, project, role, projectUrl });

  if (provider === 'graph') {
    await sendViaMicrosoftGraph({ to: recipient.email, ...message });
  } else {
    await sendViaOutlookSmtp({ to: recipient.email, ...message });
  }

  return { sent: true, provider, to: recipient.email };
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

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}

async function requireAuth(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw httpError(401, 'Authentication token required.');

    const payload = jwt.verify(token, JWT_SECRET);
    const result = await query('SELECT id, name, email FROM users WHERE id = $1', [payload.sub]);
    if (!result.rowCount) throw httpError(401, 'User no longer exists.');

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
    "SELECT 1 FROM project_members WHERE user_id = $1 AND role IN ('owner', 'manager') LIMIT 1",
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

async function requireProjectMembership(projectId, userId, minimumRole = 'viewer', db = { query }) {
  const membership = await getMembership(projectId, userId, db);
  if (!membership) throw httpError(403, 'You are not assigned to this project.');
  if (roleRank[membership.role] < roleRank[minimumRole]) {
    throw httpError(403, `This action requires ${minimumRole} access or higher.`);
  }
  return membership;
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

const taskSelect = `
  t.id,
  t.project_id,
  t.parent_task_id,
  t.name,
  t.description,
  t.trade,
  t.assigned_to,
  assignee.name AS assigned_to_name,
  assignee.email AS assigned_to_email,
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
  const access = await requireProjectAccess(projectId, userId);

  const projectResult = await query(
    `SELECT
       p.id,
       p.name,
       p.location,
       p.description,
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
       u.email
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

  return {
    project: { ...projectResult.rows[0], role: access.role },
    tasks: tasksResult.rows,
    dependencies: dependenciesResult.rows,
    members: membersResult.rows,
    audit: auditResult.rows
  };
}

function buildTaskInput(body, partial = false) {
  const input = {};

  if (!partial || body.name !== undefined) input.name = requireText(body.name, 'Task name');
  if (!partial || body.description !== undefined) input.description = cleanText(body.description);
  if (!partial || body.trade !== undefined) input.trade = cleanText(body.trade);
  if (!partial || body.assigned_to !== undefined) input.assigned_to = normalizeOptionalId(body.assigned_to, 'assigned_to');
  if (!partial || body.parent_task_id !== undefined) input.parent_task_id = normalizeOptionalId(body.parent_task_id, 'parent_task_id');

  if (!partial || body.status !== undefined) {
    input.status = partial ? normalizeOptionalEnum(body.status, statuses, 'status') : requireEnum(body.status || 'not_started', statuses, 'status');
  }

  if (!partial || body.priority !== undefined) {
    input.priority = partial ? normalizeOptionalEnum(body.priority, priorities, 'priority') : requireEnum(body.priority || 'normal', priorities, 'priority');
  }

  if (!partial || body.start_date !== undefined) input.start_date = normalizeDate(body.start_date, 'start_date');
  if (!partial || body.end_date !== undefined) input.end_date = normalizeDate(body.end_date, 'end_date');

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

  if (!/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, 'A valid email is required.');
  if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters.');

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const result = await query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordHash]
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

  const result = await query('SELECT id, name, email, password_hash FROM users WHERE email = $1', [email]);
  if (!result.rowCount) throw httpError(401, 'Invalid email or password.');

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw httpError(401, 'Invalid email or password.');

  res.json({ user: publicUser(user), token: signToken(user) });
}));

app.get('/api/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
}));

app.get('/api/projects', requireAuth, asyncHandler(async (req, res) => {
  const result = await query(
    `WITH portfolio_access AS (
       SELECT EXISTS (
         SELECT 1
         FROM project_members
         WHERE user_id = $1 AND role IN ('owner', 'manager')
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
         count(*) FILTER (WHERE status = 'complete')::int AS complete_task_count
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
               'role', pm.role
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
         WHEN project_status = 'completed' THEN 'completed'
         ELSE schedule_status
       END AS status
     FROM project_rows
     ORDER BY updated_at DESC`,
    [req.user.id]
  );

  res.json({ projects: result.rows });
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
       RETURNING id, name, location, description, project_status, to_char(start_date, 'YYYY-MM-DD') AS start_date,
         to_char(end_date, 'YYYY-MM-DD') AS end_date, created_by, created_at, updated_at`,
      [name, location, description, startDate, endDate, req.user.id]
    );

    const inserted = result.rows[0];
    await client.query('INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)', [
      inserted.id,
      req.user.id,
      'owner'
    ]);

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
      `SELECT id, name, location, description, project_status, to_char(start_date, 'YYYY-MM-DD') AS start_date,
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
      values.push(requireEnum(requestedStatus, projectLifecycleStatuses, 'project_status'));
      sets.push(`project_status = $${values.length}`);
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
       RETURNING id, name, location, description, project_status, to_char(start_date, 'YYYY-MM-DD') AS start_date,
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

app.delete('/api/projects/:projectId', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');

  await tx(async (client) => {
    await requireProjectMembership(projectId, req.user.id, 'owner', client);
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
  const sendInvite = normalizeBoolean(req.body.send_invite ?? req.body.sendInvite, false);

  const { member, project } = await tx(async (client) => {
    const membership = await requireProjectMembership(projectId, req.user.id, 'manager', client);
    if (role === 'owner' && membership.role !== 'owner') {
      throw httpError(403, 'Only project owners can add another owner.');
    }

    const userResult = await client.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    if (!userResult.rowCount) {
      throw httpError(404, 'That user has not registered yet. Ask them to create an account first, then add them again.');
    }
    const user = userResult.rows[0];

    const projectResult = await client.query(
      `SELECT id, name, location, description, project_status,
        to_char(start_date, 'YYYY-MM-DD') AS start_date,
        to_char(end_date, 'YYYY-MM-DD') AS end_date
       FROM projects WHERE id = $1`,
      [projectId]
    );
    if (!projectResult.rowCount) throw httpError(404, 'Project not found.');

    await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [projectId, user.id, role]
    );

    const row = { project_id: projectId, user_id: user.id, role, name: user.name, email: user.email };
    await writeAudit(client, {
      projectId,
      userId: req.user.id,
      action: 'member_added',
      entityType: 'project_member',
      entityId: user.id,
      after: row
    });

    return { member: row, project: projectResult.rows[0] };
  });

  let invite = { sent: false, requested: sendInvite };
  if (sendInvite) {
    try {
      invite = await sendProjectInvitationEmail({ req, sender: req.user, recipient: member, project, role });
      await writeAudit({ query }, {
        projectId,
        userId: req.user.id,
        action: invite.sent ? 'member_invite_email_sent' : 'member_invite_email_not_sent',
        entityType: 'project_member',
        entityId: member.user_id,
        after: { to: member.email, provider: invite.provider, sent: invite.sent, warning: invite.warning || null }
      });
    } catch (error) {
      console.error('Invitation email failed:', error);
      invite = {
        sent: false,
        requested: true,
        warning: `Member was added, but the Outlook invitation email could not be sent. ${error.message}`
      };
      await writeAudit({ query }, {
        projectId,
        userId: req.user.id,
        action: 'member_invite_email_failed',
        entityType: 'project_member',
        entityId: member.user_id,
        after: { to: member.email, error: error.message }
      });
    }
  }

  emitProjectChange(projectId, { actorId: req.user.id, message: 'Project member updated.' });
  res.status(201).json({ member, invite });
}));

app.patch('/api/projects/:projectId/members/:userId', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');
  const targetUserId = parseId(req.params.userId, 'userId');
  const role = requireEnum(req.body.role, roles, 'role');

  const updatedMember = await tx(async (client) => {
    await requireProjectMembership(projectId, req.user.id, 'owner', client);

    const before = await client.query('SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2', [
      projectId,
      targetUserId
    ]);
    if (!before.rowCount) throw httpError(404, 'Project member not found.');

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

    await writeAudit(client, {
      projectId,
      userId: req.user.id,
      action: 'member_role_updated',
      entityType: 'project_member',
      entityId: targetUserId,
      before: before.rows[0],
      after: result.rows[0]
    });

    return result.rows[0];
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: 'Project member role changed.' });
  res.json({ member: updatedMember });
}));

app.delete('/api/projects/:projectId/members/:userId', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');
  const targetUserId = parseId(req.params.userId, 'userId');

  await tx(async (client) => {
    await requireProjectMembership(projectId, req.user.id, 'owner', client);
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
        (project_id, parent_task_id, name, description, trade, assigned_to, status, priority, start_date, end_date,
         percent_complete, color, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [
        projectId,
        input.parent_task_id ?? null,
        input.name,
        input.description,
        input.trade,
        input.assigned_to ?? null,
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
    const result = await query('SELECT id, name, email FROM users WHERE id = $1', [payload.sub]);
    if (!result.rowCount) throw httpError(401, 'Socket user not found.');
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
  console.log(`BuildTrack server listening on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});
