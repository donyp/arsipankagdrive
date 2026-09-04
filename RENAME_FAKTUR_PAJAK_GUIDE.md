# Rename Faktur Pajak - Fitur Baru ✨

## Overview
Fitur untuk batch renaming faktur pajak dengan format: `tax-NAMA_TOKO NOMINAL`

Data diekstrak langsung dari PDF tanpa menyimpan file di server.

## Format Nama Baru
```
tax-NAMA_TOKO NOMINAL
```

Contoh:
- `tax-MEGA BAJA BOGOR 3.686.750.pdf`
- `tax-PT MAJU JAYA 5.432.100.pdf`

## Data Extraction

### Nama Toko
- Source: "Pembeli Barang Kena Pajak/Penerima Jasa Kena Pajak" → "Nama :"
- Skip: "GARUDA GEMILANG INDONESIA" (pengguna pajak, bukan penerima)
- Converted to UPPERCASE

### Nominal
- Source 1: "Harga Jual / Penggantian / Uang Muka / Termin" (nilai jual)
- Source 2: "Jumlah PPN (Pajak Pertambahan Nilai)" (nilai pajak)
- Total: Source 1 + Source 2
- Format dengan separator: `3.321.394`

## User Flow

1. **Go to Page**: `/rename-faktur.html`

2. **Upload**:
   - Drag & drop PDF files
   - Atau klik untuk browse
   - Multiple files supported

3. **Process**:
   - Klik button "Proses & Download"
   - System:
     - Membaca setiap PDF
     - Extract nama toko & nominal
     - Validasi data
     - Generate nama baru

4. **Download**:
   - Jika valid: Auto-download file dengan nama baru
   - Jika gagal: Notifikasi error, tidak ada download

5. **Result**:
   - File baru dengan nama: `tax-NAMA_TOKO NOMINAL.pdf`
   - Disimpan di device user (bukan di server)

## API Endpoint

### POST /api/invoice/rename-faktur
Extract data from PDF and prepare renamed file.

**Request:**
```
Content-Type: multipart/form-data
- file: PDF file
- filename: Original filename

```

**Response (Success):**
```json
{
  "success": true,
  "originalName": "faktur-001.pdf",
  "newName": "tax-MEGA BAJA BOGOR 3686750.pdf",
  "namaToko": "MEGA BAJA BOGOR",
  "harga": 3321394,
  "ppn": 365356,
  "totalNominal": 3686750
}
```

**Response (Fail):**
```json
{
  "success": false,
  "error": "Nama toko tidak valid atau merupakan Garuda Gemilang Indonesia"
}
```

### GET /api/invoice/rename-faktur/download/:filename
Download renamed file (if temporarily stored).

Note: Current implementation streams file directly without server storage.

## Implementation Details

### Frontend (`rename-faktur.html`)

Features:
- Drag & drop zone dengan visual feedback
- Multiple file support
- File list dengan size display
- Process button dengan loading state
- Results section dengan success/error status
- Auto-download on success
- Error notification on failure

### Backend (`rename-faktur-endpoints.js`)

Process:
1. Parse PDF menggunakan `pdf-parse` library
2. Extract text content dari PDF
3. Regex matching untuk:
   - "Pembeli Barang Kena Pajak/Penerima Jasa Kena Pajak"
   - "Harga Jual / Penggantian / Uang Muka / Termin"
   - "Jumlah PPN (Pajak Pertambahan Nilai)"
4. Validasi nama toko (tidak boleh Garuda Gemilang Indonesia)
5. Validasi nominal (> 0)
6. Generate nama baru sesuai format
7. Return ke frontend untuk download

## Regex Patterns

### Nama Toko
```regex
/Pembeli\s+Barang\s+Kena\s+Pajak\/Penerima\s+Jasa\s+Kena\s+Pajak:[^\n]*\n\s*Nama\s*:\s*([^\n]+)/i
```

### Harga Jual
```regex
/Harga\s+Jual\s*\/\s*Penggantian\s*\/\s*Uang\s+Muka\s*\/\s*Termin[^\d]*?([\d.,]+)/i
```

### Jumlah PPN
```regex
/Jumlah\s+PPN\s*\([^)]*\)[^\d]*?([\d.,]+)/i
```

## Dependencies

- `pdf-parse` - PDF text extraction
- `pdfkit` - PDF generation (optional, for future use)

Install:
```bash
npm install pdf-parse pdfkit
```

## Error Handling

### Validation Errors

1. **File not PDF**
   - Error: "File PDF wajib diupload"
   - Action: Show error notification

2. **Nama Toko not found**
   - Error: "Nama toko tidak valid atau merupakan Garuda Gemilang Indonesia"
   - Action: Show failed result, no download

3. **Nominal not found**
   - Error: "Nominal tidak dapat diekstrak dari PDF"
   - Action: Show failed result, no download

4. **PDF Parse Error**
   - Error: Detailed error message
   - Action: Show failed result, log to console

### User Feedback

- Success: ✅ Green box with "Nama baru: tax-..." + Download button
- Failure: ❌ Red box with error message
- Toast notification: "X file gagal diproses" (if any failures)

## Security

- No server-side file storage
- Files streamed directly to client
- Directory traversal protection on download endpoint
- File size validation (implicit via PDF parse)
- Text-based extraction (no executable scripts)

## Testing Checklist

- [ ] Upload single PDF
- [ ] Upload multiple PDFs
- [ ] Drag & drop functionality
- [ ] Error handling (invalid PDF)
- [ ] Error handling (missing data)
- [ ] Auto-download on success
- [ ] Error notification on failure
- [ ] File cleanup (no server storage)
- [ ] Correct naming format
- [ ] Data extraction accuracy

## Future Enhancements

1. Batch rename dengan progress bar per file
2. Preview data sebelum confirm
3. Manual override untuk nama/nominal
4. Upload to cloud storage (GDrive, terabox)
5. Template for other faktur types
6. Scheduled batch processing
7. Audit log untuk rename history

## Troubleshooting

### PDF tidak bisa dibaca
- Pastikan PDF text-based (bukan scanned image)
- Coba buka PDF di viewer untuk verify readable

### Data tidak terextract
- Pastikan format PDF sesuai dengan template faktur
- Check regex patterns di console (debug mode)
- Verify field labels match exactly

### Download tidak jalan
- Check browser download settings
- Verify file permissions
- Try different browser

## References

- PDF Parsing: https://www.npmjs.com/package/pdf-parse
- Regex Reference: https://regexr.com/

---
**Last Updated:** 2026-01-03
**Version:** 1.0
**Status:** Production Ready ✅
