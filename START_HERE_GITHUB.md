# Start Here: Create and Deploy PSG and SS Tracking Without Terminal

These steps are written for GitHub's website and Render. You do not need to run Terminal commands.

## What you are creating

This app tracks construction project timelines and includes:

- Active Projects tab
- Completed Projects tab
- Projects / assignments tab showing who is assigned to each project
- Calendar overview of projects and status
- Gantt chart for each project
- Project Check list for IPs, panels, clearances, doors, and CCure operator setup
- Drag-and-drop blueprint uploads
- Project member assignments
- Site member management for managers and owners

GitHub stores the code. Render runs the live website, backend, and PostgreSQL database.

---

## Step 1: Unzip this folder

Unzip the downloaded file on your computer.

Open the unzipped folder. You should see:

```text
client
server
package.json
render.yaml
README.md
START_HERE_GITHUB.md
```

Upload the contents of the folder, not the ZIP file itself.

---

## Step 2: Create a GitHub repository

1. Go to GitHub.
2. Click the **+** button near the top-right.
3. Click **New repository**.
4. Name it something like:

```text
buildtrack-cloud
```

5. Choose **Private** if this is for your company.
6. Do not add a README, license, or .gitignore.
7. Click **Create repository**.

---

## Step 3: Upload the app files to GitHub

1. In the empty GitHub repo, click **uploading an existing file**.
2. Open the unzipped app folder on your computer.
3. Select all files and folders inside it.
4. Drag them into GitHub.
5. At the bottom, enter this commit message:

```text
Upload PSG and SS Tracking
```

6. Click **Commit changes**.

Important: `render.yaml` must be at the top level of the repo, not inside another folder.

---

## Step 4: Deploy with Render Blueprint

1. Open Render.
2. Click **New +**.
3. Choose **Blueprint**.
4. Connect your GitHub account if asked.
5. Select your `buildtrack-cloud` repository.
6. Render should find `render.yaml`.
7. Click **Deploy Blueprint**.

Render will create:

```text
buildtrack-cloud   the live app
buildtrack-db      the PostgreSQL database
```

---

## Step 5: Open the app

When Render finishes, open the web address it gives you. It will look similar to:

```text
https://buildtrack-cloud.onrender.com
```

Click **Register** and create your first real account.

The first registered account becomes a **site owner**.

---

## Step 6: Manage users

After logging in as a site owner or site manager:

1. Open the **Site members** tab.
2. Review registered users.
3. Change site role if needed.
4. Revoke access when someone should no longer log in.
5. Restore access when needed.
6. Delete users only when they are no longer needed.

Site role options:

```text
Owner     full site management
Manager   can manage site users except protected owner actions
Member    normal user account
```

Project role options inside a project:

```text
Owner     can manage/delete that project
Manager   can manage that project
Editor    can edit tasks/checklists/uploads
Viewer    can view assigned projects only
```

---

## Step 7: Add blueprints to a project

1. Open a project.
2. Find the **Blueprints** panel.
3. Drag and drop a PDF, image, DWG, or drawing file.
4. Use **Download** to retrieve it later.

Default file limit: 25 MB.

---

## Step 8: Use the Project Check list

Open a project and look below the Gantt chart. You will see checkboxes for:

```text
IPs requested
Panel ordered
Clearances programmed
Doors programmed
CCure Operator established
```

Users with edit access can check or uncheck these items.

