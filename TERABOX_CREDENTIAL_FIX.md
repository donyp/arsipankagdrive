# Terabox Credential Manager - Cookie Issue Fix

**Date**: August 25, 2026  
**Status**: ✅ IMPLEMENTED  
**Problem**: Terabox cookie/token expiration causing authentication failures  
**Solution**: Automatic credential refresh mechanism with fallback

---

## 🎯 What's the Problem?

Terabox credentials (cookies/tokens) can expire, especially:
- Long-running processes (>1 hour)
- Alist connection timeout
- Terabox session invalidation
- WebDAV token expiration

When this happens, file operations fail with "authentication failed" errors.

---

## ✅ Solution Implemented

### Components Added

#### 1. **TeraboxCredentialManager** (`teraboxCredentialManager.js`)
Handles:
- ✅ Automatic credential refresh (1 hour intervals)
- ✅ Token caching for performance
- ✅ Retry logic with exponential backoff
- ✅ Health checks
- ✅ Fallback mechanisms

#### 2. **TeraboxStorageHandler** (`teraboxStorageHandler.js`)
Provides:
- ✅ High-level storage API
- ✅ Auto-refresh on operation failure
- ✅ Retry with fresh credentials
- ✅ Health monitoring
- ✅ File operations (upload, download, sync, list)

#### 3. **Backend Integration** (`backendInitializer.js`)
Stage 7 now:
- ✅ Initializes credential manager at startup
- ✅ Validates Alist connection
- ✅ Updates rclone.conf automatically
- ✅ Provides storage handler to server routes

#### 4. **Updated Configuration**
- ✅ Enhanced `rclone.conf.txt` with comments
- ✅ Added cache layer for performance
- ✅ Prepared for multi-backend (Google Drive, B2, Storj)
- ✅ Environment variables for tuning

---

## 🔄 How It Works

### Automatic Refresh Flow

```
[Startup]
   ↓
[Stage 1-6: Normal init]
   ↓
[Stage 7: TeraboxCredentialManager starts]
   ├→ Load cached credentials (if fresh)
   ├→ Or fetch fresh token from Alist
   ├→ Verify Terabox connection
   ├→ Start auto-refresh timer (1 hour)
   └→ Update rclone.conf

[Running]
   ├→ Auto-refresh every 60 minutes
   ├→ On file operation failure → Refresh + Retry
   ├→ Health check on request (optional)
   └→ Exponential backoff on errors

[Shutdown]
   └→ Clean up timers
```

### Retry Mechanism

```
File Operation
   ↓
[Attempt 1] Try with current credentials
   ├ Success? → Return result
   ├ Failed? → Continue
   ↓
[Attempt 2] Refresh credentials (wait 2s)
   ├ Success? → Return result
   ├ Failed? → Continue
   ↓
[Attempt 3] Refresh credentials (wait 4s)
   ├ Success? → Return result
   ├ Failed? → Use cached credentials
   ↓
[Max retries exceeded] → Error
```

---

## 📝 Configuration

### Environment Variables (`.env`)

```env
# Auto-refresh every 1 hour (in milliseconds)
TERABOX_CREDENTIAL_REFRESH_INTERVAL=3600000

# Cache file location
TERABOX_CREDENTIAL_CACHE_PATH=./terabox_credentials.json

# Max retries on failure
TERABOX_CREDENTIAL_MAX_RETRIES=3

# Operation timeout (5 minutes)
TERABOX_OPERATION_TIMEOUT=300000

# Enable auto health check
TERABOX_AUTO_HEALTH_CHECK=true
```

### Rclone Configuration (`rclone.conf`)

```ini
# PRIMARY: Terabox via Alist WebDAV
[terabox]
type = webdav
url = http://localhost:5244/dav/terabox
vendor = other
user = admin
pass = nOBxHSEklm1M-QWIKlzw_93rRHRwZ16b
# Token auto-refreshed by TeraboxCredentialManager

# CACHE: Local caching for performance
[terabox_cache]
type = cache
remote = terabox:/
chunk_size = 5M
db_path = ./cache/terabox.db
chunk_path = ./cache/chunks
chunk_total_size = 1G
```

---

## 🧪 Testing

### Run Setup Test

```bash
# Windows (PowerShell)
cd backend
node test-terabox-setup.js

# Or with npm
npm run test:terabox
```

### What Gets Tested

1. ✅ Credential Manager initialization
2. ✅ Alist authentication
3. ✅ Rclone configuration
4. ✅ Storage Handler initialization
5. ✅ Health check
6. ✅ File operations readiness

### Expected Output

```
============================================================
TERABOX CREDENTIAL MANAGER - SETUP TEST
============================================================

📋 Test 1: Credential Manager Initialization
------------------------------------------------------------
[✅ TEST] Credential Manager initialized
   Provider: alist-webdav
   Status: authenticated
   Terabox: Terabox Root

🔐 Test 2: Alist Authentication
------------------------------------------------------------
[✅ TEST] Alist authentication successful
   Token length: 256 chars
   Token preview: eyJhbGciOiJIUzI1NiIsInR5cCI...

⚙️  Test 3: Rclone Configuration
------------------------------------------------------------
[✅ TEST] Section [terabox] found
[✅ TEST] Section [terabox_crypt] found
[✅ TEST] Section [terabox_cache] found

💾 Test 4: Storage Handler Initialization
------------------------------------------------------------
[✅ TEST] Storage Handler initialized
   Status: authenticated
   Provider: alist-webdav

❤️  Test 5: Health Check
------------------------------------------------------------
[✅ TEST] Storage health check passed
   Status: authenticated
   Provider: alist-webdav

📁 Test 6: File Operations (Mock)
------------------------------------------------------------
[✅ TEST] Storage Handler methods available

============================================================
TEST SUMMARY
============================================================

📊 Results:

✅ CredentialManager Init: PASS
✅ Alist Auth: PASS
✅ Rclone Config: PASS
✅ Storage Handler Init: PASS
✅ Health Check: PASS
✅ File Operations: READY

📈 Total: 6/6 tests passed

🎉 ALL TESTS PASSED - Setup is ready!
```

---

## 💻 Usage Examples

### In Backend Routes

```javascript
const { getTeraboxStorageHandler } = require('./backendInitializer');

// In your route handler
app.get('/api/files', async (req, res) => {
  try {
    const storageHandler = getTeraboxStorageHandler();
    
    // Will auto-refresh credentials if needed
    const files = await storageHandler.listFiles('/');
    
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload file
app.post('/api/upload', async (req, res) => {
  try {
    const storageHandler = getTeraboxStorageHandler();
    
    // Auto-retry with fresh credentials on failure
    const result = await storageHandler.uploadFile(
      req.file.path,
      `/uploads/${req.file.filename}`
    );
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/api/health/storage', async (req, res) => {
  const storageHandler = getTeraboxStorageHandler();
  const health = await storageHandler.healthCheck();
  
  res.json(health);
});
```

### Direct Usage

```javascript
const TeraboxStorageHandler = require('./teraboxStorageHandler');

const handler = new TeraboxStorageHandler({
  alistUrl: 'http://localhost:5244',
  alistUser: 'admin',
  alistPassword: 'admin123'
});

// Initialize
await handler.initialize();

// List files
const files = await handler.listFiles('/');

// Upload
await handler.uploadFile('./local/file.pdf', '/remote/file.pdf');

// Sync
await handler.syncToTerabox('./local/folder', '/remote/folder');

// Health check
const health = await handler.healthCheck();

// Cleanup
handler.destroy();
```

---

## 🚀 How to Deploy

### Step 1: Verify Setup

```bash
cd backend
node test-terabox-setup.js
```

If all tests pass, continue.

### Step 2: Update Environment

```bash
# Ensure .env has these
ENABLE_ALIST=true           # For production
TERABOX_AUTO_HEALTH_CHECK=true
```

### Step 3: Start Backend

```bash
npm start

# Should show:
# [Stage 7] Initializing Terabox Credential Manager...
# [TeraboxStorageHandler] ✅ Terabox credentials ready
# [Stage 7] ✅ Complete
```

### Step 4: Monitor Logs

```bash
# Watch for auto-refresh logs
tail -f logs/backend.log | grep "TeraboxCredentialManager\|refresh"

# Should see every 60 minutes:
# [TeraboxCredentialManager] Auto-refresh triggered
# [TeraboxCredentialManager] ✅ Credentials refreshed successfully
```

---

## 🔧 Troubleshooting

### Issue: "Configuration file not found"

**Cause**: `rclone.conf` not in correct location

**Fix**:
```bash
# Make sure rclone.conf exists in project root
ls -la rclone.conf

# Or update path in .env
RCLONE_CONFIG_PATH=/full/path/to/rclone.conf
```

### Issue: "Failed to connect to Alist"

**Cause**: Alist not running on port 5244

**Fix**:
```bash
# Check if Alist is running
curl http://localhost:5244/api/me

# If not, restart with ENABLE_ALIST=true
npm start
```

### Issue: "Alist authentication failed"

**Cause**: Wrong password in `.env`

**Fix**:
```bash
# Verify password
echo $ALIST_ADMIN_PASSWORD

# Update if needed
# Edit .env and set correct password
ALIST_ADMIN_PASSWORD=your_actual_password
```

### Issue: "Rclone command not found"

**Cause**: Rclone binary not installed

**Fix**:
```bash
# Windows: Download from https://rclone.org/downloads/
# Then add to PATH

# Or specify full path in .env
RCLONE_BIN=/usr/local/bin/rclone
```

### Issue: Credentials cache corrupted

**Fix**:
```bash
# Delete cache file, will regenerate on next run
rm terabox_credentials.json

# Restart backend
npm start
```

---

## 📊 Monitoring

### Health Endpoint

```bash
curl http://localhost:5000/api/health/storage
```

Response:
```json
{
  "healthy": true,
  "status": {
    "initialized": true,
    "lastRefresh": "2026-08-25T10:30:00.000Z",
    "alistUrl": "http://localhost:5244",
    "provider": "alist-webdav",
    "status": "authenticated",
    "teraboxName": "Terabox Root"
  }
}
```

### Logs to Watch

```
✅ Successful initialization:
[TeraboxCredentialManager] ✅ Credentials refreshed successfully

✅ Scheduled auto-refresh:
[TeraboxCredentialManager] Auto-refresh scheduled every 3600000s

⚠️  Retry on failure:
[TeraboxStorageHandler] Attempt 2: Refreshing credentials...

❌ Connection errors:
[TeraboxStorageHandler] ❌ All retry attempts failed
```

---

## 🎯 Performance Optimization

### Caching

```ini
# Local cache reduces API calls
[terabox_cache]
type = cache
chunk_size = 5M         # Cache in 5MB chunks
chunk_total_size = 1G   # Use max 1GB of cache
db_path = ./cache/terabox.db
```

### Compression

```ini
# Optional: Add compression to rclone operations
rclone sync terabox: gdrive: --compress
```

### Bandwidth Limiting

```bash
# Limit bandwidth to 1MB/s
RCLONE_BWLIMIT=1M rclone sync terabox: gdrive:

# Or in config
[terabox]
# ... other options ...
bwlimit = 1M
```

---

## 📋 Checklist for Production

- [x] Credential manager implemented
- [x] Auto-refresh mechanism working
- [x] Retry logic with backoff
- [x] Health check endpoint
- [x] Logging for monitoring
- [x] Environment variables configured
- [x] Rclone config updated
- [x] Tests passing
- [ ] Deployed to production
- [ ] Monitoring logs for 24 hours
- [ ] Document incident response procedures

---

## 🚨 Incident Response

### If Terabox access fails in production:

1. **Check credentials**
   ```bash
   curl -u admin:password http://localhost:5244/api/me
   ```

2. **Force credential refresh**
   - Restart backend service: `systemctl restart arsipanka-backend`
   - Or delete cache: `rm terabox_credentials.json && npm start`

3. **Check Alist status**
   ```bash
   curl http://localhost:5244/health
   ```

4. **Check rclone**
   ```bash
   rclone about terabox:
   rclone lsf terabox:
   ```

5. **Review logs**
   ```bash
   tail -50 logs/backend.log | grep -i error
   ```

6. **Escalate if needed**
   - Check Terabox service status
   - Verify network connectivity
   - Contact Terabox support

---

## 📚 Related Files

- `teraboxCredentialManager.js` - Credential management
- `teraboxStorageHandler.js` - Storage operations
- `backendInitializer.js` - Initialization sequence
- `rclone.conf` - Rclone configuration
- `.env` - Environment variables
- `test-terabox-setup.js` - Setup test suite

---

## ✨ Summary

This solution ensures:
- ✅ **Automatic credential refresh** - No manual intervention
- ✅ **Fault tolerance** - Retry with exponential backoff
- ✅ **Performance** - Local caching + efficient operations
- ✅ **Monitoring** - Health checks and detailed logging
- ✅ **Production ready** - Tested and documented

**Status**: Ready for production deployment.

---

**Created**: August 25, 2026  
**Version**: 1.0  
**Author**: Arsip Anka Dev Team
