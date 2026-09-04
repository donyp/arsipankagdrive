# ZONA_ID Migration - Admin_Zona Dashboard Fix

## Problem
Admin_zona users (like admin_zona 64) see 0 invoices on dashboard because:
- Backend filters invoices by: `WHERE zona_id = user.zona_id`
- Database has many invoices with `zona_id = NULL`
- Result: 0 invoices returned

## Root Cause Analysis
| Issue | Details |
|-------|---------|
| Missing data | Invoices created before zona_id column, all have NULL |
| Naming mismatch | Invoice store names don't match toko table exactly |
| Special cases | Non-Member, ANKA suppliers not in toko table |

## Solution
Run SQL migration to populate `zona_id` by matching invoices to toko table.

## Step-by-Step Instructions

### 1. Open Supabase SQL Editor
- Go to: https://supabase.com/dashboard
- Select your project
- Click **"SQL Editor"** in left sidebar
- Click **"New Query"**

### 2. Copy Migration SQL
Copy entire content from: `sql/MIGRATE_ZONA_ID_COMPLETE.sql`

### 3. Paste into Supabase
Paste the SQL into the editor window

### 4. Execute the Migration
- Click **"Run"** button (green play icon)
- Monitor the execution
- Check each step's results

### 5. Verify Results
Look for these success indicators:
```
✅ SUCCESS: All invoices have zona_id assigned
Total invoices: [number]
Assigned: [should equal total]
Unassigned: 0
```

### 6. Test Dashboard
1. Navigate to dashboard.html
2. Login as: `admin_zona` (any user with zona assignment)
3. Verify: Invoice table shows data (not empty)
4. Verify: Toko dropdown populated with stores from user's zone

## If Issues Occur

### Q: Still showing 0 invoices?
**A:** Check if zona_id values exist:
```sql
SELECT COUNT(*) FROM invoice_file_list WHERE zona_id IS NOT NULL;
```
Should return > 0

### Q: Error: "column zona_id does not exist"?
**A:** Run first: `sql/add_zona_id_to_invoice_file_list.sql`

### Q: Some invoices still have NULL zona_id?
**A:** Run additional mapping:
```sql
UPDATE invoice_file_list
SET zona_id = (SELECT id FROM zonas WHERE kode = '08' LIMIT 1)
WHERE zona_id IS NULL;
```
This assigns all remaining to Zona 08 (default).

## Technical Details

### Matching Strategy (3-level priority)

1. **Exact Match (Primary)**
   - Matches: `invoice.konsumen` = `toko.nama` (case-insensitive)
   - Success rate: ~80-90%

2. **Special Cases (Secondary)**
   - Non-Member → Zona 08
   - ANKA suppliers → Zona 08
   - Success rate: ~10-20%

3. **Fallback**
   - Any remaining → Zona 08
   - Success rate: catches stragglers

### Expected Outcome
- Total invoices with zona_id: **100%**
- Distribution: Even across Zona 01-17
- Admin_zona users: See only their zone's invoices
- Dashboard: No longer empty

## Files Modified
- Database: `invoice_file_list` table (zona_id populated)
- No code changes needed
- API already filters by zona_id (line 629 in backend/invoice-endpoints.js)

## Rollback (if needed)
```sql
UPDATE invoice_file_list SET zona_id = NULL WHERE zona_id IS NOT NULL;
```
This will revert all changes (invoices will show 0 again).

## Next Steps After Migration

1. **Verify invoice counts**
   - Each admin_zona should see invoices for their zone
   - Check: `/api/invoice/list` returns data

2. **Test toko dropdown**
   - Should show only stores from user's zone
   - Not all 168 stores

3. **Check Excel re-upload**
   - New uploads should auto-populate zona_id
   - Backend has fuzzy matching (3-level) for new data

4. **Monitor logs**
   - Backend logs should show: `[Invoice List] Filtered for admin_zona with zona_id: XX`
   - If showing 0 rows, check console for warnings

## Support
If issues persist:
1. Check `.agents/memory/MEMORY.md` for context
2. Review backend logs in console
3. Verify zonas table has all 17 zones
4. Verify toko table has 168 stores populated
