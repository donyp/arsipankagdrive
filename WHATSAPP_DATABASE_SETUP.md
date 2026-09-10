# WhatsApp Notifications - Database Setup (REQUIRED)

## ⚠️ CRITICAL: Database Tables Belum Di-Create

Anda sudah upload data, tapi pesan tidak muncul karena **2 database tables belum di-create**.

---

## 🔧 Setup Sekarang (5 menit)

### Step 1: Buka Supabase SQL Editor

1. Login ke https://supabase.com
2. Pilih project: **arsipanka**
3. Di sidebar kiri, click: **SQL Editor**
4. Click: **New Query**

### Step 2: Create Table #1 - Excel Upload Messages

Copy-paste kode ini ke SQL Editor:

```sql
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

CREATE INDEX IF NOT EXISTS idx_whatsapp_zona_id ON whatsapp_notifications(zona_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_moderator_id ON whatsapp_notifications(moderator_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_batch_id ON whatsapp_notifications(batch_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sent_at ON whatsapp_notifications(sent_at) WHERE sent_at IS NULL;
```

Click: **RUN** (atau Ctrl+Enter)

Tunggu sampai ✅ success message muncul.

### Step 3: Create Table #2 - Invoice Upload Messages

Klik: **New Query** (atau clear query sebelumnya)

Copy-paste kode ini:

```sql
CREATE TABLE IF NOT EXISTS whatsapp_invoice_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zona_id INTEGER NOT NULL REFERENCES zonas(id),
    moderator_id UUID NOT NULL REFERENCES auth.users(id),
    invoice_count INTEGER NOT NULL,
    invoice_details JSONB DEFAULT '[]',
    message TEXT NOT NULL,
    notification_type TEXT DEFAULT 'invoice_upload',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    batch_id UUID,
    
    CONSTRAINT chk_invoice_count CHECK (invoice_count > 0),
    CONSTRAINT chk_notification_type CHECK (notification_type IN ('invoice_upload', 'excel_upload'))
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inv_zona_id ON whatsapp_invoice_notifications(zona_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inv_moderator_id ON whatsapp_invoice_notifications(moderator_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inv_batch_id ON whatsapp_invoice_notifications(batch_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inv_sent_at ON whatsapp_invoice_notifications(sent_at) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_inv_type ON whatsapp_invoice_notifications(notification_type);
```

Click: **RUN**

Tunggu sampai ✅ success.

---

## ✅ Verify Tables Created

### Option A: Di Supabase UI

1. Go to: **Table Editor** (sidebar kiri)
2. Lihat apakah 2 tables muncul:
   - `whatsapp_notifications`
   - `whatsapp_invoice_notifications`

### Option B: Query di SQL Editor

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'whatsapp%'
ORDER BY table_name;
```

Harus return 2 rows:
- whatsapp_invoice_notifications
- whatsapp_notifications

---

## 🔄 Re-Upload Data

Sekarang database siap. Upload ulang data:

### Upload Excel:
1. Login ke web
2. Go to: **Sistem Invoice → Upload Excel**
3. Upload file dengan invoices dari 2+ zonas
4. Tunggu success message
5. Harusnya WhatsApp panel muncul dengan messages

### Upload Invoice (PDF):
1. Go to: **Sistem Invoice → Upload Invoice**
2. Upload 1-2 invoices dengan data:
   - Zona
   - Tipe (PPN/PPH)
   - Konsumen name
   - Nominal
3. Tunggu success
4. WhatsApp messages harusnya generated

---

## 👀 View Generated Messages

### Method 1: Di Upload Page
Setelah upload berhasil, panel WhatsApp muncul langsung di page dengan:
- Copy button per zona
- Mark as sent button

### Method 2: WhatsApp Messages Menu
1. Click sidebar: **WhatsApp Messages**
2. Lihat semua generated messages
3. Filter by status atau type
4. Copy/mark sent dari sini

---

## 🧪 Test Query

Setelah re-upload, jalankan query ini di SQL Editor untuk verify data tersimpan:

```sql
-- Check Excel Upload Messages
SELECT zona_id, invoice_count, created_at, sent_at 
FROM whatsapp_notifications 
ORDER BY created_at DESC 
LIMIT 5;

-- Check Invoice Upload Messages
SELECT zona_id, invoice_count, notification_type, created_at, sent_at 
FROM whatsapp_invoice_notifications 
ORDER BY created_at DESC 
LIMIT 5;
```

Harus return data dari upload terbaru.

---

## ❓ Troubleshooting

### Masalah: "table does not exist" error
**Solusi:** Table belum di-create. Jalankan SQL setup di atas.

### Masalah: Upload success tapi tidak ada messages
**Solusi:**
1. Check browser console (F12) untuk error
2. Verify tables created dengan query di atas
3. Jalankan upload lagi

### Masalah: WhatsApp panel tidak muncul setelah upload
**Solusi:**
1. Check Network tab (F12) → filter `/api/whatsapp`
2. Lihat `/api/whatsapp/generate-messages` response
3. Cek jika ada error message

---

## Summary

| Item | Status |
|------|--------|
| Backend API | ✅ Deployed |
| Frontend UI | ✅ Deployed |
| Database Tables | ❌ **PERLU SETUP** |
| WhatsApp Messages Page | ✅ Deployed |

**Setelah setup database → SEMUA SIAP!** 🚀

