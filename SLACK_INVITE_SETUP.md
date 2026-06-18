# Slack channel invitation setup

This version sends the project invitation code when a project manager or project owner adds or updates a project member. The separate Slack invite panel was removed.

The normal flow is now:

1. Open a project.
2. Use **Project members**.
3. Add or update the member.
4. BuildTrack creates a one-use project invite code for that member.
5. BuildTrack posts the code into your chosen Slack channel.
6. The Slack message calls out the assigned BuildTrack email.

The user still needs a BuildTrack account. The code is targeted to that BuildTrack user/email.

---

## What you need from Slack

You need a Slack **Incoming Webhook**. A webhook is a special Slack URL that lets BuildTrack post a message into one Slack channel.

You do **not** need Slack direct messages, `SLACK_BOT_TOKEN`, or the `users:read.email` permission for this version.

---

# Part 1: Create or update your Slack app

## Step 1: Open Slack apps

Go to:

```text
https://api.slack.com/apps
```

Open your existing **BuildTrack Cloud** Slack app, or create a new app.

If creating a new app:

1. Click **Create New App**.
2. Choose **From scratch**.
3. Name it:

```text
BuildTrack Cloud
```

4. Choose your company Slack workspace.
5. Click **Create App**.

---

## Step 2: Turn on Incoming Webhooks

Inside the Slack app settings:

1. Click **Incoming Webhooks** in the left menu.
2. Turn **Activate Incoming Webhooks** to **On**.
3. Click **Add New Webhook to Workspace**.
4. Choose the Slack channel where BuildTrack should post project invitation codes.

A good channel name would be:

```text
#project-invites
```

5. Click **Allow**.
6. Copy the webhook URL Slack gives you.

The webhook URL should start with:

```text
https://hooks.slack.com/services/
```

Treat this URL like a password. Do not paste it into GitHub.

---

# Part 2: Add the Slack webhook to Render

Open Render and go to your BuildTrack web service, usually:

```text
buildtrack-cloud
```

Click:

```text
Environment
```

Add these environment variables:

| Key | Value |
|---|---|
| `SLACK_WEBHOOK_URL` | Paste the Slack webhook URL that starts with `https://hooks.slack.com/services/` |
| `APP_URL` | Your live BuildTrack app URL |

Example:

```text
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
APP_URL=https://buildtrack-cloud.onrender.com
```

Do not add a slash at the end of `APP_URL`.

Use this:

```text
https://buildtrack-cloud.onrender.com
```

Not this:

```text
https://buildtrack-cloud.onrender.com/
```

Then click:

```text
Save, rebuild, and deploy
```

---

# Part 3: Test it

1. Open BuildTrack.
2. Open a project.
3. Find **Project members**.
4. Add or update a registered user.
5. Use the email address registered in BuildTrack.
6. Click **Add / update member**.

A notice should appear telling you whether the Slack channel invitation was sent.

The Slack channel message will include:

- Project name
- Project location
- Project dates
- Assigned BuildTrack email
- Project role
- Invitation code
- Link to accept the invitation

---

# Troubleshooting

## The project member was updated, but no Slack message was sent

Check Render for this exact key:

```text
SLACK_WEBHOOK_URL
```

Make sure you clicked **Save, rebuild, and deploy** after adding it.

## The message went to the wrong Slack channel

A Slack Incoming Webhook is tied to the channel you selected when you created it.

Fix:

1. Go back to the Slack app.
2. Open **Incoming Webhooks**.
3. Click **Add New Webhook to Workspace**.
4. Choose the correct channel.
5. Copy the new webhook URL.
6. Replace `SLACK_WEBHOOK_URL` in Render.
7. Click **Save, rebuild, and deploy**.

## The link opens the wrong website

Check this Render key:

```text
APP_URL
```

It should be your live BuildTrack URL.

## Owner role did not get an invite code

BuildTrack does not create owner invite codes. Owner access is powerful, so owner assignment is handled directly in the app.
