# Testing Guide: Web Upload dengan Auto-Scanning ke Google Drive

## Overview
Fitur ini memungkinkan upload PDF via web dengan scanning otomatis:
1. **Scan nama file** untuk ekstrak: toko, nominal, jenis PPN/NON
2. **Auto-organize** ke folder Google Drive sesuai metadata
3. **Database insert** dengan metadata lengkap
4. **Auto-sync** akan detect file dan update dashboard

---

## Setup Sebelum Testing

### 1. Pastikan Backend Berjalan
```bash
cd arsipankanew-replit-source
node ./backend/server.js
```
Tunggu sampai output menunjukkan `✅ Backend listening on port 5000`

### 2. Pastikan Frontend Accessible
- Open: `http://localhost:8000` (atau port yang dikonfigurasi)
- Login dengan credentials: `moderator / null123`

---

## File Naming Convention untuk Upload

### Format Nama File yang Benar:
```
TOKO-NAME NOMINAL TIPE.pdf
```

### Contoh Valid:
```
BALARAJA 1.521.000 NON.pdf
CIANJUR 13.242.200 PPN.pdf
SERANG TIMUR 5.500.000 NON.pdf
PASARkemis 2.750.000 PPN.pdf
```

### Parsing Rules:
| Komponen | Pattern | Contoh | Hasil Parsing |
|----------|---------|--------|---------------|
| **Toko** | Text sebelum spasi & nominal | `BALARAJA 1.521.000` | toko-balaraja |
| **Nominal** | Digit dengan dot separator | `1.521.000` | Rp 1.521.000 |
| **Tipe** | PPN atau NON di akhir | `1.521.000 NON` | NON |

---

## Testing Steps

### Step 1: Buka Upload Modal
1. Login ke dashboard
2. Cari tombol **"+ UPLOAD"** di top menu
3. Klik untuk buka modal upload

### Step 2: Persiapkan File Test
Buat/download file PDF dengan nama salah satu dari contoh di bawah:

**Option A - NON Invoice (Zona 1, Toko Balaraja)**
```
Filename: BALARAJA 1.521.000 NON.pdf
Hasil Expected:
  - Toko: toko-balaraja
  - Nominal: Rp 1.521.000
  - Tipe: NON
  - Folder: /ARSIP ANKA/zona-1/toko-balaraja/INVOICE/NON/
  - Database: nama_file="BALARAJA 1.521.000 NON.pdf", tipe_ppn="NON", kategori="INVOICE"
```

**Option B - PPN Invoice (Zona 1, Toko Cianjur)**
```
Filename: CIANJUR 13.242.200 PPN.pdf
Hasil Expected:
  - Toko: toko-cianjur
  - Nominal: Rp 13.242.200
  - Tipe: PPN
  - Folder: /ARSIP ANKA/zona-1/toko-cianjur/INVOICE/PPN/
  - Database: nama_file="CIANJUR 13.242.200 PPN.pdf", tipe_ppn="PPN", kategori="INVOICE"
```

**Option C - Multiple Toko Names**
```
SERANG TIMUR 5.500.000 NON.pdf
PASARkemis 2.750.000 PPN.pdf
BITUNG 750.000 NON.pdf
```

### Step 3: Select File & Upload
1. Click **"Pilih File"** atau drag-drop file PDF
2. System akan show preview + metadata scanning results
3. Click **"UPLOAD"** button
4. Wait untuk progress bar selesai

### Step 4: Verify di Dashboard
After upload berhasil:

**Check 1: File muncul di list**
- Go to Dashboard
- Look for file baru di top of list
- Verify:
  - ✅ Filename correct (e.g., "BALARAJA 1.521.000 NON.pdf")
  - ✅ Category badge shows "Invoice Merah"
  - ✅ PPN/NON badge shows (e.g., "🟥 Invoice Merah • NON")
  - ✅ Nominal badge shows (e.g., "💰 Rp 1.521.000")
  - ✅ Zone shows (e.g., "📍 Zona 1")

**Check 2: Total counters updated**
- "Total Arsip Invoice" increased by 1
- "Total Pemakaian Storage" increased by file size

**Check 3: File dapat di-preview**
- Click eye icon pada file baru
- PDF harus display di modal
- Click download berfungsi

### Step 5: Verify di Google Drive
1. Open Google Drive
2. Navigate ke: `/ARSIP ANKA/zona-1/toko-balaraja/INVOICE/NON/`
3. Verify:
   - ✅ File ada di folder yang sesuai
   - ✅ Filename sesuai dengan yang di-upload
   - ✅ File size match

### Step 6: Check Database Record
File akan ter-insert ke database `files` table dengan:
```
- id: UUID (auto-generated)
- nama_file: "BALARAJA 1.521.000 NON.pdf"
- storage_path: "/arsip/zona-1/toko-balaraja/INVOICE/NON/BALARAJA 1.521.000 NON.pdf"
- zona_id: 1 (Zona 1)
- toko_id: <toko-balaraja-id>
- category: "INVOICE"
- tipe_ppn: "NON"
- ukuran_bytes: <file-size-in-bytes>
- status: "Unread"
- uploaded_by: <current-user-id>
- tanggal_dokumen: <today>
- created_at: <now>
```

---

## Expected Workflow Diagram

```
User Upload File
       ↓
Web Form (Dashboard)
       ↓
Scan Filename untuk:
├─ Toko (e.g., BALARAJA)
├─ Nominal (e.g., 1.521.000)
└─ Tipe (e.g., NON/PPN)
       ↓
Construct Google Drive Path:
/ARSIP ANKA/zona-X/toko-balaraja/INVOICE/[PPN|NON]/
       ↓
Upload to Google Drive
       ↓
Create Database Record
├─ nama_file
├─ storage_path
├─ kategori: INVOICE
├─ tipe_ppn: PPN or NON
└─ ... other metadata
       ↓
Return Success
       ↓
Frontend Refresh Dashboard
├─ Show new file in list
├─ Update "Total Arsip" count
└─ Update "Total Storage" GB
```

---

## Troubleshooting

### Issue 1: File tidak muncul di list setelah upload
**Possible Causes:**
- Upload belum complete (check progress bar)
- Auto-sync belum run (runs every 5 minutes)
- Refresh dashboard (hard refresh: Ctrl+F5)

**Solution:**
1. Wait 5-10 seconds
2. Manual refresh page: Ctrl+F5
3. Check backend logs untuk error messages
4. Wait max 5 minutes untuk auto-sync trigger

### Issue 2: File ada di Drive tapi tidak di database
**Cause:** Auto-sync hasn't run yet or path scanning failed

**Solution:**
1. Wait untuk auto-sync (every 5 minutes)
2. Check backend logs: `[GDriveSync]` messages
3. If path parsing failed, check filename format

### Issue 3: Filename parsing failed (nama_file format wrong)
**Cause:** Filename doesn't match expected format

**Correct Format:**
- Must have toko name + nominal + PPN/NON
- Example: `BALARAJA 1.521.000 NON.pdf`

**Wrong Formats:**
- `balaraja.pdf` ❌ (no nominal or tipe)
- `13.242.200 PPN.pdf` ❌ (no toko name)
- `BALARAJA PPN.pdf` ❌ (no nominal)

### Issue 4: File upload tapi folder di Drive salah
**Cause:** Toko name tidak dikenali atau zona mapping salah

**Check:**
1. Filename format correct?
2. Toko name di list yang valid?
3. Zona mapping correct di database?

**Test Toko Names:**
- toko-balaraja
- toko-cianjur
- toko-serang-timur
- toko-pasarkemis
- toko-bitung
- toko-cilegon
- toko-cipondoh
- toko-kutabumi
- toko-ciruas

---

## Verification Checklist

After upload dan auto-sync selesai, pastikan:

### Dashboard Display ✅
- [ ] File muncul di top of list
- [ ] Filename correct (tidak ada perubahan)
- [ ] Category badge: "Invoice Merah"
- [ ] PPN/NON badge: "PPN" atau "NON"
- [ ] Nominal badge: "Rp X.XXX.XXX"
- [ ] Zone badge: "Zona 1" (sesuai)
- [ ] Total Arsip counter increased
- [ ] Total Storage counter increased

### Google Drive ✅
- [ ] File ada di folder yang sesuai
- [ ] Path: `/ARSIP ANKA/zona-X/toko-name/INVOICE/[PPN|NON]/`
- [ ] Filename exact match

### Database ✅
- [ ] Record ter-insert ke `files` table
- [ ] nama_file sesuai
- [ ] storage_path format correct
- [ ] tipe_ppn correct (PPN atau NON)
- [ ] kategori: INVOICE
- [ ] zone_id correct
- [ ] toko_id ter-link

### Functionality ✅
- [ ] File dapat di-preview (eye icon)
- [ ] File dapat di-download (download icon)
- [ ] Metadata lengkap ter-display

---

## Performance Notes

**Upload Speed:**
- Typical PDF 1-2 MB: ~2-5 seconds upload
- Large PDF 5+ MB: May take 10-30 seconds

**Auto-Sync Timing:**
- Runs every 5 minutes
- After upload, wait max 5 minutes untuk file auto-detect
- Dashboard refresh otomatis setiap 1 menit (stats)

**Storage:**
- Each file cached locally untuk preview
- Cache automatically pruned after 7 days (configurable)

---

## Multiple File Upload Testing

Untuk test robustness, upload 3-5 files dengan berbeda toko/tipe:

```
Upload Queue:
1. BALARAJA 1.521.000 NON.pdf → /zona-1/toko-balaraja/INVOICE/NON/
2. CIANJUR 13.242.200 PPN.pdf → /zona-1/toko-cianjur/INVOICE/PPN/
3. SERANG TIMUR 5.500.000 NON.pdf → /zona-1/toko-serang-timur/INVOICE/NON/
4. PASARkemis 2.750.000 PPN.pdf → /zona-1/toko-pasarkemis/INVOICE/PPN/
5. BITUNG 750.000 NON.pdf → /zona-1/toko-bitung/INVOICE/NON/

Expected Result:
- Total Arsip: 5 files
- Total Storage: sum of all file sizes
- All files accessible with correct metadata
- All files in correct Google Drive folders
```

---

## Success Indicators

✅ **Test PASSED if:**
1. File upload berhasil (no error)
2. File appears di dashboard dalam 5 menit
3. File di Google Drive folder yang correct
4. Database record created dengan metadata correct
5. Counters (Total Arsip, Total Storage) updated
6. Preview dan download berfungsi
7. Auto-sync detect file tanpa manual trigger

❌ **Test FAILED if:**
1. File upload error
2. File tidak muncul di dashboard
3. File go to wrong Google Drive folder
4. Database record tidak ada atau metadata salah
5. Counters tidak update
6. Preview/download error
7. Auto-sync tidak detect file

---

## Next: If All Tests Pass

After successful upload testing:
1. ✅ System is ready for production use
2. ✅ Users dapat upload files dengan confidence
3. ✅ Automatic organization working correctly
4. ✅ Database accuracy verified
5. ✅ Dashboard showing real-time data

**Proceed to:** User training + Production deployment
