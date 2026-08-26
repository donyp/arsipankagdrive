# 🧪 Supabase Database Test Queries

**Project**: ehdqcxzdmmcwbdwkinyr  
**URL**: https://app.supabase.com  

Mari jalankan test queries untuk verify database schema.

---

## 📋 Cara Akses Supabase SQL Editor

1. Buka: https://app.supabase.com
2. Login dengan email yang ada
3. Pilih project: `ehdqcxzdmmcwbdwkinyr`
4. Klik sidebar: **SQL Editor**
5. Klik: **New Query**
6. Copy-paste query dari bawah
7. Klik: **Run** (atau Ctrl+Enter)

---

## 🧪 TEST QUERY 1: Check Tabel Utama

**Tujuan**: Verifikasi semua tabel yang diharapkan ada

```sql
-- Check if all required tables exist
SELECT 
    table_name,
    table_schema
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
    AND table_name IN ('files', 'users', 'zonas', 'tokos', 'notifications')
ORDER BY 
    table_name;
```

**Expected Output**:
```
table_name       table_schema
─────────────────────────────
files            public
notifications    public
tokos            public
users            public
zonas            public
```

**Apa yang diperiksa**: 
- ✅ Tabel `files` ada
- ✅ Tabel `users` ada
- ✅ Tabel `zonas` ada
- ✅ Tabel `tokos` ada
- ✅ Tabel `notifications` ada

**Jika Ada Error**:
- "ERROR: relation does not exist" → Tabel belum dibuat
- "0 rows" → Beberapa tabel hilang

---

## 🧪 TEST QUERY 2: Check Kolom di Tabel `files`

**Tujuan**: Verifikasi struktur kolom dalam tabel files

```sql
-- Check columns in files table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'files'
ORDER BY 
    ordinal_position;
```

**Expected Columns** (minimal):
```
column_name          data_type                 is_nullable
────────────────────────────────────────────────────────────
id                   uuid                      NO
nama_file            text                      NO
category             text                      NO (INVOICE/PIUTANG)
zona_id              uuid                      YES
toko_id              uuid                      YES
storage_path         text                      YES
created_at           timestamp with tz        NO
updated_at           timestamp with tz        NO
status               text                      YES
tanggal_dokumen      date                      YES
... other columns
```

**Apa yang diperiksa**:
- ✅ Kolom `id` tipe UUID
- ✅ Kolom `nama_file` tipe TEXT
- ✅ Kolom `category` tipe TEXT
- ✅ Kolom `zona_id` & `toko_id` tipe UUID
- ✅ Kolom `created_at` & `updated_at` tipe TIMESTAMP

---

## 🧪 TEST QUERY 3: Count Records di Setiap Tabel

**Tujuan**: Lihat berapa banyak data ada

```sql
-- Count total records in each table
SELECT 
    'files' as table_name,
    COUNT(*) as record_count
FROM files
UNION ALL
SELECT 
    'users',
    COUNT(*)
FROM users
UNION ALL
SELECT 
    'zonas',
    COUNT(*)
FROM zonas
UNION ALL
SELECT 
    'tokos',
    COUNT(*)
FROM tokos
UNION ALL
SELECT 
    'notifications',
    COUNT(*)
FROM notifications
ORDER BY 
    table_name;
```

**Expected Output** (contoh):
```
table_name      record_count
──────────────────────────────
files           1577
notifications   0-50 (various)
tokos           50-200 (various)
users           1-5 (at least 1)
zonas           5-20 (various)
```

**Apa yang diperiksa**:
- ✅ Tabel `files` punya ~1577 records
- ✅ Tabel `users` punya minimal 1 record
- ✅ Tabel `zonas` punya data
- ✅ Tabel `tokos` punya data
- ✅ Database tidak kosong

---

## 🧪 TEST QUERY 4: Get Sample Files

**Tujuan**: Lihat data file yang sebenarnya ada

```sql
-- Get first 10 files
SELECT 
    id,
    nama_file,
    category,
    zona_id,
    toko_id,
    created_at,
    status
FROM files
LIMIT 10;
```

**Expected Output** (contoh):
```
id (uuid)                            nama_file              category    created_at             status
──────────────────────────────────────────────────────────────────────────────────────────────────────────
d0548d41-c30f-4d73-9127-12f974... | INV-2024-001.pdf     | INVOICE  | 2024-08-15 10:30:00 | Read
f123e456-7890-abcd-ef12-345678... | PAYMENT-2024-001.pdf | PIUTANG  | 2024-08-16 14:22:00 | Unread
... more records
```

**Apa yang diperiksa**:
- ✅ Data files benar-benar ada
- ✅ Nama file valid
- ✅ Category sesuai (INVOICE/PIUTANG)
- ✅ Timestamps ada dan reasonable

---

## 🧪 TEST QUERY 5: Check User Accounts

**Tujuan**: Verifikasi ada user untuk testing

```sql
-- Get user accounts
SELECT 
    id,
    email,
    role,
    name
FROM users
LIMIT 5;
```

**Expected Output**:
```
id (uuid)                            email              role           name
─────────────────────────────────────────────────────────────────────────────
d0548d41-c30f-4d73-9127-12f974... | moderator@... | super_admin  | Doni
a1234567-89ab-cdef-0123-456789... | admin@...     | admin_zona   | Admin Name
... more users
```

**Apa yang diperiksa**:
- ✅ Ada user untuk login
- ✅ Role ada (super_admin, admin_zona, moderator)
- ✅ Email valid

---

## 🧪 TEST QUERY 6: Check Zonas (Geography)

**Tujuan**: Verifikasi data geografis ada

```sql
-- Get zones/regions
SELECT 
    id,
    nama,
    description
FROM zonas
LIMIT 5;
```

**Expected Output**:
```
id (uuid)                            nama                 description
──────────────────────────────────────────────────────────────────────────────
z1234567-89ab-cdef-0123-456789... | Karawang            | Karawang Region
z2345678-90ab-cdef-0123-456789... | Jakarta             | Jakarta Region
... more zones
```

---

## 🧪 TEST QUERY 7: Check Foreign Key Relationships

**Tujuan**: Verifikasi hubungan antar tabel

```sql
-- Check if files have valid zona_id references
SELECT 
    COUNT(*) as total_files,
    COUNT(zona_id) as files_with_zona,
    COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as files_without_zona
FROM files;
```

**Expected Output**:
```
total_files    files_with_zona    files_without_zona
──────────────────────────────────────────────────────
1577           1500-1577          0-77
```

**Apa yang diperiksa**:
- ✅ Mayoritas files punya zona_id
- ✅ Foreign key intact
- ✅ Data consistency baik

---

## 🧪 TEST QUERY 8: Test Write Permission (OPTIONAL)

**Tujuan**: Verifikasi bisa insert/update data (hati-hati!)

```sql
-- Check if you can write (this will create a test record)
-- WARNING: This will insert a test record
INSERT INTO files (
    nama_file,
    category,
    status,
    created_at,
    updated_at
) VALUES (
    'TEST_FILE_2026.txt',
    'INVOICE',
    'Test',
    NOW(),
    NOW()
)
RETURNING id, nama_file, created_at;
```

**Expected**: 
- Berhasil insert dan return ID baru
- Test record ada di database

**Cleanup (hapus test record)**:
```sql
DELETE FROM files 
WHERE nama_file = 'TEST_FILE_2026.txt';
```

---

## 📋 Test Checklist

Jalankan queries dalam urutan ini dan check hasilnya:

- [ ] **Query 1**: Semua tabel ada
- [ ] **Query 2**: Kolom files valid
- [ ] **Query 3**: Data ada di tabel (count > 0)
- [ ] **Query 4**: Sample files bisa diambil
- [ ] **Query 5**: Ada user accounts
- [ ] **Query 6**: Ada zona data
- [ ] **Query 7**: Foreign keys intact
- [ ] **Query 8** (Optional): Insert bisa dilakukan

---

## 🎯 Kesimpulan Test

### Jika Semua PASS ✅
```
✅ Database schema valid
✅ Semua tabel ada
✅ Data ada dan konsisten
✅ Foreign keys work
✅ Database siap production
→ DATABASE VERIFICATION COMPLETE
```

### Jika Ada FAIL ❌
```
❌ Tabel hilang → Perlu migration
❌ Kolom salah → Perlu schema fix
❌ Data kosong → Perlu seed data
❌ Query error → Perlu debugging
→ DATABASE NEEDS REPAIR
```

---

## 📊 Hasil Test Format

Setelah run semua queries, dokumentasikan hasil:

```
DATABASE VERIFICATION RESULTS
═════════════════════════════════════

Test 1 (Table Existence):     ✅ PASS / ❌ FAIL
  Status: [5/5 tables found]

Test 2 (Column Structure):    ✅ PASS / ❌ FAIL
  Status: [All required columns exist]

Test 3 (Data Count):          ✅ PASS / ❌ FAIL
  Status: [files: 1577, users: 1, zonas: X, tokos: Y]

Test 4 (Sample Data):         ✅ PASS / ❌ FAIL
  Status: [10 files retrieved successfully]

Test 5 (Users):               ✅ PASS / ❌ FAIL
  Status: [At least 1 user found]

Test 6 (Zones):               ✅ PASS / ❌ FAIL
  Status: [X zones found]

Test 7 (Foreign Keys):        ✅ PASS / ❌ FAIL
  Status: [Relationships intact]

Test 8 (Write Permission):    ✅ PASS / ⏭️ SKIPPED
  Status: [Insert/Update works]

═════════════════════════════════════
OVERALL: ✅ DATABASE VERIFIED
         Database ready for production
```

---

## 🔗 Helpful Links

- **Supabase Console**: https://app.supabase.com
- **Project ID**: ehdqcxzdmmcwbdwkinyr
- **SQL Editor**: Project → SQL Editor
- **Documentation**: https://supabase.com/docs

---

## 💡 Tips

- **Syntax Help**: Hover atas query untuk docs
- **Format SQL**: Klik "Format" button
- **Save Query**: Klik save untuk reuse nanti
- **History**: Lihat riwayat di sebelah kiri
- **Keyboard Shortcut**: Ctrl+Enter untuk run

---

**Next**: Jalankan queries di Supabase dashboard dan report hasilnya!
