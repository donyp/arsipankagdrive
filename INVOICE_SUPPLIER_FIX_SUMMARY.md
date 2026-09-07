# Invoice Supplier Name Fix Summary

## Problem
Ketika upload data Excel baru, kolom "SUPPLIER" (nama toko) di dashboard moderator dan admin zona tampil sebagai strip (`-`) atau kosong. Seharusnya tampil "ANKA BEKASI" atau "ANKA PEMALANG".

## Root Cause
1. Kolom `TOKO` di file Excel ada yang kosong atau tidak valid
2. Kode normalisasi tidak memiliki fallback untuk nilai kosong
3. Ketika `toko` kosong, database menyimpan nilai kosong, dan dashboard menampilkannya sebagai `-`

## Solution Applied

### 1. Frontend Fix (`js/upload-excel.js`)
**Before:**
```javascript
let tokoValue = (row['TOKO'] || row['toko'] || '').trim().toUpperCase();

if (tokoValue.includes('PEMALANG')) {
    tokoValue = 'ANKA PEMALANG';
} else if (tokoValue.includes('ANKA') || tokoValue === 'ANKA') {
    tokoValue = 'ANKA BEKASI';
}
// No fallback for empty values!
```

**After:**
```javascript
let tokoRaw = (row['TOKO'] || row['toko'] || '').trim();
let tokoValue = tokoRaw.toUpperCase();

if (tokoValue.includes('PEMALANG')) {
    tokoValue = 'ANKA PEMALANG';
} else if (tokoValue.includes('ANKA')) {
    tokoValue = 'ANKA BEKASI';
} else if (tokoValue === '' || !tokoValue) {
    // DEFAULT: If empty or invalid, default to ANKA BEKASI
    console.warn('[Upload] Empty toko detected, defaulting to ANKA BEKASI');
    tokoValue = 'ANKA BEKASI';
} else {
    // Any other value that doesn't contain ANKA/PEMALANG, keep as is
    tokoValue = tokoRaw;
}
```

### 2. Backend Parser Fix (`backend/excel-parser.js`)
**Before:**
```javascript
function normalizeToko(tokoRaw) {
    if (!tokoRaw) return 'UNKNOWN';  // ❌ Returns UNKNOWN
    
    const tokoUpper = tokoRaw.toUpperCase();
    
    if (tokoUpper.includes('ANKA PEMALANG') || tokoUpper.includes('ANKA-PEMALANG')) {
        return 'ANKA PEMALANG';
    }
    
    if (tokoUpper.includes('ANKA')) {
        return 'ANKA BEKASI';
    }
    
    return tokoRaw.trim();
}
```

**After:**
```javascript
function normalizeToko(tokoRaw) {
    // Handle empty/null values - default to ANKA BEKASI
    if (!tokoRaw || String(tokoRaw).trim() === '') {
        console.warn('[Excel Parser] Empty toko value detected, defaulting to ANKA BEKASI');
        return 'ANKA BEKASI';  // ✅ Returns ANKA BEKASI
    }
    
    const tokoUpper = String(tokoRaw).toUpperCase().trim();
    
    // Check for ANKA PEMALANG first (more specific)
    if (tokoUpper.includes('PEMALANG')) {  // ✅ Simplified check
        return 'ANKA PEMALANG';
    }
    
    // Check for ANKA (default to BEKASI)
    if (tokoUpper.includes('ANKA')) {
        return 'ANKA BEKASI';
    }
    
    // If not ANKA-related, keep original but trimmed
    return String(tokoRaw).trim();
}
```

### 3. Backend API Logging (`backend/invoice-endpoints.js`)
Added detailed logging to debug toko values:
```javascript
// Log sample data
console.log('[Invoice API] Raw data sample (first 3):');
data.slice(0, 3).forEach((row, idx) => {
    console.log(`  Row ${idx}: faktur=${row.faktur}, toko="${row.toko}", konsumen="${row.konsumen}"`);
});

// Warn if toko is empty
if (!item.toko || item.toko === '' || item.toko === '-') {
    console.warn(`[Invoice API] ⚠️  Faktur ${item.faktur}: toko is EMPTY or INVALID: "${item.toko}"`);
}

// Log sample toko values before insert
console.log('[Invoice API] Sample toko values:', invoicesToInsert.slice(0, 3).map(i => `"${i.toko}"`).join(', '));
```

## Data Flow

```
Excel File (TOKO column)
    ↓
Frontend Parse (js/upload-excel.js)
    ↓ normalizeToko() → "ANKA BEKASI" or "ANKA PEMALANG"
    ↓
Send to Backend API (/api/invoice/upload-excel-data)
    ↓
Backend receives data.toko
    ↓
Insert to database (invoice_file_list.toko)
    ↓
Dashboard queries database
    ↓
Display in "SUPPLIER" column
```

## Expected Behavior

### Scenario 1: Excel has "ANKA" in TOKO column
- **Result:** Dashboard shows "ANKA BEKASI"

### Scenario 2: Excel has "ANKA PEMALANG" in TOKO column
- **Result:** Dashboard shows "ANKA PEMALANG"

### Scenario 3: Excel has empty/null TOKO column
- **Before:** Dashboard shows `-` or empty
- **After:** Dashboard shows "ANKA BEKASI" (default)

### Scenario 4: Excel has other value (e.g., "Toko Lain")
- **Result:** Dashboard shows original value "Toko Lain"

## Testing Checklist

- [ ] Upload Excel with empty TOKO column → should show "ANKA BEKASI"
- [ ] Upload Excel with "ANKA" in TOKO → should show "ANKA BEKASI"
- [ ] Upload Excel with "ANKA PEMALANG" in TOKO → should show "ANKA PEMALANG"
- [ ] Verify dashboard moderator displays correct supplier names
- [ ] Verify dashboard admin zona displays correct supplier names
- [ ] Check console logs for normalization process
- [ ] Verify filter "Supplier" dropdown shows correct options

## Files Modified

1. **js/upload-excel.js** (line ~127-150)
   - Added fallback for empty toko values
   - Enhanced logging

2. **backend/excel-parser.js** (line ~12-32)
   - Changed default from 'UNKNOWN' to 'ANKA BEKASI'
   - Simplified PEMALANG check
   - Added per-row logging

3. **backend/invoice-endpoints.js** (line ~218, ~300, ~315)
   - Added detailed logging for toko values
   - Added warning for empty toko
   - Added sample toko values log before insert

## Related Database Schema

Table: `invoice_file_list`
- Column: `toko` VARCHAR(255) NOT NULL
- Purpose: Store normalized toko name (ANKA BEKASI / ANKA PEMALANG)
- Used in: Dashboard filters and SUPPLIER column display

## Dashboard Display

### Dashboard Moderator (`dashboard.html`)
- **Column:** "Supplier" (populated from filter dropdown)
- **Source:** `inv.toko` from API response
- **Filter:** `#filterSupplier` dropdown

### Dashboard Admin Zona (`dashboard-admin-zona.html`)
- **Column:** "SUPPLIER" (table header)
- **Source:** `inv.toko` from API response  
- **Filter:** `#filterSupplier` dropdown

Both dashboards use the same data source and should display consistent values.

## Next Steps

1. Deploy changes to production
2. Test with actual Excel file upload
3. Monitor console logs for any toko normalization issues
4. Verify existing data in database (may need data migration if needed)
5. Update user documentation if needed

## Rollback Plan

If issues occur:
1. Revert `js/upload-excel.js` changes
2. Revert `backend/excel-parser.js` changes
3. Revert `backend/invoice-endpoints.js` logging changes
4. Previous behavior: empty toko → 'UNKNOWN' (not ideal but system still works)

---
**Date:** 2026-09-01  
**Status:** ✅ Fix Applied - Ready for Testing
