# New Filename Format dengan Date Detection

## Format Baru
```
TIPE TOKO NOMINAL TANGGAL.pdf
```

## Contoh Valid

### Format 1: Tipe + Toko + Nominal + Tanggal (DD MMM)
```
NON Balaraja 1.140.000 30 Mei.pdf
PPN Cianjur 13.242.200 15 Agustus.pdf
NON Serang Timur 5.500.000 28 Februari.pdf
```

### Format 2: Tanggal dengan Nomor Bulan
```
NON Balaraja 1.140.000 30/05.pdf
PPN Cianjur 13.242.200 15/08.pdf
NON Balaraja 1.140.000 30-05.pdf
```

### Format 3: Tanggal Lengkap dengan Tahun
```
NON Balaraja 1.140.000 30/05/2026.pdf
PPN Cianjur 13.242.200 15/08/2026.pdf
NON Balaraja 1.140.000 30-05-2026.pdf
```

### Format 4: ISO Format (YYYY-MM-DD)
```
NON Balaraja 1.140.000 2026-05-30.pdf
PPN Cianjur 13.242.200 2026-08-15.pdf
```

---

## Parsing Rules

### Komponen 1: TIPE (PPN/NON)
- **Position**: Awal filename
- **Values**: PPN atau NON (case-insensitive)
- **Examples**: `NON`, `non`, `PPN`, `ppn`
- **Impact**: Set `tipe_ppn` di database

### Komponen 2: TOKO
- **Position**: Setelah TIPE
- **Pattern**: Text sebelum nominal pertama
- **Examples**: 
  - `Balaraja` → `toko-balaraja`
  - `Serang Timur` → `toko-serang-timur`
  - `PASARkemis` → `toko-pasarkemis`
- **Impact**: Determine folder di Drive + link ke toko_id

### Komponen 3: NOMINAL
- **Pattern**: Digit dengan dot separator (1.XXX.XXX) atau plain numbers
- **Examples**:
  - `1.140.000` → Rp 1.140.000
  - `13.242.200` → Rp 13.242.200
  - `750000` → Rp 750.000
- **Impact**: Set nominal value di database + display di badge

### Komponen 4: TANGGAL (NEW!)
- **Pattern**: Support multiple formats
- **Examples**:
  - `30 Mei` → 2026-05-30 (current year assumed)
  - `30/05` → 2026-05-30
  - `30-05-2026` → 2026-05-30
  - `2026-05-30` → 2026-05-30
- **Supported Months**: JAN, FEB, MAR, APR, MEI, JUN, JUL, AGU/AUG, SEP, OKT, NOV, DES (ID & EN)
- **Impact**: Set `tanggal_dokumen` di database + display di badge (prioritas terhadap upload date)

---

## Dashboard Display dengan New Format

Ketika file ter-upload dengan format baru:

```
🟥 Invoice Merah • NON
Balaraja 1.140.000 30 Mei.pdf
─────────────────────────────────
📁 Invoice Merah • NON
💰 Rp 1.140.000
📍 Zona 1
📅 30 Mei        ← Date from filename, NOT upload date!
```

**Key Difference**: 
- **Before**: 📅 Badge showed upload date (tanggal saat di-upload)
- **After**: 📅 Badge shows document date (tanggal dari nama file)

---

## Upload Workflow dengan Date Detection

```
User Upload File
       ↓
Filename: "NON Balaraja 1.140.000 30 Mei.pdf"
       ↓
Web Form Scanning:
├─ Tipe: NON
├─ Toko: Balaraja
├─ Nominal: 1.140.000
└─ Date: 30 Mei (2026) → 2026-05-30
       ↓
Backend Processing:
├─ Verify all components parsed
├─ Build Google Drive path
│  └─ /ARSIP ANKA/zona-1/toko-balaraja/INVOICE/NON/
├─ Upload to Drive
└─ Insert to Database:
   ├─ nama_file: "Balaraja 1.140.000 30 Mei.pdf"
   ├─ category: INVOICE
   ├─ tipe_ppn: NON
   ├─ tanggal_dokumen: 2026-05-30  ← From filename!
   └─ ukuran_bytes: <size>
       ↓
Frontend Display:
├─ Show file in list
├─ Badge shows "30 Mei" (from tanggal_dokumen)
├─ Update counters
└─ Auto-sync will detect & maintain date
```

---

## Special Cases & Edge Cases

### Case 1: Date dengan Tahun Berbeda
```
NON Balaraja 1.140.000 30/05/2025.pdf
→ tanggal_dokumen: 2025-05-30
→ Badge: 30 Mei
```

### Case 2: Multiple Spaces di Toko Name
```
NON Serang  Timur  1.140.000 30 Mei.pdf
→ Toko: "Serang Timur" (spaces normalized)
→ Folder: /toko-serang-timur/
```

### Case 3: Case-Insensitive Tipe
```
non Balaraja 1.140.000 30 Mei.pdf
ppn Cianjur 13.242.200 15 Agustus.pdf
→ Both work fine (case-insensitive)
```

### Case 4: Filename Tanpa Tanggal (Fallback)
```
NON Balaraja 1.140.000.pdf
→ tanggal_dokumen: <today's date>
→ Badge: <today> (fallback)
```

### Case 5: Invalid Date Format (Ignored)
```
NON Balaraja 1.140.000 99 Mei.pdf
→ Date parsing fails (99 is invalid)
→ tanggal_dokumen: <today's date>
→ Badge: <today>
```

---

## Valid Toko Names di System

System akan recognize toko names:
- toko-balaraja
- toko-cianjur
- toko-serang-timur / toko-serang timur
- toko-pasarkemis
- toko-bitung
- toko-cilegon
- toko-cipondoh
- toko-kutabumi
- toko-ciruas

**Parsing**: Toko name akan di-normalize:
- Spaces → hyphens
- Lowercase
- Exact match di database

---

## Testing Checklist

✅ **Before Upload**:
- [ ] Filename format correct: `TIPE TOKO NOMINAL TANGGAL.pdf`
- [ ] TIPE is PPN or NON
- [ ] TOKO name valid (one of the list above)
- [ ] NOMINAL has dot separator (e.g., 1.140.000)
- [ ] TANGGAL is readable (30 Mei, 30/05, 2026-05-30, etc.)

✅ **After Upload**:
- [ ] File appears di dashboard
- [ ] Filename correct (no changes)
- [ ] Category badge: "Invoice Merah"
- [ ] PPN/NON badge: correct type
- [ ] Nominal badge: "Rp X.XXX.XXX"
- [ ] Date badge: **Shows date from filename, NOT upload date**
- [ ] Zone badge: "Zona 1"

✅ **In Database**:
- [ ] tanggal_dokumen: Set to parsed date from filename
- [ ] tipe_ppn: Set correctly
- [ ] File in correct Google Drive folder

✅ **In Google Drive**:
- [ ] File at: `/ARSIP ANKA/zona-1/toko-name/INVOICE/[PPN|NON]/`
- [ ] Filename exact match

---

## Troubleshooting

### Problem: Date not showing correctly
**Check**:
1. Date format in filename is valid
2. Month name spelled correctly (MEI, FEB, etc.)
3. Day number is valid (1-31)

**Solution**: Try different format:
- `30 Mei` → `30/05` → `30-05-2026`

### Problem: Date shows upload date instead of filename date
**Cause**: Date extraction failed, fallback to today

**Solution**:
1. Check filename format
2. Check date parsing logs in backend
3. Re-upload with clearer date format

### Problem: Toko name not recognized
**Cause**: Toko name doesn't match database or invalid spelling

**Solution**:
1. Use exact toko name from valid list
2. Check spelling
3. Use format: `TOKE NAME NOMINAL DATE`

---

## Impact Summary

### What Changed
1. ✅ Filename now includes date
2. ✅ Date auto-extracted from filename
3. ✅ Dashboard badge shows file date (not upload date)
4. ✅ Database stores date from filename in `tanggal_dokumen`
5. ✅ Auto-sync also respects filename date

### What Stays Same
- ✅ Upload process
- ✅ Google Drive organization
- ✅ Database schema (tanggal_dokumen already exists)
- ✅ Dashboard display (just prioritizes correct date now)
- ✅ File preview & download

### Benefits
- 📅 More accurate document dating
- 📝 Date embedded in filename = source of truth
- 🔄 Consistent across all sources (web upload, auto-sync, Drive)
- 🎯 Better audit trail

---

## Examples: Full Upload Flow

### Example 1: NON Invoice Balaraja
```
Upload: NON Balaraja 1.140.000 30 Mei.pdf
↓
Parse:
- Tipe: NON
- Toko: toko-balaraja
- Nominal: 1140000 (Rp 1.140.000)
- Date: 2026-05-30
↓
Drive: /ARSIP ANKA/zona-1/toko-balaraja/INVOICE/NON/NON Balaraja 1.140.000 30 Mei.pdf
↓
Database:
- nama_file: NON Balaraja 1.140.000 30 Mei.pdf
- tipe_ppn: NON
- tanggal_dokumen: 2026-05-30
- total_jual: 1140000
- category: INVOICE
↓
Dashboard:
📁 Invoice Merah • NON | 💰 Rp 1.140.000 | 📍 Zona 1 | 📅 30 Mei
```

### Example 2: PPN Invoice Cianjur
```
Upload: PPN Cianjur 13.242.200 15/08/2026.pdf
↓
Parse:
- Tipe: PPN
- Toko: toko-cianjur
- Nominal: 13242200 (Rp 13.242.200)
- Date: 2026-08-15
↓
Drive: /ARSIP ANKA/zona-1/toko-cianjur/INVOICE/PPN/PPN Cianjur 13.242.200 15/08/2026.pdf
↓
Database:
- nama_file: PPN Cianjur 13.242.200 15/08/2026.pdf
- tipe_ppn: PPN
- tanggal_dokumen: 2026-08-15
- total_jual: 13242200
↓
Dashboard:
📁 Invoice Merah • PPN | 💰 Rp 13.242.200 | 📍 Zona 1 | 📅 15 Agustus
```

---

## Migration Note

**Existing Files**:
- Existing files without date in filename will fallback to upload date
- No retroactive change needed
- New format only applies to new uploads

**Gradual Rollout**:
- Old format still works: `TOKO NOMINAL PPN.pdf`
- New format better: `TIPE TOKO NOMINAL TANGGAL.pdf`
- Recommend using new format going forward
