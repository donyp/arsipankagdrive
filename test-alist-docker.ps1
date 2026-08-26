# Test Script for Alist Docker Fix (PowerShell)
# Tests the Alist service startup in Docker container

param(
    [string]$Action = "test",
    [switch]$Cleanup = $false
)

$ErrorActionPreference = "Continue"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Alist Docker Fix - Testing Script (PowerShell)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Functions for output
function Print-Status {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Print-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Print-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Print-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Blue
}

# ============================================================
# Step 1: Check Docker is installed
# ============================================================
Write-Host "[Step 1] Checking Docker installation..." -ForegroundColor Cyan
$DockerPath = where.exe docker 2>$null
if (-not $DockerPath) {
    Print-Error "Docker is not installed or not in PATH"
    Write-Host "Please install Docker Desktop from https://www.docker.com/" -ForegroundColor Yellow
    exit 1
}

$DockerVersion = docker --version
Print-Status "Docker found: $DockerVersion"
Write-Host ""

# ============================================================
# Step 2: Build Docker image
# ============================================================
Write-Host "[Step 2] Building Docker image..." -ForegroundColor Cyan
Write-Host "Running: docker build -t arsip-anka:test ." -ForegroundColor Gray

$BuildOutput = docker build -t arsip-anka:test . 2>&1
if ($LASTEXITCODE -eq 0) {
    Print-Status "Docker image built successfully"
} else {
    Print-Error "Failed to build Docker image"
    Write-Host $BuildOutput
    exit 1
}
Write-Host ""

# ============================================================
# Step 3: Check environment file
# ============================================================
Write-Host "[Step 3] Checking environment file..." -ForegroundColor Cyan
$EnvFile = $null

if (Test-Path ".env") {
    Print-Status ".env file found"
    $EnvFile = ".env"
} elseif (Test-Path "backend\.env") {
    Print-Status "backend\.env file found"
    $EnvFile = "backend\.env"
} else {
    Print-Warning "No .env file found - using defaults"
    $EnvFile = "$env:TEMP\test.env"
    @"
PORT=8080
NODE_ENV=production
SUPABASE_URL=https://example.supabase.co
SUPABASE_SERVICE_ROLE_KEY=test-key-12345
JWT_SECRET=test-secret-12345678901234567890123456789012
ALIST_ADMIN_PASSWORD=admin123
"@ | Set-Content $EnvFile
    Print-Status "Created temporary .env for testing"
}
Write-Host ""

# ============================================================
# Step 4: Start Docker container
# ============================================================
Write-Host "[Step 4] Starting Docker container..." -ForegroundColor Cyan
$ContainerName = "arsip-anka-test-$(Get-Random)"
$EnvFileFullPath = (Resolve-Path $EnvFile).Path

Write-Host "Running: docker run -d --name $ContainerName -p 8080:8080 -p 5244:5244 --env-file `"$EnvFile`" arsip-anka:test" -ForegroundColor Gray

$ContainerId = docker run -d `
    --name $ContainerName `
    -p 8080:8080 `
    -p 5244:5244 `
    --env-file $EnvFileFullPath `
    arsip-anka:test 2>&1

if ($LASTEXITCODE -ne 0) {
    Print-Error "Failed to start container"
    Write-Host $ContainerId
    exit 1
}

Print-Status "Container started: $ContainerId"
Write-Host "Container name: $ContainerName" -ForegroundColor Gray
Write-Host ""

# ============================================================
# Step 5: Wait for services to start
# ============================================================
Write-Host "[Step 5] Waiting for services to start..." -ForegroundColor Cyan
$MaxAttempts = 30
$Attempt = 0
$AlistOk = $false
$BackendOk = $false

while ($Attempt -lt $MaxAttempts) {
    Start-Sleep -Seconds 2
    
    # Check Alist on port 5244
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:5244/" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($Response.StatusCode -eq 200) {
            Print-Status "Alist service responding on port 5244"
            $AlistOk = $true
            break
        }
    } catch {
        # Ignore errors, keep trying
    }
    
    $Attempt++
    Write-Host -NoNewLine "`rAttempt $Attempt/$MaxAttempts...  "
}

Write-Host ""

# Check if container is still running
$ContainerStatus = docker ps --filter "id=$ContainerId" --format "{{.State}}"
if ([string]::IsNullOrEmpty($ContainerStatus)) {
    Print-Error "Container exited unexpectedly"
    Write-Host ""
    Write-Host "Container logs:" -ForegroundColor Yellow
    docker logs $ContainerId
    docker rm $ContainerId
    exit 1
}

if (-not $AlistOk) {
    Print-Warning "Alist service may not be responding on port 5244"
    Print-Info "This may be normal - checking logs..."
}
Write-Host ""

# ============================================================
# Step 6: Test Node.js backend
# ============================================================
Write-Host "[Step 6] Testing Node.js backend..." -ForegroundColor Cyan
$Attempt = 0
while ($Attempt -lt 10) {
    Start-Sleep -Seconds 1
    
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:8080/api/heartbeat" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($Response.Content -match '"status":"alive"') {
            Print-Status "Node.js backend responding on port 8080"
            $BackendOk = $true
            break
        }
    } catch {
        # Ignore errors, keep trying
    }
    
    $Attempt++
}

if (-not $BackendOk) {
    Print-Warning "Node.js backend not responding yet"
    Print-Info "Waiting a bit longer..."
    Start-Sleep -Seconds 5
    
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:8080/api/heartbeat" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($Response.Content -match '"status":"alive"') {
            Print-Status "Node.js backend is now responding"
        } else {
            Print-Warning "Node.js backend still not responding"
        }
    } catch {
        Print-Warning "Node.js backend still not responding"
    }
}
Write-Host ""

# ============================================================
# Step 7: Check container logs
# ============================================================
Write-Host "[Step 7] Container startup logs:" -ForegroundColor Cyan
Write-Host "---" -ForegroundColor Gray
$Logs = docker logs $ContainerId 2>&1
($Logs | Select-Object -First 50) | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# ============================================================
# Step 8: Check for errors
# ============================================================
Write-Host "[Step 8] Checking for errors in logs..." -ForegroundColor Cyan
$ErrorCount = ($Logs | Select-String -Pattern "error|fail" -CaseSensitive:$false | Measure-Object).Count

if ($ErrorCount -gt 0) {
    Print-Warning "Found $ErrorCount error/fail messages in logs:"
    $Logs | Select-String -Pattern "error|fail" -CaseSensitive:$false | Select-Object -First 10 | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
} else {
    Print-Status "No major errors found in logs"
}
Write-Host ""

# ============================================================
# Step 9: Detailed port checks
# ============================================================
Write-Host "[Step 9] Port status:" -ForegroundColor Cyan
Write-Host ""

Write-Host "Testing port 5244 (Alist):" -ForegroundColor Cyan
try {
    $Response = Invoke-WebRequest -Uri "http://localhost:5244/" -TimeoutSec 2 -ErrorAction Stop
    Print-Status "Port 5244 is responding"
    $Content = $Response.Content.Substring(0, [Math]::Min(100, $Response.Content.Length))
    Write-Host "  Response: $Content..." -ForegroundColor Gray
} catch {
    Print-Warning "Port 5244 not responding (This may be normal if Alist hasn't fully initialized)"
}
Write-Host ""

Write-Host "Testing port 8080 (Node.js):" -ForegroundColor Cyan
try {
    $Response = Invoke-WebRequest -Uri "http://localhost:8080/api/heartbeat" -TimeoutSec 2 -ErrorAction Stop
    Print-Status "Port 8080 is responding"
    Write-Host "  Response: $($Response.Content)" -ForegroundColor Gray
} catch {
    Print-Warning "Port 8080 not responding"
    Write-Host "  (Checking container status...)" -ForegroundColor Yellow
}
Write-Host ""

# ============================================================
# Step 10: Summary
# ============================================================
Write-Host "[Step 10] Test Summary:" -ForegroundColor Cyan
Write-Host "---" -ForegroundColor Gray

if ($AlistOk) {
    Print-Status "Alist service is working"
} else {
    Print-Warning "Alist service status unknown"
}

if ($BackendOk) {
    Print-Status "Node.js backend is working"
} else {
    Print-Warning "Node.js backend status unknown"
}

Write-Host ""
Write-Host "Container Status:" -ForegroundColor Cyan
Write-Host "  Name: $ContainerName" -ForegroundColor Gray
Write-Host "  ID: $ContainerId" -ForegroundColor Gray
Write-Host "  Ports: 8080 (Node.js), 5244 (Alist)" -ForegroundColor Gray
Write-Host ""

Write-Host "The container is still running. Options:" -ForegroundColor Cyan
Write-Host "  1. Keep running for manual testing" -ForegroundColor Gray
Write-Host "  2. Stop and remove container" -ForegroundColor Gray
Write-Host "  3. View container logs (tail)" -ForegroundColor Gray
Write-Host ""

$Choice = Read-Host "Enter choice [1/2/3] (default: 1)"

switch ($Choice) {
    "2" {
        Write-Host "Stopping and removing container..." -ForegroundColor Yellow
        docker stop $ContainerId | Out-Null
        docker rm $ContainerId | Out-Null
        Print-Status "Container removed"
    }
    "3" {
        Write-Host "Showing container logs (Ctrl+C to exit)..." -ForegroundColor Yellow
        docker logs -f $ContainerName
    }
    default {
        Write-Host "Container remains running at:" -ForegroundColor Cyan
        Write-Host "  Node.js: http://localhost:8080" -ForegroundColor Gray
        Write-Host "  Alist: http://localhost:5244" -ForegroundColor Gray
        Write-Host ""
        Write-Host "To stop and remove later, run:" -ForegroundColor Yellow
        Write-Host "  docker stop $ContainerName ; docker rm $ContainerName" -ForegroundColor Gray
    }
}

Write-Host ""
Print-Status "Test complete!"

