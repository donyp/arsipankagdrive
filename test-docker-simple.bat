@echo off
REM Simple Docker test script for Windows
REM Tests Alist Docker fix

echo.
echo ============================================================
echo Alist Docker Fix - Local Testing (Windows)
echo ============================================================
echo.

REM Check if Docker is installed
echo [Step 1] Checking Docker...
docker --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not in PATH
    echo Please install Docker Desktop from https://www.docker.com/
    exit /b 1
)
echo OK - Docker found: 
docker --version
echo.

REM Build Docker image
echo [Step 2] Building Docker image...
echo Running: docker build -t arsip-anka:test .
docker build -t arsip-anka:test .
if %errorlevel% neq 0 (
    echo ERROR: Docker build failed
    exit /b 1
)
echo OK - Image built successfully
echo.

REM Start Docker container
echo [Step 3] Starting Docker container...
for /f %%i in ('docker run -d -p 8080:8080 -p 5244:5244 --env-file .env arsip-anka:test') do set CONTAINER_ID=%%i
echo Container ID: %CONTAINER_ID%
echo.

REM Wait for services
echo [Step 4] Waiting for services to start (30 seconds)...
set ATTEMPT=0
:wait_loop
if %ATTEMPT% geq 30 (
    echo WARNING: Services did not start within 30 seconds
    goto skip_wait
)
timeout /t 1 /nobreak > nul
echo Checking ports... (attempt %ATTEMPT%/30)

REM Check if container is still running
docker ps | find "%CONTAINER_ID%" > nul
if %errorlevel% neq 0 (
    echo ERROR: Container exited
    echo Logs:
    docker logs %CONTAINER_ID%
    docker rm %CONTAINER_ID% > nul 2>&1
    exit /b 1
)

set /a ATTEMPT=%ATTEMPT%+1
goto wait_loop

:skip_wait
echo.

REM Show container logs
echo [Step 5] Container logs (last 50 lines):
echo ============================================================
docker logs %CONTAINER_ID% | powershell -Command "$input | Select-Object -Last 50"
echo ============================================================
echo.

REM Test Alist port
echo [Step 6] Testing Alist service on port 5244...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5244/' -TimeoutSec 2 -ErrorAction Stop; Write-Host 'OK - Alist is responding' } catch { Write-Host 'WARNING - Alist not responding yet' }"
echo.

REM Test Node.js port
echo [Step 7] Testing Node.js backend on port 8080...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:8080/api/heartbeat' -TimeoutSec 2; if ($r.Content -match '\"status\":\"alive\"') { Write-Host 'OK - Backend responding with correct response' } else { Write-Host 'WARNING - Backend responded but unexpected format' } } catch { Write-Host 'WARNING - Backend not responding yet' }"
echo.

REM Summary
echo [Summary]
echo ============================================================
echo Container: %CONTAINER_ID%
echo Port 5244: Alist WebDAV (internal)
echo Port 8080: Node.js backend (external)
echo.
echo Container is still running. Options:
echo   1. Keep running for manual testing
echo   2. Stop and remove container
echo.
set /p CHOICE="Enter choice [1/2] (default: 1): "
if "%CHOICE%"=="2" (
    echo.
    echo Stopping and removing container...
    docker stop %CONTAINER_ID% > nul
    docker rm %CONTAINER_ID% > nul
    echo OK - Container removed
) else (
    echo.
    echo Container still running at:
    echo   Alist: http://localhost:5244
    echo   Node.js: http://localhost:8080
    echo.
    echo To stop and remove later, run:
    echo   docker stop %CONTAINER_ID%
    echo   docker rm %CONTAINER_ID%
)
echo.
echo Test complete!
echo.

