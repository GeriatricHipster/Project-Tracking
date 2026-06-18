# Slack Task Notifier

This is a small API you can put on GitHub and deploy to Render. When your task app tells this API that a task was assigned, the API sends a formatted message to a Slack channel.

You do not need to change the code to get started.

## Plain-English explanation

Think of this project as a messenger sitting between your task system and Slack.

1. Someone assigns a task in your app.
2. Your app sends the task details to this API.
3. This API formats the task into a clean Slack message.
4. Slack posts the message in the channel you picked.

The most important secret is the Slack webhook URL. Treat it like a password. Do not put the real webhook URL in GitHub.

## What is included

- `server.js` - the actual API server.
- `package.json` - tells Render how to run the app.
- `render.yaml` - optional Render setup file.
- `.env.example` - shows which secret settings you need.
- `.gitignore` - prevents secrets and extra files from being uploaded to GitHub.

## What the Slack message looks like

The message includes:

- Task ID
- Task title
- Assigned person
- Project name
- Due date
- Priority
- Assigned by
- Notes
- Optional button to open the task
- Optional Slack @mention if you provide a Slack member ID

## Step 1 - Create the Slack webhook

1. In Slack, create a channel such as `#task-notifications`.
2. Go to Slack's app page: https://api.slack.com/apps
3. Click **Create New App**.
4. Choose **From scratch**.
5. Name the app something like `Task Notifier`.
6. Pick your Slack workspace.
7. In the left menu, click **Incoming Webhooks**.
8. Turn **Activate Incoming Webhooks** on.
9. Click **Add New Webhook to Workspace**.
10. Pick the channel where task messages should appear.
11. Click **Allow** or **Authorize**.
12. Copy the webhook URL. It will look similar to:

```text
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

Keep that URL private.

## Step 2 - Upload this project to GitHub

1. Download and unzip this project.
2. Go to GitHub.
3. Click **New repository**.
4. Name it something like `slack-task-notifier`.
5. Keep it private if this is for your company.
6. Click **Create repository**.
7. Click **uploading an existing file** or **Add file > Upload files**.
8. Drag the unzipped files into GitHub.
9. Click **Commit changes**.

Important: upload the project files, but never upload a real `.env` file.

## Step 3 - Deploy it on Render

1. Go to Render.
2. Click **New +**.
3. Choose **Web Service**.
4. Connect your GitHub account if you have not already.
5. Pick the `slack-task-notifier` repository.
6. Use these settings:

```text
Name: slack-task-notifier
Runtime: Node
Build Command: npm install
Start Command: npm start
Health Check Path: /health
```

7. Add these environment variables in Render:

```text
SLACK_WEBHOOK_URL = paste your Slack webhook URL here
NOTIFY_API_KEY = make up a long private password/token
```

Example `NOTIFY_API_KEY`:

```text
my-company-task-notifier-2026-change-this
```

Use something longer and more private for real use.

8. Click **Create Web Service** or **Deploy**.
9. After Render finishes, copy your Render URL. It will look like:

```text
https://slack-task-notifier.onrender.com
```

## Step 4 - Send a test without coding

1. Open your Render URL in your browser.
2. You should see a simple test form.
3. Fill in the task details.
4. Paste your `NOTIFY_API_KEY` into the API key field.
5. Click **Send test Slack notification**.
6. Check your Slack channel.

If it worked, you will see a task assignment message in Slack.

## Step 5 - Connect your real task app

Your real task app needs to send a `POST` request to this URL:

```text
https://YOUR-RENDER-URL.onrender.com/api/tasks/assign
```

It should send JSON like this:

```json
{
  "taskId": "1043",
  "taskTitle": "Frame inspection checklist",
  "assigneeName": "John Smith",
  "projectName": "Lot 12 - North Ridge",
  "dueDate": "Friday 3:00 PM",
  "priority": "High",
  "assignedBy": "Mike",
  "taskUrl": "https://example.com/tasks/1043",
  "notes": "Meet the superintendent at the job trailer.",
  "slackUserId": "U012AB3CD"
}
```

It also needs this header:

```text
Authorization: Bearer YOUR_NOTIFY_API_KEY
```

The `slackUserId` field is optional. Use it only if you want Slack to @mention the assigned person.

## How to mention a specific person in Slack

The easiest setup posts every task into one channel, such as `#task-notifications`.

To notify a specific person inside that channel, include their Slack member ID in the `slackUserId` field.

To find a person's Slack member ID:

1. Open Slack.
2. Click the person's profile.
3. Click the three-dot menu.
4. Click **Copy member ID**.
5. Use that ID as `slackUserId`.

Example:

```json
{
  "taskTitle": "Install door hardware",
  "assigneeName": "John Smith",
  "slackUserId": "U012AB3CD"
}
```

A Slack Incoming Webhook posts to the channel you chose when you created the webhook. If you need to dynamically choose different Slack channels or send direct messages, you will need the more advanced Slack Web API with a bot token.

## Developer test with curl

Replace the URL and API key below.

```bash
curl -X POST "https://YOUR-RENDER-URL.onrender.com/api/tasks/assign" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_NOTIFY_API_KEY" \
  -d '{
    "taskId": "1043",
    "taskTitle": "Frame inspection checklist",
    "assigneeName": "John Smith",
    "projectName": "Lot 12 - North Ridge",
    "dueDate": "Friday 3:00 PM",
    "priority": "High",
    "assignedBy": "Mike",
    "taskUrl": "https://example.com/tasks/1043",
    "notes": "Meet the superintendent at the job trailer.",
    "slackUserId": "U012AB3CD"
  }'
```

## Available routes

```text
GET  /                         Browser test page
GET  /health                   Health check for Render
GET  /example                  Example task JSON
POST /api/tasks/assign         Main task assignment notification endpoint
POST /notify/slack             Alternate endpoint name
```

## Troubleshooting

### I get `Unauthorized`

Your `NOTIFY_API_KEY` in the request does not match the one in Render. Check the spelling and spaces.

### I get `Missing SLACK_WEBHOOK_URL`

You did not add the Slack webhook URL in Render. Go to your Render service, click **Environment**, add `SLACK_WEBHOOK_URL`, then save and redeploy.

### I get `SLACK_WEBHOOK_URL does not look like a Slack Incoming Webhook URL`

Make sure you copied the full Slack webhook URL. It should start with:

```text
https://hooks.slack.com/services/
```

### The message goes to the wrong Slack channel

The channel is controlled by the webhook you created in Slack. Create a new webhook and choose the correct channel, then update `SLACK_WEBHOOK_URL` in Render.

### The Slack @mention does not work

Use the Slack member ID, not the person's display name. A member ID usually looks like `U012AB3CD`.

### The Open Task button does not show

The `taskUrl` must start with `http://` or `https://`.

## Security notes

- Never commit your real Slack webhook URL to GitHub.
- Never commit a real `.env` file to GitHub.
- Use `NOTIFY_API_KEY` so random people cannot post messages to your Slack channel.
- If your Slack webhook URL is exposed, delete it in Slack and create a new one.

## License

MIT
