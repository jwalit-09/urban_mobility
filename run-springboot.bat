@echo off
title Urban Mobility - Spring Boot Engine (Port 8080)
echo ===================================================
echo Starting Urban Mobility Platform - Spring Boot
echo Port: 8080
echo Embedded H2 in-memory DB active (PostgreSQL mode)
echo ===================================================
cd /d "%~dp0backend"

where mvn >nul 2>nul
if %errorlevel% equ 0 (
    mvn spring-boot:run
    goto end
)

if exist "C:\Users\Jwalit\Downloads\apache-maven-3.9.16-bin\apache-maven-3.9.16\bin\mvn.cmd" (
    echo [INFO] Running Maven from Downloads folder...
    "C:\Users\Jwalit\Downloads\apache-maven-3.9.16-bin\apache-maven-3.9.16\bin\mvn.cmd" spring-boot:run
    goto end
)

echo [ERROR] Maven not found.
pause

:end
