# Railway Google Drive Setup

## Problem
PDF uploads mark status=UPLOADED in DB tapi files tidak sampai ke Google Drive (uploaded_file_path=null).

## Root Cause
rclone.conf di repo tidak punya Google Drive token. Di Railway, perlu setup credentials lewat environment variable.

## Solution

### Step 1: Get Your Google Drive rclone Config

Di lokal, jalankan perintah:

```bash
rclone config show gdrive
```

Copy seluruh output.

### Step 2: Add ke Railway Variables

1. Buka [Railway Dashboard](https://railway.app)
2. Pilih project kamu
3. Ke tab **"Variables"**
4. Klik **"New Variable"**
5. Name: `GDRIVE_CONFIG_JSON`
6. Value: Convert output dari Step 1 menjadi JSON format

Contoh (ubah dengan values kamu):

```json
{
  "type": "drive",
  "client_id": "[YOUR_CLIENT_ID]",
  "client_secret": "[YOUR_CLIENT_SECRET]",
  "scope": "drive",
  "token": "[YOUR_TOKEN_JSON_OBJECT]",
  "team_drive": "[YOUR_TEAM_DRIVE_ID]"
}
```

7. Klik **"Add"**

### Step 3: Redeploy

Railway akan auto-redeploy, atau klik **"Deploy"** manual.

## Verification

Setelah redeploy, upload PDF lagi dan cek:

1. **Dashboard**: File harus punya status **UPLOADED** dengan `uploaded_file_path` terisi
2. **Google Drive**: `/ARSIPINVOICE/2026/SEPTEMBER/02/PPN/` harus ada file PDF-nya
3. **Server Logs**: Cari pattern `[uploadInvoicePDF] OK Upload successful`

## Troubleshooting

### "empty token found" error
- GDRIVE_CONFIG_JSON belum di-set atau format salah
- Verify JSON syntax dengan JSON validator

### "Failed to create oauth client" error
- Token sudah expired
- Jalankan ulang `rclone config show gdrive` dan update GDRIVE_CONFIG_JSON

### "Permission denied" error
- Folder `/ARSIPINVOICE` tidak di-share dengan account yang tepat
- Pastikan folder dapat diakses dengan credentials yang digunakan

## How It Works

1. `generate-rclone-config.js` membaca `GDRIVE_CONFIG_JSON` saat startup
2. Script membuat rclone.conf dengan Google Drive credentials
3. Semua rclone commands menggunakan config tersebut
4. PDF upload ke Google Drive berhasil dengan path yang disimpan di database

## Related Files

- `backend/rclone_wrapper.js` - Rclone execution logic
- `backend/invoice-endpoints.js` - PDF upload endpoint
- `generate-rclone-config.js` - Config generator at startup
- `start.sh` - Startup script yang menjalankan generator
