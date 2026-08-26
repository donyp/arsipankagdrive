# Visual Guide: File Upload Path Fix

## The Journey of a File Upload

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    USER UPLOADS A FILE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  File Name: "NON Balaraja 1.140.000 30 Mei.pdf"                          │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              FRONTEND AUTO-DETECTS INFORMATION                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ✓ Type: NON                                                             │
│  ✓ Toko: Balaraja                                                        │
│  ✓ Date: 30 Mei (May 30)                                                │
│  ✓ Nominal: 1.140.000                                                    │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              BACKEND BUILDS STORAGE PATH                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Zona Code:    zona-01 → zona-1 (convert for Google Drive)              │
│  Toko Code:    Balaraja → toko-balaraja                                 │
│  Category:     NON → mapped to INVOICE/NON                              │
│                                                                           │
│  Result: /ARSIP ANKA/zona-1/toko-balaraja/INVOICE/NON/filename.pdf ✓   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
    BEFORE (BROKEN)                AFTER (FIXED)
    ────────────────────           ──────────────

┌──────────────────────┐      ┌──────────────────────┐
│ getLocalPath()       │      │ getLocalPath()       │
│ (OLD CODE)           │      │ (NEW CODE)           │
├──────────────────────┤      ├──────────────────────┤
│ Input:               │      │ Input:               │
│ /ARSIP ANKA/zona-1/..│     │ /ARSIP ANKA/zona-1/..│
│                      │      │                      │
│ Regex:               │      │ Step 1:              │
│ /^\/arsip\//  ❌     │      │ Remove leading / ✓  │
│ (doesn't match!)     │      │ → ARSIP ANKA/zona-1/│
│                      │      │                      │
│ Result:              │      │ Step 2:              │
│ ./local_files/       │      │ Remove base path ✓  │
│ ARSIP%20ANKA/        │      │ → zona-1/toko-...   │
│ zona-1/...  ❌       │      │                      │
│                      │      │ Result:              │
│ ❌ WRONG!            │      │ ./local_files/       │
│                      │      │ zona-1/toko-...  ✓  │
│                      │      │                      │
│                      │      │ ✓ CORRECT!           │
└──────────────────────┘      └──────────────────────┘
        │                              │
        ▼                              ▼
   File Saved To:              File Saved To:
   
   ❌ ./local_files/           ✓ ./local_files/
      ARSIP%20ANKA/              zona-1/
      zona-1/                     toko-balaraja/
      toko-balaraja/             INVOICE/
      INVOICE/NON/              NON/
      filename.pdf              filename.pdf
                                 
   (WRONG)                       (CORRECT)
   Database doesn't             Database matches
   match filesystem             filesystem!
```

---

## Folder Structure Comparison

### Before Fix ❌
```
./local_files/
│
└── ARSIP%20ANKA/               ← WRONG! Should be removed
    └── zona-1/
        └── toko-balaraja/
            ├── INVOICE/
            │   ├── NON/
            │   │   └── file.pdf
            │   └── PPN/
            └── ...
            
Problem: "ARSIP ANKA" shouldn't be here
         Local path ≠ Database path
         Confusing folder structure
```

### After Fix ✓
```
./local_files/
│
├── zona-1/                     ← CORRECT! Base path removed
│   ├── toko-balaraja/
│   │   ├── INVOICE/
│   │   │   ├── NON/
│   │   │   │   ├── NON Balaraja 1.140.000 30 Mei.pdf
│   │   │   │   └── NON Balaraja 2.000.000 10 Juni.pdf
│   │   │   └── PPN/
│   │   │       ├── PPN Balaraja 5.000.000 15 Juni.pdf
│   │   │       └── PPN Balaraja 3.000.000 20 Mei.pdf
│   │   └── BUKTI PIUTANG/
│   │       └── ...
│   │
│   ├── toko-cianjur/           ← Different toko
│   │   ├── INVOICE/
│   │   │   ├── NON/
│   │   │   └── PPN/
│   │   └── ...
│   
└── zona-2/                     ← Different zone
    ├── toko-pasarkemis/
    │   └── ...
    
Perfect: Matches database paths
         Matches Google Drive structure
         Clean organization
```

---

## Category Mapping Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                  FILENAME ANALYSIS                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  "NON Balaraja 1.140.000 30 Mei.pdf"                            │
│   ▲                                                              │
│   └─ Starts with "NON "                                         │
│                                                                  │
│         ↓                                                         │
│                                                                  │
│   Category = NON                                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────────┐
│            BUILD FOLDER PATH                                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: category = "NON"                                        │
│                                                                  │
│  Mapping:                                                        │
│  ├─ NON     → INVOICE/NON                                       │
│  ├─ PPN     → INVOICE/PPN                                       │
│  ├─ INVOICE → INVOICE                                           │
│  └─ PIUTANG → BUKTI PIUTANG                                     │
│                                                                  │
│  Result: INVOICE/NON ✓                                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────────┐
│          FINAL STORAGE PATH                                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /ARSIP ANKA/zona-1/toko-balaraja/INVOICE/NON/                │
│                                                                  │
│  Local:  ./local_files/zona-1/toko-balaraja/INVOICE/NON/       │
│  Drive:  /ARSIP ANKA/zona-1/toko-balaraja/INVOICE/NON/         │
│                                                                  │
│  Both show the same folder structure! ✓                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## File Upload Timeline

### BEFORE FIX (Timeline showing problem)
```
┌─────────┐     ┌─────────┐     ┌────────────┐    ┌──────────┐    ┌─────────┐
│ Upload  │────▶│ Detect  │────▶│ Build Path │───▶│ Convert  │───▶│ Save    │
│ Starts  │     │ Auto    │     │ ✓          │    │ Path ❌  │    │ WRONG   │
│         │     │         │     │ /ARSIP     │    │ Mismatch │    │ Folder  │
│ File:   │     │ Detects │     │ ANKA/...   │    │          │    │ ❌      │
│ NON     │     │ All OK  │     │            │    │ Expected │    │         │
│ Balaraja│     │ ✓       │     │            │    │ /arsip   │    │ Files   │
│ ...     │     │         │     │            │    │ But got  │    │ appear  │
│         │     │         │     │            │    │ /ARSIP   │    │ in      │
└─────────┘     └─────────┘     └────────────┘    │ ANKA ❌  │    │ weird   │
                                                  └──────────┘    │ places  │
                                                                  └─────────┘
                                                       │
                                                       ▼
                                            User confused:
                                            "Where's my file?!"
```

### AFTER FIX (Timeline showing solution)
```
┌─────────┐     ┌─────────┐     ┌────────────┐    ┌──────────┐    ┌─────────┐
│ Upload  │────▶│ Detect  │────▶│ Build Path │───▶│ Convert  │───▶│ Save    │
│ Starts  │     │ Auto    │     │ ✓          │    │ Path ✓   │    │ CORRECT │
│         │     │         │     │ /ARSIP     │    │ Perfect  │    │ Folder  │
│ File:   │     │ Detects │     │ ANKA/...   │    │ Match    │    │ ✓       │
│ NON     │     │ All OK  │     │            │    │          │    │         │
│ Balaraja│     │ ✓       │     │            │    │ Remove   │    │ Files   │
│ ...     │     │         │     │            │    │ /ARSIP   │    │ appear  │
│         │     │         │     │            │    │ ANKA/ ✓  │    │ in      │
└─────────┘     └─────────┘     └────────────┘    │ Keep     │    │ right   │
                                                  │ zona-1/  │    │ place!  │
                                                  │ toko-... │    └─────────┘
                                                  └──────────┘
                                                       │
                                                       ▼
                                            User happy:
                                            "Perfect! Files 
                                             in right place!"
```

---

## Verification Flowchart

```
START: Upload Test File
   │
   ├─▶ File uploaded?
   │   ├─ NO  → Check console for errors
   │   └─ YES ▼
   │
   ├─▶ Auto-detect works? (Green checkmark on toko)
   │   ├─ NO  → Problem with filename parsing
   │   └─ YES ▼
   │
   ├─▶ Progress reaches 100%?
   │   ├─ NO  → Stuck upload (check server logs)
   │   └─ YES ▼
   │
   ├─▶ Success message shown?
   │   ├─ NO  → Check network
   │   └─ YES ▼
   │
   ├─▶ File in correct folder?
   │   │ ./local_files/zona-1/toko-balaraja/INVOICE/NON/
   │   ├─ NO  → Fix NOT working (server not restarted?)
   │   └─ YES ▼
   │
   ├─▶ Database path correct?
   │   │ /ARSIP ANKA/zona-1/toko-balaraja/INVOICE/NON/...
   │   ├─ NO  → Something else wrong
   │   └─ YES ▼
   │
   ├─▶ Preview works?
   │   ├─ NO  → File access issue
   │   └─ YES ▼
   │
   └─▶ ✅ ALL TESTS PASS!
       Fix is working correctly!
```

---

## Zone & Toko Code Conversion

```
DATABASE NAMES              GOOGLE DRIVE / LOCAL
─────────────────────────   ──────────────────────

ZONA CODES:
zona-01                 ──▶ zona-1         (remove leading zero)
zona-02                 ──▶ zona-2
zona-03a                ──▶ zona-3a
zona-03b                ──▶ zona-3b

TOKO NAMES:
Balaraja                ──▶ toko-balaraja  (lowercase + dashes)
Serang Timur            ──▶ toko-serang-timur
Cianjur                 ──▶ toko-cianjur
(Spaces become dashes, lowercase)

CATEGORY NAMES:
NON                     ──▶ INVOICE/NON    (nested in INVOICE)
PPN                     ──▶ INVOICE/PPN
INVOICE                 ──▶ INVOICE
PIUTANG                 ──▶ BUKTI PIUTANG
```

---

## Expected vs Unexpected Paths

```
✅ EXPECTED (After Fix)
───────────────────────────────────────────────────────────
./local_files/zona-1/toko-balaraja/INVOICE/NON/file.pdf
./local_files/zona-1/toko-balaraja/INVOICE/PPN/file.pdf
./local_files/zona-1/toko-cianjur/INVOICE/file.pdf
./local_files/zona-2/toko-pasarkemis/INVOICE/NON/file.pdf

❌ NOT EXPECTED (Before Fix - Should NOT See)
───────────────────────────────────────────────────────────
./local_files/ARSIP ANKA/zona-1/...
./local_files/ARSIP%20ANKA/zona-1/...
./local_files/arsip/zona-1/...
./local_files//ARSIP ANKA/zona-1/...
./local_files/NON/file.pdf (missing zona/toko)
./local_files/zona-1/NON/file.pdf (wrong: NON not in INVOICE)
```

---

## The Fix in One Picture

```
BEFORE:                          AFTER:
───────────────────────────────────────────────────────────

Input Path                       Input Path
    │                               │
    ▼                               ▼
/ARSIP ANKA/zona-1/...          /ARSIP ANKA/zona-1/...
    │                               │
    │ OLD CONVERTER                 │ NEW CONVERTER
    │ Tries to remove /arsip/       │ 
    │ But regex doesn't match ❌     │ Step 1: Remove leading /
    │                               │         → ARSIP ANKA/zona-1/...
    │                               │ 
    ▼                               │ Step 2: Remove /ARSIP ANKA/
                                    │         → zona-1/...
WRONG OUTPUT:                       │
./local_files/ARSIP%20ANKA/...     │
(broken path, files can't be       ▼
 accessed correctly)          
                              CORRECT OUTPUT:
                              ./local_files/zona-1/...
                              (proper path, files work!)
```

---

**Visual Summary: The fix converts a broken path converter to a working one, ensuring files appear in the correct folder structure.**
