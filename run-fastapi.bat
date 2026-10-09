@echo off
title Urban Mobility - FastAPI Backend (Port 8000)
echo ===================================================
echo Starting Urban Mobility Platform - FastAPI Backend
echo Port: 8000
echo ===================================================
cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel% equ 0 (
    python backend-fastapi\run_server.py
    goto end
)

where py >nul 2>nul
if %errorlevel% equ 0 (
    py backend-fastapi\run_server.py
    goto end
)

where wsl >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Python command not found in Windows PATH.
    echo [INFO] Automatically launching via WSL Python 3...
    wsl python3 backend-fastapi/run_server.py
    goto end
)

echo [ERROR] Python not found. Please install Python or use WSL.
pause

:end
