# Project-Tracking hotfix

Open the `github-ready-hotfix` folder. The recommended commit message is:

```text
Fix project view date parsing and building dropdown button
```

Unzip this package into the root of your local Project-Tracking repo so it looks like this:

```text
Project-Tracking/
  client/
  server/
  package.json
  github-ready-hotfix/
```

Then run one of these from the repo root.

Mac/Linux:

```bash
bash github-ready-hotfix/apply-and-commit.sh
```

Windows PowerShell:

```powershell
.\github-ready-hotfix\apply-and-commit.ps1
```

Then push:

```bash
git push origin main
```
