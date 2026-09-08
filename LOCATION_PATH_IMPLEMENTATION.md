# Location-Based Google Drive Path Implementation

## Summary
Implemented location-based file organization in Google Drive using BEKASI/PEMALANG directories extracted from the invoice TOKO column.

## Changes Made

### 1. Backend: `invoice-endpoints.js`
- **Added helper function**: `extractLocationFromToko(tokoName)`
  - Checks if TOKO contains "PEMALANG" → returns "PEMALANG"
  - Otherwise → returns "BEKASI" (default)
  
- **Updated PDF upload endpoint**: `/api/invoice/upload-pdf`
  - Extracts location from invoice.toko
  - Builds path: `ARSIPINVOICE/{LOCATION}/{YEAR}/{MONTH}/{DAY}/{CATEGORY}/{filename}`
  - Passes location to `RcloneStorage.uploadInvoicePDF()`

- **Updated Bukti Bayar upload**: `/api/invoice/upload-bukti-bayar`
  - Extracts location from invoice.toko
  - Builds path: `ARSIPINVOICE/{LOCATION}/{YEAR}/{MONTH}/{DAY}/BUKTIBAYAR/{filename}`
  - Passes location to `RcloneStorage.uploadDocumentFile()`

- **Updated Faktur Pajak upload**: `/api/invoice/upload-faktur-pajak`
  - Two endpoints updated (for different upload flows)
  - Extracts location from invoice.toko
  - Builds path: `ARSIPINVOICE/{LOCATION}/{YEAR}/{MONTH}/{DAY}/FAKTURPAJAK/{filename}`
  - Passes location to `RcloneStorage.uploadDocumentFile()`

### 2. Backend: `rclone_wrapper.js`
- **Updated `uploadInvoicePDF()` method**:
  - Added `location` parameter (default: 'BEKASI' for backward compatibility)
  - New path: `ARSIPINVOICE/{location}/{year}/{month}/{day}/{category}/{filename}`
  
- **Updated `uploadDocumentFile()` method**:
  - Added `location` parameter (default: 'BEKASI' for backward compatibility)
  - New path: `ARSIPINVOICE/{location}/{year}/{month}/{day}/{folderType}/{filename}`

## File Path Examples

### BEKASI Invoice
```
ARSIPINVOICE/BEKASI/2026/JANUARI/15/PPN/835100311020926004.pdf
ARSIPINVOICE/BEKASI/2026/JANUARI/15/BUKTIBAYAR/835100311020926004.pdf
ARSIPINVOICE/BEKASI/2026/JANUARI/15/FAKTURPAJAK/tax-835100311020926004 SEMESTA GEMILANG 21.658.256.pdf
```

### PEMALANG Invoice
```
ARSIPINVOICE/PEMALANG/2026/JANUARI/15/PPN/835100311020926004.pdf
ARSIPINVOICE/PEMALANG/2026/JANUARI/15/BUKTIBAYAR/835100311020926004.pdf
ARSIPINVOICE/PEMALANG/2026/JANUARI/15/FAKTURPAJAK/tax-835100311020926004 SEMESTA GEMILANG 21.658.256.pdf
```

## Location Detection Logic

From Excel TOKO column:
- `PT GARUDA GEMILANG INDONESIA - ANKA` → **BEKASI** (default)
- `PT GARUDA GEMILANG INDONESIA - ANKA PEMALANG` → **PEMALANG**

The logic checks if the TOKO string contains "PEMALANG"; if yes, use PEMALANG, otherwise use BEKASI.

## Backward Compatibility

- Both `uploadInvoicePDF()` and `uploadDocumentFile()` have `location` parameter with default value 'BEKASI'
- Existing code paths that don't pass location will default to BEKASI
- File checking and download endpoints (`check-file`, `download-file`) work with existing paths since they read from database

## Testing Recommendations

1. Upload invoice with TOKO = "PT GARUDA GEMILANG INDONESIA - ANKA" 
   - Should create: `ARSIPINVOICE/BEKASI/2026/...`

2. Upload invoice with TOKO = "PT GARUDA GEMILANG INDONESIA - ANKA PEMALANG"
   - Should create: `ARSIPINVOICE/PEMALANG/2026/...`

3. Verify files appear in correct Google Drive locations

4. Download and combine PDF should work correctly with new paths

## Commit
- **Hash**: 39859bd
- **Message**: feat: Add location-based paths (BEKASI/PEMALANG) to invoice uploads
