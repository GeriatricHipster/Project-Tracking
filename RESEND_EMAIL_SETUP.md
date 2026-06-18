# Resend invitation email setup

BuildTrack can send project invitation emails through Resend when you add a registered user to a project.

This is optional. Project assignments still work even if email is not turned on.

## What you need

You need:

```text
A Resend account
A Resend API key
A verified sending domain or approved sender address
Your live BuildTrack app URL
```

The sender address should usually be something like:

```text
schedule@yourcompany.com
```

## Step 1: Create your Resend API key

1. Sign in to Resend.
2. Open the API Keys area.
3. Create a new API key.
4. Copy the API key.

Keep this key private. Do not upload it to GitHub.

## Step 2: Verify your sending domain

In Resend, add and verify your company domain.

Example:

```text
yourcompany.com
```

Resend will give you DNS records to add at your domain provider. Your IT person or whoever manages your website/domain can help with this.

After the domain is verified, choose a sender email address, for example:

```text
schedule@yourcompany.com
```

## Step 3: Add Resend settings in Render

1. Open Render.
2. Open your `buildtrack-cloud` web service.
3. Click **Environment**.
4. Add these variables:

```text
EMAIL_PROVIDER=resend
APP_URL=https://YOUR-BUILDTRACK-APP.onrender.com
RESEND_API_KEY=your-resend-api-key
RESEND_FROM=schedule@yourcompany.com
RESEND_FROM_NAME=BuildTrack Cloud
```

Optional reply-to address:

```text
RESEND_REPLY_TO=office@yourcompany.com
```

Use your real BuildTrack URL for `APP_URL`.

## Step 4: Save and redeploy

After adding the variables in Render:

1. Click **Save changes**.
2. Let Render redeploy the app.
3. Open BuildTrack again.

## Step 5: Test an invitation

1. Make sure the person already has a BuildTrack account using the email you will add.
2. Open a project.
3. Open the **Members** panel.
4. Enter the user's email.
5. Choose their role.
6. Leave **Send invitation email** checked.
7. Click **Add / update member**.

You should see a confirmation that the invitation email was sent.

## Troubleshooting

If the user is added but the email is not sent, check these items:

```text
EMAIL_PROVIDER must be resend
RESEND_API_KEY must be correct
RESEND_FROM must be filled in
RESEND_FROM should use a verified domain or sender in Resend
APP_URL should be your live BuildTrack URL
The person must already have a BuildTrack account with that email
```

Open the Render **Logs** tab for the exact error message.

## Safe handling reminder

Do not paste your Resend API key into GitHub files.

Only add the key inside Render's Environment settings.
