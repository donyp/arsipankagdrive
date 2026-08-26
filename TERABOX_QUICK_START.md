# Terabox Credential Manager - Quick Start

**Status**: ✅ Implemented & Ready  
**Date**: August 25, 2026  
**Deployment Time**: ~2 minutes

---

## ⚡ 60-Second Setup

```bash
# 1. Verify files exist
ls backend/teraboxCredentialManager.js
ls backend/teraboxStorageHandler.js

# 2. Check dependencies
npm list axios

# 3. Test setup
cd backend && node test-terabox-setup.js

# 4. Run backend
npm start

# Done! ✅
```

---

## 📋 What It Does

**Problem**: Terabox connection fails after credentials expire  
**Solution**: Automatic refresh every 60 minutes with smart retry

| Feature | Before | After |
|---------|--------|-------|
| Credential expiry handling | Manual restart | Automatic refresh |
| Failed connection retry | Manual retry | Auto-retry with backoff |
| Connection monitoring | Manual checks | Automatic health checks |
| Downtime | Hours (waiting for restart) | Minutes (auto-recovery) |

---

## 🚀 Deployment Steps

### Step 1: Pre-deployment Check
```bash
cd backend
node test-terabox-setup.js
# Should see: 6/6 tests passed
```

### Step 2: Start Backend
```bash
npm start
# Should see: [Stage 7] Terabox Credential Manager initialized
```

### Step 3: Verify Working
```bash
curl http://localhost:5000/api/health/storage
# Should see: "healthy": true
```

### Done! ✅

---

## 🔍 Monitoring

### Daily Log Check
```bash
# Watch auto-refresh (happens hourly)
tail logs/backend.log | grep "Credential"
```

### Health Endpoint
```bash
curl http://localhost:5000/api/health/storage
```

### If Something Fails
1. Check logs: `tail logs/backend.log`
2. Restart: `npm start`
3. Force refresh: `rm terabox_credentials.json && npm start`

---

## 📁 Files Changed

| File | Changes | Impact |
|------|---------|--------|
| `teraboxCredentialManager.js` | NEW | Handles credentials |
| `teraboxStorageHandler.js` | NEW | Storage API |
| `test-terabox-setup.js` | NEW | Validation script |
| `backendInitializer.js` | +40 lines | Stage 7 initialization |
| `package.json` | +axios | HTTP client |
| `.env` | +5 vars | Configuration |
| `rclone.conf.txt` | Enhanced | Added comments |

---

## ⚙️ Configuration (Optional)

### Default values (already set):
```
Refresh interval: 60 minutes
Max retries: 3 attempts
Operation timeout: 5 minutes
Cache location: ./terabox_credentials.json
```

### To change, edit `.env`:
```bash
TERABOX_CREDENTIAL_REFRESH_INTERVAL=1800000  # 30 min instead
TERABOX_CREDENTIAL_MAX_RETRIES=5              # 5 attempts instead
TERABOX_OPERATION_TIMEOUT=600000              # 10 min instead
```

---

## 🧪 Test Commands

```bash
# Full setup test
node backend/test-terabox-setup.js

# Just validate code loads
node -e "require('./backend/teraboxCredentialManager')"

# Check if running
curl http://localhost:5000/api/health/storage
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find module 'axios'" | `npm install axios` |
| "Cannot connect to Alist" | Ensure `ENABLE_ALIST=true`, check port 5244 |
| "Credentials cache corrupted" | `rm terabox_credentials.json && npm start` |
| "Rclone command not found" | Install rclone or update PATH |

---

## 📞 Need Help?

- **Setup issues**: Read `TERABOX_CREDENTIAL_FIX.md`
- **Code issues**: Review `backend/teraboxCredentialManager.js`
- **Configuration**: Check `backend/.env`
- **Testing**: Run `node backend/test-terabox-setup.js`

---

## ✅ Pre-Deployment Checklist

- [ ] Files copied to backend folder
- [ ] npm install axios (done)
- [ ] Test passing: 6/6
- [ ] Backend starts without errors
- [ ] Health endpoint returns healthy
- [ ] Logs show "Stage 7 Complete"
- [ ] Auto-refresh logs appearing hourly

**Once all checked**: ✅ Ready for production

---

**Quick Links**:
- 📖 Full Docs: `TERABOX_CREDENTIAL_FIX.md`
- 📊 Summary: `TERABOX_SOLUTION_SUMMARY.md`
- 🧪 Test: `backend/test-terabox-setup.js`
- ⚙️ Code: `backend/teraboxCredentialManager.js`
