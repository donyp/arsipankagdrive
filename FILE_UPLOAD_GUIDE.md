# 📋 PANDUAN UPLOAD FILE KE GOOGLE DRIVE

## 🎯 STRUKTUR FOLDER YANG BENAR

**Database memiliki zona dengan leading zero (01, 02, 03, bukan 1, 2, 3)**

### Available Zonas di Database:
```
zona-01    (= zona 1)
zona-02    (= zona 2)
zona-03a   (= zona 3A)
zona-03b   (= zona 3B)
zona-04    (= zona 4)
zona-05    (= zona 5)
zona-06a   (= zona 6A)
zona-06b   (= zona 6B)
zona-07, zona-08, zona-09, zona-10
zona-11, zona-12, zona-13, zona-14
zona-15, zona-16, zona-17
zona-99    (Khusus)
```

## ✅ PATH FOLDER UNTUK UPLOAD

### Format Umum:
```
/ARSIP ANKA/[ZONA]/[TOKO]/[CATEGORY]/file.pdf
```

### Contoh Untuk Balaraja (Zona 1):
```
/ARSIP ANKA/zona-01/TOKO-BALARAJA/INVOICE/PPN_Invoice_001.pdf
/ARSIP ANKA/zona-01/TOKO-BALARAJA/INVOICE/NON_Invoice_002.pdf
/ARSIP ANKA/zona-01/TOKO-BALARAJA/BUKTI_PIUTANG/bukti_001.pdf
```

### ❌ JANGAN Pakai:
```
❌ /ARSIP ANKA/zona-1/...       (zona-1 tidak ada - harus zona-01)
❌ /ARSIP ANKA/zona-1/...       (zona-1 tidak ada - harus zona-01)
```

### ✅ YANG BENAR:
```
✅ /ARSIP ANKA/zona-01/TOKO-BALARAJA/INVOICE/file.pdf
✅ /ARSIP ANKA/zona-01/TOKO-BALARAJA/BUKTI_PIUTANG/file.pdf
```

## 📁 KATEGORI FILE YANG DIDUKUNG

Gunakan category sesuai kebutuhan (semua UPPERCASE):
- `INVOICE` - Invoice umum
- `PPN` - Invoice dengan PPN
- `NON` - Invoice tanpa PPN
- `BUKTI_PIUTANG` - Bukti pembayaran/piutang
- `PIUTANG` - Data piutang
- Dan category lain sesuai kebutuhan

## 🚀 CARA UPLOAD STEP-BY-STEP

### Step 1: Buka Google Drive
- Masuk ke Google Drive account Anda
- Buka folder: **ARSIP ANKA**

### Step 2: Navigate ke Zona Folder
Contoh untuk zona-01:
```
ARSIP ANKA/
└── zona-01/
```

### Step 3: Check/Create Toko Folder
```
zone-01/
└── TOKO-BALARAJA/
```

### Step 4: Check/Create Category Folder
```
TOKO-BALARAJA/
├── INVOICE/
├── BUKTI_PIUTANG/
└── ...
```

### Step 5: Upload PDF File
Setelah folder structure ready, upload PDF ke category folder

**Contoh lengkap:**
- **Path**: `/ARSIP ANKA/zona-01/TOKO-BALARAJA/INVOICE/`
- **File**: `PPN_Balaraja_500000_26Aug.pdf`
- **Result**: `/ARSIP ANKA/zona-01/TOKO-BALARAJA/INVOICE/PPN_Balaraja_500000_26Aug.pdf`

## ⏱️ AUTO-SYNC BEHAVIOR

Setelah file diupload ke Google Drive:

1. **Immediately** (dalam beberapa detik):
   - Rclone akan "see" file di Google Drive

2. **Within 5 minutes** (auto-sync trigger):
   - Backend scan folder `/ARSIP ANKA/`
   - Detect file baru
   - Extract metadata dari path folder
   - Validate zona & toko exist
   - Insert ke database dengan status `Unread`

3. **Dashboard** (real-time refresh):
   - File muncul di file list
   - Storage counter update
   - Metadata sudah populated dari path

## 🔍 VERIFICATION SETELAH UPLOAD

### Option A: Tunggu 5 Menit
Backend auto-scan setiap 5 menit, file akan muncul otomatis

### Option B: Trigger Manual Sync
```bash
# Dari terminal atau curl:
curl -X POST http://localhost:5000/api/sync/gdrive \
  -H "Authorization: Bearer [YOUR_TOKEN]" \
  -H "Content-Type: application/json"
```

### Option C: Check Backend Logs
Lihat terminal backend untuk verify:
```
[GDriveSync] Found 2 PDF files in ARSIP ANKA
[GDriveSync] ✅ Inserted: zona-01/TOKO-BALARAJA/INVOICE/file.pdf
[GDriveSync] Complete: 2 new, 0 existing
```

## 📊 METADATA AUTO-EXTRACTION

Ketika file di-insert, metadata di-extract otomatis dari PATH:

```
Path: /arsip/zona-01/TOKO-BALARAJA/INVOICE/file.pdf
      ↓ Parse
├─ nama_file: "file.pdf"
├─ storage_path: "/arsip/zona-01/TOKO-BALARAJA/INVOICE/file.pdf"
├─ zona_id: [lookup dari zona-01] 
├─ toko_id: [lookup dari TOKO-BALARAJA]
├─ category: "INVOICE"
├─ ukuran_bytes: [real file size]
├─ status: "Unread"
└─ created_at: [now]
```

## ✨ BENEFITS AUTO-SYNC

✅ **No manual data entry** - Metadata dari folder path  
✅ **Real-time detection** - Scan setiap 5 menit  
✅ **Validation built-in** - Zona & toko di-validate  
✅ **Duplicate prevention** - Sama file tidak di-insert 2x  
✅ **Dashboard sync** - Muncul otomatis setelah sync  
✅ **Mobile friendly** - Upload di mobile, detect di web  

## ⚠️ COMMON MISTAKES

### ❌ Zona Format Salah
```
❌ /ARSIP ANKA/zona-1/...         (WRONG - should be zona-01)
❌ /ARSIP ANKA/zona1/...          (WRONG - missing hyphen)
❌ /ARSIP ANKA/Zona-01/...        (WRONG - uppercase)
✅ /ARSIP ANKA/zona-01/...        (CORRECT)
```

### ❌ Toko Format Salah
```
❌ /ARSIP ANKA/zona-01/balaraja/...     (WRONG - missing prefix & uppercase)
❌ /ARSIP ANKA/zona-01/Balaraja/...     (WRONG - case sensitive)
✅ /ARSIP ANKA/zona-01/TOKO-BALARAJA/...  (CORRECT - matches database)
```

### ❌ Category Format Salah
```
❌ /ARSIP ANKA/zona-01/TOKO-BALARAJA/invoice/...    (WRONG - lowercase)
❌ /ARSIP ANKA/zona-01/TOKO-BALARAJA/Invoice/...    (WRONG - case)
✅ /ARSIP ANKA/zona-01/TOKO-BALARAJA/INVOICE/...    (CORRECT)
```

## 🆘 TROUBLESHOOTING

### Problem: File tidak muncul di dashboard setelah 5 menit

**Check 1: Zona Code**
- File di `/ARSIP ANKA/zona-1/...`?
- **Fix**: Ganti ke `/ARSIP ANKA/zona-01/...` (dengan leading zero)

**Check 2: Path Structure**
- Missing folder layers?
- **Fix**: Pastikan `ZONA/TOKO/CATEGORY/FILE` lengkap

**Check 3: Toko Name**
- Toko tidak ada di database?
- **Fix**: File tetap insert dengan `toko_id=null`, tapi file muncul

**Check 4: Backend Logs**
- Check terminal backend untuk error message
- Lihat line: `[GDriveSync] Found X PDF files`
- Lihat line: `[GDriveSync] Complete: Y new, Z existing`

### Problem: File muncul tapi toko kosong (null)

**Penyebab**: Toko tidak ada di database  
**Solusi**: 
1. File tetap bisa di-view & download
2. Atau tambah toko ke database master

### Problem: Auto-sync not working

**Check**:
1. Backend running? → Lihat logs
2. Google Drive connected? → Backend logs: "Google Drive ✅ Connected"
3. Zona code benar? → Check error log "Zona not found"

**Fix**:
- Restart backend
- Check Google Drive permissions
- Verify rclone config

## 📞 NEXT STEPS

1. **Upload test file** ke `/ARSIP ANKA/zona-01/TOKO-BALARAJA/INVOICE/`
2. **Wait 5 menit** atau trigger manual sync
3. **Check dashboard** - file harusnya muncul
4. **Verify metadata** - zona, toko, category correct
5. **Download/preview** - test file operations

---

**Status**: Auto-sync ready and working ✅  
**Sync Interval**: Every 5 minutes  
**Last Sync**: Check backend logs  
**Files Detected**: 2 (waiting for correct zona code)

🚀 **Upload file dengan zona-01 (bukan zona-1) dan sync akan work!**

