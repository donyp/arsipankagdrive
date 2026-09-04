# Zona ID Migration Guide

## Problem
Invoices yang diupload sebelum zona_id column ditambahkan tidak memiliki zona_id value, sehingga admin_zona users melihat error 500 ketika mencoba akses dashboard mereka.

## Solution

### Opsi 1: Database Migration Query (RECOMMENDED)
Jalankan SQL query untuk update semua invoices dengan matching toko:

```bash
# Copy query dari: sql/migrate_zona_id_for_invoices.sql
# Paste ke Supabase SQL Editor dan execute
```

Query ini akan:
1. Check berapa banyak invoices sudah punya zona_id
2. Match semua toko names dengan toko table  
3. Update zona_id dan toko_id untuk yang match
4. Show report invoices mana yang tidak bisa dimatched

### Opsi 2: Re-upload Excel File
Upload ulang file Excel yang sama:
1. Super_admin buka **Upload Excel** di dashboard
2. Select file Excel original yang sama
3. System akan auto-extract zona_id dari toko names
4. Old invoices akan skip (duplicate key constraint)
5. New invoices (jika ada) akan inserted dengan zona_id

### Opsi 3: Manual Backend Endpoint (Not Recommended)
Endpoint ini sudah tersedia tapi tidak reliabel:
```bash
curl -X POST https://arsipan-anka.up.railway.app/api/invoice/populate-zona-ids \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json"
```

## How It Works (Frontend to Backend)

### During Excel Upload:

**Frontend (upload-excel.js):**
```
User selects Excel file
  ↓
System parses Excel (frontend - XLSX library)
  ↓
Preview table shown to user
  ↓
User clicks "Upload"
  ↓
Frontend sends data to backend: POST /api/invoice/upload-excel-data
```

**Backend (invoice-endpoints.js):**
```
Receive parsed rows from frontend
  ↓
For each row:
  - Extract toko name
  - Query toko table: SELECT zona_id WHERE nama = 'toko name'
  - Insert invoice with zona_id (AUTO POPULATED - not shown to frontend)
  ↓
Return success response
```

### Example Flow:

```
Excel Row:
  toko: "Pasar Kemis"
  faktur: "INV-001"
  ...other fields...

Backend processing:
  1. Lookup: SELECT zona_id FROM toko WHERE nama = 'Pasar Kemis'
  2. Found: zona_id = 1
  3. Insert with: toko = "Pasar Kemis", zona_id = 1
  
Result in database:
  INSERT INTO invoice_file_list (
    toko, faktur, zona_id, ...
  ) VALUES (
    'Pasar Kemis', 'INV-001', 1, ...
  )
```

## Status Check

### Check how many invoices have zona_id:
```sql
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) as with_zona,
  COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as without_zona
FROM invoice_file_list;
```

### See which toko couldn't be matched:
```sql
SELECT DISTINCT toko, COUNT(*) as count
FROM invoice_file_list
WHERE zona_id IS NULL
GROUP BY toko
ORDER BY count DESC;
```

## After Migration

1. ✅ All invoices will have zona_id populated
2. ✅ Admin_zona users can access dashboard without 500 error
3. ✅ Invoice filtering by zona works correctly
4. ✅ Dropdown toko shows only toko from their zona
5. ✅ New uploads automatically get zona_id assigned

## Files Involved

- **Backend:** `backend/invoice-endpoints.js` - POST /api/invoice/upload-excel-data endpoint (lines 88-250)
- **Frontend:** `js/upload-piutang.js` - Excel upload UI and preview
- **Database:** `sql/add_zona_id_to_invoice_file_list.sql` - Schema migration
- **Database:** `sql/migrate_zona_id_for_invoices.sql` - Data migration
