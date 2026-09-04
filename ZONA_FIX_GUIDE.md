# Zona ID Fix Guide

## Problem
- `zona_id` was NULL in `invoice_file_list` table after Excel upload
- Backend zona lookup was case-sensitive and exact-match only
- Toko table may have been out of sync with invoice data

## Solution Implemented

### 1. Fixed Backend Zona Lookup (DONE)
- Changed `backend/invoice-endpoints.js` to use **case-insensitive matching**
- Now trims whitespace before comparing
- Fetches all toko records and matches client-side instead of exact DB query

### 2. Refreshed Toko Table Data (TODO)
- Run `sql/refresh_toko_data.sql` to repopulate toko table with correct 168 stores
- Maps each store to correct zona (Zona 01 - Zona 17)
- All store names match the format in your Excel: "Mega Baja Balaraja", etc.

### 3. Clear Old Invoices (TODO)
- Delete old invoice data before re-uploading

## Steps to Fix

### Step 1: Refresh Toko Table
Run this SQL in your Supabase console:
```bash
-- Copy entire content from sql/refresh_toko_data.sql and execute
```

Expected result: 19 zonas with 168 stores total

### Step 2: Clear Invoice Data
Run this SQL:
```sql
DELETE FROM public.invoice_file_list;
DELETE FROM public.excel_upload_batches;
```

### Step 3: Re-upload Excel
1. Go to Upload Excel page
2. Drop your Excel file
3. Preview should show konsumen names
4. Click "Upload Sekarang"
5. Check database - **zona_id should now be populated!**

## Verification

After upload, run this query to verify:
```sql
SELECT 
  konsumen,
  toko,
  zona_id,
  CASE WHEN zona_id IS NULL THEN '❌ NULL' ELSE '✅ Has zona' END as status
FROM public.invoice_file_list
LIMIT 20;
```

Expected: All rows should have `zona_id` set (NOT NULL)

## If Still NULL?

Check these:
1. **Are store names in Excel exactly matching toko table?**
   - Query: `SELECT DISTINCT konsumen FROM invoice_file_list LIMIT 10;`
   - Compare to: `SELECT nama FROM toko LIMIT 10;`

2. **Check backend logs** for messages like:
   - `[Invoice API] Mapped konsumen "..." to zona_id ...` ✅ Good
   - `[Invoice API] Could not find zona_id for konsumen: ...` ❌ Name mismatch

3. **Manually verify a store name:**
   ```sql
   SELECT id, nama, zona_id FROM toko 
   WHERE nama ILIKE '%balaraja%'
   LIMIT 1;
   ```

## Notes
- Zona lookup is now case-insensitive and trim-friendly
- Backend logic: if konsumen matches any toko.nama (case-insensitive), zona_id is set
- If no match found, zona_id stays NULL (fallback to manual entry later if needed)
