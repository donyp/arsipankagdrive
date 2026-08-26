@echo off
REM ============================================================
REM Kill Old Server Processes
REM ============================================================
REM This script kills any old Node processes
REM ============================================================

echo.
echo ========================================
echo Killing Old Node Processes
echo ========================================
echo.

REM Find and kill all node.exe processes
for /f "tokens=2" %%i in ('tasklist ^| find /i "node"') do (
    echo Killing process: %%i
    taskkill /PID %%i /F >nul 2>&1
)

echo.
echo Waiting 2 seconds...
timeout /t 2 /nobreak

echo.
echo Checking remaining Node processes...
tasklist | find /i "node"

if %ERRORLEVEL% EQU 0 (
    echo WARNING: Some Node processes still running
) else (
    echo SUCCESS: All Node processes killed
)

echo.
pause
