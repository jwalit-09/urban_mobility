@echo off
title Urban Mobility Platform Launcher
echo ========================================================
echo Launching Urban Mobility Platform
echo ========================================================
cd /d "%~dp0"

echo [1/2] Starting Backend Gateway...
start "Urban Mobility - Backend" cmd /k "run-fastapi.bat"

echo [2/2] Starting Frontend UI...
start "Urban Mobility - Frontend" cmd /k "run-frontend.bat"

echo.
echo ========================================================
echo Services launched!
echo - FastAPI Backend: http://localhost:8000
echo - React Dashboard: http://localhost:5173
echo ========================================================
echo You can close this launcher window at any time.
timeout /t 5 >nul
