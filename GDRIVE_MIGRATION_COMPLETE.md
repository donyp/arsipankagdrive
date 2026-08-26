# Google Drive Migration - COMPLETE ✅

**Migration Date**: August 25, 2026  
**From**: Terabox + Alist WebDAV  
**To**: Google Drive + Rclone (native)  
**Status**: Configuration updated, ready for testing

---

## Changes Made

### 1. Configuration Files

#### `rclone.conf` - Cleaned up ✅
- **Removed**: 
  - `[terabox]` - WebDAV connection to Alist (no longer needed)
  - `[terabox_crypt]` - Terabox encryption layer
  - `[drive1]`, `[drive2]`, `[drive_union]` - Simplified multi-drive setup
  
- **Kept/Updated**:
  - `[gdrive]` - Primary Google Drive remote with OAuth token
  - `[gdrive_crypt]` - Optional client-side encryption for sensitive files
  - `[gdrive_cache]` - Local cache for performance
  - `[b2]` - Optional backup to Backblaze B2
  - `[storj]` - Optional decentralized backup

#### `backend/.env` - Storage backend updated ✅
```env
STORAGE_BACKEND=gdrive          # Primary storage (was: terabox)
RCLONE_REMOTE=gdrive            # Rclone remote name
ENABLE_ALIST=false              # Alist disabled (was: complex config)
```

### 2. Backend Code Changes

#### `rclone_wrapper.js` - Storage implementation updated ✅

**Configuration Layer**:
- Removed Terabox/Alist hardcoded credentials
- Updated to use Google Drive via `RCLONE_REMOTE=gdrive`
- Constants updated:
  - `PRIMARY_REMOTE = 'gdrive'` (was: 'terabox')
  - `BACKUP_REMOTE = 'b2'` (was: 'storj')

**Upload Operations**:
- **uploadDirect()**: Switched from Alist API PUT to `rclone rcat` (streaming)
- **uploadMedia()**: Same rclone rcat approach for media files
- Simplified directory creation via `rclone mkdir`

**Download/Stream Operations**:
- **getStream()**: Switched from Alist API to `rclone cat` (native streaming)
- Fallback to local storage if Google Drive unavailable

**File Verification**:
- **remoteFileExists()**: Changed from Alist API lookup to `rclone ls` check

**Sync Operations**:
- processSyncQueue() now uploads directly to Google Drive
- No Alist WebDAV intermediary needed

### 3. Removed/Deprecated Files

The following files are no longer needed but kept for reference:

- `teraboxCredentialManager.js` - Terabox credential management
- `teraboxStorageHandler.js` - Terabox-specific storage handler
- `teraboxDirectAPI.js` - Terabox API wrapper
- `teraboxHybridHandler.js` - Hybrid Terabox/Local handler
- `alistStartupHandler.js` - Alist startup initialization

These can be archived or deleted after testing confirms everything works.

---

## Architecture Changes

### Before (Terabox + Alist + Local)
```
┌─────────────────┐
│   Application   │
└────────┬────────┘
         │
    ┌────▼──────────┐
    │ rclone_wrapper│
    └────┬──────────┘
         │
    ┌────▼──────────────┐
    │  Alist WebDAV     │  (Local server on port 5244)
    │  /dav/terabox     │
    └────┬──────────────┘
         │
         ▼
    ┌─────────────┐
    │  Terabox    │  (via rclone)
    │ (Primary)   │
    └─────────────┘
```

### After (Google Drive + Rclone native)
```
┌─────────────────┐
│   Application   │
└────────┬────────┘
         │
    ┌────▼──────────┐
    │ rclone_wrapper│
    └────┬──────────┘
         │
         ▼
    ┌────────────────┐
    │  Rclone        │
    │  (native)      │
    └────┬───────────┘
         │
         ▼
    ┌──────────────────┐
    │  Google Drive    │  (OAuth2)
    │  (Primary)       │
    └──────────────────┘
```

**Benefits**:
- ✅ No local Alist server dependency
- ✅ Direct Google Drive connection (fewer layers)
- ✅ Native OAuth2 authentication
- ✅ Simpler deployment (fewer services)
- ✅ Better for cloud platforms (Replit, Cloud Run, etc)

---

## Testing Checklist

Before deploying, verify:

- [ ] **File Upload**: `POST /api/files/upload` works
- [ ] **File Preview**: `GET /api/files/{id}/preview` streams correctly  
- [ ] **File Download**: `GET /api/files/{id}/download` retrieves files
- [ ] **File Deletion**: `DELETE /api/files/{id}` removes from storage
- [ ] **Sync Queue**: Background sync to Google Drive completes
- [ ] **Directory Listing**: `GET /api/files/list/{zona}` shows files
- [ ] **Storage Stats**: Quota and used space display correctly
- [ ] **Error Handling**: Network failures gracefully fallback to local

### Test Commands (After Starting Server)

```bash
# 1. Upload a test file
curl -X POST http://localhost:5000/api/files/upload \
  -F "file=@test.pdf" \
  -F "zona=zona-1" \
  -F "toko=TOKO-BANDUNG" \
  -F "category=PPN"

# 2. List files
curl http://localhost:5000/api/files/list/zona-1

# 3. Check sync status
curl http://localhost:5000/api/storage/sync-status

# 4. Verify Google Drive connection
curl http://localhost:5000/api/health/storage
```

---

## Environment Variables

### Required (Now Updated)
```env
# Storage backend
STORAGE_BACKEND=gdrive
RCLONE_REMOTE=gdrive
RCLONE_CONFIG_PATH=./rclone.conf

# Google Drive OAuth (in rclone.conf)
# Already configured with token
```

### Optional (Disabled Alist)
```env
# These can be removed or kept empty:
ALIST_ADMIN_PASSWORD=admin123  # Not used
ALIST_PORT=5244                # Not used
ALIST_DATA_PATH=/home/runner/workspace/data/alist  # Not used
ENABLE_ALIST=false             # Now explicitly false
```

### Backup Storage (Optional)
```env
# For backup to Backblaze B2:
# Add credentials to rclone.conf [b2] section if needed
```

---

## Rollback Plan (If Needed)

If you need to rollback to Terabox:

1. Restore `rclone.conf.txt` (old version with Terabox config)
2. Revert `backend/.env` (change `STORAGE_BACKEND=terabox`)
3. Revert `rclone_wrapper.js` from git history
4. Restart services

**Git command**:
```bash
git checkout HEAD -- backend/rclone_wrapper.js backend/.env rclone.conf
```

---

## Troubleshooting

### Issue: "rclone not found"
- Ensure rclone binary is installed in workspace or PATH
- Check `RCLONE_BIN` env var points to correct executable

### Issue: "Google Drive authentication failed"
- Verify `token` in `[gdrive]` section of rclone.conf is valid
- Tokens expire; refresh using: `rclone authorize drive gdrive`

### Issue: "Permission denied" on Google Drive
- Check Google Drive OAuth app has `drive` scope
- Verify account has storage space available

### Issue: "Files not syncing"
- Check background sync worker running: `curl http://localhost:5000/api/storage/sync-status`
- View logs: `tail -f backend/storage-errors.log`
- Manually trigger sync: `rclone sync gdrive:/arsip gdrive:/backup --dry-run`

---

## Performance Notes

Google Drive + Rclone is expected to perform:
- **Upload**: Similar to Terabox (5-20 MB/s depending on connection)
- **Download**: May be slightly slower than Terabox (optimization pending)
- **Directory Listing**: Faster than Alist WebDAV (no HTTP overhead)

For large files (>500MB), consider:
- Increasing rclone chunk size: `RCLONE_CHUNK_SIZE=20M`
- Using rclone flags: `--fast-list` for faster listing
- See `rclone.conf` for cache configuration options

---

## Next Steps

1. **Test thoroughly** with checklist above
2. **Monitor logs** for first 24 hours: `docker logs arsipanka-backend`
3. **Keep Terabox account** for archive purposes (don't delete)
4. **Configure backup** (optional): Set up B2 or Storj in rclone.conf if needed
5. **Document** in your deployment guide

---

## Questions?

Refer to rclone documentation for Google Drive:
- https://rclone.org/drive/
- https://rclone.org/crypt/
- https://rclone.org/cache/

