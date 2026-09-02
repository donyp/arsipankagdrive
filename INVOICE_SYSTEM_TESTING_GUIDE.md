# Invoice System - End-to-End Testing Guide

## Pre-requisites

### 1. Database Setup
Run the migration SQL:
```bash
node backend/execute-schema.js sql/add_invoice_file_list.sql
```

**Verify:**
- Table `invoice_file_list` exists
- Table `excel_upload_batches` exists
- Function `get_invoice_statistics()` exists
- All columns present with correct types

### 2. Server Running
```bash
npm start
# or
node backend/server.js
```

**Verify console output:**
```
[INIT] Registering Invoice System endpoints...
[INIT] Invoice System endpoints registered ✅
  ✓ Excel Upload & Parsing
  ✓ Invoice List & Statistics
  ✓ PDF Upload & Auto-matching
```

### 3. Authentication
- Login as Super Admin or Moderator
- Verify menu "Sistem Invoice" appears in sidebar

---

## Test Case 1: Excel Upload

### Steps:
1. Navigate to **Sistem Invoice → Upload Excel**
2. Prepare test Excel file (`REKAP_LABA.xls`) with columns:
   - TANGGAL
   - TOKO
   - FAKTUR
   - METODE BAYAR
   - JENIS TRANSAKSI
   - KONSUMEN
   - JUMLAH JUAL
   - KET 2

3. **Test Data Example:**
```
TANGGAL        | TOKO    | FAKTUR    | METODE BAYAR | JENIS TRANSAKSI | KONSUMEN      | JUMLAH JUAL | KET 2
02/10/2026     | ANKA    | 835100310 | CASH         | JUAL            | Toko Berkah   | 1500000     | PPN
02/10/2026     | ANKA    | 835100310 | CASH         | JUAL            | Toko Berkah   | 500000      | PPN
03/10/2026     | ANKA PEMALANG | 724200450 | PIUTANG | JUAL         | Toko Makmur   | 2000000     | NON PPN
```

4. Drag & drop or click to select Excel file
5. Click **Upload & Proses**

### Expected Results:
✅ Upload progress bar shows 30% → 60% → 100%
✅ Success message displays with stats:
   - Total Baris: 3
   - Faktur Unik: 2
   - Berhasil: 2
   - Duplikat: 0
   - Gagal: 0

✅ Faktur 835100310 has aggregated total: 2,000,000 (1,500,000 + 500,000)
✅ TOKO "ANKA" normalized to "ANKA BEKASI"
✅ TOKO "ANKA PEMALANG" kept as "ANKA PEMALANG"

### Verify in Database:
```sql
SELECT * FROM invoice_file_list WHERE faktur IN ('835100310', '724200450');
```

**Check:**
- `total_jumlah_jual` = 2000000 for faktur 835100310
- `item_count` = 2 for faktur 835100310
- `toko` = 'ANKA BEKASI' for faktur 835100310
- `toko` = 'ANKA PEMALANG' for faktur 724200450
- `status` = 'PENDING' for both

```sql
SELECT * FROM excel_upload_batches ORDER BY created_at DESC LIMIT 1;
```

**Check:**
- `status` = 'completed'
- `processed_rows` = 2
- `failed_rows` = 0
- `duplicate_rows` = 0

---

## Test Case 2: View Invoice List

### Steps:
1. Navigate to **Sistem Invoice → Daftar Invoice**
2. Wait for page to load

### Expected Results:
✅ Stats cards show:
   - Total Invoice: 2
   - Uploaded: 0
   - Pending: 2
   - Missing: 0

✅ Table displays 2 rows with 10 columns:
   - Attachments: Upload button (red)
   - Tanggal: 02/10/2026, 03/10/2026
   - No Faktur: 835100310, 724200450
   - Status Bayar: CASH, PIUTANG
   - Tipe: JUAL
   - Nama Konsumen: Toko Berkah, Toko Makmur
   - Nama Toko: ANKA BEKASI, ANKA PEMALANG
   - Total: Rp 2,000,000, Rp 2,000,000
   - Keterangan: PPN, NON PPN
   - Aksi: Status badge "PENDING" (yellow)

✅ Pagination shows: "Menampilkan 1 - 2 dari 2 invoice"

---

## Test Case 3: Apply Filters

### Steps:
1. On Invoice List page, set filters:
   - Status: PENDING
   - Toko: ANKA BEKASI
   - Keterangan: PPN
2. Click **Terapkan Filter**

### Expected Results:
✅ Table shows only 1 row (Faktur 835100310)
✅ Stats remain unchanged (global stats)
✅ Pagination updates: "Menampilkan 1 - 1 dari 1 invoice"

### Steps (continued):
3. Click **Reset** button

### Expected Results:
✅ All filters cleared
✅ Table shows all 2 rows again

---

## Test Case 4: Search Functionality

### Steps:
1. In search box, type: "835100310"
2. Press Enter or click **Terapkan Filter**

### Expected Results:
✅ Table shows only matching faktur
✅ Search works with partial match

### Steps (continued):
3. Clear search and type: "Berkah"
4. Apply filter

### Expected Results:
✅ Table shows invoice for "Toko Berkah" (konsumen search)

---

## Test Case 5: PDF Upload

### Steps:
1. Prepare PDF file named `835100310.pdf`
2. On Invoice List, find row with Faktur 835100310
3. Click **Upload** button (red) in Attachments column
4. Select the PDF file
5. Confirm upload dialog

### Expected Results:
✅ File picker opens with PDF filter
✅ Confirmation dialog shows:
   - "Upload PDF untuk faktur 835100310?"
   - File name and size

✅ Loading overlay appears with spinner
✅ Success alert: "✅ Upload berhasil!"
✅ Alert shows path: `/ARSIPINVOICE/2026/10/02/PPN/835100310.pdf`

✅ Table auto-refreshes
✅ Row updated:
   - Attachments: "Lihat" button (blue) instead of "Upload"
   - Status badge: "UPLOADED" (green)

✅ Stats cards update:
   - Uploaded: 1
   - Pending: 1

### Verify in Database:
```sql
SELECT faktur, status, uploaded_file_path, uploaded_at, uploaded_by 
FROM invoice_file_list 
WHERE faktur = '835100310';
```

**Check:**
- `status` = 'UPLOADED'
- `uploaded_file_path` = '/ARSIPINVOICE/2026/10/02/PPN/835100310.pdf'
- `uploaded_at` is not null
- `uploaded_by` = your user ID

### Verify in Google Drive:
```bash
rclone lsjson gdrive:/ARSIPINVOICE/2026/10/02/PPN/
```

**Check:**
- File `835100310.pdf` exists
- File size matches uploaded file

---

## Test Case 6: Upload NON PPN Invoice

### Steps:
1. Prepare PDF file named `724200450.pdf`
2. Find row with Faktur 724200450
3. Click **Upload** button
4. Select the PDF file and confirm

### Expected Results:
✅ Upload successful
✅ Path: `/ARSIPINVOICE/2026/10/03/NON/724200450.pdf`
✅ Note: Category is "NON" because keterangan = "NON PPN"

---

## Test Case 7: Duplicate Excel Upload

### Steps:
1. Navigate to **Upload Excel** page
2. Upload the SAME Excel file again
3. Wait for processing

### Expected Results:
✅ Upload completes
✅ Results show:
   - Total Baris: 3
   - Faktur Unik: 2
   - Berhasil: 0 (all are duplicates)
   - Duplikat: 2
   - Gagal: 0

✅ No new records in database
✅ Existing records unchanged

---

## Test Case 8: Invalid Excel File

### Steps:
1. Try to upload a .txt file
2. Try to upload a .docx file
3. Try to upload Excel with wrong columns

### Expected Results:
✅ Only .xls and .xlsx accepted
✅ Other file types rejected with error message
✅ Wrong column structure shows validation errors

---

## Test Case 9: Invalid PDF Upload

### Steps:
1. Try to upload non-PDF file (e.g., .jpg)
2. Try to upload PDF larger than 10MB

### Expected Results:
✅ Non-PDF rejected: "File harus berformat PDF"
✅ Large file rejected: "Ukuran file maksimal 10MB"

---

## Test Case 10: Upload with Wrong Faktur

### Steps:
1. Try to upload PDF with faktur "999999999" (doesn't exist in list)

### Expected Results:
❌ Upload fails with error:
   - "Faktur not found in invoice list"
   - "Please upload Excel file first or check faktur number"

---

## Test Case 11: Re-upload to Uploaded Invoice

### Steps:
1. Try to upload PDF to faktur that already has status UPLOADED
2. Click upload button on already uploaded row

### Expected Results:
✅ Upload button still visible (allows re-upload)
✅ Backend returns error: "Invoice already uploaded"
✅ Shows existing upload details

---

## Test Case 12: Permission Testing

### As Admin Zona User:
1. Login as admin_zona
2. Check sidebar

### Expected Results:
✅ "Daftar Invoice" menu visible
❌ "Upload Excel" menu NOT visible (moderator/super_admin only)

### Try Direct Access:
3. Navigate to `/upload-excel.html` directly

### Expected Results:
❌ Redirected or "Akses ditolak" message
❌ Cannot upload Excel (role check in backend)

---

## Test Case 13: Date Format Validation

### Verify:
- Database stores: `2026-10-02` (ISO format)
- Display shows: `02/10/2026` (DD/MM/YYYY)
- Path uses: `2026/10/02` (YYYY/MM/DD)

### Check in:
- Invoice list table
- Upload success messages
- Google Drive folder structure

---

## Test Case 14: Statistics Accuracy

### Steps:
1. Upload Excel with 5 invoices
2. Upload PDF for 2 invoices
3. Refresh Invoice List page

### Expected Stats:
- Total Invoice: 5
- Uploaded: 2
- Pending: 3
- Missing: 0

### Verify with SQL:
```sql
SELECT * FROM get_invoice_statistics();
```

---

## Test Case 15: Pagination

### Steps:
1. Upload Excel with 150+ invoices
2. Navigate to Invoice List

### Expected Results:
✅ Shows 100 invoices per page (default)
✅ "Selanjutnya" button enabled
✅ "Sebelumnya" button disabled on first page
✅ Click "Selanjutnya" shows next 50 invoices
✅ Pagination info updates correctly

---

## Performance Tests

### Test 1: Large Excel File
- Upload Excel with 1000+ rows
- Should complete within 30 seconds
- Memory usage stays reasonable

### Test 2: Concurrent Uploads
- Multiple users upload PDFs simultaneously
- No race conditions
- All uploads tracked correctly

### Test 3: API Response Time
- `/api/invoice/list` responds within 2 seconds
- `/api/invoice/stats` responds within 1 second

---

## Error Handling Tests

### Test 1: Network Failure
- Disconnect internet during Excel upload
- Should show error message
- Can retry after reconnection

### Test 2: Database Timeout
- Simulate slow database
- Should handle gracefully with error message

### Test 3: Google Drive Quota
- Simulate quota exceeded
- Should fail gracefully with clear message

---

## Checklist Summary

Before deployment, verify all:

**Database:**
- [ ] Tables created successfully
- [ ] Functions working
- [ ] Indexes optimized

**Backend:**
- [ ] All 6 endpoints responding
- [ ] Authentication working
- [ ] Authorization checks in place
- [ ] Error logging functional

**Frontend:**
- [ ] Upload Excel page loads
- [ ] Invoice List page loads
- [ ] Sidebar menu appears
- [ ] All filters work
- [ ] Search works
- [ ] Pagination works

**Integration:**
- [ ] Excel parse → Database insert works
- [ ] PDF upload → Google Drive works
- [ ] Status updates correctly
- [ ] Stats calculate correctly

**Security:**
- [ ] Role checks enforced
- [ ] File type validation works
- [ ] File size limits enforced
- [ ] SQL injection prevented
- [ ] XSS prevented

**Performance:**
- [ ] Large files handled
- [ ] Concurrent users supported
- [ ] Response times acceptable

---

## Troubleshooting

### Excel Upload Fails
**Check:**
1. Console errors in browser
2. Backend logs: `backend/storage-errors.log`
3. Database connection
4. Excel file format and columns

### PDF Upload Fails
**Check:**
1. Rclone config: `rclone listremotes`
2. Google Drive access: `rclone lsd gdrive:/ARSIPINVOICE`
3. File path generation logic
4. Backend logs

### Stats Not Updating
**Check:**
1. Database function: `SELECT * FROM get_invoice_statistics();`
2. Browser console for API errors
3. Backend endpoint logs

---

## Manual Testing Script

```bash
# 1. Database setup
node backend/execute-schema.js sql/add_invoice_file_list.sql

# 2. Start server
npm start

# 3. Test Rclone
rclone lsd gdrive:/ARSIPINVOICE

# 4. Test database function
# Run in SQL client:
# SELECT * FROM get_invoice_statistics();

# 5. Open browser
# http://localhost:3000/upload-excel.html
# http://localhost:3000/invoice-list.html

# 6. Upload test Excel and PDFs
# Follow test cases above

# 7. Verify in Google Drive
rclone tree gdrive:/ARSIPINVOICE --max-depth 5
```

---

## Sign-off

After completing all tests:

- [ ] All test cases passed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Ready for production deployment

**Tested by:** _______________  
**Date:** _______________  
**Environment:** _______________  
**Notes:** _______________
