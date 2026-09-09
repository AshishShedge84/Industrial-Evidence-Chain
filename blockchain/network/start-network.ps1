# PowerShell Network Lifecycle Script for Hyperledger Fabric Local Dev Network
[CmdletBinding()]
param (
    [switch]$Down,
    [switch]$Restart
)

$NetworkDir = $PSScriptRoot

if ($Down -or $Restart) {
    Write-Host "Stopping and cleaning Hyperledger Fabric containers..." -ForegroundColor Yellow
    docker compose -f "$NetworkDir\docker-compose.yaml" down -v --remove-orphans
    if ($Down) { exit 0 }
}

Write-Host "Starting Industrial Evidence Chain Hyperledger Fabric Network (v2.5.8)..." -ForegroundColor Cyan

# Check if Docker daemon is running
try {
    $null = docker info 2>&1
} catch {
    Write-Error "Docker Desktop is not running. Please start Docker Desktop and retry."
    exit 1
}

docker compose -f "$NetworkDir\docker-compose.yaml" up -d

Write-Host "`nNetwork Status:" -ForegroundColor Green
docker compose -f "$NetworkDir\docker-compose.yaml" ps
