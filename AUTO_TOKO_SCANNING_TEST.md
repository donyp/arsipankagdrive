# Auto-Toko Scanning Verification Guide

## Overview
The upload form **automatically scans filenames** to extract the toko name, eliminating the need to manually select from the dropdown.

## How It Works

### 1. Flow Diagram
```
Upload File with Filename
    ↓
Web Form Receives File
    ↓
scanFilename() function parses filename
    ↓
Extract: Type (PPN/NON), Toko, Nominal, Date
    ↓
If Toko Detected:
  ✅ Show GREEN CHECKMARK badge (auto-detected)
  ✅ Dropdown REPLACED with toko name badge
  ✅ NO MANUAL SELECTION NEEDED
    ↓
If Toko NOT Detected:
  ⚠️  Show DROPDOWN "-- Pilih Toko --"
  ⚠️  User must manually select
```

### 2. Filename Pattern
**Format**: `[TYPE] [TOKO] [NOMINAL] [DATE].pdf`

**Examples**:
```
✅ NON Balaraja 1.140.000 30 Mei.pdf
✅ PPN Cianjur 13.242.200 15 Agustus.pdf
✅ NON Serang Timur 5.500.000 28 Februari.pdf
✅ PPN Pasarkemis 2.750.000 2026-05-20.pdf
```

### 3. Toko Name Matching Algorithm
Located in: `js/upload.js` → `scanFilename()` function

```javascript
// Step 1: Load all toko names from database
window._allTokos // Contains: [{ id: 1, nama: "Balaraja", zona_id: 1 }, ...]

// Step 2: Ultra-normalize for matching
normalize("Balaraja") → "balaraja"
normalize("NON Balaraja 1.140.000 30 Mei") → "nonbalaraja1140000330mei"

// Step 3: Check if normalized toko name exists in filename
if (cleanFilename.includes("balaraja")) → MATCH! ✅

// Step 4: Return toko object
{ toko: { id: 1, nama: "Balaraja", zona_id: 1 } }
```

**Why ultra-normalize?**
- `"Serang Timur"` → `"serangtimur"`
- Handles spaces, dashes, case variations
- Robust matching even with typos or formatting differences

### 4. Visual Indicators

| Scenario | UI Display |
|----------|-----------|
| **Auto-Detected** | 🟢 `✓ BALARAJA` (green badge, locked) |
| **Manual Select** | 🔵 `-- Pilih Toko --` (dropdown, blue) |
| **Duplicate Warning** | 🔴 `⚠ File Sudah Ada` (red badge) |

## Testing Steps

### Setup (Before Testing)
1. Navigate to `upload.html`
2. Login with authorized role (super_admin, moderator, admin_zona)
3. Check browser console (F12) for any errors

### Test 1: Auto-Detection Works
**Steps**:
1. Click upload zone or drag-drop file
2. Select file: `NON Balaraja 1.140.000 30 Mei.pdf`
3. **Expected**:
   - ✅ Green checkmark badge shows `BALARAJA`
   - ✅ Dropdown DISAPPEARS
   - ✅ Badge shows: `✓ BALARAJA`
   - ✅ Date badge shows: `30 Mei`
   - ✅ Nominal shows: `Rp 1.140.000`

### Test 2: Case-Insensitive Match
**File**: `non cianjur 13.242.200 15 agustus.pdf`
1. Upload file
2. **Expected**:
   - ✅ Auto-detected as `CIANJUR`
   - ✅ Green checkmark badge

### Test 3: Multi-Word Toko
**File**: `PPN Serang Timur 5.500.000 28 Februari.pdf`
1. Upload file
2. **Expected**:
   - ✅ Auto-detected as `SERANG TIMUR`
   - ✅ Green checkmark badge

### Test 4: Unknown Toko (Fallback)
**File**: `NON UnknownToko 1.000.000 30 Mei.pdf`
1. Upload file
2. **Expected**:
   - ⚠️ Dropdown appears
   - ⚠️ Shows "-- Pilih Toko --"
   - ⚠️ User must select manually

### Test 5: Invalid Format (Fallback)
**File**: `random_filename.pdf`
1. Upload file
2. **Expected**:
   - ⚠️ Dropdown appears
   - ⚠️ No auto-detection

## Supported Toko Names (Database)

The system automatically detects these toko names:
```
- Balaraja
- Cianjur
- Serang Timur
- Pasarkemis
- Bitung
- Cilegon
- Cipondoh
- Kutabumi
- Ciruas
- (and others in your toko table)
```

**How to add more**:
1. Go to Settings/Tokos page
2. Add new toko name
3. Restart web (F5) to refresh toko list
4. Auto-detection will work for new toko names

## Debugging

### Issue: Dropdown still shows "-- Pilih Toko --" for valid filename

**Check**:
1. **Browser Console (F12)**:
   ```javascript
   window._allTokos
   ```
   - Should return array of toko objects
   - If empty `[]` → Tokos not loaded
   - If has items → Tokos loaded correctly

2. **Filename format**:
   - Verify it matches: `[TYPE] [TOKO] [NOMINAL] [DATE]`
   - Example: `NON Balaraja 1.140.000 30 Mei.pdf`

3. **Toko name spelling**:
   - Check exact spelling in database
   - Compare with `window._allTokos[].nama`

### Issue: Auto-detection works but wrong toko selected

**Cause**: Multiple toko names with similar patterns
**Fix**: Sort by longest match (already implemented in code, line ~145)

### Issue: Network error loading tokos

**Check**:
1. Backend running on port 5000?
2. API `/api/toko` responding?
3. Test in console:
   ```javascript
   fetch('http://localhost:5000/api/toko', {
     headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
   })
   ```

## Code References

### Files Involved
- **Frontend**: `js/upload.js` → `scanFilename()` function (lines ~130-185)
- **Backend API**: `backend/server.js` → `GET /api/toko` endpoint (lines ~917-937)
- **UI Update**: `js/upload.js` → `updateFileUI()` function (lines ~210-350)

### Key Functions

**scanFilename(name)** - Parses filename
```javascript
function scanFilename(name) {
  // Returns: { tipe, toko, nominal, date, isDateDetected }
}
```

**updateFileUI()** - Renders file list with badges
```javascript
// Shows green checkmark if isAutoDetected=true
// Shows dropdown if isAutoDetected=false
```

## Production Checklist

- [ ] Tokos loaded in database
- [ ] Backend `/api/toko` endpoint responding
- [ ] Upload form `await loadAllTokos()` executes on page load
- [ ] Filenames follow format: `[TYPE] [TOKO] [NOMINAL] [DATE].pdf`
- [ ] Browser console shows no errors
- [ ] `window._allTokos` contains all toko names

## Example Upload Workflow

```
User Action: Drag "NON Balaraja 1.140.000 30 Mei.pdf" to upload

↓

Form Processing:
1. addFiles() calls scanFilename()
2. Extracts: { tipe: 'NON', toko: {id:1, nama:'Balaraja'}, nominal: 1140000, date: '2026-05-30' }
3. Sets isAutoDetected: true

↓

UI Update:
1. updateFileUI() renders file item
2. Checks if toko exists → YES
3. Checks if isAutoDetected → YES
4. Shows: 🟢 "✓ BALARAJA" (green badge, locked)
5. Hides: Dropdown

↓

User sees:
✅ Green checkmark badge: "BALARAJA"
✅ Date badge: "30 Mei"
✅ Nominal badge: "Rp 1.140.000"
✅ No dropdown - ready to upload!
```

## Next Steps

1. **Test Now**: Upload files with valid filenames
2. **Verify**: Green checkmarks appear automatically
3. **Report**: If dropdown still shows, check browser console for errors
4. **Enjoy**: No more manual toko selection! 🎉
