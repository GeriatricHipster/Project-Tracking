# Start Here: BuildTrack Cloud through GitHub

These steps are written for a non-coder. You can upload the project to GitHub through the website and deploy it through Render.

## Step 1: Unzip the project

Download and unzip the BuildTrack Cloud ZIP file.

Open the unzipped folder. You should see files and folders like this:

```text
client
server
package.json
render.yaml
README.md
START_HERE_GITHUB.md
```

Upload the unzipped contents, not the ZIP file itself.

## Step 2: Create a GitHub repository

1. Go to GitHub.
2. Click the `+` button near the top-right.
3. Click `New repository`.
4. Name it something like `buildtrack-cloud`.
5. Choose `Private` if this is for your company.
6. Do not add a README, license, or gitignore on GitHub.
7. Click `Create repository`.

## Step 3: Upload the project files to GitHub

1. On the empty repo page, click `uploading an existing file`.
2. Open the unzipped BuildTrack folder on your computer.
3. Select everything inside that folder.
4. Drag those files and folders into GitHub.
5. Use this commit message:

```text
Initial BuildTrack Cloud upload
```

6. Click `Commit changes`.

After upload, make sure `render.yaml` is visible at the top level of the repo.

## Step 4: Deploy on Render

1. Open Render.
2. Click `New +`.
3. Choose `Blueprint`.
4. Connect your GitHub account if asked.
5. Select your BuildTrack GitHub repository.
6. Render should find `render.yaml`.
7. Click `Deploy Blueprint`.

Render will create:

```text
buildtrack-cloud   web app
buildtrack-db      PostgreSQL database
```

## Step 5: Open the app

When Render finishes, open the live app URL. It will look similar to:

```text
https://buildtrack-cloud.onrender.com
```

Register your first real account. In a fresh database, the first registered user becomes a site owner.

## Step 6: Add your team

Managers and owners can use the `Site members` tab to:

- Change a user's site role
- Revoke access
- Delete a user
- See which projects each user is assigned to

Project managers and owners can also open a project and use the `Project members` panel to assign registered users to that project.

## Step 7: Use the new project tools

Inside a project, you can now use:

- Gantt chart
- Project checklist
- Task list
- Blueprint drag-and-drop upload
- Dependencies
- Project members
- Activity history

Checklist items included on the Gantt chart section:

```text
IPs requested
Panel ordered
Clearances programmed
Doors programmed
CCure Operator established
```

## Updating an existing GitHub repo

Use `UPDATE_EXISTING_GITHUB_REPO.md`.
