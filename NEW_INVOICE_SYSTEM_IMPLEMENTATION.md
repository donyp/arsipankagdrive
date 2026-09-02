# New Invoice System Implementation - Complete Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Features](#features)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [User Guide](#user-guide)
7. [Technical Details](#technical-details)
8. [API Reference](#api-reference)
9. [Database Schema](#database-schema)
10. [Deployment Checklist](#deployment-checklist)
11. [Maintenance](#maintenance)
12. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose
Sistem invoice baru yang memungkinkan admin untuk:
1. Upload data Excel (REKAP_LABA.xls) secara otomatis
2. Generate daftar file invoice yang perlu diupload
3. Upload PDF invoice dengan pencocokan otomatis berdasarkan nomor faktur
4. Track status upload (PENDING/UPLOADED/MISSING)
5. Organize file di Google Drive dengan struktur folder terorganisir

### Key Benefits
- ✅ **Automated Processing**: Excel parsing otomatis dengan aggregasi data
- ✅ **Auto-matching**: PDF langsung cocok dengan nomor faktur
- ✅ **Organized Storage**: Struktur folder berdasarkan tanggal dan kategori
- ✅ **Real-time Tracking**: Status update langsung setelah upload
- ✅ **Data Aggregation**: Multiple items dengan faktur sama otomatis dijumlahkan
- ✅ **Toko Normalization**: "ANKA" otomatis menjadi "ANKA BEKASI"

### Flow Diagram
```
┌─────────────────┐
│ Admin Upload    │
│ REKAP_LABA.xls  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Parse Excel     │
│ - Normalize     │
│ - Aggregate     │
│ - Validate      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Save to DB      │
│ Status: PENDING │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Display List    │
│ with Upload Btn │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Admin Upload    │
│ faktur.pdf      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Match Faktur    │
│ Upload to GDrive│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update Status   │
│ Status: UPLOADED│
└─────────────────┘
```

---

## System Architecture

### Components

#### 1. Frontend
- **upload-excel.html**: Interface untuk upload Excel
- **invoice-list.html**: Daftar invoice dengan filter & upload
- **js/upload-excel.js**: Handler Excel upload
- **js/invoice-list.js**: Handler list & PDF upload

#### 2. Backend
- **backend/excel-parser.js**: Parse & validate Excel
- **backend/invoice-endpoints.js**: 6 REST API endpoints
- **backend/rclone_wrapper.js**: Google Drive integration

#### 3. Database
- **invoice_file_list**: Main invoice table
- **excel_upload_batches**: Track upload batches
- **get_invoice_statistics()**: Stats function

#### 4. Storage
- **Google Drive**: `/ARSIPINVOICE/YEAR/MONTH/DAY/PPN|NON/`

---

## Features

### 1. Excel Upload
- **Supported Formats**: .xls, .xlsx
- **Max Size**: 10MB
- **Required Columns**:
  - TANGGAL
  - TOKO
  - FAKTUR
  - METODE BAYAR
  - JENIS TRANSAKSI
  - KONSUMEN
  - JUMLAH JUAL
  - KET 2 (PPN/NON PPN)

### 2. Data Processing
- **Normalization**:
  - "ANKA" → "ANKA BEKASI"
  - "ANKA PEMALANG" → "ANKA PEMALANG"
  
- **Aggregation**:
  - Multiple rows dengan faktur sama → 1 entry
  - `total_jumlah_jual` = SUM(JUMLAH JUAL)
  - `item_count` = COUNT(rows)

- **Validation**:
  - Required fields check
  - Date format validation
  - Faktur uniqueness
  - Data type validation

### 3. Invoice List
- **10 Column Table**:
  1. Attachments (Upload/View button)
  2. Tanggal (DD/MM/YYYY)
  3. No Faktur
  4. Status Bayar
  5. Tipe
  6. Nama Konsumen
  7. Nama Toko
  8. Total (Rp formatted)
  9. Keterangan (PPN/NON)
  10. Aksi (Status badge)

- **Filters**:
  - Status (PENDING/UPLOADED/MISSING)
  - Toko (ANKA BEKASI/ANKA PEMALANG)
  - Keterangan (PPN/NON PPN)
  - Date range (from - to)
  - Search (faktur/konsumen)

- **Statistics Cards**:
  - Total Invoice
  - Uploaded
  - Pending
  - Missing

- **Pagination**: 100 items per page

### 4. PDF Upload
- **Method**: Click Upload button on each row
- **Validation**:
  - PDF format only
  - Max 10MB
  - Faktur must exist in list
  
- **Auto-matching**: Match berdasarkan nomor faktur
- **Path Generation**: Otomatis berdasarkan tanggal & kategori
- **Status Update**: PENDING → UPLOADED

### 5. Security
- **Authentication**: JWT token required
- **Authorization**:
  - Upload Excel: Super Admin, Moderator only
  - Upload PDF: All authenticated users
  - View List: All authenticated users
  - Delete: Super Admin only

---

## Installation

### Step 1: Database Migration

```bash
# Run SQL migration
node backend/execute-schema.js sql/add_invoice_file_list.sql
```

**Verify:**
```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('invoice_file_list', 'excel_upload_batches');

-- Check function
SELECT proname FROM pg_proc WHERE proname = 'get_invoice_statistics';
```

### Step 2: Install Dependencies

```bash
# Backend dependencies
npm install xlsx uuid multer

# Already installed:
# - express
# - @supabase/supabase-js
# - bcryptjs
# - jsonwebtoken
```

### Step 3: Verify Rclone Configuration

```bash
# Test rclone connection
rclone listremotes

# Should show: gdrive

# Test access to ARSIPINVOICE folder
rclone lsd gdrive:/ARSIPINVOICE

# If folder doesn't exist, create it
rclone mkdir gdrive:/ARSIPINVOICE
```

### Step 4: Backend Registration

File `backend/server.js` should have:
```javascript
const { registerInvoiceEndpoints } = require('./invoice-endpoints');

// After other endpoints
registerInvoiceEndpoints(app, supabase, authenticateToken, RcloneStorage);
```

✅ Already implemented in current codebase.

### Step 5: Frontend Menu

File `js/sidebar.js` should have Invoice System menu.

✅ Already implemented in current codebase.

---

## Configuration

### Environment Variables

No new environment variables required. Uses existing:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `RCLONE_REMOTE` (default: 'gdrive')
- `RCLONE_CONFIG_PATH` (default: './rclone.conf')

### Rclone Config

File: `rclone.conf`

```ini
[gdrive]
type = drive
scope = drive
token = {...}
client_id = {...}
client_secret = {...}
fast_list = true
use_trash = false
chunk_size = 32M
upload_cutoff = 32M
```

✅ Already configured correctly.

### Storage Path

Base path in Google Drive:
```
/ARSIPINVOICE/
```

Full path structure:
```
/ARSIPINVOICE/[YEAR]/[MONTH]/[DAY]/[CATEGORY]/[FAKTUR].pdf
```

Example:
```
/ARSIPINVOICE/2026/10/02/PPN/835100310.pdf
/ARSIPINVOICE/2026/10/03/NON/724200450.pdf
```

---

## User Guide

### For Admin: Upload Excel

1. **Login** as Super Admin or Moderator
2. **Navigate** to Sistem Invoice → Upload Excel
3. **Prepare Excel file** (REKAP_LABA.xls) with required columns
4. **Drag & drop** or click to select file
5. **Click** "Upload & Proses"
6. **Wait** for processing (progress bar shows status)
7. **Review results**:
   - Total rows processed
   - Unique fakturs
   - Successful inserts
   - Duplicates skipped
   - Errors (if any)
8. **Click** "Lihat Daftar Invoice" to view list

### For Admin: Upload PDF Invoice

1. **Navigate** to Sistem Invoice → Daftar Invoice
2. **Find** invoice in table (use filters/search if needed)
3. **Click** red "Upload" button in Attachments column
4. **Select** PDF file (must be named with faktur number, e.g., 835100310.pdf)
5. **Confirm** upload in dialog
6. **Wait** for upload to complete
7. **Verify**:
   - Status badge changes to "UPLOADED" (green)
   - Upload button changes to "Lihat" (blue)
   - Stats cards update

### For All Users: View Invoice List

1. **Navigate** to Sistem Invoice → Daftar Invoice
2. **View** statistics in cards at top
3. **Apply filters** if needed:
   - Select status, toko, keterangan
   - Set date range
   - Enter search term
4. **Click** "Terapkan Filter"
5. **Use pagination** for large lists
6. **Click** "Lihat" to view uploaded PDF (feature coming soon)

---

## Technical Details

### Excel Parsing Logic

File: `backend/excel-parser.js`

**Key Functions:**

1. **parseExcel(buffer)**
   - Reads Excel buffer using xlsx library
   - Extracts first sheet
   - Returns parsed data array

2. **normalizeToko(tokoRaw)**
   ```javascript
   if (toko === 'ANKA') return 'ANKA BEKASI';
   if (toko === 'ANKA PEMALANG') return 'ANKA PEMALANG';
   return tokoRaw;
   ```

3. **Data Aggregation**
   - Groups by FAKTUR
   - Sums JUMLAH JUAL for same faktur
   - Counts items per faktur
   - Keeps first row's metadata

4. **validateData(data)**
   - Checks required fields
   - Validates date format
   - Validates data types
   - Returns errors array

### Path Generation Logic

File: `backend/invoice-endpoints.js`

```javascript
const date = new Date(invoice.tanggal);
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const category = invoice.keterangan.toUpperCase().includes('PPN') ? 'PPN' : 'NON';
const filename = `${faktur}.pdf`;
const storagePath = `/ARSIPINVOICE/${year}/${month}/${day}/${category}/${filename}`;
```

### Upload Process

File: `backend/rclone_wrapper.js`

**uploadInvoicePDF(buffer, filename, year, month, day, category)**

Steps:
1. Create temp file from buffer
2. Create directory structure on remote
3. Upload file via rclone copyto
4. Verify upload (check size)
5. Clean up temp file
6. Return success/error

### Database Functions

**get_invoice_statistics()**

```sql
CREATE OR REPLACE FUNCTION get_invoice_statistics()
RETURNS TABLE (
    total_count BIGINT,
    uploaded_count BIGINT,
    pending_count BIGINT,
    missing_count BIGINT,
    total_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_count,
        COUNT(*) FILTER (WHERE status = 'UPLOADED')::BIGINT as uploaded_count,
        COUNT(*) FILTER (WHERE status = 'PENDING')::BIGINT as pending_count,
        COUNT(*) FILTER (WHERE status = 'MISSING')::BIGINT as missing_count,
        COALESCE(SUM(total_jumlah_jual), 0) as total_amount
    FROM invoice_file_list;
END;
$$ LANGUAGE plpgsql;
```

---

## API Reference

Base URL: `/api/invoice`

### 1. POST /api/invoice/upload-excel

**Upload and parse Excel file**

**Auth**: Required (Super Admin, Moderator)

**Request:**
- Content-Type: multipart/form-data
- Body: `excel` (file)

**Response:**
```json
{
  "success": true,
  "batchId": "uuid",
  "summary": {
    "totalRows": 100,
    "uniqueFakturs": 75,
    "processed": 75,
    "duplicates": 0,
    "failed": 0,
    "errors": []
  }
}
```

### 2. GET /api/invoice/list

**Get invoice list with filters**

**Auth**: Required (All users)

**Query Parameters:**
- `status` (optional): PENDING|UPLOADED|MISSING
- `toko` (optional): ANKA BEKASI|ANKA PEMALANG
- `keterangan` (optional): PPN|NON PPN
- `date_from` (optional): YYYY-MM-DD
- `date_to` (optional): YYYY-MM-DD
- `search` (optional): Search term
- `limit` (optional, default: 100)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 150,
  "limit": 100,
  "offset": 0
}
```

### 3. GET /api/invoice/stats

**Get invoice statistics**

**Auth**: Required (All users)

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_count": 150,
    "uploaded_count": 50,
    "pending_count": 90,
    "missing_count": 10,
    "total_amount": "150000000"
  }
}
```

### 4. POST /api/invoice/upload-pdf

**Upload PDF and match with faktur**

**Auth**: Required (All users)

**Request:**
- Content-Type: multipart/form-data
- Body:
  - `pdf` (file)
  - `faktur` (string)

**Response:**
```json
{
  "success": true,
  "faktur": "835100310",
  "storagePath": "/ARSIPINVOICE/2026/10/02/PPN/835100310.pdf",
  "message": "Invoice PDF uploaded successfully"
}
```

**Errors:**
- 404: Faktur not found
- 400: Invoice already uploaded
- 500: Upload to Google Drive failed

### 5. DELETE /api/invoice/:faktur

**Delete invoice from list**

**Auth**: Required (Super Admin only)

**Response:**
```json
{
  "success": true
}
```

### 6. PATCH /api/invoice/:faktur/status

**Manually update invoice status**

**Auth**: Required (Super Admin, Moderator)

**Request Body:**
```json
{
  "status": "PENDING|UPLOADED|MISSING"
}
```

**Response:**
```json
{
  "success": true
}
```

---

## Database Schema

### Table: invoice_file_list

```sql
CREATE TABLE invoice_file_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- From Excel
    tanggal DATE NOT NULL,
    toko VARCHAR(100) NOT NULL,
    toko_raw VARCHAR(100),
    faktur VARCHAR(50) UNIQUE NOT NULL,
    metode_bayar VARCHAR(50),
    jenis_transaksi VARCHAR(50),
    konsumen TEXT,
    keterangan VARCHAR(100),
    
    -- Aggregated
    total_jumlah_jual NUMERIC(15,2),
    item_count INTEGER DEFAULT 1,
    
    -- Upload tracking
    status VARCHAR(20) DEFAULT 'PENDING',
    uploaded_file_path TEXT,
    uploaded_at TIMESTAMPTZ,
    uploaded_by UUID REFERENCES users(id),
    
    -- Excel batch tracking
    excel_batch_id UUID,
    excel_uploaded_at TIMESTAMPTZ,
    excel_uploaded_by UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invoice_faktur ON invoice_file_list(faktur);
CREATE INDEX idx_invoice_status ON invoice_file_list(status);
CREATE INDEX idx_invoice_tanggal ON invoice_file_list(tanggal);
CREATE INDEX idx_invoice_toko ON invoice_file_list(toko);
CREATE INDEX idx_invoice_batch ON invoice_file_list(excel_batch_id);
```

### Table: excel_upload_batches

```sql
CREATE TABLE excel_upload_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    total_rows INTEGER,
    processed_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    duplicate_rows INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    error_log TEXT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batch_status ON excel_upload_batches(status);
CREATE INDEX idx_batch_created ON excel_upload_batches(created_at);
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] **Database Migration**
  ```bash
  node backend/execute-schema.js sql/add_invoice_file_list.sql
  ```

- [ ] **Verify Tables**
  ```sql
  SELECT * FROM invoice_file_list LIMIT 1;
  SELECT * FROM excel_upload_batches LIMIT 1;
  SELECT * FROM get_invoice_statistics();
  ```

- [ ] **Test Rclone**
  ```bash
  rclone lsd gdrive:/ARSIPINVOICE
  ```

- [ ] **Backend Dependencies**
  ```bash
  npm install
  ```

- [ ] **Environment Variables**
  - SUPABASE_URL ✓
  - SUPABASE_KEY ✓
  - JWT_SECRET ✓

### Deployment Steps

1. **Push to Repository**
   ```bash
   git add .
   git commit -m "feat: New Invoice System - Excel upload & auto-matching"
   git push origin main
   ```

2. **Deploy to Production**
   - Railway/Replit will auto-deploy
   - Or manually: `npm start`

3. **Post-Deployment Verification**
   - [ ] Server starts without errors
   - [ ] Invoice endpoints logged in console
   - [ ] Login works
   - [ ] Menu "Sistem Invoice" appears
   - [ ] Pages load without errors

4. **Functional Testing**
   - [ ] Upload test Excel file
   - [ ] View invoice list
   - [ ] Apply filters
   - [ ] Upload test PDF
   - [ ] Verify in Google Drive
   - [ ] Check statistics

### Rollback Plan

If issues occur:

1. **Database**: Backup before migration
   ```sql
   -- Backup
   CREATE TABLE invoice_file_list_backup AS SELECT * FROM invoice_file_list;
   
   -- Rollback
   DROP TABLE invoice_file_list CASCADE;
   DROP TABLE excel_upload_batches CASCADE;
   DROP FUNCTION get_invoice_statistics();
   ```

2. **Code**: Revert git commit
   ```bash
   git revert HEAD
   git push origin main
   ```

3. **Frontend**: Remove menu temporarily
   - Comment out invoice menu in sidebar.js

---

## Maintenance

### Daily Tasks
- Monitor error logs: `backend/storage-errors.log`
- Check upload statistics
- Verify Google Drive quota

### Weekly Tasks
- Review pending invoices
- Check for missing PDFs
- Verify data integrity

### Monthly Tasks
- Archive old batches
- Clean up failed uploads
- Optimize database indexes

### Quarterly Tasks
- Review storage usage
- Update documentation
- Performance tuning

---

## Troubleshooting

### Issue: Excel Upload Fails

**Symptoms**: Error during Excel parsing

**Causes:**
1. Wrong file format
2. Missing required columns
3. Invalid data

**Solutions:**
```bash
# Check backend logs
tail -f backend/storage-errors.log

# Verify Excel format
# - Must be .xls or .xlsx
# - Must have all required columns
# - Date format must be valid
```

### Issue: PDF Upload Fails

**Symptoms**: "Upload to Google Drive failed"

**Causes:**
1. Rclone not configured
2. Google Drive quota exceeded
3. Network issues

**Solutions:**
```bash
# Test rclone
rclone lsd gdrive:/ARSIPINVOICE

# Check quota
rclone about gdrive:

# Verify token
rclone config show gdrive
```

### Issue: Status Not Updating

**Symptoms**: After PDF upload, status still PENDING

**Causes:**
1. Database update failed
2. Frontend not refreshing

**Solutions:**
```sql
-- Manually check database
SELECT faktur, status, uploaded_at 
FROM invoice_file_list 
WHERE faktur = 'YOUR_FAKTUR';

-- Manually update if needed
UPDATE invoice_file_list 
SET status = 'UPLOADED', 
    uploaded_at = NOW() 
WHERE faktur = 'YOUR_FAKTUR';
```

### Issue: Statistics Incorrect

**Symptoms**: Stats cards show wrong numbers

**Causes:**
1. Function error
2. Data inconsistency

**Solutions:**
```sql
-- Test function
SELECT * FROM get_invoice_statistics();

-- Manual count
SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'UPLOADED') as uploaded,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending
FROM invoice_file_list;
```

---

## Support

### Documentation Files
- `INVOICE_SYSTEM_PATH_STRUCTURE.md` - Path details
- `INVOICE_SYSTEM_TESTING_GUIDE.md` - Testing procedures
- `NEW_INVOICE_SYSTEM_IMPLEMENTATION.md` - This file

### Contact
For issues or questions:
1. Check documentation first
2. Review logs
3. Test with sample data
4. Contact system administrator

---

## Version History

**v1.0.0** - Initial Release
- Excel upload with auto-parsing
- Invoice list with filters
- PDF upload with auto-matching
- Google Drive integration
- Statistics dashboard

---

## Credits

**Developed by**: Kiro AI Assistant  
**Date**: September 2026  
**System**: ARSIP ANKA - Invoice Management  

---

**END OF DOCUMENTATION**
