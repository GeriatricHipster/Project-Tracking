'use strict';

const http = require('node:http');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT || 10000);
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';
const NOTIFY_API_KEY = process.env.NOTIFY_API_KEY || '';
const NODE_ENV = process.env.NODE_ENV || 'development';

const MAX_BODY_BYTES = 1024 * 1024;

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(html);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error('Request body is too large.'));
      }
    });

    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Request body must be valid JSON.'));
      }
    });

    req.on('error', reject);
  });
}

function getAuthToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return String(req.headers['x-api-key'] || '').trim();
}

function isAuthorized(req) {
  if (!NOTIFY_API_KEY) return true;
  return getAuthToken(req) === NOTIFY_API_KEY;
}

function slackEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function isSlackWebhookUrl(value) {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'hooks.slack.com' || parsed.hostname === 'hooks.slack-gov.com') &&
      parsed.pathname.startsWith('/services/')
    );
  } catch (_) {
    return false;
  }
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function normalizeTask(input) {
  const taskTitle = pickFirst(input.taskTitle, input.title, input.name, 'Untitled task');
  const taskId = pickFirst(input.taskId, input.id, input.taskNumber);
  const assigneeName = pickFirst(input.assigneeName, input.assignedTo, input.assignee, 'Unassigned');
  const assignedBy = pickFirst(input.assignedBy, input.createdBy, input.requestedBy, 'Not provided');
  const projectName = pickFirst(input.projectName, input.project, input.jobName, 'Not provided');
  const dueDate = pickFirst(input.dueDate, input.due, input.deadline, 'Not provided');
  const priority = pickFirst(input.priority, 'Normal');
  const notes = pickFirst(input.notes, input.description, input.message);
  const taskUrl = pickFirst(input.taskUrl, input.url, input.link);
  const slackUserId = pickFirst(input.slackUserId, input.slackMemberId, input.slackId);

  return {
    taskTitle,
    taskId,
    assigneeName,
    assignedBy,
    projectName,
    dueDate,
    priority,
    notes,
    taskUrl,
    slackUserId
  };
}

function slackMention(userId) {
  const id = String(userId || '').trim().toUpperCase();
  if (/^[UW][A-Z0-9]{2,}$/.test(id)) {
    return `<@${id}>`;
  }
  return '';
}

function buildSlackPayload(task) {
  const safeTitle = slackEscape(task.taskTitle);
  const safeAssignee = slackEscape(task.assigneeName);
  const safeProject = slackEscape(task.projectName);
  const safeDue = slackEscape(task.dueDate);
  const safeAssignedBy = slackEscape(task.assignedBy);
  const safePriority = slackEscape(task.priority);
  const safeTaskId = slackEscape(task.taskId);
  const safeNotes = slackEscape(task.notes);
  const mention = slackMention(task.slackUserId);
  const titleLine = mention ? `${mention} *${safeTitle}*` : `*${safeTitle}*`;

  const fields = [
    `*Assigned to:*\n${safeAssignee}`,
    `*Project:*\n${safeProject}`,
    `*Due:*\n${safeDue}`,
    `*Priority:*\n${safePriority}`,
    `*Assigned by:*\n${safeAssignedBy}`
  ];

  if (safeTaskId) {
    fields.unshift(`*Task ID:*\n${safeTaskId}`);
  }

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'New task assigned',
        emoji: true
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: titleLine
      }
    },
    {
      type: 'section',
      fields: fields.slice(0, 10).map((text) => ({ type: 'mrkdwn', text }))
    }
  ];

  if (safeNotes) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Notes:*\n${safeNotes}`
      }
    });
  }

  if (task.taskUrl && isHttpUrl(task.taskUrl)) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Open task',
            emoji: true
          },
          url: task.taskUrl
        }
      ]
    });
  }

  return {
    text: `New task assigned: ${task.taskTitle} to ${task.assigneeName}${task.slackUserId ? ` (${task.slackUserId})` : ''}`,
    blocks
  };
}

async function postToSlack(payload) {
  if (!SLACK_WEBHOOK_URL) {
    throw new Error('Missing SLACK_WEBHOOK_URL environment variable. Add it in Render under Environment.');
  }

  if (!isSlackWebhookUrl(SLACK_WEBHOOK_URL)) {
    throw new Error('SLACK_WEBHOOK_URL does not look like a Slack Incoming Webhook URL.');
  }

  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Slack returned ${response.status}: ${responseText}`);
  }

  return responseText || 'ok';
}

function homeHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Slack Task Notifier</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.5; max-width: 980px; margin: 40px auto; padding: 0 20px; }
    label { display: block; font-weight: bold; margin: 12px 0 4px; }
    input, textarea, select { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #bbb; border-radius: 6px; font: inherit; }
    textarea { min-height: 84px; }
    button { margin-top: 16px; padding: 10px 16px; border: 0; border-radius: 6px; font: inherit; cursor: pointer; }
    code, pre { background: #f5f5f5; border-radius: 6px; }
    code { padding: 2px 4px; }
    pre { padding: 16px; overflow-x: auto; white-space: pre-wrap; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
    .note { background: #fff8db; border: 1px solid #eadb91; border-radius: 6px; padding: 12px; }
    @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <h1>Slack Task Notifier API</h1>
  <p>This service is running. Fill out the form below to send a test task assignment to Slack.</p>
  <p class="note">This page is only a simple test tool. Your real task app should call <code>/api/tasks/assign</code> automatically when a task is assigned.</p>

  <form id="notify-form">
    <label for="apiKey">API key from Render's NOTIFY_API_KEY environment variable</label>
    <input id="apiKey" name="apiKey" type="password" placeholder="Leave blank only if you did not set NOTIFY_API_KEY">

    <div class="grid">
      <div>
        <label for="taskId">Task ID</label>
        <input id="taskId" name="taskId" value="1043">
      </div>
      <div>
        <label for="priority">Priority</label>
        <select id="priority" name="priority">
          <option>High</option>
          <option>Normal</option>
          <option>Low</option>
        </select>
      </div>
    </div>

    <label for="taskTitle">Task title</label>
    <input id="taskTitle" name="taskTitle" value="Frame inspection checklist" required>

    <div class="grid">
      <div>
        <label for="assigneeName">Assigned to</label>
        <input id="assigneeName" name="assigneeName" value="John Smith">
      </div>
      <div>
        <label for="assignedBy">Assigned by</label>
        <input id="assignedBy" name="assignedBy" value="Mike">
      </div>
    </div>

    <div class="grid">
      <div>
        <label for="projectName">Project</label>
        <input id="projectName" name="projectName" value="Lot 12 - North Ridge">
      </div>
      <div>
        <label for="dueDate">Due date</label>
        <input id="dueDate" name="dueDate" value="Friday 3:00 PM">
      </div>
    </div>

    <label for="taskUrl">Task link</label>
    <input id="taskUrl" name="taskUrl" value="https://example.com/tasks/1043">

    <label for="slackUserId">Optional Slack member ID to @mention that person</label>
    <input id="slackUserId" name="slackUserId" placeholder="Example: U012AB3CD">

    <label for="notes">Notes</label>
    <textarea id="notes" name="notes">Meet the superintendent at the job trailer.</textarea>

    <button type="submit">Send test Slack notification</button>
  </form>

  <h2>Result</h2>
  <pre id="result">No test sent yet.</pre>

  <h2>API routes</h2>
  <p>Health check: <a href="/health">/health</a></p>
  <p>Example JSON: <a href="/example">/example</a></p>

  <script>
    var form = document.getElementById('notify-form');
    var result = document.getElementById('result');

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      result.textContent = 'Sending...';

      var formData = new FormData(form);
      var apiKey = String(formData.get('apiKey') || '').trim();
      formData.delete('apiKey');

      var payload = {};
      formData.forEach(function (value, key) {
        if (String(value).trim() !== '') {
          payload[key] = String(value).trim();
        }
      });

      var headers = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers.Authorization = 'Bearer ' + apiKey;
      }

      try {
        var response = await fetch('/api/tasks/assign', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });
        var text = await response.text();
        result.textContent = 'HTTP ' + response.status + '\n\n' + text;
      } catch (error) {
        result.textContent = 'Error: ' + error.message;
      }
    });
  </script>
</body>
</html>`;
}

async function handleAssignTask(req, res) {
  if (!isAuthorized(req)) {
    sendJson(res, 401, {
      ok: false,
      error: 'Unauthorized. Provide the correct Authorization: Bearer token or X-API-Key header.'
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message });
    return;
  }

  const task = normalizeTask(body);
  const slackPayload = buildSlackPayload(task);

  try {
    const slackResult = await postToSlack(slackPayload);
    sendJson(res, 200, {
      ok: true,
      message: 'Task assignment notification sent to Slack.',
      slackResult,
      task
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error.message,
      hint: 'Check your SLACK_WEBHOOK_URL in Render and make sure the Slack app is still installed.'
    });
  }
}

function exampleTask() {
  return {
    taskId: '1043',
    taskTitle: 'Frame inspection checklist',
    assigneeName: 'John Smith',
    projectName: 'Lot 12 - North Ridge',
    dueDate: 'Friday 3:00 PM',
    priority: 'High',
    assignedBy: 'Mike',
    taskUrl: 'https://example.com/tasks/1043',
    notes: 'Meet the superintendent at the job trailer.',
    slackUserId: 'U012AB3CD'
  };
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = parsedUrl.pathname;

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && path === '/') {
    sendHtml(res, 200, homeHtml());
    return;
  }

  if (req.method === 'GET' && path === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'slack-task-notifier',
      environment: NODE_ENV,
      slackWebhookConfigured: Boolean(SLACK_WEBHOOK_URL),
      apiKeyProtectionEnabled: Boolean(NOTIFY_API_KEY)
    });
    return;
  }

  if (req.method === 'GET' && path === '/example') {
    sendJson(res, 200, exampleTask());
    return;
  }

  if (req.method === 'POST' && (path === '/api/tasks/assign' || path === '/notify/slack')) {
    await handleAssignTask(req, res);
    return;
  }

  sendJson(res, 404, {
    ok: false,
    error: 'Not found',
    availableRoutes: ['GET /', 'GET /health', 'GET /example', 'POST /api/tasks/assign', 'POST /notify/slack']
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Slack Task Notifier listening on port ${PORT}`);
});
