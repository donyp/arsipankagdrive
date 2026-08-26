# Server Startup Guide

## Problem & Solution

**Problem:** Web menampilkan blank putih karena port 5000 sudah dipakai oleh process Node lain.

**Root Cause:** Jika server crash atau tidak proper shutdown, process lama tetap holding port 5000, mencegah server baru untuk bind.

**Solution:** Auto-restart wrapper + cleanup script untuk handle duplicate processes.

---

## Quick Start (Recommended)

### Option 1: Double-click batch file (Windows)
```
Double-click: start-server.bat
```
This will:
- ✅ Kill old Node processes automatically
- ✅ Start server
- ✅ Auto-restart if server crashes
- ✅ Log all activity to `server-restart.log`

### Option 2: PowerShell (Full control)
```powershell
cd d:\DOWNLOAD\arsipankanew-replit-source\arsipankanew-replit-source
.\start-server-with-restart.ps1 -MaxRestarts 10
```

**Parameters:**
- `-MaxRestarts 10` = Restart maximum 10 times before giving up (default: 10)
- `-RestartDelaySeconds 5` = Wait 5 seconds before each restart (default: 5)

---

## Manual Cleanup

If you want to manually kill old processes before starting server:

### Option 1: Batch file
```
Double-click: kill-old-servers.bat
```

### Option 2: PowerShell
```powershell
cd d:\DOWNLOAD\arsipankanew-replit-source\arsipankanew-replit-source
.\cleanup-processes.ps1
```

---

## Check if Server is Running

```powershell
# Check Node processes
Get-Process node

# Check port 5000
netstat -ano | Select-String ":5000.*LISTENING"

# Test server
curl http://localhost:5000
```

---

## Graceful Shutdown

Press `Ctrl+C` in the terminal running the auto-restart wrapper.

The script will:
- ✅ Capture shutdown signal
- ✅ Kill Node processes gracefully
- ✅ Log shutdown activity
- ✅ Exit cleanly

---

## Logs

Auto-restart logs are saved to:
```
server-restart.log
```

View logs:
```powershell
Get-Content server-restart.log -Tail 50
```

---

## Troubleshooting

### Port 5000 still in use after cleanup?
```powershell
# Find what's using port 5000
netstat -ano | Select-String ":5000"

# Get process name by PID
Get-Process -Id [PID]

# Force kill by name (if it's not node)
taskkill /IM process-name.exe /F
```

### Server won't start after multiple restarts?
- Check `.env` file for missing variables
- Check Supabase connection (test manually)
- Check backend dependencies: `cd backend && npm install`

### Need to run on different port?
Edit `backend/server.js` or set environment variable:
```powershell
$env:PORT = 8000
.\start-server-with-restart.ps1
```

---

## Files Created

| File | Purpose |
|------|---------|
| `start-server.bat` | Windows batch to start auto-restart wrapper |
| `start-server-with-restart.ps1` | PowerShell auto-restart wrapper |
| `cleanup-processes.ps1` | Cleanup old Node processes |
| `kill-old-servers.bat` | Batch file to kill old processes |
| `server-restart.log` | Startup log file |

---

## How It Works

```
start-server.bat
    ↓
start-server-with-restart.ps1
    ↓
Cleanup old Node processes
    ↓
Start Node server (backend/server.js)
    ↓
Monitor process
    ↓
If server crashes:
    Wait 5 seconds
    Go back to "Start Node server"
    Repeat up to MaxRestarts times
    ↓
If Ctrl+C pressed:
    Kill processes gracefully
    Exit
```

---

## Next Steps

1. **Test server:** Open http://localhost:5000 in browser
2. **Check logs:** View `server-restart.log` for any issues
3. **Deploy:** When ready, use Dockerfile for production
4. **Monitor:** Consider adding external health checks

