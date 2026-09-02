# Invoice System Complete Flow Verification

## User Story
**Admin upload file massal dengan no faktur berbeda → system cocok no faktur → status berubah ke UPLOADED**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    USER FLOW                                │
└─────────────────────────────────────────────────────────────┘

1. UPLOAD EXCEL
   └─> User: upload-excel.html
   └─> Backend: POST /api/invoice/upload-excel
   └─> Process: Parse Excel → Aggregate by faktur → Store to DB
   └─> Database: invoice_file_list (status=PENDING)

2. UPLOAD PDF (MASSAL)
   └─> User: Select multiple PDFs in invoice-list.html
   └─> For each PDF:
       ├─> Frontend: Extract filename → Parse faktur number
       ├─> Backend: POST /api/invoice/upload-pdf
       │   ├─> Find invoice by faktur
       │   ├─> Build path: /ARSIPINVOICE/YEAR/MONTH/DAY/PPN|NON/faktur.pdf
       │   ├─> Upload to Google Drive
       │   └─> Update DB: status=UPLOADED
       └─> Frontend: Reload list → Show UPLOADED badge

3. RESULT
   └─> Status change: PENDING → UPLOADED
   └─> File stored at: /ARSIPINVOICE/YEAR/MONTH/DAY/PPN|NON/faktur.pdf
```

---

## Flow Step-by-Step

### STEP 1: Excel Upload (Create Daftar)
**File:** upload-excel.html + js/upload-excel.js

```javascript
// User uploads file:
// - File: REKAP_LABA.xls
// - Contains: NO_FAKTUR, JUMLAH_JUAL, TOKO, KETERANGAN, TANGGAL

// Frontend validates:
✓ File type is .xls/.xlsx
✓ File has required columns

// Backend (POST /api/invoice/upload-excel):
1. Parse Excel with parseExcel()
   - Extract rows
   - Normalize TOKO (ANKA → ANKA BEKASI)
   - Aggregate by NO_FAKTUR (SUM JUMLAH_JUAL)
   - Validate data
   
2. Create batch record in excel_upload_batches
   
3. Insert invoice_file_list records
   - Fields: faktur, tanggal, toko, jumlah_jual, keterangan, status, batch_id
   - Status: PENDING (not uploaded yet)
   
4. Response: { success, batch_id, inserted_count, stats }
```

**Example Excel Data:**
```
NO_FAKTUR | JUMLAH_JUAL | TOKO   | KETERANGAN | TANGGAL
835100310 | 1000000     | ANKA   | PPN        | 2026-09-01
835100311 | 2000000     | ANKA   | PPN        | 2026-09-01
835100312 | 500000      | ANKA   | NON        | 2026-09-01
```

**Database After Excel Upload:**
```sql
SELECT * FROM invoice_file_list;

id | faktur    | tanggal    | toko         | jumlah_jual | keterangan | status  | uploaded_file_path
1  | 835100310 | 2026-09-01 | ANKA BEKASI  | 1000000     | PPN        | PENDING | NULL
2  | 835100311 | 2026-09-01 | ANKA BEKASI  | 2000000     | PPN        | PENDING | NULL
3  | 835100312 | 2026-09-01 | ANKA BEKASI  | 500000      | NON        | PENDING | NULL
```

---

### STEP 2: PDF Upload (Massal)
**File:** invoice-list.html + js/invoice-list.js

#### Frontend Process:
```javascript
// User clicks "Upload" button next to PENDING invoices
uploadPDF('835100310') // Triggered for each file

// What happens:
1. File picker dialog opens
   - Accept: .pdf only
   - Max size: 10MB
   
2. User selects: 835100310.pdf
   - File validated
   - Confirmation shown: "Upload PDF untuk faktur 835100310?"
   
3. User confirms → POST /api/invoice/upload-pdf
   - FormData: { pdf: file, faktur: '835100310' }
```

#### Backend Process:
**Endpoint:** POST /api/invoice/upload-pdf

```javascript
1. Validate request
   ✓ File exists
   ✓ Faktur provided
   
2. Find invoice in database
   Query: SELECT * FROM invoice_file_list WHERE faktur='835100310'
   Result: { faktur, tanggal, toko, status, keterangan, ... }
   
3. Check status
   If status === 'UPLOADED':
      Return error: "Invoice already uploaded"
   Else:
      Continue to upload
      
4. Build storage path
   - Date: tanggal = 2026-09-01
   - Year: 2026
   - Month: 09
   - Day: 01
   - Category: KETERANGAN.includes('PPN') ? 'PPN' : 'NON'
   - Result: /ARSIPINVOICE/2026/09/01/PPN/835100310.pdf
   
5. Upload to Google Drive
   RcloneStorage.uploadInvoicePDF(buffer, filename, year, month, day, category)
   
6. Update database
   UPDATE invoice_file_list 
   SET 
     status = 'UPLOADED',
     uploaded_file_path = '/ARSIPINVOICE/2026/09/01/PPN/835100310.pdf',
     uploaded_at = NOW(),
     uploaded_by = user_id
   WHERE faktur = '835100310'
   
7. Log audit
   INSERT audit_logs
   (user_id, action, context)
   VALUES (user_id, 'upload_invoice_pdf', '...')
```

#### Database After PDF Upload:
```sql
SELECT * FROM invoice_file_list WHERE faktur='835100310';

id | faktur    | tanggal    | toko        | jumlah_jual | keterangan | status   | uploaded_file_path                      | uploaded_at
1  | 835100310 | 2026-09-01 | ANKA BEKASI | 1000000     | PPN        | UPLOADED | /ARSIPINVOICE/2026/09/01/PPN/835100310.pdf | 2026-09-02 10:30:00
```

---

## Complete Test Scenario

### Test Case 1: Single Invoice Upload

**Precondition:**
- Masuk ke dashboard
- Go to "Sistem Invoice" → "Upload Excel"
- Upload file dengan 1 faktur

**Setup:**
```
File: test-invoice.xlsx

NO_FAKTUR | JUMLAH_JUAL | TOKO | KETERANGAN | TANGGAL
835100310 | 1000000     | ANKA | PPN        | 2026-09-01
```

**Steps:**
1. Click "Upload Excel" button
2. Select test-invoice.xlsx
3. Verify: Success message + stats updated
4. Dashboard shows: Total=1, Pending=1, Uploaded=0
5. Go to "Daftar Invoice"
6. Verify: Row shows PENDING status + "Upload" button
7. Click "Upload" button next to 835100310
8. Select PDF file: 835100310.pdf
9. Confirm dialog
10. Verify: Success message
11. Reload page
12. Verify: Status changed to "UPLOADED"
13. Verify: "Upload" button changed to "Lihat" button
14. Dashboard stats: Uploaded=1, Pending=0

---

### Test Case 2: Massal Upload (Multiple Invoices)

**Setup:**
```
File: test-multiple.xlsx

NO_FAKTUR | JUMLAH_JUAL | TOKO   | KETERANGAN | TANGGAL
835100310 | 1000000     | ANKA   | PPN        | 2026-09-01
835100311 | 2000000     | ANKA   | PPN        | 2026-09-01
835100312 | 500000      | ANKA   | NON        | 2026-09-01
835100313 | 1500000     | ANKA   | NON        | 2026-09-02
```

**Steps:**
1. Upload Excel file
   - Verify: Inserted 4 invoices, all PENDING
   - Dashboard: Total=4, Pending=4, Uploaded=0

2. Upload PDFs one by one:
   ```
   Upload 835100310.pdf → Status: UPLOADED
   Upload 835100311.pdf → Status: UPLOADED
   Upload 835100312.pdf → Status: UPLOADED
   Upload 835100313.pdf → Status: UPLOADED
   ```

3. After each upload:
   - Verify: Status badge changes to "UPLOADED"
   - Verify: Button changes to "Lihat File"

4. Final state in database:
   ```sql
   SELECT status, COUNT(*) FROM invoice_file_list GROUP BY status;
   
   status   | count
   UPLOADED | 4
   ```

5. Dashboard stats:
   - Total: 4
   - Uploaded: 4
   - Pending: 0

---

### Test Case 3: Error Handling

**Test 3a: Faktur not found**
- Excel has faktur: 835100310
- Try to upload PDF for faktur: 835100399 (tidak ada di list)
- Expected: Error message "Faktur not found in invoice list"

**Test 3b: Duplicate upload**
- Upload 835100310.pdf
- Status changed to UPLOADED
- Try to upload 835100310.pdf again
- Expected: Error message "Invoice already uploaded"

**Test 3c: Invalid file format**
- Click "Upload" button
- Select .txt file instead of .pdf
- Expected: Alert "File harus berformat PDF"

**Test 3d: File size exceeded**
- Create PDF > 10MB
- Try to upload
- Expected: Alert "Ukuran file maksimal 10MB"

---

## Database Verification

### Check Invoice List
```sql
-- View all invoices
SELECT faktur, tanggal, toko, status, uploaded_file_path, uploaded_at 
FROM invoice_file_list 
ORDER BY tanggal DESC;

-- View stats
SELECT * FROM get_invoice_statistics();

-- View upload batches
SELECT * FROM excel_upload_batches ORDER BY created_at DESC;
```

### Check Audit Log
```sql
SELECT user_id, action, context, created_at 
FROM audit_logs 
WHERE action IN ('upload_invoice_excel', 'upload_invoice_pdf')
ORDER BY created_at DESC;
```

---

## API Endpoints to Test

### 1. Upload Excel
```
POST /api/invoice/upload-excel
Headers: Authorization: Bearer {token}, Content-Type: multipart/form-data
Body: { excel: File }

Response:
{
  "success": true,
  "batch_id": "abc123",
  "inserted_count": 4,
  "stats": {
    "total": 4,
    "pending": 4,
    "uploaded": 0
  }
}
```

### 2. List Invoices
```
GET /api/invoice/list?limit=100&offset=0&status=PENDING
Headers: Authorization: Bearer {token}

Response:
{
  "count": 4,
  "data": [
    {
      "id": 1,
      "faktur": "835100310",
      "tanggal": "2026-09-01",
      "toko": "ANKA BEKASI",
      "jumlah_jual": 1000000,
      "keterangan": "PPN",
      "status": "PENDING",
      "uploaded_file_path": null
    },
    ...
  ]
}
```

### 3. Upload PDF
```
POST /api/invoice/upload-pdf
Headers: Authorization: Bearer {token}, Content-Type: multipart/form-data
Body: { pdf: File, faktur: "835100310" }

Response:
{
  "success": true,
  "faktur": "835100310",
  "storagePath": "/ARSIPINVOICE/2026/09/01/PPN/835100310.pdf",
  "message": "Invoice PDF uploaded successfully"
}
```

### 4. Get Stats
```
GET /api/invoice/stats
Headers: Authorization: Bearer {token}

Response:
{
  "stats": {
    "total_count": 4,
    "uploaded_count": 3,
    "pending_count": 1,
    "missing_count": 0
  }
}
```

---

## Expected Behavior Summary

| Stage | Status | Count | User Sees |
|-------|--------|-------|-----------|
| After Excel Upload | PENDING | 4 | Upload buttons |
| After 1st PDF Upload | 3 PENDING, 1 UPLOADED | 4 total | Mixed buttons |
| After All PDF Upload | All UPLOADED | 4 | View buttons |
| Dashboard | - | - | Total=4, Uploaded=4, Pending=0 |

---

## Troubleshooting

**If "Cannot find module 'uuid'" appears:**
- Railway needs npm install
- Check: package.json has uuid, xlsx, multer listed
- Solution: Restart & Clear Build Cache in Railway

**If status doesn't update:**
- Check Supabase connection
- Verify JWT token is valid
- Check audit logs for errors

**If file doesn't appear in Google Drive:**
- Check rclone.conf settings
- Verify ARSIPINVOICE folder exists in shared drive
- Check RcloneStorage.uploadInvoicePDF() implementation

**If date format wrong:**
- Verify tanggal stored as DATE type in DB
- Check formatDate() in invoice-list.js
- Expected: DD/MM/YYYY display format

---

## Files Involved

**Frontend:**
- `invoice-list.html` - Display list + upload buttons
- `js/invoice-list.js` - Upload logic
- `upload-excel.html` - Excel upload UI
- `js/upload-excel.js` - Excel parse logic
- `dashboard.html` - Stats display

**Backend:**
- `backend/invoice-endpoints.js` - API endpoints
- `backend/excel-parser.js` - Excel parsing
- `backend/rclone_wrapper.js` - Google Drive upload

**Database:**
- `invoice_file_list` - Main table
- `excel_upload_batches` - Batch tracking
- `audit_logs` - Activity tracking

---

## Sign-Off Checklist

- [ ] Excel upload works (daftar tercipta)
- [ ] Stats show correctly (total, pending, uploaded)
- [ ] PDF single upload works
- [ ] PDF massal upload works (multiple different faktur)
- [ ] Status changes from PENDING to UPLOADED
- [ ] Files appear in Google Drive at correct path
- [ ] Error handling works (duplicate, not found, invalid format)
- [ ] Audit logs recorded
- [ ] Dashboard stats update in real-time
- [ ] Can view uploaded PDF (Lihat button)
- [ ] Can delete from batch (double confirmation works)

