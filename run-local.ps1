$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

function Get-ComposeCommand {
  docker compose version *> $null
  if ($LASTEXITCODE -eq 0) { return "docker compose" }

  docker-compose version *> $null
  if ($LASTEXITCODE -eq 0) { return "docker-compose" }

  return $null
}

try {
  docker --version *> $null
} catch {
  Write-Host "Docker is not installed or is not available in this terminal."
  Write-Host "Install Docker Desktop, open it, and run this script again."
  exit 1
}

$composeCommand = Get-ComposeCommand
if (-not $composeCommand) {
  Write-Host "Docker Compose is not available."
  Write-Host "Install Docker Desktop or docker compose, then run this script again."
  exit 1
}

if (-not (Test-Path "server/.env")) {
  Copy-Item "server/.env.example" "server/.env"
  Write-Host "Created server/.env from server/.env.example"
}

if (-not (Test-Path "client/.env")) {
  Copy-Item "client/.env.example" "client/.env"
  Write-Host "Created client/.env from client/.env.example"
}

Write-Host "Starting BuildTrack Cloud locally..."
Write-Host "Open http://localhost:5173 after the containers finish starting."
Write-Host "Demo login: admin@demo.com / Construction123!"

if ($composeCommand -eq "docker compose") {
  docker compose up --build
} else {
  docker-compose up --build
}
