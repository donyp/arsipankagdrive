# 🔄 Quick Rollback Instructions

If chunked upload implementation causes issues, use these commands to quickly revert to the stable backup.

---

## 🚨 EMERGENCY ROLLBACK (Fastest)

### Option 1: Revert Entire Branch (1 second)
```bash
cd d:\DOWNLOAD\arsipankanew-replit-source\arsipankanew-replit-source

# Quick revert to backup snapshot
git checkout backup/upload-system-snapshot-before-chunked

# Verify you're on backup branch
git status
# Output should show: On branch backup/upload-system-snapshot-before-chunked
```

**Effect**: Entire codebase reverts to commit `7a34c40`. All upload/download code returns to original state.

---

### Option 2: Restore Individual Files from Backup

If you only want to restore specific files (not entire branch):

```bash
# Restore rclone_wrapper.js
copy backend\backups\rclone_wrapper.BACKUP-7a34c40.js backend\rclone_wrapper.js

# Restore server.js (general upload endpoints)
copy backend\backups\server.BACKUP-7a34c40.js backend\server.js

# Restore invoice endpoints
copy backend\backups\invoice-endpoints.BACKUP-7a34c40.js backend\invoice-endpoints.js

# Restart server
npm restart
```

---

### Option 3: Git Hard Reset (Nuclear, if branch has unintended commits)
```bash
# Reset to backup snapshot, discarding ALL changes
git reset --hard backup/upload-system-snapshot-before-chunked

# Verify reset
git log --oneline -1
# Should show: 7a34c40 fix: Remove default zona number...
```

**⚠️ WARNING**: This discards all changes since branch creation. Only use if branch is completely broken.

---

## 📋 Rollback Checklist

After executing any rollback option above, verify:

```bash
# 1. Verify branch/commit
git log --oneline -1
# Should show: 7a34c40

# 2. Verify backup files are in place
ls backend/rclone_wrapper.js
ls backend/server.js
ls backend/invoice-endpoints.js

# 3. Clear npm cache
npm cache clean --force

# 4. Reinstall dependencies
npm install

# 5. Start server
npm start

# 6. Test endpoints manually:
# - Try uploading a small PDF
# - Try downloading a file
# - Check if file exists
# If all work, you're safe
```

---

## 🔍 Verify Rollback Success

### Manual Test: Upload a Small File

```bash
# Using curl from Windows PowerShell
$file = "C:\path\to\test.pdf"
$token = "YOUR_AUTH_TOKEN"

$response = curl.exe -X POST `
  -H "Authorization: Bearer $token" `
  -F "file=@$file" `
  "http://localhost:3000/api/files/upload"

echo $response
```

**Expected result**: 
- HTTP 200 OK
- File appears in database
- File visible on Google Drive

---

### Manual Test: Download a File

```bash
# Using curl
curl.exe -X GET `
  -H "Authorization: Bearer $token" `
  "http://localhost:3000/api/files/download?id=FILE_ID" `
  -o "C:\output\downloaded.pdf"
```

**Expected result**: 
- HTTP 200 OK
- File downloaded to disk
- File content matches original

---

### Manual Test: Check File Exists

```bash
# Using curl
curl.exe -X GET `
  -H "Authorization: Bearer $token" `
  "http://localhost:3000/api/invoice/check-file?path=ARSIPINVOICE/BEKASI/2026/JANUARI/01/PPN/test.pdf"
```

**Expected result**: 
- HTTP 200 OK
- Returns: `{ exists: true/false }`

---

## 📊 Verify Database Consistency After Rollback

```sql
-- Check no orphaned records
SELECT COUNT(*) FROM files WHERE storage_path IS NULL;
-- Should return 0

-- Check duplicate files
SELECT storage_path, COUNT(*) FROM files GROUP BY storage_path HAVING COUNT(*) > 1;
-- Should return empty result

-- Check invoice consistency
SELECT COUNT(*) FROM invoice_file_list WHERE invoice_pdf_path IS NOT NULL;
-- Should match number of uploaded invoices

-- Check timestamps are recent
SELECT MAX(created_at) FROM files;
-- Should be recent timestamp, not NULL
```

---

## 🔄 After Successful Rollback

1. ✅ System is back to stable state
2. ✅ All original upload/download features work
3. ✅ Database is consistent
4. ✅ No data loss

### Next Steps:
- [ ] Identify what caused the issue
- [ ] Fix on feature branch
- [ ] Test locally before re-deploying
- [ ] Or start fresh with different approach

---

## 🚀 Restart Feature Branch (After Fixing Issue)

```bash
# Create new feature branch from backup (fresh start)
git checkout -b feature/chunked-upload-v2 backup/upload-system-snapshot-before-chunked

# Verify you're on new branch
git status
# Output: On branch feature/chunked-upload-v2

# Now make changes again...
```

---

## 📞 Support

If rollback doesn't work:

1. **Check git status**:
   ```bash
   git status
   git log --oneline -5
   ```

2. **Check if files exist**:
   ```bash
   ls backend/rclone_wrapper.js
   ls backend/backups/rclone_wrapper.BACKUP-7a34c40.js
   ```

3. **Manual restore from backup**:
   ```bash
   copy backend\backups\rclone_wrapper.BACKUP-7a34c40.js backend\rclone_wrapper.js
   copy backend\backups\server.BACKUP-7a34c40.js backend\server.js
   copy backend\backups\invoice-endpoints.BACKUP-7a34c40.js backend\invoice-endpoints.js
   ```

4. **Restart application**:
   ```bash
   npm restart
   ```

---

## 📝 Backup Files Location

All backups stored in: `backend/backups/`

```
backend/backups/
├── rclone_wrapper.BACKUP-7a34c40.js      # Original file operations
├── server.BACKUP-7a34c40.js               # Original upload endpoints
└── invoice-endpoints.BACKUP-7a34c40.js    # Original invoice endpoints
```

These files are never modified. Safe to reference anytime.

---

## 🔑 Git Commands Reference

```bash
# View all branches (including backup)
git branch -a

# Checkout backup branch
git checkout backup/upload-system-snapshot-before-chunked

# Checkout feature branch (to continue working)
git checkout feature/chunked-upload-optimization

# View difference between branches
git diff master backup/upload-system-snapshot-before-chunked -- backend/

# View commit history of backup
git log backup/upload-system-snapshot-before-chunked --oneline -10

# Reset to any previous commit (if needed)
git reset --soft HEAD~1          # Keep changes, undo last commit
git reset --mixed HEAD~1        # Undo last commit, keep files
git reset --hard HEAD~1         # Undo last commit, discard everything
```

---

## ⏱️ Rollback Time Estimates

| Method | Time | Effort |
|--------|------|--------|
| Option 1: Checkout backup branch | < 5 seconds | Minimal |
| Option 2: Restore backup files | < 30 seconds | Minimal |
| Option 3: Hard reset | < 10 seconds | Moderate |
| Option 3 + full test | 5-10 minutes | High |

**Recommendation**: Use Option 1 (checkout backup branch) for fastest rollback in emergency.
