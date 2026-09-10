# WhatsApp Notification System - Testing Guide

## System Components
✅ Database Table: `whatsapp_notifications` (sql/add_whatsapp_notifications.sql)
✅ Backend Handler: `backend/whatsapp-notification-handler.js`
✅ API Endpoints: 4 endpoints in `backend/server.js`
✅ Frontend UI: WhatsApp panel in `upload-excel.html`
✅ JavaScript Functions: `js/upload-excel.js`

---

## Pre-Test Checklist

Before testing, ensure:

1. **Database Migration Applied**
   ```bash
   # For Supabase SQL Editor or psql:
   psql -d arsipanka -f sql/add_whatsapp_notifications.sql
   
   # Or via Supabase UI:
   # - Go to SQL Editor
   # - Copy content from sql/add_whatsapp_notifications.sql
   # - Execute
   ```

2. **Backend Server Running**
   ```bash
   # In Railway deployment or local:
   npm start  # or node backend/server.js
   ```

3. **Files Deployed**
   - upload-excel.html (UI updated with WhatsApp panel)
   - js/upload-excel.js (JavaScript functions appended)
   - backend/whatsapp-notification-handler.js (new file)
   - backend/server.js (endpoints added at line 5781+)

---

## Test Flow

### Test 1: Upload Excel with Multiple Invoices Across Zones
**Objective:** Verify WhatsApp messages are generated per zona

**Steps:**
1. Login as Moderator or Super Admin
2. Go to Upload Excel page (https://arsipankagdrive-production.up.railway.app/upload-excel)
3. Create/select Excel file with invoices for multiple zonas:
   - Zona 1 (Bekasi): 5 invoices from toko A, B, C
   - Zona 2 (Jakarta): 3 invoices from toko D, E
   - Zona 3 (Bandung): 2 invoices from toko F

4. Upload the file
5. **Expected Result:**
   - Upload success message shows
   - ✅ WhatsApp panel appears (green #25d366 header)
   - 3 message cards appear (one per zona)
   - Each card shows:
     - Zona name with invoice count (e.g., "📍 Bekasi (5 invoice)")
     - Full formatted message in Indonesian
     - Green "📋 Salin Pesan" button

**Pass Criteria:**
- [ ] Panel displays correctly
- [ ] All 3 zonas have separate messages
- [ ] Message text is formatted in Indonesian
- [ ] Toko names are listed in each message
- [ ] Invoice counts are accurate

---

### Test 2: Copy Message to Clipboard
**Objective:** Verify copy-to-clipboard functionality

**Steps:**
1. From Test 1 result, click "📋 Salin Pesan" button for Zona 1
2. Observe button feedback
3. Open WhatsApp Web or mobile WhatsApp
4. Click in a group chat for that zona
5. Paste (Ctrl+V or Cmd+V)

**Expected Result:**
- Button changes text to "✅ Sudah Disalin!" for 2 seconds
- Button color changes to green
- Clipboard contains the full message with emojis
- Message pastes correctly in WhatsApp

**Pass Criteria:**
- [ ] Button shows success feedback
- [ ] Toast notification appears (if enabled)
- [ ] Message copies successfully
- [ ] Message pastes with formatting intact
- [ ] Emojis render correctly

---

### Test 3: Mark All as Sent
**Objective:** Verify marking batch as sent updates database

**Steps:**
1. From Test 1 result, after copying all messages
2. Click "✅ Tandai Semua Sudah Dikirim" button
3. Check database for sent_at timestamps

**Expected Result:**
- Button is clicked and processed
- WhatsApp panel disappears
- Toast shows: "Semua pesan sudah ditandai sebagai terkirim!"
- In database (whatsapp_notifications table):
  - All 3 records have sent_at timestamp populated
  - batch_id matches all records
  - moderator_id is the current user

**Pass Criteria:**
- [ ] Panel disappears after button click
- [ ] Success message shows
- [ ] Database records updated with sent_at
- [ ] batch_id groups all 3 messages correctly

---

### Test 4: Message Format Validation
**Objective:** Verify message template is correctly formatted

**Expected Message Format (Indonesian):**
```
📦 *NOTIFIKASI UPLOAD INVOICE* 📦

*Zona: [Zona Name]*
📅 Tanggal: [Date & Time]

📊 *RINGKASAN UPLOAD:*
• Total Invoice: *[Count]*
• Toko yang diupload:
• [Toko Name 1]
• [Toko Name 2]
...

✅ Invoice sudah tersimpan di sistem Arsip Anka
📥 Silakan login untuk melihat status file

---
*Pusat Arsip Anka - Document Management System*
```

**Pass Criteria:**
- [ ] All sections present
- [ ] Date in Indonesian locale (e.g., "1 September 2026")
- [ ] Emojis display correctly
- [ ] Bold text renders in WhatsApp (*text*)
- [ ] Toko names are unique (no duplicates)
- [ ] Toko names are alphabetically sorted

---

### Test 5: API Endpoint Validation
**Objective:** Verify backend endpoints work correctly

**5a. POST /api/whatsapp/generate-messages**
```bash
curl -X POST http://localhost:3000/api/whatsapp/generate-messages \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "invoices": [
      {"zona_id": 128, "toko": "Toko A"},
      {"zona_id": 128, "toko": "Toko B"}
    ],
    "batchId": "batch_test_001"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "zona_id": 128,
      "zona_name": "Bekasi",
      "message": "...",
      "invoice_count": 2
    }
  ]
}
```

**5b. GET /api/whatsapp/pending-messages**
```bash
curl -X GET http://localhost:3000/api/whatsapp/pending-messages \
  -H "Authorization: Bearer [TOKEN]"
```

**Expected Response:**
```json
{
  "success": true,
  "count": 3,
  "notifications": {
    "Bekasi": [...],
    "Jakarta": [...],
    "Bandung": [...]
  }
}
```

**5c. POST /api/whatsapp/mark-batch-sent**
```bash
curl -X POST http://localhost:3000/api/whatsapp/mark-batch-sent \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"batchId": "batch_test_001"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Batch marked as sent",
  "count": 3
}
```

**Pass Criteria:**
- [ ] All endpoints return 200 OK
- [ ] Authentication required (401 if no token)
- [ ] Notification count matches expected
- [ ] Message content is present
- [ ] batch_id correctly groups records

---

### Test 6: Database Verification
**Objective:** Confirm database records are correct

**Query to verify:**
```sql
SELECT 
  id,
  zona_id,
  moderator_id,
  invoice_count,
  array_length(toko_list, 1) as toko_count,
  created_at,
  sent_at,
  batch_id
FROM whatsapp_notifications
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Results:**
- [ ] Records exist for uploaded zonas
- [ ] invoice_count > 0
- [ ] toko_list contains array of toko names
- [ ] created_at is recent timestamp
- [ ] sent_at is NULL before marking sent
- [ ] sent_at is populated after "Tandai Semua Sudah Dikirim"
- [ ] batch_id matches for same upload session
- [ ] moderator_id matches current user

---

## Troubleshooting

### Issue: WhatsApp panel doesn't appear after upload
**Solution:**
1. Check browser console (F12) for JavaScript errors
2. Verify API endpoint returns successful response
3. Check backend logs for `/api/whatsapp/generate-messages` 400+ errors
4. Ensure zone exists in database for uploaded invoices

### Issue: Copy button doesn't work
**Solution:**
1. Ensure https:// (clipboard API requires secure context)
2. Check browser permissions for clipboard access
3. Verify Toast library is loaded (if enabled)
4. Test in different browser if issue persists

### Issue: Messages not saved to database
**Solution:**
1. Verify `whatsapp_notifications` table exists
2. Check database migrations were applied
3. Verify Supabase credentials in backend
4. Check backend logs for database errors

### Issue: Mark as sent button does nothing
**Solution:**
1. Check browser console for network errors
2. Verify batch_id is passed correctly
3. Check backend logs for `/api/whatsapp/mark-batch-sent` errors
4. Verify authentication token is valid

---

## Success Criteria - All Tests Pass
✅ WhatsApp panel displays after upload  
✅ Messages grouped by zona  
✅ Message format is correct in Indonesian  
✅ Copy-to-clipboard works  
✅ Messages paste in WhatsApp  
✅ Mark as sent updates database  
✅ Batch grouping works correctly  
✅ API endpoints respond correctly  
✅ Database records are accurate  

---

## Production Deployment Checklist

After testing passes locally:

1. **Apply Database Migration**
   ```sql
   -- Run in Supabase SQL Editor
   -- Content from: sql/add_whatsapp_notifications.sql
   ```

2. **Deploy Files**
   - Commit and push to repository:
   ```bash
   git add sql/add_whatsapp_notifications.sql
   git add backend/whatsapp-notification-handler.js
   git add backend/server.js
   git add upload-excel.html
   git add js/upload-excel.js
   git commit -m "Feature: Manual WhatsApp notification system for zone upload alerts"
   git push origin master
   ```

3. **Verify on Railway**
   - Check deployment succeeds
   - Verify logs show no errors
   - Test upload → message generation → copy flow

4. **Monitor First Day**
   - Watch for API errors in logs
   - Verify database records being created
   - Confirm copy functionality works for moderators
   - Monitor sent_at timestamps being recorded

