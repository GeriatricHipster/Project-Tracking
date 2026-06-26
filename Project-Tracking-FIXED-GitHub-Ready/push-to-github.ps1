$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

if ($args.Count -lt 1) {
  Write-Host "Usage: .\push-to-github.ps1 https://github.com/YOUR-USER/YOUR-REPO.git"
  Write-Host "Create an empty GitHub repo first, then run the command above."
  exit 1
}

$remoteUrl = $args[0]

git --version *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Git is not installed or is not available in this terminal."
  exit 1
}

if (-not (Test-Path ".git")) {
  git init
}

git checkout -B main
git add .

git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host "No file changes to commit."
} else {
  git commit -m "Initial PSG and SS Tracking deployment"
}

git remote get-url origin *> $null
if ($LASTEXITCODE -eq 0) {
  git remote set-url origin $remoteUrl
} else {
  git remote add origin $remoteUrl
}

git push -u origin main

Write-Host ""
Write-Host "Code pushed to GitHub."
Write-Host "Next: in Render, choose New + > Blueprint, connect this repo, and Render will read render.yaml."
