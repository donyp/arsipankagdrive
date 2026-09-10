# WhatsApp Notification System - Setup Guide

## ⚠️ PERLU SETUP DATABASE TERLEBIH DAHULU

Fitur WhatsApp notification **sudah di-deploy ke production**, tapi **tabel database belum di-create**.

---

## 🔧 Step 1: Buat Table di Supabase

### Opsi A: Gunakan Supabase UI (RECOMMENDED)

1. Login ke Supabase Dashboard
2. Pilih project `arsipanka`
3. Pergi ke **SQL Editor**
4. Klik **New Query**
5. Copy-paste kode berikut:

```sql
-- ============================================================
-- WhatsApp Notifications Table
-- Stores auto-generated WhatsApp messages for zona groups
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zona_id INTEGER NOT NULL REFERENCES zonas(id),
    moderator_id UUID NOT NULL REFERENCES auth.users(id),
    invoice_count INTEGER NOT NULL,
    toko_list TEXT[] NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    batch_id UUID,
    
    CONSTRAINT chk_invoice_count CHECK (invoice_count > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_zona_id ON whatsapp_notifications(zona_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_moderator_id ON whatsapp_notifications(moderator_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_batch_id ON whatsapp_notifications(batch_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sent_at ON whatsapp_notifications(sent_at) WHERE sent_at IS NULL;

-- Comments
COMMENT ON TABLE whatsapp_notifications IS 'Stores auto-generated WhatsApp messages for manual copy-paste to zona groups';
COMMENT ON COLUMN whatsapp_notifications.sent_at IS 'Timestamp when moderator marked as sent to group';
COMMENT ON COLUMN whatsapp_notifications.batch_id IS 'Batch ID from excel upload session for grouping related uploads';
```

6. Klik **Run** (atau Ctrl+Enter)
7. Tunggu sampai selesai (akan melihat ✅ success message)

### Opsi B: Gunakan psql Command (jika ada akses CLI)

```bash
psql -d arsipanka -U postgres -f sql/add_whatsapp_notifications.sql
```

---

## ✅ Verify Table Created

### Di Supabase UI:
1. Pergi ke **Table Editor** di sidebar kiri
2. Lihat apakah `whatsapp_notifications` muncul di list
3. Klik table → cek columns ada: id, zona_id, moderator_id, invoice_count, toko_list, message, created_at, sent_at, batch_id

### Atau query di SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'whatsapp_notifications';
```

Harus return 1 row kalau berhasil.

---

## 🧪 Step 2: Test Feature

### Test di Production:

1. **Login ke aplikasi**
   - URL: https://arsipankagdrive-production.up.railway.app/
   - Login sebagai Moderator atau Super Admin

2. **Upload Excel dengan invoices dari multiple zonas**
   - Pergi ke **Upload Excel** menu
   - Upload file dengan invoices untuk:
     - Zona 1 (minimal 2 invoices)
     - Zona 2 (minimal 2 invoices)
   - Centang checkbox upload
   - Klik tombol upload

3. **Verifikasi WhatsApp Panel Muncul**
   - Setelah upload berhasil, harus lihat:
     - ✅ Success message ("File berhasil diupload!")
     - 📱 WhatsApp panel dengan header hijau
     - Messages untuk masing-masing zona
     - 📋 Tombol "Salin Pesan" untuk setiap zona

4. **Test Copy Paste**
   - Klik tombol "📋 Salin Pesan" untuk zona 1
   - Harusnya button berubah jadi "✅ Sudah Disalin!" (hijau, 2 detik)
   - Buka WhatsApp Web atau mobile
   - Paste ke group zona
   - Cek format message sudah benar (Indonesian, emojis, toko names, dll)

5. **Test Mark as Sent**
   - Setelah copy semua messages dan kirim ke WhatsApp groups
   - Klik "✅ Tandai Semua Sudah Dikirim"
   - Panel WhatsApp harus hilang
   - Harus muncul toast success message

6. **Verify Database**
   - Buka Supabase SQL Editor
   - Query:
   ```sql
   SELECT zona_id, invoice_count, created_at, sent_at 
   FROM whatsapp_notifications 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
   - Harus lihat 2 rows (satu per zona)
   - `sent_at` harus ada value (bukan NULL) setelah klik "Mark as Sent"

---

## 🐛 Troubleshooting

### Issue: WhatsApp panel tidak muncul setelah upload

**Kemungkinan penyebab & solusi:**

#### A. Database table belum di-create
```sql
-- Check apakah table exist
SELECT * FROM whatsapp_notifications LIMIT 1;
-- Kalau error "does not exist", jalankan SQL di atas
```

#### B. API error saat generate messages
- Buka browser console (F12)
- Pergi ke **Network** tab
- Upload file
- Cari request ke `/api/whatsapp/generate-messages`
- Lihat response (harus 200 OK dengan JSON)
- Kalau error, lihat message-nya

#### C. JavaScript error
- Buka browser console (F12)
- Lihat apakah ada error messages
- Common errors:
  - "generateWhatsappMessages is not defined" → js/upload-excel.js tidak load
  - "Cannot read property 'display'" → DOM elements belum render
  - Network error → API endpoint error

#### D. Zone invoices tidak properly grouped
- Pastikan Excel file punya kolom:
  - `zona_id` (number)
  - `toko` (text)
  - Minimal 2 zona dengan 1+ invoices masing-masing

### Issue: Messages tidak berhasil di-copy

**Solusi:**
- Pastikan HTTPS (clipboard API butuh secure context)
- Coba di browser berbeda
- Cek browser permissions untuk clipboard
- Check browser console untuk error messages

### Issue: Mark as Sent tidak work

**Solusi:**
- Buka Network tab (F12)
- Klik "Tandai Semua Sudah Dikirim"
- Cari request `/api/whatsapp/mark-batch-sent`
- Lihat response (harus 200 OK)
- Kalau error, cek batch_id ada value

---

## 📋 Database Structure

```sql
whatsapp_notifications table:
├── id (UUID, primary key, auto-generated)
├── zona_id (INTEGER, foreign key to zonas)
├── moderator_id (UUID, foreign key to auth.users)
├── invoice_count (INTEGER, > 0)
├── toko_list (TEXT[], array of toko names)
├── message (TEXT, pre-formatted WhatsApp message)
├── created_at (TIMESTAMP, auto-generated)
├── sent_at (TIMESTAMP, nullable, populated when marked sent)
└── batch_id (UUID, groups messages from same upload)

Indexes:
├── zona_id (for filtering by zona)
├── moderator_id (for filtering by moderator)
├── batch_id (for grouping batches)
└── sent_at WHERE IS NULL (for pending messages query)
```

---

## 🚀 After Setup Complete

1. ✅ Database table created
2. ✅ Test upload → messages generated → copy → mark sent
3. ✅ Monitor first 24 hours:
   - Check database for new records
   - Verify sent_at timestamps being recorded
   - Monitor for any API errors in logs

---

## 📞 Support

**Jika masih ada issue:**
- Check browser console (F12) untuk error messages
- Query database: `SELECT * FROM whatsapp_notifications ORDER BY created_at DESC LIMIT 10;`
- Check Railway logs untuk backend errors
- Verify all environment variables set (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

