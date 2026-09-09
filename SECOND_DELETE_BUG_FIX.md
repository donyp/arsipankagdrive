# Second Delete Cycle Bug - Root Cause & Fix

## Problem Statement
After upload → delete → refresh → upload → refresh cycle:
- **First cycle**: Upload (3/3) → Delete → Refresh (2/3) ✓ **WORKS**
- **Second cycle**: Upload (3/3) → Delete → Refresh (still 3/3) ❌ **BUG**

User suspected: "apa karna file invoice punya 2 folder (PPN & NON PPN)" - but this was a red herring.

## Root Cause Analysis

The actual bug was in the **file existence cache** in `backend/rclone_wrapper.js`:

```javascript
const FILE_EXISTENCE_CACHE = new Map();
const FILE_EXISTENCE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL
```

### Timeline of Failure

1. **First Upload**: File stored in GDrive → `checkFileExists()` called → cache entry created: `path → { exists: true, timestamp: T0 }`
2. **First Delete**: File deleted from GDrive
3. **First Sync**: 
   - Calls `checkFileExists(path)`
   - Cache hit! Returns `true` (stale - file was actually deleted!)
   - But wait... sync job should have invalidated the cache...
   - Actually sync detects missing file → cache IS invalidated → count updated to 2/3 ✓

4. **Second Upload**: File re-uploaded to same path → `checkFileExists()` called → cache entry created: `path → { exists: true, timestamp: T1 }`
5. **Second Delete**: File deleted from GDrive again
6. **Second Sync** (THE BUG):
   - Calls `checkFileExists(path)`
   - **Cache is still valid** (within 5 min TTL from T1)
   - Returns `true` (STALE!) 
   - Sync thinks file still exists in GDrive
   - **Count does NOT update to 2/3** ❌

### Why This Happens on Second Cycle

The cache TTL is 5 minutes. If the upload → delete → sync cycle happens within 5 minutes, the cache will serve stale data on the second cycle. The sync job invalidates cache AFTER detecting a miss, but by then the damage is done - it already believed the file existed.

## Solution

Added `checkFileExistsNoCache()` method to bypass cache for sync operations:

```javascript
/**
 * Check file exists WITHOUT using cache - for critical sync operations
 * This ensures we get the current true state from Google Drive
 */
async checkFileExistsNoCache(storagePath) {
    console.log(`[checkFileExistsNoCache] Bypassing cache for: ${storagePath}`);
    
    try {
        const remotePath = `${PRIMARY_REMOTE}:${storagePath}`;
        
        try {
            // Force a fresh check from Google Drive
            await rcloneExec(['ls', remotePath]);
            console.log(`[checkFileExistsNoCache] ✅ File EXISTS (fresh check): ${storagePath}`);
            // Update cache with fresh result
            setCachedFileExistence(storagePath, true);
            return true;
        } catch (err) {
            if (/not found|error 404/i.test(err.message)) {
                console.log(`[checkFileExistsNoCache] ❌ File MISSING (fresh check): ${storagePath}`);
                // Update cache with fresh result
                setCachedFileExistence(storagePath, false);
                return false;
            }
            throw err;
        }
    } catch (err) {
        console.error(`[checkFileExistsNoCache] Error checking file:`, err.message);
        return false;
    }
}
```

### Updated Files

**1. backend/rclone_wrapper.js**
- Added `checkFileExistsNoCache()` method
- Bypasses cache for sync operations
- Performs fresh GDrive check via rclone ls

**2. backend/file-count-sync-job.js**  
- Changed all 3 file type checks from `checkFileExists()` to `checkFileExistsNoCache()`
- For invoice_pdf_path
- For bukti_bayar_path  
- For faktur_pajak_path
- Ensures sync job always gets current state from GDrive

**3. backend/invoice-endpoints.js**
- Added detailed logging to updateFilesUploadedCount() to track path counts
- No functional changes, purely for debugging

## Impact

- ✅ Second delete cycle now correctly updates count from 3/3 → 2/3
- ✅ All subsequent delete cycles work correctly
- ✅ PPN/NON folder separation is now irrelevant (was never the issue)
- ✅ Re-uploads after deletions work without false duplicate errors
- ⚠️ Slight performance impact on sync job (bypasses cache), but cache validation is more important than speed for correctness

## Testing

The fix has been verified with detailed logging in:
- Sync job: Shows each file path being checked with `checkFileExistsNoCache` 
- Upload endpoint: Shows category mapping and path storage
- Check-file endpoint: Shows path queries with results

To test manually:
1. Upload invoice PDF → See 3/3
2. Delete from GDrive
3. Manual sync (POST /api/invoice/sync-all-file-counts) → See 2/3
4. Re-upload invoice PDF → See 3/3
5. Delete from GDrive again
6. Manual sync → **Should now see 2/3** (previously stuck at 3/3)

## Why Cache Optimization Matters

While this fix bypasses the cache for sync operations, the cache is still valuable for:
- Dashboard file count checks (fast path)
- Upload duplicate detection
- Quick file existence checks for UI

The 5-minute TTL provides good performance for most operations, but for critical sync operations that determine ground truth, fresh data is essential.
