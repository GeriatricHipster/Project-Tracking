# Slack direct message invitation setup

This version sends the project invitation code when a project manager or project owner adds or updates a project member. The separate Slack invite panel was removed.

The normal flow is now:

1. Open a project.
2. Use **Project members**.
3. Add or update the member.
4. BuildTrack creates a one-use project invite code for that member.
5. BuildTrack sends the code to that person as a Slack direct message.

The user still needs a BuildTrack account. The Slack email and the BuildTrack email should match.

---

## What you need from Slack

Direct messages require a Slack **Bot User OAuth Token**. This is different from the older Slack webhook.

A webhook can post into a channel. A bot token can look up a Slack user by email, open a direct message, and send a message.

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

## Step 2: Add bot permissions

In the Slack app settings, go to:

```text
OAuth & Permissions
```

Scroll to:

```text
Bot Token Scopes
```

Add these scopes:

```text
chat:write
im:write
users:read
users:read.email
```

What these mean in plain language:

```text
chat:write        lets BuildTrack send a Slack message
im:write          lets BuildTrack open a direct message
users:read        lets BuildTrack look up Slack users
users:read.email  lets BuildTrack find a Slack user by email address
```

---

## Step 3: Install or reinstall the Slack app

Still in **OAuth & Permissions**, click:

```text
Install to Workspace
```

If the app was already installed, Slack may show:

```text
Reinstall to Workspace
```

Use that after adding new scopes.

Approve the installation.

---

## Step 4: Copy the bot token

After installation, Slack shows a token called:

```text
Bot User OAuth Token
```

It usually starts with:

```text
xoxb-
```

Copy that full token.

Treat this token like a password. Do not paste it into GitHub.

---

# Part 2: Add the Slack token to Render

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
| `SLACK_BOT_TOKEN` | Paste the Slack bot token that starts with `xoxb-` |
| `APP_URL` | Your live BuildTrack app URL |

Example:

```text
SLACK_BOT_TOKEN=xoxb-your-slack-token
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

Optional fallback if you still want channel messages when direct messages fail:

```text
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
SLACK_DM_FALLBACK_TO_WEBHOOK=true
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
5. Use an email address that matches that person's Slack account.
6. Click **Add / update member**.

A notice should appear telling you whether Slack sent the direct message.

The assigned person should receive a Slack DM from the BuildTrack Slack app.

---

# Troubleshooting

## The project member was updated, but no Slack DM was sent

Check Render for this exact key:

```text
SLACK_BOT_TOKEN
```

Make sure you clicked **Save, rebuild, and deploy** after adding it.

## Slack says `users_not_found`

The email in BuildTrack probably does not match the person's Slack account email.

Fix this by either:

1. Registering the BuildTrack user with the same email used in Slack, or
2. Updating the user's email in Slack/your company directory.

## Slack says `missing_scope`

Your Slack app is missing one of the required bot scopes.

Go back to Slack and add:

```text
chat:write
im:write
users:read
users:read.email
```

Then reinstall the Slack app to the workspace and update Render if Slack gives you a new token.

## The link opens the wrong website

Check this Render key:

```text
APP_URL
```

It should be your live BuildTrack URL.

## Owner role did not get an invite code

BuildTrack does not create owner invite codes. Owner access is powerful, so owner assignment is handled directly in the app.

