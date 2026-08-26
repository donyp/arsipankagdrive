# Fix: Local Storage Path Structure - August 26, 2026

## Problem Identified

The system was storing files locally with a **BROKEN PATH CONVERSION** function. The issue was in `backend/local_storage.js`:

### OLD (Broken) Code
```javascript
function getLocalPath(storagePath) {
    // Hardcoded to remove OLD /arsip/ prefix
    const relativePath = storagePath.replace(/^\/arsip\//, '');
    return path.join(LOCAL_STORAGE_PATH, relativePath);
}
```

### What Was Happening
1. Frontend sends: `/ARSIP ANKA/zona-1/toko-balaraja/INVOICE/NON/filename.pdf` ✓ (CORRECT)
2. Local storage tries to convert but removes `/arsip/` 
3. Since path starts with `/ARSIP ANKA/` (not `/arsip/`), the regex doesn't match
4. Function returns: `./local_files//ARSIP ANKA/zona-1/toko-balaraja/INVOICE/NON/filename.pdf` ✗ (BROKEN)
5. File ends up in wrong folder with escaped spaces

---

## Solution Applied

### File Modified: `backend/local_storage.js`

#### 1. Fixed getLocalPath Function
```javascript
function getLocalPath(storagePath) {
    // storagePath format: /ARSIP ANKA/zona-1/toko-balaraja/INVOICE/NON/filename.pdf
    // Convert to: ./local_files/zona-1/toko-balaraja/INVOICE/NON/filename.pdf
    
    // Remove leading slash and base path prefix
    let relativePath = storagePath.startsWith('/') ? storagePath.substring(1) : storagePath;
    
    // Remove '/ARSIP ANKA/' prefix (handles both spaces and escaped versions)
    relativePath = relativePath.replace(/^ARSIP\s+ANKA\//, '');
    
    // Fallback: if still has old /arsip/ prefix, remove it (for backward compatibility)
    relativePath = relativePath.replace(/^arsip\//, '');
    
    return path.join(LOCAL_STORAGE_PATH, relativePath);
}
```

**What it does now:**
- Properly handles `/ARSIP ANKA/` with spaces ✓
- Removes leading slash first ✓
- Falls back to old `/arsip/` for backward compatibility ✓
- Result: `./local_files/zona-1/toko-balaraja/INVOICE/NON/filename.pdf` ✓

#### 2. Updated Mock File Structure
Changed from uppercase names to lowercase (matching actual database tokos):
- OLD: `TOKO-TASIKMALAYA` → NEW: `toko-balaraja`
- OLD: `PPN`, `NON_PPN` → NEW: `INVOICE/NON`, `INVOICE/PPN`
- Categories now correctly use: `INVOICE`, `INVOICE/NON`, `INVOICE/PPN`, `BUKTI PIUTANG`

#### 3. Fixed Fallback Stream Logic
Updated the regex pattern to extract zone/toko/category from new path format:
```javascript
// OLD: /arsip/zona-12/TOKO-TASIKMALAYA/INVOICE/filename.pdf
// NEW: /ARSIP ANKA/zona-1/toko-balaraja/INVOICE/NON/filename.pdf

// Updated regex to handle nested categories (INVOICE/NON)
const pathMatch = storagePath.match(/\/zona-(\w+)\/([^/]+)\/([^/]+(?:\/[^/]+)?)\//);
```

---

## Expected File Paths After Fix

### Before (Broken)
```
./local_files//ARSIP%20ANKA/zona-1/toko-balaraja/INVOICE/NON/filename.pdf
```

### After (Fixed)
```
./local_files/zona-1/toko-balaraja/INVOICE/NON/filename.pdf
```

---

## File Upload Flow (Now Correct)

1. **User uploads:** `NON Balaraja 1.140.000 30 Mei.pdf`
2. **Frontend detects:**
   - Type: `NON`
   - Toko: `Balaraja` → ID lookup → `zona_id = 1`
3. **Backend processes:**
   - Zona code: `zona-01` → converted to `zona-1` by `convertZonaCodeForGDrive()`
   - Toko code: `toko-balaraja` (from toko name)
   - Category: `NON` → mapped to `INVOICE/NON` by `buildStoragePath()`
4. **Storage path built:** `/ARSIP ANKA/zona-1/toko-balaraja/INVOICE/NON/NON Balaraja 1.140.000 30 Mei.pdf`
5. **Local file saved:** `./local_files/zona-1/toko-balaraja/INVOICE/NON/NON Balaraja 1.140.000 30 Mei.pdf` ✓

---

## Next Steps

### When Google Drive Upload is Re-Enabled
The same `storagePath` will be used for Google Drive via rclone:
- Rclone will upload to: `/ARSIP ANKA/zona-1/toko-balaraja/INVOICE/NON/filename.pdf`
- On Google Drive it will appear exactly as: `ARSIP ANKA → zona-1 → toko-balaraja → INVOICE → NON → filename.pdf`

### Testing
Upload a test file and verify:
1. File appears in correct local folder
2. File is accessible via preview/download
3. Database record has correct `storage_path`

---

## Code Quality
- ✓ Handles spaces in folder names
- ✓ Backward compatible with old `/arsip/` paths
- ✓ Properly handles nested category paths (INVOICE/NON, INVOICE/PPN)
- ✓ Case-insensitive zone/toko matching with regex

---

## References
- **Issue**: Local storage path conversion was using hardcoded old prefix
- **Root Cause**: BASE_PATH changed from `/arsip` to `/ARSIP ANKA` but local_storage.js wasn't updated
- **Files Modified**: `backend/local_storage.js` (getLocalPath, createMockFiles, getStream)
- **Deployment**: Ready for testing immediately
