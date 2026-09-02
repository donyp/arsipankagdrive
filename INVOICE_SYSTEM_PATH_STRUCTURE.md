# Invoice System - Path Structure

## Google Drive Path Structure

### Base Path
```
/ARSIPINVOICE/
```

### Full Path Format
```
/ARSIPINVOICE/[YEAR]/[MONTH]/[DAY]/[CATEGORY]/[FAKTUR].pdf
```

### Path Components

1. **YEAR**: 4-digit year (e.g., `2026`)
2. **MONTH**: 2-digit month with leading zero (e.g., `01`, `02`, `12`)
3. **DAY**: 2-digit day with leading zero (e.g., `01`, `15`, `31`)
4. **CATEGORY**: 
   - `PPN` - For invoices with PPN (Pajak Pertambahan Nilai)
   - `NON` - For invoices without PPN (NON PPN)
5. **FAKTUR**: Invoice number from Excel (e.g., `835100310`)

### Examples

#### PPN Invoice
```
/ARSIPINVOICE/2026/02/10/PPN/835100310.pdf
```
- Date: 10 February 2026
- Category: PPN
- Faktur: 835100310

#### NON PPN Invoice
```
/ARSIPINVOICE/2026/03/15/NON/724200450.pdf
```
- Date: 15 March 2026
- Category: NON PPN
- Faktur: 724200450

## Rclone Configuration

### Remote Name
```
gdrive
```

### Remote Type
```
Google Drive (type = drive)
```

### Access Method
- OAuth2 token authentication
- Shared Drive support
- Fast list enabled for better performance

## Upload Process

### 1. Excel Upload
- Admin uploads `REKAP_LABA.xls`
- System parses Excel and extracts:
  - TANGGAL (date)
  - FAKTUR (invoice number)
  - KETERANGAN (PPN/NON PPN)
  - Other metadata

### 2. Path Generation
Based on extracted data:
```javascript
const date = new Date(invoice.tanggal);
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const category = invoice.keterangan.toUpperCase().includes('PPN') ? 'PPN' : 'NON';
const filename = `${faktur}.pdf`;
const storagePath = `/ARSIPINVOICE/${year}/${month}/${day}/${category}/${filename}`;
```

### 3. PDF Upload
- User clicks "Upload" button on invoice row
- Selects PDF file (must match faktur number)
- System uploads to generated path
- Database updated with:
  - `status` = 'UPLOADED'
  - `uploaded_file_path` = full path
  - `uploaded_at` = timestamp
  - `uploaded_by` = user ID

## Directory Creation

Directories are created automatically by Rclone using:
```bash
rclone mkdir gdrive:/ARSIPINVOICE/YEAR/MONTH/DAY/CATEGORY --parents
```

The `--parents` flag creates all parent directories if they don't exist.

## File Verification

After upload, system verifies:
1. File exists on remote
2. File size matches local buffer
3. File is accessible via `lsjson`

If verification fails, upload is rolled back and error is reported.

## Access Control

### Upload Permissions
- Super Admin: Full access
- Moderator: Full access
- Admin Zona: Read only
- User: Read only

### API Endpoints
- `POST /api/invoice/upload-excel` - Upload Excel (Super Admin, Moderator)
- `POST /api/invoice/upload-pdf` - Upload PDF (All authenticated users)
- `GET /api/invoice/list` - List invoices (All authenticated users)
- `DELETE /api/invoice/:faktur` - Delete invoice (Super Admin only)

## Storage Backend

### Primary Storage
- **Service**: Google Shared Drive
- **Remote**: `gdrive`
- **Base Path**: `/ARSIPINVOICE`

### Backup Strategy (Future)
Consider implementing:
- Automatic backup to secondary storage (B2/Storj)
- Periodic sync verification
- Disaster recovery procedures

## Maintenance

### Regular Tasks
1. **Monthly**: Verify all uploaded files still exist
2. **Quarterly**: Check storage quota usage
3. **Yearly**: Archive old invoices (optional)

### Troubleshooting

#### Upload Fails
1. Check Rclone config: `rclone listremotes`
2. Test connection: `rclone lsd gdrive:/ARSIPINVOICE`
3. Verify token: Check token expiry in rclone.conf
4. Check logs: `backend/storage-errors.log`

#### File Not Found
1. Verify path in database matches actual file location
2. Check if directory exists: `rclone lsd gdrive:/ARSIPINVOICE/YEAR/MONTH/DAY`
3. Search for file: `rclone lsf gdrive:/ARSIPINVOICE --recursive | grep FAKTUR`

#### Performance Issues
1. Enable fast_list in rclone.conf (already enabled)
2. Increase chunk_size for large files
3. Use cache remote for frequently accessed files

## Notes

- All dates stored in database use ISO 8601 format (YYYY-MM-DD)
- Display format uses Indonesian style (DD/MM/YYYY)
- File uploads are direct to Google Drive (no local staging)
- Temp files are cleaned up immediately after upload
- Path structure is immutable once uploaded
- Category determination is automatic based on `keterangan` field

## Future Enhancements

1. **Bulk Upload**: Upload multiple PDFs at once
2. **Auto-matching**: Match PDFs in folder to faktur numbers automatically
3. **File Preview**: Direct PDF preview in browser
4. **Download API**: Download invoices directly from UI
5. **Archive**: Move old invoices to archive folder
6. **Statistics**: Track upload trends and missing invoices
