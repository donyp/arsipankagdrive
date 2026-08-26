# Google Drive - Struktur Folder

**Total Folders**: 49  
**Status**: ✅ Connected via rclone  
**Last Updated**: August 25, 2026

---

## 📂 Daftar Folder di Google Drive Root

Berdasarkan listing dari rclone, berikut adalah folder yang tersedia:

### Produk & Barang (Product Categories)
1. 📁 **1** (Folder numerik)
2. 📁 **ALL PRODUCT** - Semua produk
3. 📁 **ANKA** 
4. 📁 **ARSIP ANKA** - Arsip utama Anka
5. 📁 **BATU GERINDA** - Batu gerinda/batu asah
6. 📁 **BATU GERINDA ELLIP IRON NEW** - Batu gerinda tipe baru
7. 📁 **BATU GERINDA MEGA TOOLS** - Koleksi Mega Tools
8. 📁 **BOOKLET** - Buku panduan/brosur
9. 📁 **COVER REELS** - Penutup gulungan
10. 📁 **DUBBING** - Dubbing/penyiaran
11. 📁 **FILE RAGAT 2 TAK** - File kategori khusus
12. 📁 **FOOTAGE** - Video/footage
13. 📁 **Foto** - Folder foto
14. 📁 **ICON & LOGO** - Ikon dan logo
15. 📁 **INDOBUILDTECH 2026** - Pameran/event 2026
16. 📁 **MEGA TOOLS** - Koleksi alat Mega
17. 📁 **MEGA TOOLS ALFA** - Varian Mega Tools
18. 📁 **REELS** - Gulungan/spool
19. 📁 **SUPER THIN ELLIP IRON** - Batu tipis khusus
20. 📁 **a** (Folder single char)
21. 📁 **b** (Folder single char)
22. 📁 **banner** - Banner/spanduk
23. 📁 **pdf** - Folder PDF
24. 📁 **recap rafi** - Ringkasan/recap
25. 📁 **revisi** - Revisi/perbaikan

---

## 📊 Kategori Folder

### Dokumen & File
- 📁 pdf
- 📁 BOOKLET
- 📁 FOOTAGE
- 📁 FILE RAGAT 2 TAK

### Media & Desain
- 📁 Foto
- 📁 ICON & LOGO
- 📁 banner
- 📁 COVER REELS
- 📁 REELS

### Produk
- 📁 BATU GERINDA
- 📁 BATU GERINDA ELLIP IRON NEW
- 📁 BATU GERINDA MEGA TOOLS
- 📁 MEGA TOOLS
- 📁 MEGA TOOLS ALFA
- 📁 SUPER THIN ELLIP IRON
- 📁 ALL PRODUCT

### Organisasi/Admin
- 📁 ANKA
- 📁 ARSIP ANKA
- 📁 INDOBUILDTECH 2026
- 📁 recap rafi
- 📁 revisi
- 📁 DUBBING

### Lainnya
- 📁 a, b, 1 (Folder pendek)

---

## 🔍 Cara Akses Folder

### Via Rclone CLI
```bash
# List semua folder di root
rclone lsd gdrive:/

# List file dalam folder tertentu
rclone ls gdrive:/pdf
rclone ls gdrive:/Foto

# Tree view (hierarchical)
rclone tree gdrive:/ -L 2
```

### Via Backend API
Setelah backend running, endpoint untuk list files:
```
GET /api/files/list/{zona}
```

### Via Google Drive Web UI
Buka: https://drive.google.com/drive/home

---

## 💾 Storage Info

| Metrik | Nilai |
|--------|-------|
| Free Tier | 15 GB |
| Folders | ~25+ (dari root) |
| Files | 49+ (diindeks rclone) |
| Last Sync | August 25, 2026 |
| Status | ✅ Connected |

---

## ⚠️ Catatan Penting

1. **Encoding Issue**: Beberapa folder name menunjukkan encoding UTF-8 corruption di terminal
   - Ini adalah display issue saja, data di Google Drive normal
   - Rclone menangani dengan baik

2. **Folder Structure**: Folder dibuat berdasarkan kebutuhan bisnis
   - Gunakan konsisten untuk organisasi baru

3. **Backup**: Semua folder ini tersinkronisasi via rclone
   - Backup ke B2 atau Storj bisa diatur jika diperlukan

---

## 🔄 Sync Status

✅ Google Drive Connected  
✅ Rclone Configured  
✅ Cache Enabled (2GB)  
✅ Fast List Enabled  
✅ Auto Sync Ready  

---

## 📈 Rekomendasi

1. **Organisasi**: Pertimbangkan untuk reorganisasi folder yang lebih terstruktur
   - Buat folder zona (ZONA-1, ZONA-2, dll)
   - Buat subfolder toko dalam setiap zona
   - Gunakan kategori standar (INVOICE, PPN, NON_PPN, PIUTANG)

2. **Struktur Ideal**:
   ```
   gdrive:/
   ├── ZONA-1/
   │   ├── TOKO-BANDUNG/
   │   │   ├── INVOICE/
   │   │   ├── PPN/
   │   │   ├── NON_PPN/
   │   │   └── PIUTANG/
   │   ├── TOKO-CIANJUR/
   │   └── ...
   ├── ZONA-2/
   └── BACKUP/
   ```

3. **Migration**: Jika ingin reorganisasi:
   - Gunakan rclone move untuk transfer folder
   - Update database reference (Supabase)
   - Test dengan staging terlebih dahulu

---

**Last Generated**: August 25, 2026  
**Connection**: ✅ Active  
**Status**: Ready for production
