# Optional Outlook invitation email setup

This app now has a checkbox named **Send Outlook invitation email** when a manager or owner adds a registered user to a project.

The project assignment still works even if email is not configured. If email is not configured yet, the app will add the user and show a message that the invitation email was not sent.

You can use either Microsoft Graph or Outlook SMTP. Microsoft Graph is the better long-term Microsoft 365 option. Outlook SMTP is simpler, but your Microsoft 365 administrator may need to enable SMTP AUTH for the sending mailbox.

---

## What the email does

When you add a project member and leave the email checkbox turned on, the app sends an email that includes:

- project name
- project location
- project start and finish dates
- the user's project role
- a link back to the project

Important: The user must already have a registered BuildTrack Cloud account using the same email address before you can add them to a project.

---

## Where to add the settings in Render

1. Open Render.
2. Open your **buildtrack-cloud** web service.
3. Click **Environment**.
4. Add the variables from one of the setup options below.
5. Click **Save Changes**.
6. Let Render redeploy the app.

---

# Option A: Microsoft Graph setup

Use this if you have a Microsoft 365 administrator who can create an app registration in Microsoft Entra/Azure.

Add these Render environment variables:

```text
EMAIL_PROVIDER=graph
APP_NAME=BuildTrack Cloud
APP_URL=https://YOUR-APP-NAME.onrender.com
OUTLOOK_FROM_EMAIL=schedule@yourcompany.com
MICROSOFT_TENANT_ID=your-tenant-id
MICROSOFT_CLIENT_ID=your-application-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret-value
```

Replace this value with your real live app URL:

```text
https://YOUR-APP-NAME.onrender.com
```

Your Microsoft administrator needs to give the app permission to send mail through Microsoft Graph. The permission is named:

```text
Mail.Send
```

Use the least amount of access possible for your company. Ideally, your Microsoft administrator should restrict the app so it can only send from the one mailbox used for BuildTrack invitations.

---

# Option B: Outlook SMTP setup

Use this if your Microsoft 365 administrator allows authenticated SMTP for one mailbox.

Add these Render environment variables:

```text
EMAIL_PROVIDER=smtp
APP_NAME=BuildTrack Cloud
APP_URL=https://YOUR-APP-NAME.onrender.com
OUTLOOK_FROM_EMAIL=schedule@yourcompany.com
OUTLOOK_SMTP_HOST=smtp.office365.com
OUTLOOK_SMTP_PORT=587
OUTLOOK_SMTP_SECURE=false
OUTLOOK_SMTP_USER=schedule@yourcompany.com
OUTLOOK_SMTP_PASS=your-mailbox-password-or-app-password
```

Important notes:

- Use a dedicated mailbox if possible, such as `schedule@yourcompany.com`.
- The sending mailbox must be allowed to send email through SMTP AUTH.
- Some Microsoft 365 tenants block SMTP AUTH by default.
- If your company uses multi-factor authentication, a normal password may not work. Your Microsoft administrator may need to provide the correct app password or choose the Microsoft Graph setup instead.

---

## How to test it

1. Register two BuildTrack users.
2. Log in as a project owner or manager.
3. Open a project.
4. Add the second user's email as a member.
5. Leave **Send Outlook invitation email** checked.
6. Click **Add / update member**.

Expected result:

```text
Member added. Outlook invitation sent to user@company.com.
```

If you see a warning instead, the project assignment still worked, but the email settings need to be checked in Render.

---

## Common fixes

### The member was added, but the email did not send

Check that all Render environment variables are spelled exactly right.

### SMTP says authentication failed

Ask your Microsoft 365 administrator whether SMTP AUTH is enabled for the sending mailbox.

### Graph says permission denied

Ask your Microsoft 365 administrator to confirm that the app registration has Microsoft Graph `Mail.Send` permission and admin consent.

### The project link in the email is wrong

Update this Render environment variable:

```text
APP_URL=https://YOUR-APP-NAME.onrender.com
```

Do not add a slash at the end.
