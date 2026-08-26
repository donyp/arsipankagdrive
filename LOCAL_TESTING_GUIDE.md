# 🧪 Local Testing Guide

**Status**: Setup Validation  
**Date**: August 23, 2026

---

## 📋 Pre-Testing Checklist

### Environment Setup
- [x] backend/.env created
- [x] JWT_SECRET updated (64 chars)
- [x] ALIST_ADMIN_PASSWORD: admin123 (update later if needed)
- [x] All critical variables verified
- [x] verify-env.ps1 passed

### Current Issues
- ⚠️ npm install timeout (network or dependency issue)
- ⚠️ node_modules may be incomplete

---

## 🔧 Testing Options

### Option 1: Manual Validation (No npm needed)
```bash
# Verify environment
powershell -ExecutionPolicy Bypass -File verify-env.ps1

# Check .env file syntax
type backend\.env

# Validate JSON in .env (quick check)
node -e "
require('dotenv').config({ path: './backend/.env' });
console.log('✅ JWT_SECRET:', process.env.JWT_SECRET.substring(0, 20) + '...');
console.log('✅ SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('✅ All env vars loaded');
"
```

### Option 2: Clean npm Install (Recommended)

**Step 1**: Clean up
```bash
cd backend
rmdir /s /q node_modules
del package-lock.json
```

**Step 2**: Fresh install with flags
```bash
npm install --verbose --no-audit
```

If still fails, try:
```bash
npm cache clean --force
npm install --registry https://registry.npmjs.org/
```

**Step 3**: Start server
```bash
npm start
# Expected: Backend listening on port 5000
```

### Option 3: Direct Node Execution

```bash
cd backend
node server.js
# If works: Server will listen on port 5000
# If fails: Check error message
```

---

## ✅ Testing Checklist

Once server starts, verify:

### Test 1: Health Check (Auto)
```bash
curl http://localhost:5000/api/heartbeat
```

Expected response (HTTP 200):
```json
{
  "status": "alive",
  "version": "2.0.1-fixed"
}
```

### Test 2: Environment Variables Loaded
Check server logs for:
```
[BOOT] Pusat Arsip Anka - v2.1.0-fixed
[CONFIG] Reading environment variables...
[CONFIG] SUPABASE_URL: SET (https://...)
[CONFIG] SUPABASE_SERVICE_ROLE_KEY: SET
✅ Backend listening on port 5000
```

### Test 3: Database Connection
```bash
curl http://localhost:5000/api/stats/storage
```

Expected: Returns file statistics or 200 OK

### Test 4: JWT Functionality
```bash
# Test JWT signing (if endpoint exists)
curl -X POST http://localhost:5000/api/auth/test \
  -H "Content-Type: application/json"
```

### Test 5: Logs for Errors
Monitor console for:
```
❌ DO NOT SEE:
- 401 Unauthorized
- Cannot find module
- ECONNREFUSED
- ETIMEDOUT
- Database error

✅ SHOULD SEE:
- ✅ Backend listening
- Configuration loaded
- Heartbeat responses
- Normal request logs
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'express'"

**Cause**: npm install incomplete or failed  
**Solution**:
```bash
cd backend
rmdir /s /q node_modules
del package-lock.json
npm cache clean --force
npm install
```

### Issue: "Port 5000 already in use"

**Solution**:
```bash
# Find process on port 5000
netstat -ano | findstr :5000

# Kill process (replace PID with actual ID)
taskkill /PID <PID> /F

# Or change port in backend/.env
PORT=5001
node server.js
```

### Issue: "ECONNREFUSED" to Supabase

**Solution**:
1. Verify SUPABASE_URL in backend/.env
2. Check internet connection
3. Verify Supabase account is active
4. Check SERVICE_ROLE_KEY is correct

### Issue: Server starts but no logs

**Solution**:
- Output may be buffered, send test request
- Check with: `curl http://localhost:5000/api/heartbeat`
- Add debug: `DEBUG=* npm start`

---

## 📊 Expected Startup Output

```
════════════════════════════════════════════════════
[BOOT] Pusat Arsip Anka - v2.1.0-fixed
[BOOT] Time: 2026-08-23T07:30:00.000Z
════════════════════════════════════════════════════

[CONFIG] Reading environment variables...
[CONFIG] PORT: 5000
[CONFIG] NODE_ENV: production
[CONFIG] SUPABASE_URL: SET (https://ehdqcxzdmmcwbdwkinyr.supabase.co)
[CONFIG] SUPABASE_SERVICE_ROLE_KEY: SET
[CONFIG] Environment configuration loaded.

[SecretManager] Client initialized for project: (not set)
🔐 [RcloneStorage] Initializing storage credentials...

✅ [RcloneStorage] Storage credentials loaded from FALLBACK
✅ Backend listening on port 5000

[BOOT] Application ready!
════════════════════════════════════════════════════
```

---

## 📈 Performance Baseline

Expected metrics after server starts:

| Metric | Expected |
|--------|----------|
| Startup time | 2-5 seconds |
| Memory usage | 50-100MB |
| CPU usage | Minimal (idle) |
| Response time (heartbeat) | < 100ms |
| Error rate | 0 (after startup) |

---

## 🎯 Testing Flow

```
1. Verify environment
   ↓
2. Clean npm install
   ↓
3. Start server
   ↓
4. Wait 3-5 seconds
   ↓
5. Test /api/heartbeat
   ↓
6. Check logs
   ↓
7. Review results
```

---

## ✅ Success Criteria

Server is ready for deployment when:
- [x] Environment variables verified
- [x] npm install completed successfully
- [x] Server starts without errors
- [x] /api/heartbeat returns 200
- [x] No "Cannot find module" errors
- [x] No database connection errors
- [x] Startup logs look normal

---

## 🚀 Next After Testing

### If Testing Passes ✅
1. Stop server: Press Ctrl+C
2. Proceed to deployment
3. Choose platform: HF / Cloud Run / Other

### If Testing Fails ❌
1. Check troubleshooting above
2. Review error messages carefully
3. Verify environment variables
4. Check npm install completed
5. Try clean install again

---

## 📝 Testing Log Template

```
Date: 2026-08-23
Time: 07:30 UTC

Environment Check: PASS
- JWT_SECRET: 64 chars ✅
- SUPABASE_URL: Valid ✅
- All variables: Set ✅

npm install: [PASS / FAIL]
Server startup: [PASS / FAIL]
Heartbeat test: [PASS / FAIL]

Overall: [READY / NEEDS FIX]
Issues: 
- (list any issues found)

Next step:
- (what to do next)
```

---

## 🔗 Related Documents

- `ENVIRONMENT_SETUP_GUIDE.md` - Setup instructions
- `ENVIRONMENT_READY.md` - Environment summary
- `PRODUCTION_SECURITY_CHECKLIST.md` - Security requirements
- `verify-env.ps1` - Verification script

---

## 💡 Tips

1. **Keep terminal window open** during testing to see logs
2. **Use separate terminal** for running curl commands
3. **Check logs first** if something fails
4. **Verify PORT is not in use** before starting
5. **Allow 5 seconds** for server initialization

---

**Testing Guide v2.0**  
**Status**: Ready for Testing  
**Last Updated**: August 23, 2026

