# Startup Checklist

Complete this checklist before starting server to ensure everything works.

---

## Pre-Startup Checks

### Environment Variables
- [ ] `.env` file exists in `backend/` directory
- [ ] `SUPABASE_URL` is set (check: `type backend\.env | findstr SUPABASE_URL`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set
- [ ] `JWT_SECRET` is set (if not set, auto-generated)
- [ ] `PORT` is set to 5000 or intended port

### Dependencies
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Backend dependencies installed:
  ```powershell
  cd backend
  npm install
  cd ..
  ```

### Port Availability
- [ ] Port 5000 is free (`netstat -ano | Select-String ":5000"`)
- [ ] If used, kill old process: `.\kill-old-servers.bat`

### Database Connection
- [ ] Supabase account is active
- [ ] Database is accessible
- [ ] Test connection (optional):
  ```powershell
  cd backend
  node -e "require('dotenv').config(); const { createClient } = require('@supabase/supabase-js'); const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); sb.from('users').select('count').single().then(d => console.log('✅ DB Connected')).catch(e => console.log('❌ DB Error:', e.message))"
  cd ..
  ```

---

## Startup

### Option 1: Auto-Restart Wrapper (Recommended)
```powershell
# Windows: Double-click
start-server.bat

# Or PowerShell:
.\start-server-with-restart.ps1
```

### Option 2: Manual Start
```powershell
cd backend
node server.js
```

---

## Post-Startup Checks

### Server Started Successfully?
- [ ] Terminal shows: `✅ Backend listening on port 5000`
- [ ] No error messages like "address already in use"
- [ ] Logs show all 8 initialization stages complete

### Web Access
- [ ] Open browser: http://localhost:5000
- [ ] Page loads (NOT blank white)
- [ ] Can see login form

### API Endpoints
- [ ] `/api/heartbeat` returns: `{"status":"alive","version":"2.0.1-fixed"}`
  ```powershell
  curl http://localhost:5000/api/heartbeat
  ```
- [ ] `/api/health` returns status info
  ```powershell
  curl http://localhost:5000/api/health
  ```

### Logs
- [ ] Check `server-restart.log` for any warnings
- [ ] No [ERROR] entries in startup logs

---

## Connection Test

Test login endpoint:
```powershell
$body = @{
    email = "your-test-email@anka.com"
    password = "test-password"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing
```

Expected: `{"success":true,"token":"...","user":{...}}`

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Port 5000 already in use | `.\kill-old-servers.bat` then restart |
| Blank white web page | Check terminal for [ERROR] messages |
| `.env` not found | Copy `.env.example` to `.env` and fill values |
| Supabase connection error | Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` |
| npm install fails | `npm cache clean --force` then `npm install` |

---

## Monitoring

### While Server is Running
```powershell
# Check if process is running
Get-Process node

# Monitor restart log
Get-Content server-restart.log -Wait

# Check port usage
netstat -ano | Select-String ":5000"

# Test endpoint every 10 seconds
while ($true) { curl http://localhost:5000/api/heartbeat; Start-Sleep 10 }
```

---

## Graceful Shutdown

Press `Ctrl+C` in the terminal running the server.

Server will:
- [ ] Receive shutdown signal
- [ ] Kill Node processes gracefully
- [ ] Log shutdown activity
- [ ] Exit cleanly

---

## Post-Shutdown

### Verify Shutdown
```powershell
# Check no Node processes remain
Get-Process node

# Should return nothing
```

### Port Cleanup
```powershell
# Check port 5000 is free
netstat -ano | Select-String ":5000"

# Should be empty (or only TIME_WAIT connections)
```

---

## Success Criteria ✅

Server is ready for use when:
- [x] All initialization stages complete
- [x] Web loads at http://localhost:5000
- [x] Login form is visible
- [x] API endpoints respond
- [x] No [ERROR] messages in logs
- [x] Can trigger auto-restart by killing server

---

## Next Steps

1. **Login** - Use existing credentials to test login
2. **Upload Files** - Test file upload functionality
3. **Browse Files** - Verify file listing works
4. **Download Files** - Test file download
5. **Deploy** - When ready, use provided Docker/deployment configs

---

*Last Updated: August 23, 2026*  
*Status: ✅ VERIFIED*

