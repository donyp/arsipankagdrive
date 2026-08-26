# ============================================================
# Environment Variables Verification Script (PowerShell)
# ============================================================

param(
    [string]$EnvFile = "backend\.env"
)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "ENVIRONMENT VARIABLES VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# Check if .env file exists
if (-not (Test-Path $EnvFile)) {
    Write-Host "[ERROR] $EnvFile file not found!" -ForegroundColor Red
    Write-Host "   Run: cp .env.example $EnvFile`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Found: $EnvFile`n" -ForegroundColor Green

# Parse .env file
$envVars = @{}
Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line -split "=", 2
        if ($parts.Length -eq 2) {
            $envVars[$parts[0]] = $parts[1]
        }
    }
}

# Define required variables by tier
$CRITICAL = @(
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "JWT_SECRET",
    "NODE_ENV"
)

$RECOMMENDED = @(
    "SESSION_SECRET",
    "ALIST_ADMIN_PASSWORD",
    "PORT",
    "ENABLE_ALIST"
)

$OPTIONAL = @(
    "FONNTE_TOKEN",
    "LOG_LEVEL",
    "MAX_FILE_SIZE"
)

# Test CRITICAL tier
Write-Host "[CRITICAL Variables (REQUIRED)]:" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Gray
$criticalPassed = $true
foreach ($var in $CRITICAL) {
    if ($envVars.ContainsKey($var) -and $envVars[$var]) {
        $displayValue = if ($envVars[$var].Length -gt 40) { 
            $envVars[$var].Substring(0, 37) + "..." 
        } else { 
            $envVars[$var] 
        }
        Write-Host "[OK] $($var.PadRight(30)) = $displayValue" -ForegroundColor Green
    } else {
        Write-Host "[X] $($var.PadRight(30)) = NOT SET" -ForegroundColor Red
        $criticalPassed = $false
    }
}
Write-Host ""

# Test RECOMMENDED tier
Write-Host "[RECOMMENDED Variables]:" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Gray
$recommendedCount = 0
foreach ($var in $RECOMMENDED) {
    if ($envVars.ContainsKey($var) -and $envVars[$var]) {
        $displayValue = if ($envVars[$var].Length -gt 40) { 
            $envVars[$var].Substring(0, 37) + "..." 
        } else { 
            $envVars[$var] 
        }
        Write-Host "[OK] $($var.PadRight(30)) = $displayValue" -ForegroundColor Green
        $recommendedCount++
    } else {
        Write-Host "[!] $($var.PadRight(30)) = NOT SET" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test OPTIONAL tier
Write-Host "[OPTIONAL Variables]:" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Gray
foreach ($var in $OPTIONAL) {
    if ($envVars.ContainsKey($var) -and $envVars[$var]) {
        $displayValue = if ($envVars[$var].Length -gt 40) { 
            $envVars[$var].Substring(0, 37) + "..." 
        } else { 
            $envVars[$var] 
        }
        Write-Host "[OK] $($var.PadRight(30)) = $displayValue" -ForegroundColor Green
    } else {
        Write-Host "[i] $($var.PadRight(30)) = (using default)" -ForegroundColor Gray
    }
}
Write-Host ""

# Specific validations
Write-Host "[Detailed Validations]:" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Gray

# Validate JWT_SECRET length
$jwtSecret = $envVars["JWT_SECRET"]
if ($jwtSecret -and $jwtSecret.Length -ge 32) {
    Write-Host "[OK] JWT_SECRET length: $($jwtSecret.Length) chars (min 32)" -ForegroundColor Green
} else {
    Write-Host "[X] JWT_SECRET too short: $($jwtSecret.Length) chars (min 32)" -ForegroundColor Red
}

# Validate SUPABASE_URL format
$supabaseUrl = $envVars["SUPABASE_URL"]
if ($supabaseUrl -and $supabaseUrl.Contains("supabase.co")) {
    $display = $supabaseUrl.Substring(0, [Math]::Min(40, $supabaseUrl.Length)) + "..."
    Write-Host "[OK] SUPABASE_URL format: Valid ($display)" -ForegroundColor Green
} else {
    Write-Host "[X] SUPABASE_URL format: Invalid or missing" -ForegroundColor Red
}

# Validate PORT
$port = $envVars["PORT"]
if ($port -and [int]::TryParse($port, [ref]0)) {
    Write-Host "[OK] PORT is valid: $port" -ForegroundColor Green
} else {
    Write-Host "[!] PORT not set or invalid (using default 5000)" -ForegroundColor Yellow
}

# Validate NODE_ENV
$nodeEnv = $envVars["NODE_ENV"]
if ($nodeEnv -in @("development", "production", "test")) {
    Write-Host "[OK] NODE_ENV is valid: $nodeEnv" -ForegroundColor Green
} else {
    Write-Host "[!] NODE_ENV not recognized: $nodeEnv" -ForegroundColor Yellow
}

# Validate ALIST_ADMIN_PASSWORD strength
$alistPass = $envVars["ALIST_ADMIN_PASSWORD"]
if ($alistPass) {
    if ($alistPass.Length -lt 8) {
        Write-Host "[!] ALIST_ADMIN_PASSWORD weak: $($alistPass.Length) chars (recommend 12+)" -ForegroundColor Yellow
    } else {
        Write-Host "[OK] ALIST_ADMIN_PASSWORD: $($alistPass.Length) chars" -ForegroundColor Green
    }
} else {
    Write-Host "[!] ALIST_ADMIN_PASSWORD not set" -ForegroundColor Yellow
}

Write-Host ""

# Summary
Write-Host "[SUMMARY]:" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Gray
Write-Host "Critical Variables: $($CRITICAL.Count)/$($CRITICAL.Count)" -ForegroundColor Green
Write-Host "Recommended Variables: $recommendedCount/$($RECOMMENDED.Count) ($([Math]::Round($recommendedCount / $RECOMMENDED.Count * 100))%)" -ForegroundColor Cyan

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan

if ($criticalPassed) {
    Write-Host "[OK] STATUS: READY - All critical variables are set!" -ForegroundColor Green
    Write-Host "========================================================`n" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "[ERROR] STATUS: FAILED - Critical variables are missing!" -ForegroundColor Red
    Write-Host "========================================================`n" -ForegroundColor Cyan
    exit 1
}
