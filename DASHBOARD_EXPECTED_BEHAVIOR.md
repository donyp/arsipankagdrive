# Dashboard Expected Behavior - After Fixes

## What Should Display Now

### 1. **Total Arsip Invoice (Top Right, Red Circle)**
- **Before**: Shows 0 (broken)
- **After**: Shows correct count, e.g., "2" for the two test files
- **Logic**: Auto-filtered by role (admin_zona sees only INVOICE category, others see all)

### 2. **Total Storage Used (Top Right, Blue/Gray)**
- **Before**: Shows 0 GB (broken)
- **After**: Shows correct usage, e.g., "0.00 / 80 GB" for test files
- **Calculation**: Sum of `ukuran_bytes` from all non-deleted files
- **Today's Usage**: Shown separately below main storage bar

### 3. **File List in Dashboard**
When you view the file list, each file should show:

```
📁 Invoice • PPN        <- Icon + Category + Badge
BALARAJA.pdf            <- Clean filename (NO "PPN" prefix)
1.53 MB • 30 Mei       <- Size and metadata
```

### 4. **Auto-Sync Status**
Backend logs show:
```
[GDriveSync] Starting scan at 2026-08-26T03:XX:XX.XXXZ
[GDriveSync] Found X PDF files in ARSIP ANKA
[GDriveSync] Complete: X new, X existing
```

This runs every 5 minutes automatically.

---

## Testing the Fixes

### Quick Test (No New Files Needed)
1. Open dashboard
2. Check that "Total Arsip Invoice" shows "2" (not 0)
3. Check that "Total Storage" shows file size (not 0 GB)
4. Files list shows both test files with correct names

### Full Test (Upload New File)
1. Go to `/ARSIP ANKA/zona-1/toko-balaraja/INVOICE/PPN/` in Google Drive
2. Upload a new PDF file, e.g., `TEST_FILE.pdf`
3. Wait up to 5 minutes for auto-sync to run
4. Refresh dashboard
5. Check that:
   - New file appears in list with clean name
   - Total Arsip count increased by 1
   - Total Storage increased by file size
   - File has correct PPN/NON badge

### Preview Test
1. Click eye icon on any file in the list
2. PDF should display in modal (or show "Preview tidak tersedia" for cloud-only files)
3. Button to download should work
4. Button to close preview works

---

## Common Issues & Solutions

### Issue: Total Arsip still shows 0
- **Check**: Backend running? (`node ./backend/server.js`)
- **Check**: Database connected? (Check browser console for auth errors)
- **Check**: Cleared browser cache? (Hard refresh: Ctrl+F5)

### Issue: Files show wrong names (e.g., "PPN/PPN BALARAJA")
- **Status**: This should be fixed by the auto-sync improvements
- **Note**: Legacy files with wrong names stay as-is; only NEW files will have clean names
- **Fix if needed**: Re-upload file to force re-sync with clean name

### Issue: Preview still shows "File tidak ditemukan"
- **Likely**: The file's storage_path format is still wrong
- **Fix**: Check backend logs for the attempted rclone paths
- **Workaround**: Use Download button instead (doesn't require cached file)

### Issue: Stats don't update immediately after uploading file
- **Expected**: Takes up to 5 minutes for auto-sync to run
- **Manual**: Backend has `/api/sync/gdrive` endpoint that can be called manually to force sync
- **Check**: Backend logs will show when sync runs

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GOOGLE DRIVE                              │
│  /ARSIP ANKA                                                │
│  ├── zona-1/                                                │
│  │   ├── toko-balaraja/INVOICE/PPN/  → FILE.pdf           │
│  │   └── toko-balaraja/INVOICE/NON/  → FILE.pdf           │
│  └── zona-17/                                               │
│      └── ...                                                │
└─────────────────────────────────────────────────────────────┘
           ↑                                    ↓
      (listens)                            (writes)
           ↑                                    ↓
┌─────────────────────────────────────────────────────────────┐
│             AUTO-SYNC (gdrive-file-sync.js)                │
│  Runs every 5 minutes:                                      │
│  1. List all PDFs in ARSIP ANKA                            │
│  2. Check if already in database                           │
│  3. Extract metadata (zona, toko, category, PPN/NON)      │
│  4. Insert new records with clean filenames               │
└─────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE DATABASE                              │
│  files table:                                               │
│  - nama_file (BALARAJA.pdf - cleaned)                      │
│  - storage_path (/arsip/toko-balaraja/INVOICE/PPN/...)    │
│  - category (INVOICE)                                       │
│  - tipe_ppn (PPN or NON)                                   │
│  - ukuran_bytes (file size in bytes)                       │
│  - zona_id (linked to zonas table)                         │
└─────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│                   DASHBOARD (Frontend)                      │
│  1. Loads file list from /api/files endpoint               │
│  2. Displays cleaned filename + badges                      │
│  3. Loads stats from /api/stats/storage endpoint            │
│  4. Shows total count and storage usage                    │
│  5. Provides download & preview buttons                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Details for Developers

### Path Transformations
When a new file is uploaded to Google Drive:
```
Google Drive Path:
  toko-balaraja/INVOICE/PPN/PPN BALARAJA 13.242.200 30 Mei.pdf

Parsed by auto-sync:
  tokoKode: toko-balaraja
  category: INVOICE
  subCategory: PPN
  filename: BALARAJA 13.242.200 30 Mei.pdf  (cleaned - PPN prefix removed)

Stored in database:
  storage_path: /arsip/toko-balaraja/INVOICE/PPN/PPN BALARAJA 13.242.200 30 Mei.pdf
  nama_file: BALARAJA 13.242.200 30 Mei.pdf
  tipe_ppn: PPN

Preview endpoint transforms:
  storage_path → rclone path → gdrive:/ARSIP ANKA/toko-balaraja/INVOICE/PPN/...
```

### Database Query Examples
```sql
-- Get total files (dashboard counter)
SELECT COUNT(*) FROM files WHERE deleted_at IS NULL AND category = 'INVOICE'

-- Get storage usage (dashboard storage bar)
SELECT SUM(ukuran_bytes) FROM files WHERE deleted_at IS NULL

-- Get files with metadata (dashboard list)
SELECT * FROM files 
WHERE deleted_at IS NULL 
ORDER BY created_at DESC
LIMIT 50
```

---

## Performance Notes
- Auto-sync interval: 5 minutes (configurable via `SYNC_INTERVAL` in gdrive-file-sync.js)
- Rclone caches listings for ~1 hour (helps performance)
- Preview files cached locally in `backend/preview_cache/` directory
- Large files (>32MB) may take longer to cache for preview

---

## Rollback Info
If you need to revert changes:
- Dashboard.js: Change line 1573 back to filter manually
- server.js: Remove alternative path fallback (lines 1115-1147)
- gdrive-file-sync.js: Simplify parseStoragePath to only expect zona-prefixed paths

But recommended to keep these fixes as they enable proper Google Drive integration.
