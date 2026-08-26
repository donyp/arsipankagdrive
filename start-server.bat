@echo off
REM ============================================================
REM Start Server with Auto-Restart
REM ============================================================
REM This batch file:
REM 1. Cleans up old Node processes
REM 2. Starts the backend server
REM 3. Auto-restarts if it crashes
REM ============================================================

cd /d "%~dp0"

echo.
echo ========================================
echo Pusat Arsip Anka - Server Startup
echo ========================================
echo.

REM Check if PowerShell script exists
if not exist "start-server-with-restart.ps1" (
    echo ERROR: start-server-with-restart.ps1 not found
    echo Please run this batch file from the project root directory
    pause
    exit /b 1
)

REM Run PowerShell script with auto-restart
powershell -NoProfile -ExecutionPolicy Bypass -File "start-server-with-restart.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Server wrapper failed
    pause
)
