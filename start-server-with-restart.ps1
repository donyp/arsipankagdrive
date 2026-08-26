# ============================================================
# Auto-Restart Server Wrapper
# ============================================================
# Usage: .\start-server-with-restart.ps1
# 
# Features:
# 1. Kills any old Node processes on startup
# 2. Starts backend server
# 3. Auto-restarts if server crashes
# 4. Logs all activity
# 5. Graceful shutdown on Ctrl+C
# ============================================================

param(
    [int]$Port = 5000,
    [int]$MaxRestarts = 10,
    [int]$RestartDelaySeconds = 5
)

$Global:ShouldExit = $false
$restartCount = 0
$logFile = "$(Get-Location)\server-restart.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMsg = "[$timestamp] [$Level] $Message"
    Write-Host $logMsg
    Add-Content -Path $logFile -Value $logMsg -ErrorAction SilentlyContinue
}

function Cleanup-OldProcesses {
    Write-Log "Cleaning up old Node processes..." "SETUP"
    
    $nodeProcesses = @(Get-Process node -ErrorAction SilentlyContinue)
    
    if ($nodeProcesses.Count -le 1) {
        Write-Log "No duplicate processes to clean up" "SETUP"
        return
    }
    
    $sorted = $nodeProcesses | Sort-Object StartTime
    
    for ($i = 0; $i -lt $sorted.Count - 1; $i++) {
        $proc = $sorted[$i]
        Write-Log "Killing old process PID $($proc.Id)" "CLEANUP"
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }
    
    Start-Sleep -Seconds 2
}

function Start-ServerProcess {
    Write-Log "Starting Node.js backend server on port $Port..." "START"
    
    $process = Start-Process -FilePath "node" `
        -ArgumentList "server.js" `
        -WorkingDirectory "$(Get-Location)\backend" `
        -PassThru `
        -NoNewWindow
    
    Write-Log "Server process started (PID: $($process.Id))" "START"
    return $process
}

function Monitor-Process {
    param([System.Diagnostics.Process]$Process)
    
    # Wait for process to exit
    $Process.WaitForExit()
    
    $exitCode = $Process.ExitCode
    Write-Log "Server process exited with code: $exitCode" "ERROR"
    
    return $exitCode
}

function Handle-Shutdown {
    Write-Log "Shutdown signal received. Cleaning up..." "SHUTDOWN"
    $Global:ShouldExit = $true
    
    # Kill any remaining Node processes
    Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Log "Killing process PID $($_.Id) during shutdown" "SHUTDOWN"
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    
    Write-Log "Shutdown complete" "SHUTDOWN"
    exit 0
}

# Setup signal handlers
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Handle-Shutdown
}

# Trap Ctrl+C
$sigintHandler = {
    Handle-Shutdown
}

Write-Log "========================================" "INFO"
Write-Log "Pusat Arsip Anka - Auto-Restart Wrapper" "INFO"
Write-Log "========================================" "INFO"
Write-Log "Max restarts: $MaxRestarts" "CONFIG"
Write-Log "Restart delay: $RestartDelaySeconds seconds" "CONFIG"
Write-Log "Log file: $logFile" "CONFIG"

# Cleanup old processes
Cleanup-OldProcesses

# Main restart loop
while (-not $Global:ShouldExit) {
    if ($restartCount -ge $MaxRestarts) {
        Write-Log "Max restart count ($MaxRestarts) reached. Exiting." "ERROR"
        break
    }
    
    $restartCount++
    Write-Log "Starting server (attempt $restartCount/$MaxRestarts)..." "INFO"
    
    try {
        $serverProcess = Start-ServerProcess
        
        # Monitor the process
        $exitCode = Monitor-Process -Process $serverProcess
        
        if ($Global:ShouldExit) {
            Write-Log "Shutdown requested" "INFO"
            break
        }
        
        # Server crashed or exited unexpectedly
        Write-Log "Server exited unexpectedly. Restarting in $RestartDelaySeconds seconds..." "WARN"
        Start-Sleep -Seconds $RestartDelaySeconds
        
    } catch {
        Write-Log "Error starting server: $_" "ERROR"
        Write-Log "Restarting in $RestartDelaySeconds seconds..." "WARN"
        Start-Sleep -Seconds $RestartDelaySeconds
    }
}

Write-Log "========================================" "INFO"
Write-Log "Server wrapper stopped" "INFO"
Write-Log "========================================" "INFO"
