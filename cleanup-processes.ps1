# ============================================================
# Cleanup & Kill Duplicate Node Processes
# ============================================================
# Usage: .\cleanup-processes.ps1
# 
# This script:
# 1. Finds all Node processes listening on port 5000
# 2. Kills old/duplicate processes
# 3. Leaves the newest process running
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup: Finding Node processes..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Get all Node processes
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue

if (-not $nodeProcesses) {
    Write-Host "✅ No Node processes found." -ForegroundColor Green
    exit 0
}

# If single process, leave it alone
if ($nodeProcesses -is [single]) {
    $nodeProcesses = @($nodeProcesses)
}

Write-Host "Found $($nodeProcesses.Count) Node process(es)" -ForegroundColor Yellow

# Sort by start time (oldest first)
$sorted = $nodeProcesses | Sort-Object StartTime

if ($sorted.Count -le 1) {
    Write-Host "✅ Only 1 process running. No cleanup needed." -ForegroundColor Green
    exit 0
}

Write-Host "`nKilling $($sorted.Count - 1) old process(es)..." -ForegroundColor Yellow

# Kill all but the newest
for ($i = 0; $i -lt $sorted.Count - 1; $i++) {
    $proc = $sorted[$i]
    Write-Host "  ❌ Killing PID $($proc.Id) (started: $($proc.StartTime))" -ForegroundColor Red
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}

# Check if port 5000 is free (should be after kills)
Start-Sleep -Seconds 1
$portCheck = netstat -ano 2>$null | Select-String ":5000.*LISTENING"

if ($portCheck) {
    Write-Host "`n⚠️  Port 5000 still in use. Waiting 3 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "✅ Cleanup Complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Final check
$remaining = Get-Process node -ErrorAction SilentlyContinue
Write-Host "Remaining Node processes: $($remaining.Count ?? 0)" -ForegroundColor Cyan
