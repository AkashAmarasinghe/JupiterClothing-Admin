@echo off
setlocal
cd /d "%~dp0"
title Jupiter Admin Launcher

echo ==============================================
echo       Jupiter Admin - Local Launcher
echo ==============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or is not in PATH.
  echo Install Node.js LTS, then run this file again.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm is not available in PATH.
  echo Reinstall Node.js LTS, then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\vite\package.json" (
  echo [1/2] Installing frontend packages...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
) else (
  echo [1/2] Frontend packages already installed.
)

echo [2/2] Starting Jupiter Admin...
echo.
echo The browser will open: http://localhost:3000/signin.html
echo Keep this window open while using the admin panel.
echo Press Ctrl+C to stop the server.
echo.
call npm run dev -- --host 127.0.0.1
