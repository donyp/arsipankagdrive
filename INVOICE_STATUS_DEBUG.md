# Invoice Status Debug Guide

## Problem
Status masih menampilkan "BELUM LUNAS" instead of "0/2", "1/2", "2/2", "0/3", "1/3", "2/3", "3/3"

## Root Causes (Priority Order)

### 1. Browser Cache (Most Common)
**Solution:** Hard refresh browser
- Windows: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`
- Or: Open DevTools (F12) → Network tab → Check "Disable cache" → Refresh

### 2. Database Trigger Not Executed on Existing Data
**Problem:** New columns exist but values are NULL for existing invoices

**Check in Database:**
```sql
SELECT 
    faktur,
    keterangan,
    files_uploaded_count,
    files_required_count,
    invoice_pdf_path,
    bukti_bayar_path,
    faktur_pajak_path
FROM invoice_file_list
ORDER BY created_at DESC
LIMIT 10;
```

**If files_uploaded_count and files_required_count are NULL:**
```bash
# Run the update script
psql $DATABASE_URL -f sql/update_existing_invoice_file_counts.sql
```

Or manually in database:
```sql
UPDATE invoice_file_list
SET updated_at = NOW()
WHERE files_uploaded_count IS NULL 
   OR files_required_count IS NULL;
```

### 3. Railway Not Deployed
**Check:** 
- Go to Railway dashboard
- Check last deployment time
- If needed, trigger manual redeploy

**Or force redeploy:**
```bash
# Commit a small change
git commit --allow-empty -m "Force Railway redeploy"
git push origin master
```

### 4. API Not Returning New Columns
**Test API Response:**
```bash
# Get auth token first (login on website, check browser DevTools → Application → Local Storage)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.railway.app/api/invoice/list?limit=5
```

**Check if response includes:**
- `files_uploaded_count`
- `files_required_count`
- `invoice_pdf_path`
- `bukti_bayar_path`
- `faktur_pajak_path`

**If missing:** Backend code issue (unlikely since we modified it)

## Frontend Check

**File:** `js/invoice-list.js` lines ~401-476

Should have this code:
```javascript
// Display X/Y status format instead of lunas/belum lunas
const uploadedCount = invoice.files_uploaded_count || 0;
const requiredCount = invoice.files_required_count || 
    (invoice.keterangan === 'PPN' ? 3 : 2);

statusCell.textContent = `${uploadedCount}/${requiredCount}`;
```

**If still showing old code:**
- Hard refresh browser (Ctrl + Shift + R)
- Clear browser cache completely
- Check Railway deployment timestamp

## Quick Test Steps

1. **Hard refresh browser** (Ctrl + Shift + R)
2. **Check database:**
   ```sql
   SELECT faktur, files_uploaded_count, files_required_count 
   FROM invoice_file_list LIMIT 5;
   ```
3. **If NULL:** Run `sql/update_existing_invoice_file_counts.sql`
4. **Check Railway:** Ensure latest commit is deployed
5. **Test API:** Use browser DevTools → Network → Check `/api/invoice/list` response

## Expected Behavior

### Status Display:
- **NON PPN / GUNGGUNG:**
  - 0/2 = No files uploaded
  - 1/2 = Invoice PDF uploaded
  - 2/2 = Invoice + Bukti Bayar uploaded (COMPLETE)
  
- **PPN:**
  - 0/3 = No files uploaded
  - 1/3 = Invoice PDF uploaded
  - 2/3 = Invoice + Bukti Bayar uploaded
  - 3/3 = Invoice + Bukti Bayar + Faktur Pajak uploaded (COMPLETE)

### Download Buttons (only show if file exists):
- 📄 INV = Invoice PDF
- 💰 BB = Bukti Bayar
- 📋 FP = Faktur Pajak (PPN only)

### Combine Button:
- Only shows when status is 2/2 or 3/3 (complete)
- Downloads combined PDF: BUKTI BAYAR + INVOICE + FAKTUR PAJAK (PPN) or BUKTI BAYAR + INVOICE (NON PPN/GUNGGUNG)

## Files Modified
- `sql/add_invoice_file_tracking.sql` - Schema changes + triggers
- `sql/update_existing_invoice_file_counts.sql` - Fix existing data
- `backend/invoice-endpoints.js` - Upload endpoints track file paths
- `js/invoice-list.js` - Display X/Y status + download buttons
- `dashboard.html` - CSS for download buttons
- `package.json` - Added pdf-lib dependency

## Verification SQL

```sql
-- Check trigger function exists
SELECT proname FROM pg_proc WHERE proname = 'update_invoice_file_counts';

-- Check columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'invoice_file_list' 
  AND column_name IN ('files_uploaded_count', 'files_required_count', 
                       'invoice_pdf_path', 'bukti_bayar_path', 'faktur_pajak_path');

-- Test data with file counts
SELECT 
    faktur,
    keterangan,
    CONCAT(files_uploaded_count, '/', files_required_count) as status,
    CASE 
        WHEN invoice_pdf_path IS NOT NULL THEN 'âœ"' 
        ELSE 'âœ—' 
    END as inv,
    CASE 
        WHEN bukti_bayar_path IS NOT NULL THEN 'âœ"' 
        ELSE 'âœ—' 
    END as bb,
    CASE 
        WHEN faktur_pajak_path IS NOT NULL THEN 'âœ"' 
        ELSE 'âœ—' 
    END as fp
FROM invoice_file_list
ORDER BY created_at DESC
LIMIT 20;
```

## If Still Not Working

1. Check browser console (F12) for JavaScript errors
2. Check Network tab - ensure `/api/invoice/list` response includes new fields
3. Verify Railway environment variables are correct
4. Check Railway logs for any startup errors
5. Try incognito/private browsing mode (completely fresh cache)
