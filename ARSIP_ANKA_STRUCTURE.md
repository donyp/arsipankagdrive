# ARSIP ANKA - Struktur & Panduan Migration

**Status**: ✅ Ready untuk migration file PDF  
**Lokasi**: `gdrive:/ARSIP ANKA/`  
**Purpose**: Storage untuk invoice & dokumen merah per zona-toko  
**Last Updated**: August 25, 2026

---

## 📂 Struktur Folder di ARSIP ANKA

```
ARSIP ANKA/
├── zona-1/
│   ├── TOKO-BANDUNG/
│   │   ├── INVOICE/
│   │   ├── PPN/
│   │   ├── NON_PPN/
│   │   └── PIUTANG/
│   ├── TOKO-CIANJUR/
│   │   ├── INVOICE/
│   │   ├── PPN/
│   │   ├── NON_PPN/
│   │   └── PIUTANG/
│   ├── TOKO-SUBANG/
│   └── ... (toko lainnya)
│
├── zona-2/
│   ├── TOKO-SUMEDANG/
│   ├── TOKO-TASIKMALAYA/
│   └── ... (toko zona-2)
│
├── zona-3/
│   └── ... (toko zona-3)
│
└── ... (zona lainnya)
```

---

## 📊 Kategori Dokumen per Toko

Setiap toko memiliki 4 subfolder:

| Folder | Singkatan | Keterangan |
|--------|-----------|-----------|
| **INVOICE** | INV | Invoice & bukti transaksi |
| **PPN** | PPN | Dokumen dengan PPN (Pajak Pertambahan Nilai) |
| **NON_PPN** | NPPN | Dokumen tanpa PPN |
| **PIUTANG** | PTG | Dokumen piutang / hutang |

---

## 🔄 Panduan Migration File PDF

### Persiapan

1. **Inventaris file PDF lama**
   ```bash
   # List semua file di folder lama
   ls -la /path/to/old/pdfs
   ```

2. **Grup by toko name**
   - Identifikasi nama toko dari filename
   - Kategorikan ke INVOICE, PPN, NON_PPN, PIUTANG

### Metode 1: Manual Copy via Web UI

1. Buka [Google Drive](https://drive.google.com/drive/home)
2. Navigate ke `ARSIP ANKA/zona-X/TOKO-XXX/[KATEGORI]/`
3. Upload file PDF sesuai kategori
4. Verify upload selesai

### Metode 2: Batch Upload via Rclone

```bash
# Upload semua file dari folder lokal ke ARSIP ANKA
rclone copy /local/path/to/pdfs/ gdrive:/ARSIP\ ANKA/zona-1/TOKO-BANDUNG/INVOICE/ --progress

# Contoh struktur lokal yang cocok:
# local/
# ├── zona-1/
# │   ├── TOKO-BANDUNG/
# │   │   ├── INVOICE/
# │   │   ├── PPN/
# │   │   ├── NON_PPN/
# │   │   └── PIUTANG/
# │   └── ...
# └── zona-2/
#     └── ...

# Command:
rclone copy ./local/ gdrive:/ARSIP\ ANKA/ --progress --dry-run

# Tanpa --dry-run untuk upload sungguhan:
rclone copy ./local/ gdrive:/ARSIP\ ANKA/ --progress
```

### Metode 3: Via Backend API

Setelah backend fully integrated, akan ada endpoint:
```
POST /api/files/upload
```

Parameter:
- `file`: File PDF
- `zona`: zona-1, zona-2, etc
- `toko`: TOKO-BANDUNG, TOKO-CIANJUR, etc
- `category`: INVOICE, PPN, NON_PPN, PIUTANG

---

## ✅ Checklist Migration

- [ ] **Prepare files**: Inventaris semua file PDF lama
- [ ] **Group by toko**: Kelompokkan per nama toko
- [ ] **Create folders**: Pastikan struktur zona-toko sudah ada di ARSIP ANKA
- [ ] **Upload batch 1**: Test dengan toko kecil dulu
- [ ] **Verify in DB**: Update database references
- [ ] **Test API**: Pastikan file bisa diakses via API
- [ ] **Upload batch 2**: Lanjut toko berikutnya
- [ ] **Final verification**: Semua file terupload dengan benar
- [ ] **Archive old files**: Simpan file lama sebagai backup
- [ ] **Update documentation**: Dokumentasi struktur final

---

## 🔍 Verifikasi Upload

### Via Rclone
```bash
# List file yang sudah diupload
rclone ls gdrive:/ARSIP\ ANKA/zona-1/TOKO-BANDUNG/INVOICE/

# Count file per kategori
rclone lsd gdrive:/ARSIP\ ANKA/zona-1/TOKO-BANDUNG/

# Tree view
rclone tree gdrive:/ARSIP\ ANKA/zona-1/ -L 2
```

### Via Google Drive Web UI
1. Buka folder zona-toko
2. Verifikasi file sudah ada
3. Cek tanggal upload

### Via Backend API (Setelah live)
```bash
curl http://localhost:5000/api/files/list/zona-1
```

---

## 🛠️ Tips & Tricks

### Upload Besar (>500MB)
Gunakan rclone dengan chunk size besar:
```bash
rclone copy ./local/ gdrive:/ARSIP\ ANKA/ \
  --transfers 4 \
  --checkers 8 \
  --chunk-size 32M \
  --progress
```

### Dry Run (Test tanpa upload)
```bash
rclone copy ./local/ gdrive:/ARSIP\ ANKA/ --dry-run
```
Lihat apa yang akan di-upload tanpa benar-benar upload.

### Resume Upload yang gagal
```bash
rclone copy ./local/ gdrive:/ARSIP\ ANKA/ \
  --retries 3 \
  --low-level-retries 10 \
  --progress
```

### Monitoring Progress
```bash
# Real-time monitoring
rclone copy ./local/ gdrive:/ARSIP\ ANKA/ \
  --progress \
  --stats 10s
```

---

## 📋 Database Integration

Setelah file diupload ke Google Drive, update database:

### Tabel: files
```sql
UPDATE files 
SET storage_path = 'gdrive:/ARSIP ANKA/zona-X/TOKO-XXX/CATEGORY/filename.pdf'
WHERE old_path = 'old/path/filename.pdf'
```

### Tabel: storage_sync_status
Status akan otomatis di-update oleh backend:
```json
{
  "storagePath": "/arsip/zona-1/TOKO-BANDUNG/INVOICE/file.pdf",
  "primaryStatus": "synced",
  "syncAttempts": 1,
  "lastSyncTime": "2026-08-25T10:30:00Z"
}
```

---

## ⚠️ Penting

1. **Backup file lama**: Jangan hapus file lama sebelum migration 100% selesai
2. **Verify structure**: Pastikan zona & toko sudah ada di ARSIP ANKA
3. **Test kecil dulu**: Upload beberapa file test sebelum batch upload
4. **Monitor quota**: Pastikan Google Drive punya space cukup (15GB free tier)
5. **Naming consistency**: Gunakan naming convention yang sama

---

## 🚀 Timeline Rekomendasi

- **Week 1**: Setup & test (upload 5-10 file)
- **Week 2**: Batch 1 migration (zona-1)
- **Week 3**: Batch 2 migration (zona-2)
- **Week 4**: Batch 3 migration (zona-3)
- **Week 5**: Verification & cleanup

---

## 📞 Troubleshooting

### Error: "not found" saat copy
```
Solusi: Pastikan folder zona-toko sudah ada di ARSIP ANKA
rclone mkdir gdrive:/ARSIP\ ANKA/zona-1/TOKO-BANDUNG/INVOICE/
```

### Error: "quota exceeded"
```
Solusi: Hapus file temporary atau upgrade storage
rclone purge gdrive:/ARSIP\ ANKA/.cache
```

### Error: "authentication failed"
```
Solusi: Refresh token OAuth
rclone authorize drive gdrive
```

---

## ✨ Setelah Migration Selesai

1. ✅ Semua file PDF sudah di ARSIP ANKA
2. ✅ Database references sudah updated
3. ✅ API bisa list file per zona-toko
4. ✅ Backend bisa preview & download file
5. ✅ Backup ke B2/Storj (optional)

---

**Generated**: August 25, 2026  
**Status**: ✅ Ready for migration  
**Next Action**: Start file inventory & grouping
