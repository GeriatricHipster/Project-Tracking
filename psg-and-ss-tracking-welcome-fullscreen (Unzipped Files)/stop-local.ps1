$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

docker compose version *> $null
if ($LASTEXITCODE -eq 0) {
  docker compose down
  exit 0
}

docker-compose version *> $null
if ($LASTEXITCODE -eq 0) {
  docker-compose down
  exit 0
}

Write-Host "Docker Compose is not available."
exit 1
