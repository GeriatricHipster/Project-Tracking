# Slack invitation code setup

This version lets a project manager or project owner create a project invitation code and send it to a Slack channel.

The easiest Slack setup is an **Incoming Webhook**. Think of it like a private delivery address. BuildTrack sends the invitation message to that address, and Slack posts it into the channel you picked.

## What the feature does

Inside a project, managers and owners will see a **Slack invite code** panel.

From that panel, they can:

- choose the project access level for the invite code
- choose how many days the code stays active
- choose how many people can use the code
- send the code to a Slack channel

People who receive the Slack message can either:

- click the invite link, log in or register, and get added to the project
- copy the code from Slack and paste it into **Join with invite code** on the main BuildTrack dashboard

## Important access rules

- People still need a BuildTrack account before they can use the code.
- Project managers can create **editor** and **viewer** invite codes.
- Project owners can create **manager**, **editor**, and **viewer** invite codes.
- The app does not create owner invite codes for safety. Add owners manually from the Project members panel.
- The Slack webhook posts to one Slack channel. To post to a different channel, create another webhook for that channel and replace the webhook URL in Render.

---

# Part 1: Create the Slack webhook

## Step 1: Open the Slack app page

Go to the Slack app page in your browser:

```text
https://api.slack.com/apps
```

Sign in with the Slack workspace you use for your company.

## Step 2: Create a Slack app

Click:

```text
Create New App
```

Choose:

```text
From scratch
```

For the app name, use something clear, such as:

```text
BuildTrack Cloud
```

Choose your company Slack workspace.

Click:

```text
Create App
```

## Step 3: Turn on Incoming Webhooks

In the left menu, click:

```text
Incoming Webhooks
```

Turn this on:

```text
Activate Incoming Webhooks
```

## Step 4: Pick the Slack channel

Click:

```text
Add New Webhook to Workspace
```

Slack will ask which channel the app should post to.

Choose a channel like:

```text
#project-invites
```

or another channel your project team watches.

Click:

```text
Allow
```

## Step 5: Copy the webhook URL

Slack will show a long URL that starts with:

```text
https://hooks.slack.com/services/
```

Copy the full URL.

Treat this URL like a password. Do not put it into GitHub, email it around, or post it in Slack.

---

# Part 2: Add the webhook to Render

## Step 1: Open Render

Go to Render and open your BuildTrack web service.

It is usually named:

```text
buildtrack-cloud
```

## Step 2: Open Environment settings

Click:

```text
Environment
```

## Step 3: Add the Slack variable

Add this environment variable:

| Key | Value |
|---|---|
| `SLACK_WEBHOOK_URL` | Paste the Slack webhook URL you copied |

It should look like this:

```text
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/slack/webhook
```

## Step 4: Add your app URL

Add this environment variable too:

| Key | Value |
|---|---|
| `APP_URL` | Your live BuildTrack website URL |

Example:

```text
APP_URL=https://buildtrack-cloud.onrender.com
```

Do not add a slash at the end.

Use this:

```text
https://buildtrack-cloud.onrender.com
```

Not this:

```text
https://buildtrack-cloud.onrender.com/
```

## Step 5: Save and redeploy

Click:

```text
Save, rebuild, and deploy
```

Render will restart the app with the new Slack setting.

---

# Part 3: Send a Slack invitation code

## Step 1: Open BuildTrack

Open your live BuildTrack site.

## Step 2: Open a project

Go to:

```text
Active projects
```

Click:

```text
Open project
```

## Step 3: Find the Slack invite panel

On the right side of the project page, look for:

```text
Slack invite code
```

## Step 4: Choose the invite settings

Choose:

```text
Access level
Expires in days
Max uses
```

Suggested starting settings:

```text
Access level: viewer
Expires in days: 7
Max uses: 10
```

## Step 5: Send it

Click:

```text
Send invite code to Slack
```

BuildTrack will post the invite code to the Slack channel connected to your webhook.

---

# Part 4: How your team uses the code

The person receiving the Slack invite can click:

```text
Open invitation
```

Then they log in or register.

BuildTrack will add them to the project automatically.

They can also copy the invite code from Slack, open BuildTrack, and paste it into:

```text
Join with invite code
```

---

# Troubleshooting

## The app says Slack is not set up

Check Render and make sure this exact key exists:

```text
SLACK_WEBHOOK_URL
```

Then save and redeploy.

## The Slack message does not appear

Check these items:

1. The webhook URL was copied correctly.
2. The Slack app is installed to the correct workspace.
3. The webhook is connected to the channel you expected.
4. Render was redeployed after adding the environment variable.

## The invite link opens the wrong page

Check this Render environment variable:

```text
APP_URL
```

It should be your live BuildTrack website URL.

## Someone cannot use the code

Check these items:

1. They have a BuildTrack account.
2. The code has not expired.
3. The code has not reached the max uses limit.
4. Their site access has not been revoked.

## I need invites in multiple Slack channels

Slack webhooks are tied to the channel selected during setup.

The simplest approach is to use one channel for all project invites, such as:

```text
#project-invites
```

To change the channel, create a new Slack webhook for that channel and replace `SLACK_WEBHOOK_URL` in Render.
