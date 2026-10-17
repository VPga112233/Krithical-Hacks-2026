@echo off
cd /d "%~dp0"
title VouchAI Turbo Server
echo ==========================================================
echo   VouchAI Turbo - Automated Setup ^& Launcher for Judges
echo ==========================================================
echo.

:: Check if node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    pause
    exit /b 1
)

:: Install dependencies if node_modules is missing
if not exist "node_modules\" (
    echo [1/3] First-time setup: Installing required dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
) else (
    echo [1/3] Dependencies verified.
)

echo [2/3] Opening browser at http://localhost:3000 ...
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"

echo [3/3] Starting high-speed backend server...
echo.
node server.js
pause
