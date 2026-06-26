$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")
$CommitMessage = Get-Content (Join-Path $ScriptDir "COMMIT_MESSAGE.txt") -Raw
$CommitMessage = $CommitMessage.Trim()

Set-Location $RepoRoot
node (Join-Path $ScriptDir "apply-update.js")

try {
  git rev-parse --is-inside-work-tree *> $null
  git add client/src/lib/dates.js client/src/components/TaskForm.jsx client/src/components/Dashboard.jsx client/src/styles.css server/src/server.js
  git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) {
    Write-Host "No new changes to commit."
  } else {
    git commit -m $CommitMessage
    Write-Host "Committed changes with message: $CommitMessage"
  }
} catch {
  Write-Host "Changes applied. This folder is not a git working tree, so no commit was created."
  Write-Host "Commit message: $CommitMessage"
}
