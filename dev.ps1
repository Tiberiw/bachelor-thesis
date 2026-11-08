# Local dev helper.
#   .\dev.ps1 up      start Postgres (Docker), then back-end and frontend in new windows
#   .\dev.ps1 down    stop Postgres (data is kept)
#   .\dev.ps1 reset   stop Postgres and delete its data volume, then start fresh
param(
    [Parameter(Position = 0)]
    [ValidateSet('up', 'down', 'reset')]
    [string]$Command = 'up'
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$envFile = Join-Path $root 'back-end\.env'

function Invoke-Compose {
    Wait-Docker
    docker compose --env-file $envFile -f (Join-Path $root 'docker-compose.yml') @args
    if ($LASTEXITCODE -ne 0) { throw "docker compose $($args -join ' ') failed" }
}

# `docker info` can hang while Docker Desktop's engine is starting, so probe it
# in a child process with a per-attempt timeout instead of calling it directly.
function Wait-Docker([int]$timeoutSec = 180) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        $probe = Start-Process docker -ArgumentList 'info' -PassThru -WindowStyle Hidden `
            -RedirectStandardOutput ([IO.Path]::GetTempFileName()) -RedirectStandardError ([IO.Path]::GetTempFileName())
        $null = $probe.Handle  # without this, ExitCode can read as $null after WaitForExit
        if ($probe.WaitForExit(10000) -and $probe.ExitCode -eq 0) { return }
        if (-not $probe.HasExited) { $probe.Kill() }
        Write-Host "Waiting for Docker engine (open Docker Desktop if it is not running)..."
        Start-Sleep -Seconds 3
    }
    throw "Docker engine did not become ready within $timeoutSec seconds."
}

function Start-Db {
    if (-not (Test-Path $envFile)) { throw "Missing back-end\.env - copy back-end\.env.example and fill it in." }
    Wait-Docker
    Write-Host "Starting Postgres (the first run downloads the image, which can take a minute)..."
    Invoke-Compose up -d --wait db
}

function Start-App($dir, $script) {
    $path = Join-Path $root $dir
    if (-not (Test-Path (Join-Path $path 'node_modules'))) {
        Write-Host "Installing $dir dependencies..."
        Push-Location $path; npm install; Pop-Location
    }
    Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$path'; npm run $script"
}

switch ($Command) {
    'up' {
        Start-Db
        Start-App 'back-end' 'start:dev'
        Start-App 'frontend' 'start'
        Write-Host "Database up on localhost:5433. Back-end (3000) and frontend (4200) are starting in new windows."
    }
    'down' { Invoke-Compose down }
    'reset' {
        Invoke-Compose down -v
        Start-Db
    }
}
