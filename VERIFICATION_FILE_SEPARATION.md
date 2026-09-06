# Verifikasi: Bukti Bayar dan Faktur Pajak Berbeda

## Status: ✅ SUDAH TERPISAH

Sistem sudah memastikan bahwa **bukti_bayar** dan **faktur_pajak** adalah file yang berbeda dan disimpan di lokasi berbeda.

---

## 1. Upload Path (TERPISAH)

### Bukti Bayar
- **Endpoint**: `POST /api/invoice/upload-document`
- **Folder GDrive**: `/ARSIPINVOICE/ARSIPINVOICE/YEAR/MONTH/DAY/**BUKTIBAYAR**/`
- **Contoh**: `/ARSIPINVOICE/ARSIPINVOICE/2026/SEPTEMBER/02/BUKTIBAYAR/835100311020926004.pdf`

### Faktur Pajak
- **Endpoint**: `POST /api/invoice/upload-faktur-pajak`
- **Folder GDrive**: `/ARSIPINVOICE/ARSIPINVOICE/YEAR/MONTH/DAY/**FAKTURPAJAK**/`
- **Contoh**: `/ARSIPINVOICE/ARSIPINVOICE/2026/SEPTEMBER/02/FAKTURPAJAK/tax-835100311020926004 PT ABC 1.000.000.pdf`

---

## 2. Database Columns (TERPISAH)

Table: `invoice_file_list`

| Kolom | Deskripsi | Upload By |
|-------|-----------|-----------|
| `invoice_pdf_path` | Path file invoice PDF | `/api/invoice/upload-pdf` |
| `bukti_bayar_path` | **Path file bukti bayar** | `/api/invoice/upload-document` |
| `faktur_pajak_path` | **Path file faktur pajak** | `/api/invoice/upload-faktur-pajak` |

Timestamp columns juga terpisah:
- `bukti_bayar_uploaded_at` - Waktu upload bukti bayar
- `faktur_pajak_uploaded_at` - Waktu upload faktur pajak

---

## 3. Download Endpoint (TERPISAH)

**Endpoint**: `GET /api/invoice/download-file/:faktur/:fileType`

Supported `fileType`:
- `invoice` → Ambil dari `invoice_pdf_path`
- `bukti_bayar` → Ambil dari `bukti_bayar_path`  ✅
- `faktur_pajak` → Ambil dari `faktur_pajak_path`  ✅

---

## 4. Combine PDF Endpoint (URUTAN BENAR)

**Endpoint**: `GET /api/invoice/combine-pdf/:faktur`

Urutan gabung file:
1. **BUKTI BAYAR** (dari `bukti_bayar_path`)
2. **INVOICE** (dari `invoice_pdf_path`)
3. **FAKTUR PAJAK** (dari `faktur_pajak_path`) - hanya untuk PPN

---

## 5. File Status Display

Frontend menampilkan status terpisah untuk setiap file:

```
PPN Invoice (3 files required):
✅ Invoice PDF: 1/3
✅ Bukti Bayar: 2/3
❌ Faktur Pajak: 0/3

NON PPN Invoice (2 files required):
✅ Invoice PDF: 1/2
✅ Bukti Bayar: 2/2
```

---

## Kesimpulan

✅ **Bukti Bayar** dan **Faktur Pajak** sudah sepenuhnya terpisah di:
- Upload path (folder berbeda di GDrive)
- Database columns (kolom berbeda)
- Download logic (logic berbeda)
- Combine logic (urutan berbeda)

**Tidak ada risiko file tercampur atau tertukar!**
