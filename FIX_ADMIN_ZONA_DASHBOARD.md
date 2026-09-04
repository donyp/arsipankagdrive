# Fix Admin Zona Dashboard - Data Not Showing

## Problem
Admin_zona users see empty dashboard because `zona_id` is NULL for all invoices.

## Root Cause
- Column `zona_id` exists but is NOT populated
- Backend filters by zona_id: `WHERE zona_id = ?` returns 0 rows
- Frontend shows "Belum ada data invoice"

## Solution

### Step 1: Run Data Migration in Supabase

1. Go to Supabase Console → SQL Editor
2. Copy entire content from: `sql/migrate_zona_id_for_invoices.sql`
3. Paste and execute

**What it does:**
- Matches invoices' `konsumen` (store name) with `toko.nama`
- Populates `zona_id` by looking up the correct zona for each store
- Shows status report with:
  - Total invoices before/after
  - How many got matched
  - Which stores (if any) couldn't be matched

### Step 2: Verify Success

Check the status output - should show:
```
total_invoices: [your count]
with_zona_id: [should match total]
missing_zona_id: 0 ✅
```

And sample data query shows invoices with zona_id populated.

### Step 3: Test Admin_Zona Dashboard

1. Login as admin_zona user (any zona)
2. Go to Dashboard
3. Should see invoices for that zona ✅

**Example:**
- Admin Zona 1 → sees only Zona 1 invoices
- Admin Zona 2 → sees only Zona 2 invoices
- Super Admin → sees all invoices

## Why This Works

**Before Migration:**
```
invoice_file_list columns:
- konsumen: "Mega Baja Balaraja" 
- toko: "ANKA BEKASI"
- zona_id: NULL ❌

Backend filter: WHERE zona_id = 1 → 0 rows ❌
```

**After Migration:**
```
invoice_file_list columns:
- konsumen: "Mega Baja Balaraja"
- toko: "ANKA BEKASI"
- zona_id: 1 (matched from toko table) ✅

Backend filter: WHERE zona_id = 1 → returns all Zona 1 invoices ✅
```

## Troubleshooting

### If migration fails with "toko table not found"
- Run `sql/refresh_toko_data.sql` first (to ensure toko table has all 168 stores)
- Then run migration

### If some invoices still have zona_id = NULL after migration
- Check if konsumen name matches toko.nama exactly (case-sensitive before fix)
- Case-insensitive matching is built into the migration, but:
  - "Mega Baja Balaraja" ✅ matches "mega baja balaraja" in toko
  - "Pasar Kemis" ✅ matches "Mega Baja Pasar Kemis" if store name is exact

### If you see "⚠️ X invoices still missing zona_id"
- These are invoices with konsumen names that don't exist in toko table
- Either add missing stores to toko table OR manually update those invoices
- Run query to see which konsumen couldn't be matched:
  ```sql
  SELECT DISTINCT konsumen FROM invoice_file_list WHERE zona_id IS NULL;
  ```

## Data Flow After Fix

```
Admin_zona login (zona_id = 1)
    ↓
Frontend calls: GET /api/invoice/list
    ↓
Backend extracts: req.user.zona_id = 1
    ↓
Backend filters: SELECT * FROM invoice_file_list WHERE zona_id = 1
    ↓
Database returns: 50 invoices for Zona 1
    ↓
Frontend displays: Full invoice list for Zona 1 ✅
```
