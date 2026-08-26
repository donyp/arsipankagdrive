# Local Server Testing Script

Write-Host "================================================"
Write-Host "LOCAL TESTING - Backend Health Check"
Write-Host "================================================"
Write-Host ""

# Test 1: Heartbeat
Write-Host "[Test 1] Heartbeat Endpoint" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/heartbeat" -Method Get -TimeoutSec 5 -ErrorAction Stop
    $body = $response.Content | ConvertFrom-Json
    Write-Host "OK - Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "OK - Response: status=$($body.status), version=$($body.version)" -ForegroundColor Green
} catch {
    Write-Host "FAIL - Error: $_" -ForegroundColor Red
}

Write-Host ""

# Test 2: Health endpoint
Write-Host "[Test 2] Health Endpoint" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
    $body = $response.Content | ConvertFrom-Json
    Write-Host "OK - Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "OK - Response: status=$($body.status), version=$($body.version)" -ForegroundColor Green
} catch {
    Write-Host "FAIL - Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================"
Write-Host "Testing Complete"
Write-Host "================================================"
