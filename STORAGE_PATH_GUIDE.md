# 📋 PANDUAN PATH FOLDER & FILE UPLOAD

## Struktur Folder di Google Drive (ARSIP ANKA)

```
ARSIP ANKA/
├── zona-1/
│   ├── TOKO-BALARAJA/
│   │   ├── INVOICE/
│   │   ├── INVOICE/PPN/
│   │   ├── INVOICE/NON/
│   │   ├── BUKTI PIUTANG/
│   │   └── ...
│   └── ...
├── zona-2/
├── zona-3/
└── ...
```

## Path File Menurut User

**User upload struktur berikut:**
1. Invoice PPN (Red): `/ARSIP ANKA/zona-1/toko-balaraja/INVOICE/PPN/file.pdf`
2. Invoice NON (Red): `/ARSIP ANKA/zona-1/toko-balaraja/INVOICE/NON/file.pdf`
3. Bukti Piutang: `/ARSIP ANKA/zona-1/toko-balaraja/BUKTI PIUTANG/file.pdf`

**Masalah**: Database punya struktur yang BERBEDA!

## Struktur Database yang Sebenarnya

Dari error log, zona yang dicari: `zona-1` (HURUF KECIL SEMUA)
Tapi folder di Google Drive: `zona-1`, `TOKO-BALARAJA` (UPPERCASE)

**Solusi Sementara:**
- ✅ Pakai folder dengan struktur: `zona-1/TOKO-BALARAJA/CATEGORY/`
- ✅ Category bisa: `INVOICE`, `BUKTI_PIUTANG`, `PPN`, `NON`, dll
- ✅ Auto-sync akan detect dan insert otomatis

## Path Benar untuk Upload:

### ✅ Invoice (PPN dan NON digabung dalam INVOICE)
```
/ARSIP ANKA/zona-1/TOKO-BALARAJA/INVOICE/PPN_Invoice_001.pdf
/ARSIP ANKA/zona-1/TOKO-BALARAJA/INVOICE/NON_Invoice_002.pdf
```

### ✅ Bukti Piutang / Bukti Pembayaran
```
/ARSIP ANKA/zona-1/TOKO-BALARAJA/BUKTI_PIUTANG/bukti_001.pdf
```

### ✅ Kategori Lain
```
/ARSIP ANKA/zona-1/TOKO-BALARAJA/PPN/file.pdf
/ARSIP ANKA/zona-1/TOKO-BALARAJA/NON/file.pdf
```

## Current Status

**Files Detected**: 2 PDF ditemukan di Google Drive  
**File Path Format**: Unknown (zona-1 not in database)

**Action**: 
1. Check zona code yang ada di database
2. Pastikan folder menggunakan zona code yang benar
3. Auto-sync akan automatically detect & insert

## Bagaimana Auto-Sync Bekerja:

1. **Setiap 5 menit**: Backend scan folder `/ARSIP ANKA/`
2. **Parse path**: Extract `zona/toko/category/filename`
3. **Validasi**: Check zona & toko exist di database
4. **Insert**: Tambah ke database jika belum ada
5. **Status**: `Unread` otomatis
6. **Dashboard**: File muncul otomatis setelah insert

## Mapel Database ↔ Storage

```
Storage Path:     /arsip/zona-1/TOKO-BALARAJA/INVOICE/file.pdf
├─ Parsed:
│  ├─ zona_kode: "zona-1" 
│  ├─ toko_kode: "TOKO-BALARAJA"
│  ├─ category: "INVOICE"
│  └─ filename: "file.pdf"
│
├─ Lookup:
│  ├─ zona_id: (look in zonas table by kode)
│  └─ toko_id: (look in toko table by zona_id + kode)
│
└─ Insert:
   ├─ nama_file: "file.pdf"
   ├─ storage_path: "/arsip/zona-1/TOKO-BALARAJA/INVOICE/file.pdf"
   ├─ zona_id: [from lookup]
   ├─ toko_id: [from lookup, can be null]
   ├─ category: "INVOICE"
   ├─ ukuran_bytes: [file size]
   ├─ status: "Unread"
   └─ uploaded_by: [system user]
```

## Troubleshooting

### ❌ "Zona not found: zona-1"
**Penyebab**: Zona `zona-1` tidak ada di tabel `zonas` database
**Solusi**: 
1. Check nama zona yang benar di database
2. Atau buat zona di database jika belum ada
3. Gunakan zona_kode yang sesuai di path folder

### ❌ "2 PDF files found, 0 new"
**Penyebab**: File sudah ada di database (duplicate check)
**Solusi**: Rename file atau hapus dari database

### ✅ "Complete: 2 new, 0 existing"
**Status**: File sukses di-insert! Check dashboard untuk lihat

## Next Steps

1. **Verify zonas di database** - gunakan tools untuk check
2. **Upload files ke folder benar** - pastikan path sesuai
3. **Wait atau manual trigger** - auto-sync setiap 5 menit
4. **Check dashboard** - files muncul dengan metadata benar

---

**Status**: Auto-sync working, waiting for correct zona/toko setup
**Error**: Zona code mismatch - perlu verifikasi database zonas

