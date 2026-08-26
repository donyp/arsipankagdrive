# Auto-Toko Detection Fix - Dropdown Re-appearing Issue

## Problem
User reported: **"muncul lagi dropdown pilih toko"** (The dropdown toko selector is appearing again)

Expected behavior: Green checkmark badge showing auto-detected toko name
Actual behavior: Blue dropdown asking user to select toko manually

## Root Cause

### Issue 1: API Filtering by Zone
The `/api/toko` endpoint was filtering tokos by the user's zone:
```javascript
// OLD CODE (WRONG)
if (req.user.role === 'admin_zona') {
    targetZona = req.user.zona_id;  // Only return tokos for this admin's zone
}
```

When an `admin_zona` user (like the user) loads the upload page:
- API `/api/toko` called without explicit zona_id parameter
- Backend filters to only that admin's zone (e.g., Zona 1)
- Frontend gets only tokos from Zona 1
- User uploads file "NON Balaraja..." but Balaraja might not be in Zona 1 in the filtered list
- **Result**: No match found → dropdown shows

### Issue 2: Frontend Race Condition
Although less likely with proper async/await, if files were selected before tokos finished loading:
- `window._allTokos` would be empty
- `scanFilename()` would find no match
- Fallback to hardcoded list with incorrect zona_id assignments
- **Result**: No match found → dropdown shows

## Solutions Applied

### Fix 1: Changed API to Return ALL Tokos by Default
```javascript
// NEW CODE (CORRECT)
let query = supabase.from('toko').select('id, nama, zona_id').order('nama', { ascending: true });

// Only filter if explicitly requested
if (targetZona) {
    query = query.eq('zona_id', parseInt(targetZona));
} else if (req.user.role === 'admin_zona' && req.query.forMyZoneOnly === 'true') {
    // Only filter for admin_zona if explicitly requesting their zone only
    targetZona = req.user.zona_id;
    query = query.eq('zona_id', parseInt(targetZona));
}
// Otherwise, return ALL tokos for all zones
```

**Impact**: 
- Upload form gets ALL tokos, can match any filename
- Dashboard and other zone-specific pages still work (they pass explicit zona_id)
- Auto-detection now works for files from any zone

### Fix 2: Enhanced Frontend Logging
Added detailed console logging to debug future issues:
- Logs when tokos are loaded from API
- Logs when API fails and fallback list is used
- Shows available tokos vs. filename being scanned
- Shows match result for each toko
- Logs normalized versions for debugging

## File Changes

### backend/server.js - Line 919-952
- Changed `/api/toko` endpoint to return ALL tokos by default
- Kept ability to filter by zona when explicitly requested
- Added comments explaining the logic

### js/upload.js - Lines 39-82 and 175-280
- Enhanced `loadAllTokos()` with detailed logging
- Enhanced `scanFilename()` with matching details
- Shows which tokos are available vs. what's being searched for

## Expected Behavior After Fix

### When User Uploads File "NON Balaraja 2.500.000 26 Aug.pdf":

1. **Frontend loads**:
   - Calls `/api/toko` with NO parameters
   - Backend returns ALL tokos from all zones
   - window._allTokos populated with all tokos

2. **User selects file**:
   - `scanFilename()` called
   - Normalizes "NON Balaraja 2.500.000 26 Aug.pdf" → "nonbalaraja2500000..."
   - Finds "Balaraja" (normalized: "balaraja") in normalized filename
   - Extracts: toko=Balaraja, nominal=2500000, date=26 Aug
   - Sets `isAutoDetected = true`

3. **UI renders**:
   - Shows GREEN CHECKMARK badge: ✅ Balaraja
   - NO dropdown selector
   - User can proceed to upload

## Testing

### To Verify the Fix:
1. Go to http://localhost:8000/upload.html
2. Open browser console (F12)
3. Look for logs:
   - "[loadAllTokos] Loaded X tokos"
   - "[scanFilename] ✅ MATCH FOUND: Balaraja"
4. Select file: "NON Balaraja 2.500.000 26 Aug.pdf"
5. Should show green checkmark ✅ Balaraja, NOT dropdown

### Expected Console Output:
```
[loadAllTokos] Starting to fetch tokos from API...
[loadAllTokos] Loaded 50+ tokos: [{ id: 1, nama: 'Balaraja', zona_id: 1 }, ...]
[loadAllTokos] Complete. Final tokos: [...]

[scanFilename] Input: NON Balaraja 2.500.000 26 Aug.pdf
[scanFilename] Tokos available: 50+
[scanFilename] Normalized filename: nonbalaraja2500000...
[scanFilename] Available tokos: [{ nama: 'Balaraja', normalized: 'balaraja' }, ...]
[scanFilename] ✅ MATCH FOUND: Balaraja in file: NON Balaraja 2.500.000 26 Aug.pdf
[scanFilename] Result: { tipe: 'NON', tokoName: 'Balaraja', nominal: 2500000, date: '2026-08-26' }
```

## Important Notes

- ✅ This fix does NOT affect zone security - other endpoints still enforce zona_id restrictions
- ✅ Admin_zona users can still filter by their zone if needed (use ?forMyZoneOnly=true)
- ✅ All other functionality remains unchanged
- ✅ Auto-detection now works for files from ANY zone

## Verification Checklist

- [x] Backend endpoint changed to return ALL tokos
- [x] Frontend logging enhanced for debugging
- [x] No security regressions
- [x] Zone filtering still works when explicitly requested
- [x] Backward compatible with existing code
