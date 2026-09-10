# WhatsApp Invoice System - Testing Guide

## 🎯 System Overview
WhatsApp notifications generate **automatically** when invoices are uploaded via PDF. No manual trigger needed.

**Flow:**
```
User uploads PDF invoices 
        ↓
/api/invoice/upload-pdf processes files
        ↓
API returns zona_id, tipe, konsumen, nominal
        ↓
upload-invoice-pdf.js calls /api/whatsapp/generate-invoice-messages
        ↓
Messages saved to whatsapp_invoice_notifications table
        ↓
User views messages in /whatsapp-messages dashboard
        ↓
User copy-paste messages to WhatsApp zones manually
```

---

## 📋 Testing Checklist

### Step 1: Verify Database Tables Exist
Run this SQL in Supabase Console:

```sql
-- Check WhatsApp invoice table
SELECT COUNT(*) FROM whatsapp_invoice_notifications;

-- Check structure
\d whatsapp_invoice_notifications;
```

**Expected:** Table exists with columns:
- `id` (UUID)
- `zona_id` (INT)
- `message` (TEXT)
- `sent_at` (TIMESTAMP)
- `batch_id` (TEXT)
- `invoice_count` (INT)

---

### Step 2: Upload a Test Invoice
1. Go to `/upload-invoice` or click **Upload Invoice** from sidebar
2. **Fill form:**
   - Zona: Pick any zona (e.g., "Zona 01")
   - Tipe: PPN
   - Konsumen: TEST_CUSTOMER_123
   - Nominal: 2930223
   - File: Upload any PDF file

3. **Click "Upload Invoice"**

4. **Check browser console (F12 → Console):**
   ```
   [Upload] Calling API with token: true
   [Upload] Invoice data: {zona_id: X, tipe: "PPN", ...}
   [Upload] API response status: 200
   [Upload] API response: {success: true, notifications: {...}}
   ```

---

### Step 3: Verify Messages in Database

Run this SQL to check if message was created:

```sql
-- Check for messages
SELECT 
  id, 
  zona_id, 
  invoice_count,
  message,
  created_at,
  sent_at
FROM whatsapp_invoice_notifications
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** Should see 1 new record with your zona_id

---

### Step 4: View Messages in Dashboard
1. Go to `/whatsapp-messages` (or click **WhatsApp Messages** from sidebar)
2. **Should see:**
   - Filter tabs: Pending (1), Sent (0), All (1)
   - Message card for your zona
   - Format:
     ```
     *UPDATE INVOICE ZONA (Zona Name)*
     
     - [PPN] TEST_CUSTOMER_123 - Rp 2.930.223
     
     _@adminanka_
     ```

3. **Click "Copy" button** to copy message to clipboard
4. **Verify message format** - should be ready to paste to WhatsApp

---

### Step 5: Test Bulk PDF Upload
If using the bulk upload page:

1. Go to `/upload-invoice` (bulk PDF upload page)
2. **Select multiple PDF files** with names like:
   - `835100311020926004.pdf`
   - `835100311020926005.pdf`
   - etc.

3. **The system will:**
   - Validate each PDF
   - Extract faktur number from filename
   - Look up invoice details from database
   - Upload PDFs in background
   - **AUTOMATICALLY call WhatsApp API for each**

4. **Check console:** Should see multiple `[PDF Bulk]` logs
   ```
   [PDF Bulk] Uploading (1/3): 835100311020926004.pdf
   [PDF Bulk] ✓ Uploaded: 835100311020926004
   [PDF Bulk] Generating WhatsApp message for: {zona_id: 1, tipe: "PPN", ...}
   [PDF Bulk] ✓ WhatsApp message generated
   [PDF Bulk] Uploading (2/3): 835100311020926005.pdf
   ...
   ```

---

## 🔍 Debugging - If Messages Don't Appear

### Check 1: Verify API is being called
**Browser Console:**
- Open F12 → Network tab
- Upload invoice
- Look for requests to `/api/whatsapp/generate-invoice-messages`
- Should see **200 OK** response

**Expected response body:**
```json
{
  "success": true,
  "message": "Generated X WhatsApp messages for Y zonas",
  "notifications": {
    "Zona Name": {
      "zona_id": 1,
      "message": "*UPDATE INVOICE ZONA (Zona 01)*\n...",
      "invoice_count": 1
    }
  }
}
```

### Check 2: Verify Invoice Has zona_id
The invoice must have `zona_id` populated in database:

```sql
SELECT faktur, zona_id, konsumen, total_jumlah_jual 
FROM invoice_file_list 
WHERE zona_id IS NOT NULL 
LIMIT 5;
```

If `zona_id` is NULL, the WhatsApp message won't generate!

**Fix:** Make sure invoices are properly linked to zonas.

### Check 3: Check Backend Logs
If on Railway, check deployment logs for errors:

```
[API] POST /api/whatsapp/generate-invoice-messages
[WA-Invoice] Creating notifications for X invoices
[WA-Invoice] ✓ Saved X notifications to database
```

### Check 4: Verify Supabase Connection
Run this in backend console:

```javascript
const { createInvoiceNotifications } = require('./whatsapp-invoice-notifications');

const result = await createInvoiceNotifications(
  [{
    zona_id: 1,
    tipe: 'PPN',
    konsumen: 'TEST',
    nominal: 100000
  }],
  'moderator-uuid',
  'batch_test_123'
);

console.log(result);
```

---

## 📊 Database Queries for Verification

### Get all pending messages (not sent)
```sql
SELECT 
  zona_id,
  (SELECT nama FROM zonas WHERE id = whatsapp_invoice_notifications.zona_id) as zona_name,
  invoice_count,
  message,
  created_at
FROM whatsapp_invoice_notifications
WHERE sent_at IS NULL
ORDER BY created_at DESC;
```

### Get message statistics
```sql
SELECT 
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE sent_at IS NULL) as pending,
  COUNT(*) FILTER (WHERE sent_at IS NOT NULL) as sent,
  COUNT(DISTINCT zona_id) as unique_zonas
FROM whatsapp_invoice_notifications;
```

### Get messages by batch
```sql
SELECT 
  batch_id,
  COUNT(*) as message_count,
  COUNT(DISTINCT zona_id) as zona_count,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM whatsapp_invoice_notifications
GROUP BY batch_id
ORDER BY created_at DESC;
```

---

## ✅ Success Criteria

- [x] Upload invoice → messages generate automatically
- [x] Messages appear in `/whatsapp-messages` dashboard
- [x] Messages grouped by zona
- [x] Copy button copies to clipboard
- [x] Message format correct: `*UPDATE INVOICE ZONA (...)*`
- [x] Shows invoice count and type (PPN/PPH)
- [x] "Mark Sent" button updates database

---

## 🚀 Production Deployment

1. **Code changes committed** ✅
2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

3. **Railway auto-deploys** from main branch
4. **Test on production:**
   - Upload test invoice
   - Check `/whatsapp-messages` 
   - Verify database on Railway Postgres

---

## 📞 Support

If messages still don't appear:

1. Check browser console for API errors
2. Check server logs on Railway
3. Verify invoice has `zona_id` in database
4. Verify Supabase URL and keys in `.env`
5. Check if WhatsApp table exists: `SELECT * FROM whatsapp_invoice_notifications LIMIT 1;`

---

**Created:** 2026-09-01
**System:** Pusat Arsip Anka WhatsApp Notifications
**Status:** Ready for Testing
