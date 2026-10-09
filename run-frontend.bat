@echo off
title Urban Mobility - Frontend UI (Port 5173)
echo ===================================================
echo Starting Urban Mobility Platform - React Frontend
echo Port: 5173
echo ===================================================
cd /d "%~dp0frontend"

where npm >nul 2>nul
if %errorlevel% equ 0 (
    npm run dev
    goto end
)

if exist "C:\Program Files\nodejs\npm.cmd" (
    echo [INFO] Running npm from C:\Program Files\nodejs...
    "C:\Program Files\nodejs\npm.cmd" run dev
    goto end
)

echo [ERROR] npm is not found in PATH or standard installation directory.
pause

:end
