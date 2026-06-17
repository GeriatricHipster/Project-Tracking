$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$confirm = Read-Host "This will delete the local Docker PostgreSQL data volume. Type RESET to continue"
if ($confirm -ne "RESET") {
  Write-Host "Canceled."
  exit 0
}

docker compose version *> $null
if ($LASTEXITCODE -eq 0) {
  docker compose down -v
  Write-Host "Local database volume removed. Run .\run-local.ps1 to recreate and seed it."
  exit 0
}

docker-compose version *> $null
if ($LASTEXITCODE -eq 0) {
  docker-compose down -v
  Write-Host "Local database volume removed. Run .\run-local.ps1 to recreate and seed it."
  exit 0
}

Write-Host "Docker Compose is not available."
exit 1
