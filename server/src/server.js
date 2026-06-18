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
const multer = require('multer');
const { Server } = require('socket.io');
const { pool, query, tx } = require('./db');

const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'local-development-secret-change-me';
const APP_NAME = process.env.APP_NAME || 'BuildTrack Cloud';
const BLUEPRINT_MAX_FILE_SIZE = Number(process.env.BLUEPRINT_MAX_FILE_SIZE || 25 * 1024 * 1024);
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
const siteRoles = new Set(['owner', 'manager', 'editor', 'viewer']);
const accessStatuses = new Set(['active', 'revoked']);
const dependencyTypes = new Set(['FS', 'SS', 'FF', 'SF']);

const projectChecklistDefinitions = [
  { key: 'ips_requested', label: 'IPs requested' },
  { key: 'panel_ordered', label: 'Panel ordered' },
  { key: 'clearances_programmed', label: 'Clearances programmed' },
  { key: 'doors_programmed', label: 'Doors programmed' },
  { key: 'ccure_operator_established', label: 'CCure Operator established' }
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
  limits: { fileSize: BLUEPRINT_MAX_FILE_SIZE, files: 10 }
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
    email: user.email,
    site_role: user.site_role || 'viewer',
    access_status: user.access_status || 'active',
    can_manage_site: Boolean(user.can_manage_site)
  };
}

async function requireAuth(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw httpError(401, 'Authentication token required.');

    const payload = jwt.verify(token, JWT_SECRET);
    const result = await query('SELECT id, name, email, site_role, access_status FROM users WHERE id = $1', [payload.sub]);
    if (!result.rowCount) throw httpError(401, 'User no longer exists.');
    if (result.rows[0].access_status === 'revoked') throw httpError(403, 'Your account access has been revoked.');

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

async function getSiteAdminAccess(userId, db = { query }) {
  const result = await db.query(
    `SELECT
       u.site_role,
       u.access_status,
       EXISTS (
         SELECT 1 FROM project_members pm
         WHERE pm.user_id = u.id AND pm.role IN ('owner', 'manager')
       ) AS has_project_admin_role
     FROM users u
     WHERE u.id = $1`,
    [userId]
  );

  if (!result.rowCount) throw httpError(401, 'User no longer exists.');
  const row = result.rows[0];
  if (row.access_status === 'revoked') throw httpError(403, 'Your account access has been revoked.');

  const siteRole = row.site_role || 'viewer';
  return {
    siteRole,
    accessStatus: row.access_status || 'active',
    canManageSite: ['owner', 'manager'].includes(siteRole) || row.has_project_admin_role === true,
    canViewPortfolio: ['owner', 'manager'].includes(siteRole) || row.has_project_admin_role === true,
    isSiteOwner: siteRole === 'owner',
    hasProjectAdminRole: row.has_project_admin_role === true
  };
}

async function requireSiteManager(userId, db = { query }) {
  const access = await getSiteAdminAccess(userId, db);
  if (!access.canManageSite) throw httpError(403, 'This action requires site manager or owner access.');
  return access;
}

async function ensureAtLeastOneActiveSiteOwner(db, targetUserId = null) {
  const result = await db.query(
    `SELECT count(*)::int AS count
     FROM users
     WHERE site_role = 'owner'
       AND access_status = 'active'
       AND ($1::int IS NULL OR id <> $1)`,
    [targetUserId]
  );
  if (result.rows[0].count <= 0) {
    throw httpError(400, 'The site must keep at least one active owner.');
  }
}

function checklistDefinitionForKey(key) {
  const definition = projectChecklistDefinitions.find((item) => item.key === key);
  if (!definition) throw httpError(400, `Checklist item must be one of: ${projectChecklistDefinitions.map((item) => item.key).join(', ')}.`);
  return definition;
}

function buildChecklist(rows) {
  const byKey = new Map((rows || []).map((row) => [row.item_key, row]));
  return projectChecklistDefinitions.map((definition) => {
    const row = byKey.get(definition.key);
    return {
      key: definition.key,
      label: definition.label,
      is_checked: Boolean(row?.is_checked),
      checked_at: row?.checked_at || null,
      checked_by: row?.checked_by || null,
      checked_by_name: row?.checked_by_name || null
    };
  });
}

function safeDownloadName(name) {
  return String(name || 'blueprint')
    .replace(/[\r\n\0]/g, '')
    .replace(/[\\/]/g, '-')
    .replace(/"/g, "'")
    .slice(0, 160) || 'blueprint';
}

async function hasPortfolioViewAccess(userId, db = { query }) {
  const access = await getSiteAdminAccess(userId, db);
  return access.canViewPortfolio;
}

async function requireProjectAccess(projectId, userId, db = { query }) {
  const membership = await getMembership(projectId, userId, db);
  if (membership) return { role: membership.role, membership, portfolio: false };

  const siteAccess = await getSiteAdminAccess(userId, db);
  if (siteAccess.canViewPortfolio) {
    const exists = await db.query('SELECT 1 FROM projects WHERE id = $1', [projectId]);
    if (!exists.rowCount) throw httpError(404, 'Project not found.');
    if (siteAccess.siteRole === 'owner') return { role: 'owner', membership: null, portfolio: true };
    if (siteAccess.siteRole === 'manager') return { role: 'manager', membership: null, portfolio: true };
    return { role: 'portfolio_viewer', membership: null, portfolio: true };
  }

  throw httpError(403, 'You are not assigned to this project.');
}

async function requireProjectMembership(projectId, userId, minimumRole = 'viewer', db = { query }) {
  const membership = await getMembership(projectId, userId, db);
  if (membership && roleRank[membership.role] >= roleRank[minimumRole]) return membership;

  const siteAccess = await getSiteAdminAccess(userId, db);
  const inheritedRole = siteAccess.siteRole === 'owner' ? 'owner' : siteAccess.siteRole === 'manager' ? 'manager' : null;
  if (inheritedRole && roleRank[inheritedRole] >= roleRank[minimumRole]) {
    const exists = await db.query('SELECT 1 FROM projects WHERE id = $1', [projectId]);
    if (!exists.rowCount) throw httpError(404, 'Project not found.');
    return { role: inheritedRole, inherited_site_role: true };
  }

  if (!membership) throw httpError(403, 'You are not assigned to this project.');
  throw httpError(403, `This action requires ${minimumRole} access or higher.`);
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

  const checklistResult = await query(
    `SELECT
       pci.project_id,
       pci.item_key,
       pci.label,
       pci.is_checked,
       pci.checked_by,
       pci.checked_at,
       checked_user.name AS checked_by_name
     FROM project_checklist_items pci
     LEFT JOIN users checked_user ON checked_user.id = pci.checked_by
     WHERE pci.project_id = $1
     ORDER BY pci.item_key`,
    [projectId]
  );

  const blueprintsResult = await query(
    `SELECT
       pb.id,
       pb.project_id,
       pb.file_name,
       pb.mime_type,
       pb.file_size,
       pb.uploaded_by,
       pb.created_at,
       uploader.name AS uploaded_by_name,
       uploader.email AS uploaded_by_email
     FROM project_blueprints pb
     LEFT JOIN users uploader ON uploader.id = pb.uploaded_by
     WHERE pb.project_id = $1
     ORDER BY pb.created_at DESC`,
    [projectId]
  );

  return {
    project: { ...projectResult.rows[0], role: access.role },
    tasks: tasksResult.rows,
    dependencies: dependenciesResult.rows,
    members: membersResult.rows,
    checklist: buildChecklist(checklistResult.rows),
    blueprints: blueprintsResult.rows,
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
  const userCountResult = await query('SELECT count(*)::int AS count FROM users');
  const initialSiteRole = userCountResult.rows[0].count === 0 ? 'owner' : 'viewer';

  try {
    const result = await query(
      'INSERT INTO users (name, email, password_hash, site_role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, site_role, access_status',
      [name, email, passwordHash, initialSiteRole]
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

  const result = await query('SELECT id, name, email, password_hash, site_role, access_status FROM users WHERE email = $1', [email]);
  if (!result.rowCount) throw httpError(401, 'Invalid email or password.');

  const user = result.rows[0];
  if (user.access_status === 'revoked') throw httpError(403, 'Your account access has been revoked.');
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw httpError(401, 'Invalid email or password.');

  res.json({ user: publicUser(user), token: signToken(user) });
}));

app.get('/api/me', requireAuth, asyncHandler(async (req, res) => {
  const siteAccess = await getSiteAdminAccess(req.user.id);
  res.json({ user: publicUser({ ...req.user, can_manage_site: siteAccess.canManageSite }) });
}));

app.get('/api/projects', requireAuth, asyncHandler(async (req, res) => {
  const result = await query(
    `WITH portfolio_access AS (
       SELECT (
         EXISTS (SELECT 1 FROM users WHERE id = $1 AND site_role IN ('owner', 'manager') AND access_status = 'active')
         OR EXISTS (SELECT 1 FROM project_members WHERE user_id = $1 AND role IN ('owner', 'manager'))
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
         coalesce(pm.role, CASE WHEN u.site_role IN ('owner', 'manager') THEN u.site_role ELSE 'portfolio_viewer' END) AS role
       FROM projects p
       CROSS JOIN portfolio_access pa
       JOIN users u ON u.id = $1
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
  await requireSiteManager(req.user.id);

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

  const member = await tx(async (client) => {
    const membership = await requireProjectMembership(projectId, req.user.id, 'manager', client);
    if (role === 'owner' && membership.role !== 'owner') {
      throw httpError(403, 'Only project owners or site owners can add another owner.');
    }

    const userResult = await client.query('SELECT id, name, email FROM users WHERE email = $1 AND access_status = $2', [email, 'active']);
    if (!userResult.rowCount) {
      throw httpError(404, 'That active user was not found. Ask them to create an account first, or reactivate them in Site members.');
    }
    const user = userResult.rows[0];

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

    return row;
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: 'Project member updated.' });
  res.status(201).json({ member });
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


app.get('/api/site/users', requireAuth, asyncHandler(async (req, res) => {
  const access = await requireSiteManager(req.user.id);
  const result = await query(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.site_role,
       u.access_status,
       u.created_at,
       count(pm.project_id)::int AS project_count,
       coalesce(
         json_agg(
           json_build_object(
             'project_id', p.id,
             'project_name', p.name,
             'project_status', p.project_status,
             'role', pm.role,
             'start_date', to_char(p.start_date, 'YYYY-MM-DD'),
             'end_date', to_char(p.end_date, 'YYYY-MM-DD')
           )
           ORDER BY p.name
         ) FILTER (WHERE p.id IS NOT NULL),
         '[]'::json
       ) AS projects
     FROM users u
     LEFT JOIN project_members pm ON pm.user_id = u.id
     LEFT JOIN projects p ON p.id = pm.project_id
     GROUP BY u.id
     ORDER BY
       CASE u.access_status WHEN 'active' THEN 1 ELSE 2 END,
       CASE u.site_role WHEN 'owner' THEN 1 WHEN 'manager' THEN 2 WHEN 'editor' THEN 3 ELSE 4 END,
       u.name`,
    []
  );

  res.json({
    users: result.rows,
    access: {
      site_role: access.siteRole,
      can_manage_site: access.canManageSite,
      is_site_owner: access.isSiteOwner
    }
  });
}));

app.patch('/api/site/users/:userId', requireAuth, asyncHandler(async (req, res) => {
  const targetUserId = parseId(req.params.userId, 'userId');

  const updatedUser = await tx(async (client) => {
    const access = await requireSiteManager(req.user.id, client);
    const beforeResult = await client.query('SELECT id, name, email, site_role, access_status, created_at FROM users WHERE id = $1', [targetUserId]);
    if (!beforeResult.rowCount) throw httpError(404, 'User not found.');
    const before = beforeResult.rows[0];

    const values = [];
    const sets = [];

    if (req.body.site_role !== undefined) {
      const nextRole = requireEnum(req.body.site_role, siteRoles, 'site_role');
      if (!access.isSiteOwner && (before.site_role === 'owner' || nextRole === 'owner')) {
        throw httpError(403, 'Only a site owner can manage owner-level users.');
      }
      if (before.site_role === 'owner' && nextRole !== 'owner') {
        await ensureAtLeastOneActiveSiteOwner(client, targetUserId);
      }
      values.push(nextRole);
      sets.push(`site_role = $${values.length}`);
    }

    if (req.body.access_status !== undefined) {
      const nextStatus = requireEnum(req.body.access_status, accessStatuses, 'access_status');
      if (targetUserId === req.user.id && nextStatus === 'revoked') {
        throw httpError(400, 'You cannot revoke your own access while signed in.');
      }
      if (!access.isSiteOwner && before.site_role === 'owner') {
        throw httpError(403, 'Only a site owner can revoke an owner-level user.');
      }
      if (before.site_role === 'owner' && nextStatus === 'revoked') {
        await ensureAtLeastOneActiveSiteOwner(client, targetUserId);
      }
      values.push(nextStatus);
      sets.push(`access_status = $${values.length}`);
    }

    if (!sets.length) return before;

    values.push(targetUserId);
    const updateResult = await client.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${values.length}
       RETURNING id, name, email, site_role, access_status, created_at`,
      values
    );

    await writeAudit(client, {
      userId: req.user.id,
      action: 'site_user_updated',
      entityType: 'user',
      entityId: targetUserId,
      before,
      after: updateResult.rows[0]
    });

    return updateResult.rows[0];
  });

  res.json({ user: updatedUser });
}));

app.delete('/api/site/users/:userId', requireAuth, asyncHandler(async (req, res) => {
  const targetUserId = parseId(req.params.userId, 'userId');

  await tx(async (client) => {
    const access = await requireSiteManager(req.user.id, client);
    if (targetUserId === req.user.id) throw httpError(400, 'You cannot delete your own user account while signed in.');

    const beforeResult = await client.query('SELECT id, name, email, site_role, access_status, created_at FROM users WHERE id = $1', [targetUserId]);
    if (!beforeResult.rowCount) throw httpError(404, 'User not found.');
    const before = beforeResult.rows[0];

    if (!access.isSiteOwner && before.site_role === 'owner') {
      throw httpError(403, 'Only a site owner can delete an owner-level user.');
    }
    if (before.site_role === 'owner') {
      await ensureAtLeastOneActiveSiteOwner(client, targetUserId);
    }

    await writeAudit(client, {
      userId: req.user.id,
      action: 'site_user_deleted',
      entityType: 'user',
      entityId: targetUserId,
      before
    });
    await client.query('DELETE FROM users WHERE id = $1', [targetUserId]);
  });

  res.status(204).send();
}));

app.patch('/api/projects/:projectId/checklist/:itemKey', requireAuth, asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');
  const itemKey = String(req.params.itemKey || '').trim();
  const definition = checklistDefinitionForKey(itemKey);
  const isChecked = normalizeBoolean(req.body.is_checked ?? req.body.checked, false);

  const item = await tx(async (client) => {
    await requireProjectMembership(projectId, req.user.id, 'editor', client);

    const beforeResult = await client.query(
      'SELECT * FROM project_checklist_items WHERE project_id = $1 AND item_key = $2',
      [projectId, definition.key]
    );

    const result = await client.query(
      `INSERT INTO project_checklist_items
        (project_id, item_key, label, is_checked, checked_by, checked_at)
       VALUES ($1, $2, $3, $4, CASE WHEN $4 THEN $5 ELSE NULL END, CASE WHEN $4 THEN now() ELSE NULL END)
       ON CONFLICT (project_id, item_key)
       DO UPDATE SET
         label = EXCLUDED.label,
         is_checked = EXCLUDED.is_checked,
         checked_by = CASE WHEN EXCLUDED.is_checked THEN $5 ELSE NULL END,
         checked_at = CASE WHEN EXCLUDED.is_checked THEN now() ELSE NULL END,
         updated_at = now()
       RETURNING project_id, item_key, label, is_checked, checked_by, checked_at`,
      [projectId, definition.key, definition.label, isChecked, req.user.id]
    );

    await writeAudit(client, {
      projectId,
      userId: req.user.id,
      action: isChecked ? 'checklist_checked' : 'checklist_unchecked',
      entityType: 'project_checklist_item',
      before: beforeResult.rows[0] || null,
      after: result.rows[0]
    });

    return {
      key: result.rows[0].item_key,
      label: result.rows[0].label,
      is_checked: result.rows[0].is_checked,
      checked_by: result.rows[0].checked_by,
      checked_at: result.rows[0].checked_at,
      checked_by_name: isChecked ? req.user.name : null
    };
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: `Checklist updated: ${definition.label}` });
  res.json({ item });
}));

app.post('/api/projects/:projectId/blueprints', requireAuth, blueprintUpload.array('blueprints', 10), asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId, 'projectId');
  const files = Array.isArray(req.files) ? req.files : [];
  if (!files.length) throw httpError(400, 'Drag and drop at least one blueprint file.');

  const blueprints = await tx(async (client) => {
    await requireProjectMembership(projectId, req.user.id, 'editor', client);
    const rows = [];

    for (const file of files) {
      const fileName = safeDownloadName(file.originalname || 'blueprint');
      const result = await client.query(
        `INSERT INTO project_blueprints
          (project_id, file_name, mime_type, file_size, file_data, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, project_id, file_name, mime_type, file_size, uploaded_by, created_at`,
        [projectId, fileName, file.mimetype || 'application/octet-stream', file.size || file.buffer.length, file.buffer, req.user.id]
      );
      rows.push({ ...result.rows[0], uploaded_by_name: req.user.name, uploaded_by_email: req.user.email });

      await writeAudit(client, {
        projectId,
        userId: req.user.id,
        action: 'blueprint_uploaded',
        entityType: 'project_blueprint',
        entityId: result.rows[0].id,
        after: { id: result.rows[0].id, file_name: fileName, file_size: result.rows[0].file_size }
      });
    }

    return rows;
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: `${blueprints.length} blueprint file${blueprints.length === 1 ? '' : 's'} uploaded.` });
  res.status(201).json({ blueprints });
}));

app.get('/api/blueprints/:blueprintId/download', requireAuth, asyncHandler(async (req, res) => {
  const blueprintId = parseId(req.params.blueprintId, 'blueprintId');
  const result = await query(
    `SELECT id, project_id, file_name, mime_type, file_size, file_data
     FROM project_blueprints
     WHERE id = $1`,
    [blueprintId]
  );
  if (!result.rowCount) throw httpError(404, 'Blueprint not found.');
  const blueprint = result.rows[0];
  await requireProjectAccess(blueprint.project_id, req.user.id);

  res.setHeader('Content-Type', blueprint.mime_type || 'application/octet-stream');
  res.setHeader('Content-Length', blueprint.file_size);
  res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName(blueprint.file_name)}"`);
  res.send(blueprint.file_data);
}));

app.delete('/api/blueprints/:blueprintId', requireAuth, asyncHandler(async (req, res) => {
  const blueprintId = parseId(req.params.blueprintId, 'blueprintId');
  let projectId;

  await tx(async (client) => {
    const beforeResult = await client.query(
      'SELECT id, project_id, file_name, file_size, uploaded_by, created_at FROM project_blueprints WHERE id = $1',
      [blueprintId]
    );
    if (!beforeResult.rowCount) throw httpError(404, 'Blueprint not found.');
    const before = beforeResult.rows[0];
    projectId = before.project_id;
    await requireProjectMembership(projectId, req.user.id, 'manager', client);

    await writeAudit(client, {
      projectId,
      userId: req.user.id,
      action: 'blueprint_deleted',
      entityType: 'project_blueprint',
      entityId: blueprintId,
      before
    });
    await client.query('DELETE FROM project_blueprints WHERE id = $1', [blueprintId]);
  });

  emitProjectChange(projectId, { actorId: req.user.id, message: 'Blueprint file deleted.' });
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
    const result = await query('SELECT id, name, email, site_role, access_status FROM users WHERE id = $1', [payload.sub]);
    if (!result.rowCount) throw httpError(401, 'Socket user not found.');
    if (result.rows[0].access_status === 'revoked') throw httpError(403, 'Your account access has been revoked.');
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
  const status = error.status || (error.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500) {
    console.error(error);
  }
  res.status(status).json({
    error: error.code === 'LIMIT_FILE_SIZE' ? `Blueprint file is too large. Maximum upload size is ${Math.round(BLUEPRINT_MAX_FILE_SIZE / 1024 / 1024)} MB.` : (error.message || 'Server error.')
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
