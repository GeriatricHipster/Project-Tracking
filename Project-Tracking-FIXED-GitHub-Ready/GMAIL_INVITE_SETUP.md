# Gmail email invitation setup

This app can send project invitation codes by email through a Gmail account when a manager or owner adds or updates a project member.

## What you need

- A Gmail account you can dedicate to BuildTrack notifications
- 2-Step Verification turned on for that Gmail account
- A Gmail App Password
- Your live PSG and SS Tracking app URL

## Step 1: Turn on 2-Step Verification

1. Sign in to the Gmail account you want BuildTrack to use.
2. Open your Google Account security settings.
3. Turn on **2-Step Verification** if it is not already enabled.

Google requires 2-Step Verification before you can create an App Password.

## Step 2: Create an App Password

1. In the same Google Account, go to **App passwords**.
2. Create a new app password for **Mail** or **Other**.
3. Copy the generated password.

Use this password in BuildTrack, not your normal Gmail password.

## Step 3: Add the settings in Render

Open Render and go to your BuildTrack web service.

Add these environment variables:

- `EMAIL_PROVIDER` = `gmail`
- `SMTP_HOST` = `smtp.gmail.com`
- `SMTP_PORT` = `587`
- `SMTP_SECURE` = `false`
- `SMTP_REQUIRE_TLS` = `true`
- `SMTP_USER` = your Gmail address, such as `buildtrack@gmail.com`
- `SMTP_PASS` = the Gmail App Password you copied
- `EMAIL_FROM` = the same Gmail address
- `EMAIL_FROM_NAME` = `PSG and SS Tracking`
- `APP_URL` = your live BuildTrack website address

Example:

```text
EMAIL_PROVIDER=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=buildtrack@gmail.com
SMTP_PASS=your-gmail-app-password
EMAIL_FROM=buildtrack@gmail.com
EMAIL_FROM_NAME=PSG and SS Tracking
APP_URL=https://your-buildtrack-app.onrender.com
```

After saving, click **Save, rebuild, and deploy**.

## Step 4: Test it

1. Open BuildTrack.
2. Open a project.
3. Go to **Project members**.
4. Add or update a member with a real email address.
5. An email with the invitation code should be sent.

## Notes

- The assigned person must already have a BuildTrack account.
- Gmail works without a custom domain because you are sending from your Gmail mailbox.
- If email does not send, the most common issue is a wrong App Password.
