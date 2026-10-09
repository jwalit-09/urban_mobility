@echo off
title Push to GitHub - Urban Mobility Platform
echo ========================================================
echo Pushing Urban Mobility Platform to GitHub
echo ========================================================
cd /d "%~dp0"

echo Current remote origin:
git remote -v
echo.
echo Pushing branch 'main' to GitHub...
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo ========================================================
    echo If you encountered an authentication or repository error:
    echo 1. Verify your GitHub username. If your URL is different, run:
    echo    git remote set-url origin https://github.com/YOUR_GITHUB_USERNAME/urban.git
    echo 2. Then run:
    echo    git push -u origin main
    echo    (A browser window will pop up to sign in to GitHub).
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo [SUCCESS] Successfully pushed to GitHub!
    echo ========================================================
)
pause
