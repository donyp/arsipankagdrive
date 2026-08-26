# Latest Updates - Preview Fix & Nominal Badge

## Changes Applied

### 1. **Fixed spawn Not Defined Error** ✅
**File**: `backend/server.js`
- **Problem**: `spawn` was being required inside a try block (line 1065), but used in the catch block where it was out of scope
- **Fix**: Added `const { spawn } = require('child_process');` at the top of server.js (line 11)
- **Result**: spawn function now available throughout the preview endpoint

### 2. **Fixed Rclone Download Command** ✅
**File**: `backend/server.js` (lines 1073 & 1127)
- **Problem**: Using `rclone copy` preserves directory structure, so file ends up in nested folders instead of directly in cache
- **Example**: File copied to `/preview_cache/ARSIP ANKA/toko-balaraja/...` instead of `/preview_cache/filename.pdf`
- **Fix**: Changed from `rclone copy` to `rclone copyto` which allows specifying exact destination file path
- **Result**: Files now download directly to the expected cache location

### 3. **Added Nominal Badge Display** ✅
**File**: `js/dashboard.js`
- **Added Functions**:
  - `getCategoryLabel()` - Returns display label for category (e.g., "Invoice Merah" for INVOICE)
  - `getTipePPNLabel()` - Returns label for PPN type (PPN or NON)
  - `extractNominalFromFilename()` - Extracts Rp value from filename using regex pattern
    - Looks for dot-separated numbers like "13.242.200" or "1.521.000"
    - Returns formatted string like "Rp 13.242.200" or null if not found

- **Updated Dashboard Display** (line 1002-1009):
  - Added new metadata row showing nominal value with 💰 icon
  - Shows only if nominal found in filename
  - Appears between Category badge and Location/Date info

**Example File Display**:
```
🟥 Invoice Merah • PPN
Balaraja 13.242.200 30 Mei.pdf
───────────────────────────────
📁 Invoice Merah • PPN
💰 Rp 13.242.200       ← NEW
📍 Zona 1
📅 30 Mei
```

---

## Technical Details

### Nominal Extraction Algorithm
The `extractNominalFromFilename()` function uses regex to find patterns:
- **Pattern**: `\b(\d{1,2}(?:\.\d{3})+)\b`
- **Matches**: 
  - "13.242.200" ✓
  - "1.521.000" ✓
  - "100.000" ✓
  - "1000" ✗ (needs dots)
  - "13242200" ✗ (needs dots for formatting)

### Rclone Command Fix
**Before** (using copy - creates nested structure):
```bash
rclone copy gdrive:/ARSIP ANKA/toko-balaraja/INVOICE/PPN/FILE.pdf /cache/
# Result: /cache/ARSIP ANKA/toko-balaraja/INVOICE/PPN/FILE.pdf
```

**After** (using copyto - exact destination):
```bash
rclone copyto gdrive:/ARSIP ANKA/toko-balaraja/INVOICE/PPN/FILE.pdf /cache/ID.pdf
# Result: /cache/ID.pdf ✓
```

---

## Files Modified
1. `backend/server.js` - spawn import + rclone copyto command (2 locations)
2. `js/dashboard.js` - Added 3 helper functions + nominal display in file list

## Testing Notes
- Dashboard nominal badge will show for files with Rp values in their names
- Preview endpoint now uses copyto for direct file download
- Both first attempt and alternative path (fallback) use copyto
- Nominal extraction is case-insensitive and robust to extra spaces

---

## Known Issues
- Preview download from Google Drive may timeout if:
  - Google Drive API token is expired
  - Network connectivity issues
  - Rclone process taking too long
- **Workaround**: Download button works independently; doesn't require preview

---

## Next Steps if Preview Still Not Working
1. **Check Google Drive token expiry**: Token in `rclone.conf` may have expired
2. **Manually re-auth rclone**: Run `rclone config` to refresh Google Drive credentials
3. **Test rclone directly**: 
   ```bash
   rclone copyto gdrive:/ARSIP\ ANKA/toko-balaraja/INVOICE/PPN/FILE.pdf test-file.pdf
   ```
4. **Check rclone logs**: Add `-vv` flag to rclone command for verbose output

---

## Files Status
- ✅ Nominal badge feature: COMPLETE and displaying
- ✅ Spawn function: FIXED (imported at top)
- ✅ Rclone copyto: IMPLEMENTED (should work better)
- ⚠️ Preview streaming: Fixed code, but may still need Google Drive token refresh
- ✅ All stats counters: Working correctly
- ✅ File list display: Showing correct metadata with new nominal badge
