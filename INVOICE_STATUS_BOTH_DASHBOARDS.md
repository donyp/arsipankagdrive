# Invoice Status Display - Both Dashboards Complete ✅

## Summary

Kedua dashboard sekarang menampilkan status invoice dalam format **X/Y** bukan "Lunas/Belum Lunas":

| Role | File | Status Update | Download Buttons | Combine Button |
|------|------|---|---|---|
| super_admin, moderator | `dashboard.html` | ✅ X/Y format | ✅ Added | ✅ Added |
| admin_zona | `dashboard-admin-zona.html` | ✅ X/Y format | ✅ Added | ✅ Added |

---

## Dashboard 1: Moderator & Super Admin (`dashboard.html`)

**Location:** `js/invoice-list.js` (Lines ~401-476)

### Status Display
- NON PPN / GUNGGUNG: `0/2`, `1/2`, `2/2` (2 files required)
- PPN: `0/3`, `1/3`, `2/3`, `3/3` (3 files required)

### Download Buttons
```
📄 INV  (Blue)   - Download Invoice PDF
💰 BB   (Green)  - Download Bukti Bayar  
📋 FP   (Purple) - Download Faktur Pajak (PPN only)
```

### Combine Button
```
📦 Combine (Orange) - Shows only when 2/2 or 3/3
```

### Implementation
- Uses `files_uploaded_count` and `files_required_count` from API
- Conditional button rendering based on file existence
- Download functions: `downloadInvoiceFile()`, `combinePDF()`

### CSS Classes
- `.btn-download-small` - Styling for download buttons
- `.btn-combine` - Styling for combine button

---

## Dashboard 2: Admin Zona (`dashboard-admin-zona.html`)

**Location:** Inline in dashboard-admin-zona.html (Lines ~718-810)

### Status Display (Line ~720-722)
```javascript
const uploadedCount = inv.files_uploaded_count || 0;
const requiredCount = inv.files_required_count || (inv.keterangan === 'PPN' ? 3 : 2);
const statusDisplay = `${uploadedCount}/${requiredCount}`;
```

### Status Colors
- ✅ Green: Complete (uploadedCount === requiredCount)
- ⏳ Yellow: Incomplete (uploadedCount < requiredCount)

### Download Buttons (Line ~730-738)
```html
📄 INV  - conditionally shown if invoice_pdf_path exists
💰 BB   - conditionally shown if bukti_bayar_path exists
📋 FP   - conditionally shown if faktur_pajak_path exists AND keterangan='PPN'
📦 Combine - conditionally shown if uploadedCount === requiredCount
```

### Functions Added (Line ~750-810)
```javascript
downloadInvoiceFile(faktur, fileType)  // Download individual file
combinePDF(faktur)                      // Download combined PDF
```

---

## File Upload Requirements

### NON PPN & GUNGGUNG (2 files)
1. Invoice PDF (`invoice_pdf_path`)
2. Bukti Bayar (`bukti_bayar_path`)

**Status progression:**
- 0/2 → Upload Invoice → 1/2
- 1/2 → Upload Bukti Bayar → 2/2 ✅ (Complete)

### PPN (3 files)
1. Invoice PDF (`invoice_pdf_path`)
2. Bukti Bayar (`bukti_bayar_path`)
3. Faktur Pajak (`faktur_pajak_path`)

**Status progression:**
- 0/3 → Upload Invoice → 1/3
- 1/3 → Upload Bukti Bayar → 2/3
- 2/3 → Upload Faktur Pajak → 3/3 ✅ (Complete)

---

## Combined PDF Order

### For PPN
```
1. BUKTI BAYAR (first page)
2. INVOICE (middle pages)
3. FAKTUR PAJAK (last pages)
```

### For NON PPN & GUNGGUNG
```
1. BUKTI BAYAR (first page)
2. INVOICE (last pages)
```

---

## Database Schema

Required columns in `invoice_file_list` table:

```sql
files_uploaded_count INTEGER       -- Auto-calculated: 0-3
files_required_count INTEGER       -- Auto-calculated: 2 or 3 (based on keterangan)
invoice_pdf_path VARCHAR(500)      -- Path to invoice PDF
bukti_bayar_path VARCHAR(500)      -- Path to bukti bayar file
faktur_pajak_path VARCHAR(500)     -- Path to faktur pajak file
```

---

## How It Works

### Backend API Endpoints

1. **Get Invoice List**
   ```
   GET /api/invoice/list
   ```
   Returns invoice data including new columns for file tracking

2. **Download Individual File**
   ```
   GET /api/invoice/download-file/:faktur/:fileType
   ```
   `fileType` = `invoice`, `bukti_bayar`, or `faktur_pajak`

3. **Download Combined PDF**
   ```
   GET /api/invoice/combine-pdf/:faktur
   ```
   Combines all uploaded files in correct order

### Frontend Flow

1. API returns invoice list with `files_uploaded_count`, `files_required_count`, and file paths
2. JavaScript calculates status as `${uploadedCount}/${requiredCount}`
3. Buttons render conditionally based on file paths
4. User clicks button → Call download/combine endpoint
5. Browser downloads file

---

## Git Commits

```
6ef715c - Add documentation for admin-zona dashboard updates
e7b2eee - Update dashboard-admin-zona.html to show X/Y status and download buttons
0a1a8c7 - Add comprehensive fix summary for invoice status issue
e63472d - Add debug tools for invoice status display issue
d3e9f71 - Initial implementation (SQL + Backend + Frontend)
```

---

## Testing Checklist

### For Each Dashboard

- [ ] Hard refresh browser (Ctrl + Shift + R)
- [ ] Verify no JavaScript errors in console (F12)
- [ ] Status column shows X/Y format (not "Lunas/Belum Lunas")
- [ ] Downloaded count = required count shows green background
- [ ] Downloaded count < required count shows yellow background
- [ ] Download buttons appear only for uploaded files
- [ ] Combine button appears only when complete (X/X)
- [ ] Click download button → file downloads correctly
- [ ] Click combine button → merged PDF downloads correctly

### Database Verification

```sql
-- Check if columns have data
SELECT 
    faktur,
    keterangan,
    CONCAT(files_uploaded_count, '/', files_required_count) as status,
    invoice_pdf_path IS NOT NULL as has_invoice,
    bukti_bayar_path IS NOT NULL as has_bb,
    faktur_pajak_path IS NOT NULL as has_fp
FROM invoice_file_list
ORDER BY created_at DESC
LIMIT 20;
```

If `files_uploaded_count` and `files_required_count` are NULL, run:
```bash
psql $DATABASE_URL -f sql/update_existing_invoice_file_counts.sql
```

---

## Troubleshooting

### Status Still Shows "BELUM LUNAS"

1. **Hard refresh browser** (Ctrl + Shift + R)
2. Check browser console (F12) for errors
3. Check Network tab - `/api/invoice/list` response should include new columns
4. Check Railway deployment - latest commit deployed?
5. If database columns NULL, run update script

### Download Buttons Not Showing

- Verify `invoice_pdf_path`, `bukti_bayar_path`, `faktur_pajak_path` are not NULL
- Check if you uploaded files to the correct paths on Google Drive
- Check file paths in database match actual paths

### Combine Button Shows But Download Fails

- Verify all required files exist on Google Drive
- Check file paths are correct
- Check logs for rclone errors
- Verify `pdf-lib` is installed (check `package.json`)

### Combine Button Not Showing Despite All Files Uploaded

- Verify `files_uploaded_count === files_required_count`
- Hard refresh browser to clear cache
- Check if triggers executed on newest data

---

## Files Modified Summary

| File | Change | Status |
|------|--------|--------|
| `dashboard.html` | Uses js/invoice-list.js | ✅ |
| `dashboard-admin-zona.html` | Updated renderInvoices + added functions | ✅ |
| `js/invoice-list.js` | X/Y format + download/combine buttons | ✅ |
| `backend/invoice-endpoints.js` | Track file paths on upload | ✅ |
| `backend/rclone_wrapper.js` | Download and combine functions | ✅ |
| `sql/add_invoice_file_tracking.sql` | Schema + triggers | ✅ |
| `package.json` | Added pdf-lib dependency | ✅ |

---

## Next Steps

1. **Hard refresh both dashboards** (Ctrl + Shift + R)
2. **Test as admin_zona user** - Verify new buttons appear
3. **Test as moderator/super_admin** - Verify new buttons appear
4. **If status still wrong** - Run database update script
5. **If download fails** - Check Railway logs and file paths

---

## Current Status

✅ Both dashboards updated with X/Y format  
✅ Download buttons added to both  
✅ Combine button added to both  
✅ Functions implemented in both  
✅ Code committed and pushed  

⏳ Next: User tests and Railway deployment verification
