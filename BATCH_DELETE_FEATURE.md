# 🗑️ Batch Delete Feature - Documentation

## Overview

Fitur baru untuk **menghapus semua daftar invoice dari satu batch upload Excel**. Berguna jika admin upload Excel yang salah dan ingin menghapus semua data sekaligus.

---

## ✨ Fitur

### 1. Halaman Riwayat Upload Excel
- **URL**: `/invoice-batches.html`
- **Akses**: Super Admin & Moderator only
- **Menu**: Sistem Invoice → Riwayat Upload

### 2. Informasi yang Ditampilkan
- Tanggal upload
- Nama file Excel
- Status (Completed, Processing, Failed, Completed with Errors)
- Statistik (Total rows, Berhasil, Duplikat, Gagal)
- Nama user yang upload
- Aksi (Lihat Invoice, Hapus)

### 3. Tombol Aksi
- **Lihat Invoice**: Redirect ke invoice-list dengan filter batch
- **Hapus**: Hapus semua invoice dari batch ini

---

## 🔧 Technical Implementation

### Backend API

#### 1. GET /api/invoice/batches
**Get list of Excel upload batches**

**Auth**: Super Admin, Moderator

**Query Params:**
- `limit` (default: 50)
- `offset` (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "filename": "REKAP_LABA.xls",
      "total_rows": 100,
      "processed_rows": 95,
      "failed_rows": 0,
      "duplicate_rows": 5,
      "status": "completed",
      "created_at": "2026-10-02T10:00:00Z",
      "uploader": {
        "name": "Admin Name",
        "email": "admin@example.com"
      }
    }
  ],
  "count": 10,
  "limit": 50,
  "offset": 0
}
```

#### 2. DELETE /api/invoice/batch/:batchId
**Delete all invoices from a batch**

**Auth**: Super Admin, Moderator

**Response:**
```json
{
  "success": true,
  "deletedCount": 95,
  "batchFilename": "REKAP_LABA.xls"
}
```

**Actions:**
1. Get batch info
2. Count invoices in batch
3. Delete all invoices with `excel_batch_id = batchId`
4. Update batch status to 'deleted'
5. Log to audit_logs

---

## 📖 User Guide

### Cara Menghapus Batch Upload

#### Step 1: Akses Halaman Riwayat
1. Login sebagai Super Admin atau Moderator
2. Klik menu **Sistem Invoice → Riwayat Upload**
3. Akan muncul daftar semua batch upload Excel

#### Step 2: Pilih Batch yang Mau Dihapus
1. Cari batch yang salah dari daftar
2. Perhatikan:
   - Nama file Excel
   - Tanggal upload
   - Jumlah invoice yang akan dihapus
   - Nama user yang upload

#### Step 3: Klik Tombol Hapus
1. Klik tombol merah **"Hapus"** di kolom Aksi
2. Akan muncul dialog konfirmasi pertama:
   ```
   ⚠️ PERINGATAN!
   
   Anda akan menghapus batch: "REKAP_LABA.xls"
   Jumlah invoice yang akan dihapus: 95
   
   Aksi ini TIDAK DAPAT DIBATALKAN!
   
   Apakah Anda yakin?
   ```
3. Klik **OK** untuk lanjut

#### Step 4: Konfirmasi Kedua
1. Akan muncul dialog konfirmasi kedua:
   ```
   Konfirmasi terakhir!
   
   95 invoice akan dihapus permanen.
   
   Lanjutkan?
   ```
2. Klik **OK** untuk konfirmasi akhir

#### Step 5: Verifikasi Hasil
1. Loading overlay muncul saat proses hapus
2. Setelah selesai, muncul alert:
   ```
   ✅ Batch berhasil dihapus!
   
   File: REKAP_LABA.xls
   Invoice dihapus: 95
   ```
3. Halaman auto-refresh
4. Batch hilang dari list

---

## 🔒 Security

### Permission Check
- Hanya **Super Admin** dan **Moderator** yang bisa:
  - Akses halaman `/invoice-batches.html`
  - Melihat list batches
  - Menghapus batch

### Double Confirmation
- **Konfirmasi pertama**: Warning tentang jumlah data
- **Konfirmasi kedua**: Final confirmation
- Mencegah accidental deletion

### Audit Log
Setiap delete batch tercatat di `audit_logs`:
```sql
{
  "user_id": "uuid",
  "action": "delete_invoice_batch",
  "context": "Deleted batch REKAP_LABA.xls with 95 invoices"
}
```

---

## ⚠️ Important Notes

### Yang Dihapus
- ✅ Semua invoice dengan `excel_batch_id = batchId`
- ✅ Status batch diupdate jadi 'deleted'
- ❌ Batch record TIDAK dihapus (untuk audit trail)

### Yang TIDAK Dihapus
- ❌ PDF files di Google Drive tetap ada
- ❌ Batch record tetap ada di database (status: deleted)
- ❌ Audit log tetap ada

### Tidak Bisa Di-undo
- ⚠️ **Penghapusan PERMANEN**
- ⚠️ **Tidak ada fitur undo/restore**
- ⚠️ Harus upload Excel lagi untuk restore data

---

## 🧪 Testing

### Test Case 1: View Batches
1. Login as Super Admin
2. Navigate to Riwayat Upload
3. Verify batches displayed correctly
4. Check statistics accurate

### Test Case 2: Delete Batch
1. Upload test Excel with 5 invoices
2. Go to Riwayat Upload
3. Find the batch
4. Click Delete
5. Confirm both dialogs
6. Verify:
   - Success message shows
   - Batch removed from list
   - Invoices deleted from invoice_file_list
   - Batch status = 'deleted'
   - Audit log created

### Test Case 3: Permission Check
1. Login as Admin Zona
2. Try to access `/invoice-batches.html`
3. Should be redirected or access denied

### Test Case 4: Cancel Delete
1. Click Delete button
2. Click Cancel on first dialog
3. Verify nothing deleted
4. Click Delete again
5. Click OK on first, Cancel on second
6. Verify nothing deleted

---

## 📊 Database Changes

### Table: excel_upload_batches
**New status value**: `deleted`

```sql
-- Batch setelah dihapus
UPDATE excel_upload_batches 
SET 
  status = 'deleted',
  error_log = 'Deleted by Admin Name at 2026-10-02T10:00:00Z'
WHERE id = 'batch-uuid';
```

### Table: invoice_file_list
**Cascade delete**: All invoices with matching batch_id

```sql
-- Semua invoice dari batch dihapus
DELETE FROM invoice_file_list 
WHERE excel_batch_id = 'batch-uuid';
```

---

## 🔍 Troubleshooting

### Issue: Batch tidak bisa dihapus
**Cause**: Permission denied

**Solution:**
1. Check user role
2. Must be super_admin or moderator
3. Check backend logs for error

### Issue: Delete terlalu lama
**Cause**: Batch besar (1000+ invoices)

**Solution:**
1. Wait for process to complete
2. Check database connections
3. Increase timeout if needed

### Issue: Batch hilang tapi invoice masih ada
**Cause**: Database transaction failed

**Solution:**
1. Check backend logs
2. Verify batch status in database
3. Manually delete invoices if needed:
```sql
DELETE FROM invoice_file_list 
WHERE excel_batch_id = 'batch-uuid';
```

---

## 🚀 Deployment

### Files Added
1. `invoice-batches.html` - Batch management page
2. `js/invoice-batches.js` - JavaScript handler
3. `BATCH_DELETE_FEATURE.md` - This documentation

### Files Modified
1. `backend/invoice-endpoints.js` - Added 2 new endpoints
2. `js/sidebar.js` - Added menu item

### No Migration Required
All uses existing tables. No database changes needed.

---

## 📝 Usage Scenarios

### Scenario 1: Wrong Excel Uploaded
**Problem**: Admin upload Excel bulan Oktober tapi harusnya September

**Solution:**
1. Go to Riwayat Upload
2. Find October batch
3. Delete batch
4. Upload correct September Excel

### Scenario 2: Duplicate Upload
**Problem**: Admin accidentally upload same Excel 2x

**Solution:**
1. Check Riwayat Upload
2. Find duplicate batch (all duplicates in stats)
3. Delete the duplicate batch

### Scenario 3: Test Data Cleanup
**Problem**: Need to clean test data before production

**Solution:**
1. Identify test batches by filename or date
2. Delete all test batches
3. Production ready

---

## 🎯 Future Enhancements

### Phase 2 (Optional)
1. **Restore Batch**: Undo delete within 24 hours
2. **Archive Instead of Delete**: Move to archive table
3. **Delete with PDF**: Option to also delete PDFs from GDrive
4. **Batch Comparison**: Compare 2 batches to find differences
5. **Export Batch Data**: Download batch info as CSV

---

## ✅ Summary

**What's New:**
- ✅ Riwayat Upload page to view all batches
- ✅ Delete batch button with double confirmation
- ✅ Delete all invoices from a batch at once
- ✅ Audit logging for batch deletion
- ✅ Permission-based access

**Benefits:**
- ✅ Easy cleanup of wrong uploads
- ✅ Remove duplicate batches
- ✅ Clean test data quickly
- ✅ Audit trail maintained
- ✅ Safe with double confirmation

**Menu Path:**
```
Sistem Invoice → Riwayat Upload
```

---

**Version**: 1.1.0  
**Date**: September 2026  
**Author**: Kiro AI Assistant
