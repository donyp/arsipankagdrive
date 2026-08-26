# Test Local Storage Path Fix

## Quick Verification Steps

### Step 1: Upload a Test File
1. Go to upload page
2. Upload file: **`NON Balaraja 1.140.000 30 Mei.pdf`**
3. Expected detection:
   - Type: NON (auto-detected) ✓
   - Toko: Balaraja (auto-detected with green checkmark) ✓
   - Date: 30 Mei (auto-detected) ✓

### Step 2: Verify Local Storage Path
After successful upload, check the local filesystem:

**Expected file location:**
```
./local_files/zona-1/toko-balaraja/INVOICE/NON/NON Balaraja 1.140.000 30 Mei.pdf
```

**DO NOT expect these (old paths):**
- ✗ `./local_files/ARSIP ANKA/zona-1/...` (wrong)
- ✗ `./local_files/arsip/zona-1/...` (old format)

### Step 3: Verify Database Record
Check database:
```sql
SELECT 
  nama_file,
  storage_path,
  category,
  zona_id,
  toko_id
FROM files
ORDER BY created_at DESC
LIMIT 1;
```

**Expected values:**
- `nama_file`: `NON Balaraja 1.140.000 30 Mei.pdf`
- `storage_path`: `/ARSIP ANKA/zona-1/toko-balaraja/INVOICE/NON/NON Balaraja 1.140.000 30 Mei.pdf` ✓
- `category`: `NON_PPN` (database internal value)
- `zona_id`: `1` (Balaraja is in zona-1)

### Step 4: Verify File Access
1. Click preview on uploaded file
2. PDF should load successfully ✓
3. File should be readable/downloadable ✓

---

## Test Checklist

- [ ] Upload test file named `NON Balaraja 1.140.000 30 Mei.pdf`
- [ ] Verify auto-detection works (toko name highlighted in green)
- [ ] Check `./local_files/zona-1/toko-balaraja/INVOICE/NON/` folder exists
- [ ] Verify database `storage_path` matches expected format
- [ ] Preview/download file works correctly
- [ ] Upload another file with `PPN` prefix to test `INVOICE/PPN` path
- [ ] Verify upload progress doesn't hang (local storage is fast)

---

## Troubleshooting

### Problem: File not appearing in expected folder
**Likely cause:** Server not restarted after code changes

**Solution:** Restart backend server:
```bash
npm run dev
# or
node backend/server.js
```

### Problem: File shows correct in DB but wrong in filesystem
**Likely cause:** Check console for errors during upload

**Solution:** Look for error messages in backend console, ensure:
- `BASE_PATH` is `/ARSIP ANKA` in `rclone_wrapper.js` (line ~257)
- Local storage directory has write permissions
- No disk space issues

### Problem: Old files still in wrong location
**Solution:** This is expected. Old files are still at old paths.

**What to do:**
- Don't delete old files manually
- New uploads will use correct paths
- Old files can be manually reorganized/archived later if needed

---

## Expected Behavior After Fix

✓ Files upload quickly to local storage (no Google Drive delays)
✓ Files are stored in correct nested folder structure
✓ Database path matches filesystem location
✓ Preview/download work immediately
✓ File organization matches user's Google Drive setup

---

## When to Re-Enable Google Drive

Once local storage test passes:

1. **Verify rclone config** (check `rclone.conf` has valid Google Drive token)
2. **Re-enable upload in `backend/server.js` line ~1772:**
   ```javascript
   // Uncomment this line:
   RcloneStorage.uploadInBackground(fileBuffer, req.file.originalname, zona.kode, tokoKode, folderCategory);
   ```
3. **Test with small file first** (< 5MB)
4. **Monitor console for any timeout errors**
5. **If timeout, investigate rclone hanging issue**

---

## Success Indicators

- ✓ Files appear in correct local folder immediately after upload
- ✓ All files follow pattern: `./local_files/zona-X/toko-Y/CATEGORY/filename`
- ✓ Database `storage_path` field matches filesystem location
- ✓ File preview/download works without errors
