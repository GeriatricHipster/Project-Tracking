# Update an existing GitHub upload without using Terminal

Use these steps if you already uploaded an earlier version of BuildTrack Cloud to GitHub and want to replace it with this updated version.

## What this update adds

- A dashboard tab named **Active projects**
- A dashboard tab named **Completed**
- A dashboard tab named **Project assignments**
- A dashboard tab named **Calendar overview**
- A **Move to completed** button for manager/owner users
- A **Move back to active** button for completed projects
- An owner-only **Delete** button for permanently removing projects
- Assignment cards showing project users and roles
- A calendar month view showing all visible active and completed projects and their current status
- Optional invitation emails through Resend or SMTP when assigning a registered user to a project
- Viewer/editor visibility limited to assigned projects
- Owner/manager portfolio visibility across all projects

## Simple update steps

1. Unzip this updated project ZIP on your computer.
2. Open your existing GitHub repository in your browser.
3. Click **Add file**.
4. Click **Upload files**.
5. Drag the contents of the unzipped project folder into GitHub.
6. If GitHub asks whether to replace existing files, allow it.
7. Scroll to the bottom of the GitHub page.
8. Use this commit message:

```text
Add Resend email invites and project visibility controls
```

9. Click **Commit changes**.
10. Render should automatically redeploy after GitHub updates.

## Important check

After uploading, these files must still be at the top level of the GitHub repository:

```text
client
server
package.json
render.yaml
README.md
START_HERE_GITHUB.md
```

Do not upload the outer folder if it creates a folder inside GitHub. The files above need to be visible immediately when you open the repository.

## After Render redeploys

Open your live app URL and look at the top of the dashboard. You should see four main dashboard tabs:

```text
Active projects
Completed
Project assignments
Calendar overview
```

The Assignments tab uses the project members you add inside each project. The Calendar tab uses each project's start date, finish date, task progress, blocked tasks, and completed/active filing status. Finished projects can be moved to the Completed tab, restored to Active, or permanently deleted by an owner. When you add a registered user to a project, you can check **Send invitation email**. To turn that on, follow `EMAIL_INVITATION_SETUP.md` or `RESEND_EMAIL_SETUP.md` after Render redeploys.
