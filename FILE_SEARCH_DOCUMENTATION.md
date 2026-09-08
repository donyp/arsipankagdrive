# File Search and Discovery for Location-Based Paths

## Overview
Added three new endpoints to search for existing invoice files in Google Drive using the new location-based path structure (BEKASI/PEMALANG). These endpoints help discover files that already exist with the new paths and update the database accordingly.

## New Endpoints

### 1. POST `/api/invoice/search-existing-files/:faktur`
**Purpose**: Search for an individual invoice's files in Google Drive using location-based paths.

**Authentication**: Super Admin or Moderator only

**Parameters**:
- `faktur` (URL parameter, required): Invoice number to search for

**Response**:
```json
{
  "success": true,
  "faktur": "835100311020926004",
  "location": "BEKASI",
  "foundFiles": {
    "invoice": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/PPN/835100311020926004.pdf",
    "bukti_bayar": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/BUKTIBAYAR/835100311020926004.pdf",
    "faktur_pajak": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/FAKTURPAJAK/tax-835100311020926004 SEMESTA GEMILANG 21.658.256.pdf"
  },
  "filesUpdatedCount": 2
}
```

**What it does**:
1. Gets invoice data from database
2. Extracts location from TOKO column (BEKASI or PEMALANG)
3. Builds date-based paths for the invoice
4. Searches Google Drive for each file type:
   - Invoice PDF in `{LOCATION}/{YEAR}/{MONTH}/{DAY}/{PPN|NON}/`
   - Bukti Bayar in `{LOCATION}/{YEAR}/{MONTH}/{DAY}/BUKTIBAYAR/`
   - Faktur Pajak in `{LOCATION}/{YEAR}/{MONTH}/{DAY}/FAKTURPAJAK/`
5. Returns found file paths (or null if not found)
6. Indicates how many files need database update

### 2. POST `/api/invoice/update-file-paths/:faktur`
**Purpose**: Update database with found file paths from search.

**Authentication**: Super Admin or Moderator only

**Parameters**:
- `faktur` (URL parameter, required): Invoice number to update
- Body (JSON):
  ```json
  {
    "foundFiles": {
      "invoice": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/PPN/835100311020926004.pdf",
      "bukti_bayar": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/BUKTIBAYAR/835100311020926004.pdf",
      "faktur_pajak": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/FAKTURPAJAK/tax-835100311020926004.pdf"
    }
  }
  ```

**Response**:
```json
{
  "success": true,
  "faktur": "835100311020926004",
  "updated": ["invoice", "bukti_bayar", "faktur_pajak"],
  "data": {
    "id": "...",
    "faktur": "835100311020926004",
    "invoice_pdf_path": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/PPN/835100311020926004.pdf",
    "bukti_bayar_path": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/BUKTIBAYAR/835100311020926004.pdf",
    "faktur_pajak_path": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/FAKTURPAJAK/tax-835100311020926004.pdf"
  }
}
```

**What it does**:
1. Takes found file paths from search result
2. Updates invoice_file_list table with new paths
3. Returns updated record from database

### 3. POST `/api/invoice/scan-all-invoices`
**Purpose**: Bulk scan multiple invoices for existing files.

**Authentication**: Super Admin or Moderator only

**Query Parameters**:
- `limit` (optional, default: 50): Number of invoices to scan
- `offset` (optional, default: 0): Starting position for pagination

**Response**:
```json
{
  "success": true,
  "summary": {
    "totalScanned": 50,
    "totalCount": 250,
    "foundWithFiles": 12,
    "needsUpdate": 5
  },
  "results": [
    {
      "faktur": "835100311020926004",
      "location": "BEKASI",
      "found": ["invoice", "bukti_bayar"],
      "needsUpdate": true
    },
    {
      "faktur": "835100311020926005",
      "location": "PEMALANG",
      "found": ["invoice", "bukti_bayar", "faktur_pajak"],
      "needsUpdate": false
    }
  ],
  "hasMore": true
}
```

**What it does**:
1. Fetches invoices from database (with pagination)
2. For each invoice, searches for existing files in Google Drive
3. Records which files were found
4. Identifies which invoices need database update
5. Returns summary and first 20 results (use pagination to see more)

## Usage Workflow

### Single Invoice Discovery
```bash
# 1. Search for files
curl -X POST https://api.example.com/api/invoice/search-existing-files/835100311020926004

# 2. If files found, update database
curl -X POST https://api.example.com/api/invoice/update-file-paths/835100311020926004 \
  -H "Content-Type: application/json" \
  -d '{
    "foundFiles": {
      "invoice": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/PPN/835100311020926004.pdf",
      "bukti_bayar": "ARSIPINVOICE/BEKASI/2026/JANUARI/15/BUKTIBAYAR/835100311020926004.pdf"
    }
  }'
```

### Bulk Discovery
```bash
# 1. Scan all invoices (with pagination if needed)
curl -X POST "https://api.example.com/api/invoice/scan-all-invoices?limit=50&offset=0"

# 2. Check which invoices need update (needsUpdate: true)

# 3. For each invoice that needs update, call search-existing-files and update-file-paths
```

## How File Search Works

### Location Extraction
The search uses location extracted from invoice TOKO column:
- If TOKO contains "PEMALANG" → search in `ARSIPINVOICE/PEMALANG/...`
- Otherwise → search in `ARSIPINVOICE/BEKASI/...`

### Path Construction
Paths are constructed using invoice data:
- Year: From `tanggal` field (YYYY)
- Month: From `tanggal` field converted to Indonesian name (JANUARI, FEBRUARI, etc.)
- Day: From `tanggal` field (DD)
- Category: From `keterangan` field (PPN or NON)

### File Matching
- **Invoice PDF**: Filename contains faktur number and ends with `.pdf`
- **Bukti Bayar**: Filename contains faktur number in `BUKTIBAYAR/` folder
- **Faktur Pajak**: Filename starts with `tax-`, contains faktur number, in `FAKTURPAJAK/` folder

## Error Handling

### Non-existent Paths
If a directory path doesn't exist in Google Drive, the search gracefully continues without error.

### Missing Data
If invoice data is incomplete, search will fail with descriptive error.

### Database Update Failures
If update fails, detailed error message is returned. Database remains unchanged.

## Integration with Check-File and Download

After paths are discovered and stored in database:
- `GET /api/invoice/check-file/:faktur/:fileType` - Reads paths from database, checks existence
- `GET /api/invoice/download-file/:faktur/:fileType` - Reads paths from database, downloads file
- `GET /api/invoice/combine-pdf/:faktur` - Reads paths from database, combines files

## Performance Considerations

- **Single search**: Typically takes 2-5 seconds depending on Google Drive latency
- **Bulk scan**: For 50 invoices, typically takes 30-60 seconds
- **Recommendation**: Run bulk scans during off-peak hours or use pagination with smaller batches (10-20) for UI feedback

## Migration Strategy

For existing invoices with old paths:

1. **Verify files exist** in new location-based paths on Google Drive
2. **Run scan-all-invoices** to discover which files are present
3. **Update paths** using search-existing-files + update-file-paths
4. **Verify downloads** work correctly with new paths
5. **Monitor logs** for any issues with combined PDFs

## Related Commits
- `6b386e6` - feat: Add file search and discovery endpoints for location-based paths
- `39859bd` - feat: Add location-based paths (BEKASI/PEMALANG) to invoice uploads
- `5a92d6a` - docs: Add documentation for location-based path implementation

## Testing Recommendations

1. **Test single search**:
   - Call search-existing-files for known invoice
   - Verify correct location is extracted
   - Verify correct paths are built

2. **Test file matching**:
   - Upload test files to new locations
   - Search should find them
   - Verify filename patterns match correctly

3. **Test database update**:
   - Search finds files
   - Update database
   - Verify check-file returns true
   - Verify download-file works

4. **Test bulk scan**:
   - Run with small batch (10 invoices)
   - Verify summary counts
   - Check if results are accurate

5. **Test pagination**:
   - Scan with limit=20, offset=0
   - Then limit=20, offset=20
   - Verify different invoices returned
