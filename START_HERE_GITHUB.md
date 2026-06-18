# Start here: no-terminal GitHub setup

This guide is for setting up BuildTrack Cloud without typing terminal commands.

Important clarification: GitHub stores and tracks the app code. Because this app has a live backend and PostgreSQL database, GitHub alone cannot host the full production app. The included `render.yaml` file lets Render create the live web app and database directly from your GitHub repository.

You will use:

- GitHub: where the project files live
- Render: where the live app and database run

No coding or local terminal is required.

---

## Part A: Upload the project to GitHub

### 1. Unzip the file you received

Unzip the project ZIP on your computer.

Open the unzipped folder. You should see files and folders like this:

```text
client
server
package.json
render.yaml
README.md
```

The most important file is:

```text
render.yaml
```

It must be at the top level of your GitHub repository.

### 2. Create a new GitHub repository

1. Go to GitHub.
2. Click the plus sign near the top-right.
3. Click **New repository**.
4. Repository name suggestion:

```text
buildtrack-cloud
```

5. Choose **Private** if this is for your company.
6. Do not add a README, .gitignore, or license on GitHub because this project already includes those files.
7. Click **Create repository**.

### 3. Upload the project files using the GitHub website

On the empty repository page:

1. Click **uploading an existing file**.
2. Open the unzipped project folder on your computer.
3. Select the files and folders INSIDE the project folder.
4. Drag them into the GitHub upload area.
5. Wait for the upload to finish.
6. At the bottom, leave the commit message as-is or type:

```text
Initial BuildTrack Cloud upload
```

7. Click **Commit changes**.

Important: Do not drag the outer folder itself if it creates a folder inside GitHub. The repository top level should show `client`, `server`, `package.json`, and `render.yaml`.

### 4. Confirm the upload is correct

After committing, your GitHub repository should show these items near the top level:

```text
client
server
package.json
render.yaml
README.md
START_HERE_GITHUB.md
```

If `render.yaml` is inside another folder, Render will not find it. Move the files to the top level or re-upload the contents of the folder.

---

## Part B: Deploy the live app from GitHub using Render

### 5. Create or open your Render account

Go to Render and sign in.

Use the same GitHub account when Render asks to connect to GitHub.

### 6. Create a Blueprint deployment

In Render:

1. Click **New +**.
2. Click **Blueprint**.
3. Connect GitHub if prompted.
4. Select the repository you uploaded, for example:

```text
buildtrack-cloud
```

5. Render should detect the `render.yaml` file.
6. Review the services Render plans to create.

The Blueprint should create:

```text
buildtrack-cloud   web service
buildtrack-db      PostgreSQL database
```

7. Click **Apply** or **Deploy Blueprint**.

### 7. Wait for deployment to finish

Render will build the app, create the database, and start the web service.

When it is done, open the web service URL. It will look similar to:

```text
https://buildtrack-cloud.onrender.com
```

### 8. Create your real account

Open the live URL and use **Register** to create your own account.

Recommended first account:

```text
Name: Your name
Email: your work email
Password: a strong password
```

---

## Part C: Basic first-use checklist

After registering:

1. Create a project.
2. Add a few tasks.
3. Assign start and finish dates.
4. Open the Gantt chart.
5. Register a second user.
6. Add the second user as a project member.
7. Check the Assignments tab to see who is assigned to each project.
8. Check the Calendar tab to see project dates and status.
9. Use **Move to completed** on a finished project to file it under Completed.
10. Use **Delete** only when you want to permanently remove a project.

The app supports project members, optional Resend or SMTP invitation emails, task edits, dependencies, audit history, live update notifications, Active Projects, Completed, Assignments, and Calendar dashboard tabs, project-level Gantt charts, visibility controls, and owner-only project deletion.

---

---

---

## Visibility rule in this version

Project visibility now works like this:

```text
Viewer/editor users: see only projects they are assigned to
Manager/owner users: can view the full project portfolio
```

A user is treated as a manager/owner for portfolio viewing when they have a **manager** or **owner** role on at least one project. If they open a project they are not directly assigned to, they can view it, but they cannot edit it unless they are added as a member of that specific project with edit/manage rights.

## Optional: turn on invitation emails with Resend or SMTP

The app can send an invitation email when you assign a registered user to a project. This is optional and requires Resend or SMTP email settings in Render.

Open this file in the project for the simple setup steps:

```text
EMAIL_INVITATION_SETUP.md
RESEND_EMAIL_SETUP.md
```

Without those email settings, project assignments still work; the app will simply tell you the email was not sent.

## Common problems

### Render says it cannot find a Blueprint

Check GitHub. The file below must be at the top level of the repository:

```text
render.yaml
```

It should not be inside another folder.

### The app URL opens but shows an error

In Render, open the `buildtrack-cloud` service and check the **Logs** tab.

The most common causes are:

- the database is still starting
- the first deployment is still running
- the database URL was not created correctly

The included `render.yaml` is designed to set the database URL automatically.

### I uploaded the whole folder by mistake

If your GitHub page shows this:

```text
construct-timeline-cloud/render.yaml
```

instead of this:

```text
render.yaml
```

then the files are one folder too deep.

The easy fix is to create a new empty repository and upload the files inside the project folder, not the outer folder itself.

### I want to update the app later

For simple text or code changes:

1. Open the file in GitHub.
2. Click the pencil icon.
3. Make the change.
4. Click **Commit changes**.

Render will redeploy from GitHub after changes are committed.

---

## What not to upload

Do not upload real password files or secret files.

Do not create or upload files named:

```text
.env
server/.env
client/.env
```

This project only includes safe example files:

```text
server/.env.example
client/.env.example
```

Those are okay to upload.

## Production note about free hosting

The included Render Blueprint uses free plans so you can test deployment with the least friction. For a real construction company schedule tracker, move the web service and database to paid plans before relying on it for active projects, backups, and team operations.
