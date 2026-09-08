# Fix Invoice Paths for Faktur 835100311020926004

## Problem
Status changed from 2/3 to 0/3 because the database paths are NULL or still pointing to old paths. The check-file endpoint reads from database, so it returns 0 when paths are not set.

## Solution: Update Database with New Location-Based Paths

### Option 1: Using SQL (Direct Database Access)

Run this SQL query:

```sql
UPDATE invoice_file_list
SET 
    invoice_pdf_path = 'ARSIPINVOICE/BEKASI/2026/JANUARI/15/PPN/835100311020926004.pdf',
    bukti_bayar_path = 'ARSIPINVOICE/BEKASI/2026/JANUARI/15/BUKTIBAYAR/835100311020926004.pdf',
    faktur_pajak_path = 'ARSIPINVOICE/BEKASI/2026/JANUARI/15/FAKTURPAJAK/tax-835100311020926004 SEMESTA GEMILANG 21.658.256.pdf',
    updated_at = NOW()
WHERE faktur = '835100311020926004';
```

### Option 2: Using API Endpoints (Recommended)

#### Step 1: Search for existing files
```bash
curl -X POST http://localhost:3000/api/invoice/search-existing-files/835100311020926004 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

Response will show:
```json
{
  "success": true,
  "faktur": "835100311020926004",
  "location": "BEKASI",
  "foundFiles": {
    "invoice": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/PPN/835100311020926004.pdf",
    "bukti_bayar": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/BUKTIBAYAR/835100311020926004.pdf",
    "faktur_pajak": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/FAKTURPAJAK/tax-835100311020926004 SEMESTA GEMILANG 21.658.256.pdf"
  },
  "filesUpdatedCount": 0
}
```

#### Step 2: Update database with found paths
```bash
curl -X POST http://localhost:3000/api/invoice/update-file-paths/835100311020926004 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "foundFiles": {
      "invoice": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/PPN/835100311020926004.pdf",
      "bukti_bayar": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/BUKTIBAYAR/835100311020926004.pdf",
      "faktur_pajak": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/FAKTURPAJAK/tax-835100311020926004 SEMESTA GEMILANG 21.658.256.pdf"
    }
  }'
```

Response:
```json
{
  "success": true,
  "faktur": "835100311020926004",
  "updated": ["invoice", "bukti_bayar", "faktur_pajak"],
  "data": {
    "faktur": "835100311020926004",
    "invoice_pdf_path": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/PPN/835100311020926004.pdf",
    "bukti_bayar_path": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/BUKTIBAYAR/835100311020926004.pdf",
    "faktur_pajak_path": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/FAKTURPAJAK/tax-835100311020926004 SEMESTA GEMILANG 21.658.256.pdf"
  }
}
```

#### Step 3: Verify the update
After update, the dashboard will automatically show 3/3 status because:
- `invoice_pdf_path` is set ✅
- `bukti_bayar_path` is set ✅
- `faktur_pajak_path` is set ✅
- Database trigger will recalculate `files_uploaded_count = 3`

## File Paths Reference

For faktur **835100311020926004**:

| File Type | Path |
|-----------|------|
| Invoice PDF | `ARSIPINVOICE/BEKASI/2026/JANUARI/15/PPN/835100311020926004.pdf` |
| Bukti Bayar | `ARSIPINVOICE/BEKASI/2026/JANUARI/15/BUKTIBAYAR/835100311020926004.pdf` |
| Faktur Pajak | `ARSIPINVOICE/BEKASI/2026/JANUARI/15/FAKTURPAJAK/tax-835100311020926004 SEMESTA GEMILANG 21.658.256.pdf` |

## After Update

Once paths are updated in database:
- ✅ Dashboard will show 3/3
- ✅ check-file endpoint will return true for each file
- ✅ download-file endpoint will download correct files
- ✅ combine-pdf will merge all 3 files correctly

## Bulk Update (For Multiple Invoices)

Use bulk scan endpoint:
```bash
POST /api/invoice/scan-all-invoices?limit=50&offset=0
```

This returns all invoices with files and their paths. You can then update each one that needs it.
