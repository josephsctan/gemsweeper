# play.ps1 - launches Gemsweeper locally for playing/testing.
#
# Usage:
#   .\play.ps1            # dev server (hot-reload), opens your browser
#   .\play.ps1 -Preview   # production build served exactly as GitHub Pages does

param(
    [switch]$Preview
)

$ErrorActionPreference = 'Stop'

# Always run from the repo root, regardless of where this script is invoked from.
Set-Location $PSScriptRoot

if (-not (Test-Path (Join-Path $PSScriptRoot 'node_modules'))) {
    Write-Host "Installing dependencies (first run only)..." -ForegroundColor Cyan
    npm install
}

if ($Preview) {
    Write-Host "Building production bundle..." -ForegroundColor Cyan
    npm run build
    Write-Host "Serving the production build. Press Ctrl+C to stop." -ForegroundColor Cyan
    npm run preview -- --open
} else {
    Write-Host "Starting dev server. Press Ctrl+C to stop." -ForegroundColor Cyan
    npm run dev -- --open
}
