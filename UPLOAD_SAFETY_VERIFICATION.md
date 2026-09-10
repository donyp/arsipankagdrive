# Upload Safety Verification Guide

## Overview
All 3 file types (invoice_pdf, bukti_bayar, faktur_pajak) now have SAFE re-upload logic:
- ✅ No false duplicate errors
- ✅ Handles manual GDrive deletions correctly
- ✅ Counts sync accurately

## How It Works

### Upload Flow (All 3 Types)
1. **Quick Check** (before upload)
   - If old path exists in DB, check if file TRULY exists in GDrive
   - Only reject if file exists (real duplicate)
   - Allow re-upload if file not found

2. **Background Upload**
   - Upload file to GDrive
   - Update DB with NEW path
   - Update file count

3. **Sync Job** (every 5 minutes)
   - Check actual file existence in GDrive
   - If file missing:
     - Invalidate cache entry (so next check queries fresh)
     - Clear path from DB (so re-upload won't see stale path)
     - Update count correctly

## Test Procedure

### Test 1: Invoice PDF Upload/Delete/Re-upload

```
Step 1: Upload invoice PDF
- Select invoice with keterangan "PPN" (requires 3 files)
- Upload invoice PDF file
- Expected: Count shows 1/3

Step 2: Verify upload success
- Refresh browser
- Expected: Still 1/3 (file cached in DB)

Step 3: Delete file from GDrive directly
- Go to Google Drive
- Delete the invoice PDF file
- Wait 5 minutes (sync interval)

Step 4: Check dashboard
- Refresh browser
- Expected: Count should NOW be 0/3 (sync detected deletion)

Step 5: Re-upload same invoice PDF
- Upload invoice PDF again
- Expected: Upload succeeds, NO "duplicate" error
- Expected: Count becomes 1/3

Step 6: Verify re-upload
- Refresh browser
- Expected: Still 1/3 (new file is there)
```

### Test 2: Bukti Bayar Upload/Delete/Re-upload

```
Step 1: Upload bukti bayar
- Select same invoice
- Upload bukti bayar file
- Expected: Count shows 2/3

Step 2: Delete from GDrive
- Go to Google Drive
- Delete the bukti bayar file
- Wait 5 minutes

Step 3: Check count
- Refresh browser
- Expected: Count is 1/3 (sync detected deletion)

Step 4: Re-upload bukti bayar
- Upload bukti bayar again
- Expected: Upload succeeds, NO "duplicate" error
- Expected: Count becomes 2/3

Step 5: Verify
- Refresh browser
- Expected: Still 2/3
```

### Test 3: Faktur Pajak Upload/Delete/Re-upload

```
Step 1: Upload faktur pajak
- Select same invoice (PPN type requires this)
- Upload faktur pajak file
- Expected: Count shows 3/3

Step 2: Delete from GDrive
- Go to Google Drive
- Delete the faktur pajak file
- Wait 5 minutes

Step 3: Check count
- Refresh browser
- Expected: Count is 2/3

Step 4: Re-upload faktur pajak
- Upload faktur pajak again
- Expected: Upload succeeds, NO "duplicate" error
- Expected: Count becomes 3/3

Step 5: Verify
- Hard refresh browser (Ctrl+F5)
- Expected: Still 3/3
```

### Test 4: Multiple Deletions & Re-uploads

```
Step 1: Start with 3/3 (all files uploaded)

Step 2: Delete 2 files at once
- Delete invoice PDF AND bukti bayar from GDrive
- Wait 5 minutes for sync

Step 3: Check count
- Refresh
- Expected: Count is 1/3 (only faktur pajak remains)

Step 4: Re-upload both deleted files
- Upload invoice PDF → should work
- Upload bukti bayar → should work
- Expected: Count becomes 3/3

Step 5: Verify final state
- Hard refresh
- Expected: 3/3 with all files present
```

## What Was Fixed

### Before (Broken)
- Upload → sync clear path immediately → next upload still sees stale cache → duplicate error

### After (Fixed)
- Upload → sync detects missing → invalidates cache AND clears path → next upload doesn't see stale data → upload succeeds

## Endpoints Verified

### Upload-PDF (Invoice)
- File: `backend/invoice-endpoints.js` line ~1570
- Status: ✅ Safe - has quick check logic, sync clears paths

### Upload-Document (Bukti Bayar)
- File: `backend/invoice-endpoints.js` line ~1920
- Status: ✅ Safe - has quick check logic, sync clears paths

### Upload-Document (Faktur Pajak)
- File: `backend/invoice-endpoints.js` line ~1770
- Status: ✅ Safe - has quick check logic, sync clears paths

### File-Count-Sync Job
- File: `backend/file-count-sync-job.js` line ~80
- Status: ✅ Safe - invalidates cache AND clears paths for all 3 types

## Expected Results

✅ All 3 file types: Upload → Delete → Re-upload → **SUCCESS** (no false duplicate)
✅ Count accuracy: Sync within 5 minutes detects actual GDrive state
✅ No data loss: Cache invalidated, paths cleared, counts corrected

## Troubleshooting

If still seeing "duplicate" error:
1. Hard refresh browser (Ctrl+F5)
2. Wait 5 minutes for sync job to run
3. Check server logs for "FileCountSync" entries
4. Verify file actually deleted from GDrive

If count doesn't update after delete:
1. Check browser cache (hard refresh)
2. Wait for sync job (5 min interval)
3. Manual sync: Click "Sync Now" button on dashboard if available
4. Check server logs for sync completion

## Implementation Details

### Key Changes
- **file-count-sync-job.js**: Invalidate cache + clear paths when deletion detected
- **invoice-endpoints.js**: All 3 upload endpoints check if OLD file truly exists before rejecting

### Cache Strategy
- TTL: 5 minutes (auto-expire stale entries)
- Invalidation: On deletion detection (manual invalidate)
- Result: Fresh GDrive queries after deletion

### Path Clearing Strategy
- When: Sync detects file missing
- What: Set invoice_pdf_path/bukti_bayar_path/faktur_pajak_path to NULL
- Why: Prevents quick check from seeing stale paths

---
**Test and report any issues!**
