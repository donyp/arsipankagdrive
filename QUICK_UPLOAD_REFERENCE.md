# Quick Reference: Upload File Format

## Format
```
TIPE TOKO NOMINAL TANGGAL.pdf
```

## Example
```
NON Balaraja 1.140.000 30 Mei.pdf
```

## What Each Part Does

| Part | Example | Result |
|------|---------|--------|
| **TIPE** | NON | Sets PPN/NON type |
| **TOKO** | Balaraja | Organizes to `/toko-balaraja/` |
| **NOMINAL** | 1.140.000 | Shows 💰 Rp 1.140.000 badge |
| **TANGGAL** | 30 Mei | Sets 📅 date badge |

## Dashboard Result
```
🟥 Invoice Merah • NON
Balaraja 1.140.000 30 Mei.pdf
───────────────────────────────
📁 Invoice Merah • NON
💰 Rp 1.140.000
📍 Zona 1
📅 30 Mei     ← From filename!
```

## Date Formats (All Work!)
- `30 Mei` → 30 Mei 2026
- `30/05` → 30 Mei 2026
- `30-05` → 30 Mei 2026
- `30/05/2026` → 30 Mei 2026
- `2026-05-30` → 30 Mei 2026

## Valid Toko Names
- Balaraja
- Cianjur
- Serang Timur
- Pasarkemis
- Bitung
- Cilegon
- Cipondoh
- Kutabumi
- Ciruas

## Test Filenames (Copy-Paste Ready)
```
NON Balaraja 1.140.000 30 Mei.pdf
PPN Cianjur 13.242.200 15 Agustus.pdf
NON Serang Timur 5.500.000 28 Februari.pdf
PPN Pasarkemis 2.750.000 2026-05-20.pdf
NON Bitung 750.000 30/12/2026.pdf
```

## What Happens After Upload
1. ✅ Web scans filename
2. ✅ Extracts: toko, nominal, date, type
3. ✅ Uploads to Google Drive in correct folder
4. ✅ Saves to database with date from filename
5. ✅ Dashboard shows all metadata + date badge
6. ✅ Auto-sync maintains everything

## Key Point!
**📅 Date badge shows DATE FROM FILENAME, not upload date!**

This means the document date (when transaction occurred) is what matters, not when you uploaded it.

## Troubleshooting
- **Date not showing?** → Check format matches one above
- **File in wrong folder?** → Check toko name spelling
- **Nominal not showing?** → Make sure it has dots (1.140.000)
- **Type wrong?** → Must be PPN or NON at start

## Bottom Line
```
Good ✅:    NON Balaraja 1.140.000 30 Mei.pdf
Bad ❌:     Balaraja_1140000_30Mei.pdf
Bad ❌:     1.140.000 NON Balaraja 30 Mei.pdf  (wrong order)
```

Upload and it works automatically! 🚀
