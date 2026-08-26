# Terabox Files Cleanup Guide

**Status**: After migration to Google Drive is tested and confirmed working  
**Safety Level**: LOW RISK (these files are not called anymore)  
**Recommendation**: Archive for 30 days, then delete

---

## Files to Remove

These files are no longer used after switching to Google Drive + Rclone:

### Backend Files

| File | Purpose | Can Delete | Notes |
|------|---------|-----------|-------|
| `backend/teraboxCredentialManager.js` | Terabox credential mgmt | ✅ YES | Replaced by Google OAuth |
| `backend/teraboxStorageHandler.js` | Terabox storage wrapper | ✅ YES | Replaced by rclone direct |
| `backend/teraboxDirectAPI.js` | Terabox API wrapper | ✅ YES | No longer needed |
| `backend/teraboxHybridHandler.js` | Hybrid Terabox/Local | ✅ YES | Google Drive only now |
| `backend/alistStartupHandler.js` | Alist startup & health | ✅ YES | Alist disabled |
| `backend/test-terabox-setup.js` | Terabox setup testing | ✅ YES | Reference only |
| `backend/test-e2e.js` | E2E tests for Terabox | ⚠️ REVIEW | May contain useful test patterns |
| `backend/rclone_wrapper_old.js` | Old version backup | ✅ YES | Redundant |

### Configuration Files

| File | Purpose | Can Delete | Notes |
|------|---------|-----------|-------|
| `rclone.conf.txt` | Old rclone config template | ✅ YES | Replaced by rclone.conf |
| `backend/TASK_*.md` | Old task documentation | ⚠️ REVIEW | Keep if needed for reference |

---

## Step-by-Step Cleanup

### Phase 1: Verify Everything Works (Do First)

```bash
# 1. Run full testing suite
npm test

# 2. Start server and verify:
node backend/server.js

# 3. Test all critical endpoints
curl http://localhost:5000/api/health/storage
curl http://localhost:5000/api/files/list/zona-1
curl http://localhost:5000/api/storage/sync-status

# 4. Upload/download test file
# (See testing checklist in GDRIVE_MIGRATION_CHECKLIST.md)
```

### Phase 2: Archive Files (Optional but Recommended)

```bash
# Create archive of old files
mkdir -p ./archive/terabox-files
mkdir -p ./archive/rclone-config

# Archive backend Terabox files
cp backend/terabox*.js archive/terabox-files/
cp backend/alistStartupHandler.js archive/terabox-files/
cp backend/test-terabox-setup.js archive/terabox-files/
cp backend/test-e2e.js archive/terabox-files/
cp backend/rclone_wrapper_old.js archive/terabox-files/

# Archive old rclone config
cp rclone.conf.txt archive/rclone-config/

# Create dated archive
tar -czf archive-2026-08-25.tar.gz ./archive
```

### Phase 3: Delete Files (After 30 Days of Successful Operation)

```bash
# Only run this if you're sure you don't need the old files

# Delete backend Terabox files
rm backend/teraboxCredentialManager.js
rm backend/teraboxStorageHandler.js
rm backend/teraboxDirectAPI.js
rm backend/teraboxHybridHandler.js
rm backend/alistStartupHandler.js
rm backend/test-terabox-setup.js
rm backend/rclone_wrapper_old.js

# Delete old rclone config
rm rclone.conf.txt

# Optionally remove test files if not needed
# rm backend/test-e2e.js

# Commit cleanup to git
git add -A
git commit -m "cleanup: remove terabox and alist files after gdrive migration"
git push origin main
```

---

## Files to Keep

These files should NOT be deleted:

| File | Reason |
|------|--------|
| `rclone.conf` | Primary storage configuration - ESSENTIAL |
| `backend/.env` | Environment variables - ESSENTIAL |
| `backend/rclone_wrapper.js` | Storage layer - ESSENTIAL |
| `backend/server.js` | Main application - ESSENTIAL |
| `GDRIVE_MIGRATION_COMPLETE.md` | Migration documentation |
| `GDRIVE_MIGRATION_CHECKLIST.md` | Testing guide |
| `MIGRATION_SUMMARY.txt` | Reference |
| `CLEANUP_TERABOX_FILES.md` | This file |

---

## Safe Deletion Bash Script

If you want to automate it (run only after 30 days of successful testing):

```bash
#!/bin/bash
# cleanup-terabox.sh

echo "Terabox Files Cleanup"
echo "====================="
echo ""
echo "WARNING: This will delete Terabox-related files"
echo "Make sure Google Drive migration is working!"
echo ""
read -p "Continue? (yes/no): " response

if [[ "$response" != "yes" ]]; then
    echo "Cancelled."
    exit 1
fi

# List of files to delete
files_to_delete=(
    "backend/teraboxCredentialManager.js"
    "backend/teraboxStorageHandler.js"
    "backend/teraboxDirectAPI.js"
    "backend/teraboxHybridHandler.js"
    "backend/alistStartupHandler.js"
    "backend/test-terabox-setup.js"
    "backend/rclone_wrapper_old.js"
    "rclone.conf.txt"
)

# Delete files
for file in "${files_to_delete[@]}"; do
    if [ -f "$file" ]; then
        rm "$file"
        echo "✓ Deleted: $file"
    else
        echo "✗ Not found: $file"
    fi
done

echo ""
echo "Cleanup complete!"
echo "Run: git status"
echo "Then: git add -A && git commit -m 'cleanup: remove terabox files'"
```

---

## Git History & Rollback

If you delete files and later need them:

```bash
# View file history
git log --oneline -- backend/teraboxCredentialManager.js

# Restore a specific file from history
git checkout <commit-hash> -- backend/teraboxCredentialManager.js

# Or restore all deleted files
git checkout HEAD~1 -- backend/terabox*.js
```

---

## Before/After Cleanup

### Before Cleanup
```
backend/
├── teraboxCredentialManager.js    ← DELETE
├── teraboxStorageHandler.js       ← DELETE
├── teraboxDirectAPI.js            ← DELETE
├── teraboxHybridHandler.js        ← DELETE
├── alistStartupHandler.js         ← DELETE
├── test-terabox-setup.js          ← DELETE
├── rclone_wrapper.js              ← KEEP
├── rclone_wrapper_old.js          ← DELETE
└── ... (other files)

rclone.conf                         ← KEEP
rclone.conf.txt                     ← DELETE
```

### After Cleanup
```
backend/
├── rclone_wrapper.js              ← KEEP
├── server.js                       ← KEEP
└── ... (other files - no Terabox files)

rclone.conf                         ← KEEP
```

---

## Size Impact

### Current Disk Usage
```
teraboxCredentialManager.js         ~15 KB
teraboxStorageHandler.js            ~25 KB
teraboxDirectAPI.js                 ~12 KB
teraboxHybridHandler.js             ~18 KB
alistStartupHandler.js              ~20 KB
test-terabox-setup.js               ~8 KB
rclone_wrapper_old.js               ~32 KB
rclone.conf.txt                     ~3 KB
test-e2e.js                         ~18 KB
─────────────────────────────────────────
Total                               ~151 KB
```

**Cleanup Impact**: ~151 KB freed (negligible for modern systems)

---

## 🚀 Recommended Timeline

- **Week 1**: Run migration, test everything
- **Week 2-4**: Monitor in production, keep backup
- **Day 30**: If all stable, archive files
- **Day 60**: Delete archived files if no issues found

---

## Questions?

- Migration guide: `GDRIVE_MIGRATION_COMPLETE.md`
- Testing checklist: `GDRIVE_MIGRATION_CHECKLIST.md`
- Quick reference: `MIGRATION_SUMMARY.txt`

---

**Last Updated**: August 25, 2026  
**Safe to Execute After**: Confirmed Google Drive working (30 days)
