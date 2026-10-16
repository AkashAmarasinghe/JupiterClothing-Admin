$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host '=============================================='
Write-Host '      Jupiter Admin - Local Launcher'
Write-Host '=============================================='
Write-Host ''

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host '[ERROR] Node.js is not installed or is not in PATH.' -ForegroundColor Red
    Write-Host 'Install Node.js LTS and run this script again.'
    Read-Host 'Press Enter to close'
    exit 1
}

if (-not (Test-Path 'node_modules/vite/package.json')) {
    Write-Host '[1/2] Installing frontend packages...'
    npm install
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }
} else {
    Write-Host '[1/2] Frontend packages already installed.'
}

Write-Host '[2/2] Starting Jupiter Admin...'
Write-Host ''
Write-Host 'The browser will open: http://localhost:3000/signin.html'
Write-Host 'Keep this window open while using the admin panel.'
Write-Host 'Press Ctrl+C to stop the server.'
Write-Host ''
npm run dev -- --host 127.0.0.1
