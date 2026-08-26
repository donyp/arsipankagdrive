# 🚀 Auto Toko Scanning - Quick Start

## What Changed?
**Before**: Upload file → dropdown "-- Pilih Toko --" → manually select toko → upload  
**Now**: Upload file → **auto-scan toko name** → green checkmark → upload ✅

---

## How to Use

### Step 1: Prepare Filename
Use format: `[TYPE] [TOKO] [NOMINAL] [DATE].pdf`

**Examples**:
```
NON Balaraja 1.140.000 30 Mei.pdf
PPN Cianjur 13.242.200 15 Agustus.pdf
NON Serang Timur 5.500.000 28 Februari.pdf
```

### Step 2: Upload
1. Go to: `http://localhost:8000/upload.html`
2. Click or drag file to upload
3. **Expected**: File shows green ✓ checkmark badge with toko name

### Step 3: Ready!
- ✅ Green badge = Auto-detected
- ✅ No dropdown = Ready to upload
- ✅ Click "Mulai Upload Antrean"

---

## Visual Comparison

### ❌ Old Way (Manual Selection)
```
File: NON Balaraja 1.140.000 30 Mei.pdf
      ↓
      Dropdown: -- Pilih Toko --
      ↓
      User clicks & selects "Balaraja"
      ↓
      Upload
```

### ✅ New Way (Auto-Scan)
```
File: NON Balaraja 1.140.000 30 Mei.pdf
      ↓
      Auto-scan: BALARAJA ✓
      ↓
      Green checkmark badge appears
      ↓
      Ready to upload!
```

---

## Badge Meanings

| Badge | Color | Meaning |
|-------|-------|---------|
| ✓ BALARAJA | 🟢 Green | Toko auto-detected (locked) |
| -- Pilih Toko -- | 🔵 Blue | Toko not found (manual selection) |
| ⚠ File Sudah Ada | 🔴 Red | File already exists |
| 💰 Rp 1.140.000 | 🔵 Blue | Nominal extracted from filename |
| 📅 30 Mei | 🟡 Amber | Date extracted from filename |

---

## Supported Toko Names
The system recognizes these tokos automatically:
- Balaraja
- Cianjur
- Serang Timur
- Pasarkemis
- Bitung
- Cilegon
- Cipondoh
- Kutabumi
- Ciruas
- (and more you add in Settings)

---

## Troubleshooting

### Issue: Dropdown still shows "-- Pilih Toko --"

**Check**:
1. **Filename format correct?**
   - ✅ `NON Balaraja 1.140.000 30 Mei.pdf`
   - ❌ `Balaraja_NON_1140000.pdf`
   - ❌ `NON 1.140.000 Balaraja 30 Mei.pdf` (wrong order)

2. **Toko name spelled correctly?**
   - Database has: "Balaraja"
   - File has: "Balaraja" ✅
   - File has: "Balanja" ❌

3. **Backend running?**
   ```
   Check: http://localhost:5000/api/heartbeat
   Should return: {"status":"alive",...}
   ```

4. **Browser console errors?** (F12)
   - Check for red errors
   - Check: `window._allTokos` has data

---

## Test Filenames (Copy-Paste)

### Test Set 1
```
NON Balaraja 1.140.000 30 Mei.pdf
PPN Cianjur 13.242.200 15 Agustus.pdf
NON Serang Timur 5.500.000 28 Februari.pdf
```

### Test Set 2
```
non balaraja 1.521.000 30/05.pdf
ppn cianjur 13.242.200 15/08/2026.pdf
NON Pasarkemis 2.750.000 2026-05-20.pdf
```

### Test Set 3 (Case Variations)
```
NoN BALARAJA 1140000 30 mei.pdf
PpN CiAnJuR 13.242.200 15 agustus.pdf
```

---

## Performance
- ✅ Scanning happens instantly (no waiting)
- ✅ Matches multiple toko names
- ✅ Works offline (no API calls for scanning)
- ✅ Handles typos and variations

---

## FAQ

**Q: What if my toko name has multiple words?**  
A: Works! System matches: "Serang Timur", "Serang_Timur", "serang timur" all the same.

**Q: What if file doesn't have date?**  
A: Uses today's date as fallback.

**Q: Can I override auto-detected toko?**  
A: Yes! If dropdown shows (auto-detection failed), select manually.

**Q: Do I need to restart browser?**  
A: Only if you added new tokos - reload page (F5) to refresh list.

**Q: What if multiple toko names match?**  
A: System picks the longest match (most specific).

---

## Command Reference

### Start Backend
```bash
cd backend
node server.js
```

### Start Frontend Server
```bash
# In another terminal
npx http-server
```

### Test API
```javascript
// In browser console
fetch('http://localhost:5000/api/toko', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
})
.then(r => r.json())
.then(d => console.log(d.tokos))
```

---

## Next Steps

✅ Prepare test files with valid filenames  
✅ Go to `http://localhost:8000/upload.html`  
✅ Upload a file  
✅ See green checkmark badge  
✅ No dropdown needed!  
✅ Enjoy faster uploads! 🎉

---

## Support

**Works**: Valid filenames with recognized toko names  
**Fallback**: Shows dropdown for unrecognized names (manual selection)  
**Always works**: File uploads regardless (auto-detect or manual)

---

## Summary
```
Old: Format → Select dropdown → Upload (3 clicks)
New: Format → Upload (1 click) ✨
```

Faster, easier, smarter! 🚀
