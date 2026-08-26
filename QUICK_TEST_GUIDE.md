# Quick Test Guide - Google Drive Auto-Sync

## Status Right Now
✅ **System is running and ready to test**

Backend Status:
```
Port: http://localhost:5000
Auto-Sync: Active (scanning every 5 minutes)
Database: Connected to Supabase
Storage: Google Drive (via rclone)
```

---

## 5-Minute Test Plan

### Step 1: Upload a Test File (2 min)
1. Open Google Drive
2. Go to: **ARSIP ANKA → zona-2 → TOKO-SAWANGAN → INVOICE**
3. Upload any PDF file (e.g., `test-invoice.pdf`)
4. Done! File is now in Google Drive

### Step 2: Trigger Manual Sync (1 min)
You have two options:

**Option A: Via API (Fastest)**
```bash
# Get JWT token from your web UI login or run:
# curl -X POST http://localhost:5000/api/auth/login \
#   -H "Content-Type: application/json" \
#   -d '{"email":"your_email@example.com","password":"your_password"}'

# Then call sync endpoint:
curl -X POST http://localhost:5000/api/sync/gdrive \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Option B: Wait for Auto-Sync**
- System scans automatically every 5 minutes
- Just wait and check database

**Option C: Check via Web UI**
1. Open http://localhost:3000 (or your frontend)
2. Login with your credentials
3. Navigate to Files section
4. File should appear there automatically

### Step 3: Verify File in Database (1 min)
```bash
curl -X GET http://localhost:5000/api/files \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Look for your uploaded file in the response. You should see:
```json
{
  "filename": "test-invoice.pdf",
  "storage_path": "gdrive:/ARSIP ANKA/zona-2/TOKO-SAWANGAN/INVOICE/test-invoice.pdf",
  "zona_kode": "zona-2",
  "toko_kode": "TOKO-SAWANGAN",
  "category": "INVOICE",
  "file_size": 12345,
  ...
}
```

### Step 4: Verify in Web UI (1 min)
1. Refresh web UI
2. Go to Files section
3. Filter by zona-2 and TOKO-SAWANGAN
4. See your uploaded file with all metadata populated automatically

---

## Expected Results

### Success Indicators ✅
- [x] File uploaded to Google Drive at correct path
- [x] Auto-sync detected the file within 5 minutes
- [x] Database record created with all metadata fields populated
- [x] File visible in web UI with filters working
- [x] Log shows: `[GDriveSync] ✅ Inserted: zona-2/TOKO-SAWANGAN/INVOICE/test-invoice.pdf`

### If Something's Wrong ❌
See troubleshooting section below

---

## Troubleshooting

### Problem 1: "File not showing up in database"

**Check 1: File exists in Google Drive**
```bash
rclone ls --config "./rclone.conf" "gdrive:/ARSIP ANKA" --recursive
# Look for your file in output
```

**Check 2: File path is correct**
Required format: `ARSIP ANKA/zona-X/TOKO-NAME/CATEGORY/filename.pdf`

Valid categories: `INVOICE`, `PPN`, `NON_PPN`, `PIUTANG` (EXACT case)

**Check 3: Backend is running**
```bash
curl http://localhost:5000/api/heartbeat
# Should return: {"status":"alive","version":"2.0.1-fixed"}
```

**Check 4: Trigger manual sync**
```bash
curl -X POST http://localhost:5000/api/sync/gdrive \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Should return: {"status":"success",...}
```

---

### Problem 2: "Manual sync returns error"

**Most common cause**: Invalid or expired JWT token

**Solution**:
1. Get a fresh token by logging in via API or web UI
2. Ensure token is in format: `Authorization: Bearer TOKEN_HERE`
3. Try again

---

### Problem 3: "Backend says 'Found 0 PDF files'"

**Possible causes**:
1. No files uploaded yet
2. Files not in correct location (verify path)
3. Files don't have .pdf extension
4. Google Drive connection issue

**Debug**:
```bash
# Check what files are actually in Google Drive
rclone ls --config "./rclone.conf" "gdrive:/ARSIP ANKA" --recursive

# If nothing shows, Google Drive may not be connected
# Try this to verify connection:
rclone lsd --config "./rclone.conf" gdrive:/
# Should list root folders on your Google Drive
```

---

### Problem 4: "Sync runs but hangs/times out"

**Cause**: Rclone Google Drive connection might be slow

**Solution**:
1. Check internet connection
2. Restart backend: `node backend/server.js`
3. Verify rclone token hasn't expired in `rclone.conf`

---

## Testing Scenarios

### Scenario 1: Single File Upload
1. Upload `invoice-001.pdf` to zona-2/TOKO-SAWANGAN/INVOICE/
2. Trigger sync
3. Verify file appears in database
4. ✅ Test passes if file has correct metadata

### Scenario 2: Multiple Files
1. Upload 5 PDF files to different categories (INVOICE, PPN, NON_PPN, PIUTANG)
2. Trigger sync
3. All 5 should appear in database
4. ✅ Test passes if all 5 have correct metadata

### Scenario 3: Duplicate Prevention
1. Upload `invoice.pdf` to INVOICE folder
2. Sync (should insert)
3. Sync again immediately (should skip - already exists)
4. ✅ Test passes if response shows: `"synced": 0, "skipped": 1`

### Scenario 4: Auto-Sync Interval
1. Wait 5 minutes without uploading anything
2. Check logs - should show automatic scan
3. Upload file
4. Wait max 5 minutes
5. ✅ Test passes if file appears without manual trigger

---

## Logs to Watch

In terminal where backend is running:

### Normal Sync Output
```
[GDriveSync] 🚀 Starting Google Drive file auto-sync...
[GDriveSync] Starting auto-sync worker (interval: 300s)
[GDriveSync] Starting scan at 2026-08-25T10:00:00.000Z
[GDriveSync] Found 3 PDF files in ARSIP ANKA
[GDriveSync] ✅ Inserted: zona-2/TOKO-SAWANGAN/INVOICE/invoice-1.pdf
[GDriveSync] ✅ Inserted: zona-2/TOKO-SAWANGAN/INVOICE/invoice-2.pdf
[GDriveSync] Complete: 2 new, 1 existing
```

### Error Output (if sync fails)
```
[GDriveSync] Error listing files: Command timeout
[GDriveSync] Error inserting file: Duplicate key value
[GDriveSync] DB check error: Connection refused
```

---

## Quick Commands Reference

```bash
# Start backend
cd backend
node server.js

# Get health status
curl http://localhost:5000/api/health/storage

# Get sync status
curl http://localhost:5000/api/sync/status -H "Authorization: Bearer TOKEN"

# Manual sync
curl -X POST http://localhost:5000/api/sync/gdrive \
  -H "Authorization: Bearer TOKEN"

# List files in database
curl http://localhost:5000/api/files \
  -H "Authorization: Bearer TOKEN"

# Check Google Drive files directly
rclone ls --config "./rclone.conf" "gdrive:/ARSIP ANKA" --recursive
```

---

## Success Checklist ✅

- [ ] Backend running on port 5000
- [ ] Auto-sync shows "[GDriveSync] 🚀 Starting..." in logs
- [ ] Test file uploaded to correct Google Drive path
- [ ] Manual sync returns `"status": "success"`
- [ ] File appears in database with correct metadata
- [ ] File visible in web UI
- [ ] Auto-sync logs show "✅ Inserted: ..."

---

## Need Help?

1. **Backend won't start**: Check logs for errors, ensure port 5000 is free
2. **Can't upload to Google Drive**: Verify you have ARSIP ANKA folder, check permissions
3. **Sync not detecting files**: Verify path format, check file extension is .pdf
4. **Database errors**: Check Supabase connection in .env file
5. **Logs not showing**: Restart backend with: `node backend/server.js 2>&1`

---

## What Happens Next (After Testing)

Once you confirm files auto-sync successfully:

1. ✅ System is production-ready
2. ✅ Start bulk uploading files to Google Drive
3. ✅ All files auto-populate database
4. ✅ Users can access via web UI and API
5. ✅ No more manual data entry needed!

---

**Last Updated**: 2026-08-25  
**System Version**: v2.0.1-fixed  
**Backend Status**: ✅ Running
