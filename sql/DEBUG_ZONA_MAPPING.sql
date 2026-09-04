-- Debug: Find zona_id untuk Bitung, Pasar Kemis, Kutabumi

-- 1. Cari toko-toko ini di toko table dengan zona_id
SELECT 
    id,
    nama,
    zona_id,
    (SELECT kode FROM zonas WHERE id = toko.zona_id) as zona_kode
FROM toko
WHERE LOWER(nama) LIKE '%bitung%' 
   OR LOWER(nama) LIKE '%pasar kemis%' 
   OR LOWER(nama) LIKE '%kutabumi%'
ORDER BY nama;

-- 2. Cek invoices untuk toko-toko ini
SELECT 
    i.id,
    i.konsumen,
    i.toko,
    i.zona_id,
    z.kode,
    z.nama
FROM invoice_file_list i
LEFT JOIN zonas z ON i.zona_id = z.id
WHERE LOWER(i.konsumen) LIKE '%bitung%' 
   OR LOWER(i.konsumen) LIKE '%pasar kemis%' 
   OR LOWER(i.konsumen) LIKE '%kutabumi%'
ORDER BY i.konsumen;

-- 3. Lihat zona_id mana yang digunakan untuk invoices ini
SELECT DISTINCT
    i.zona_id,
    z.id,
    z.kode,
    z.nama,
    COUNT(i.id) as invoice_count
FROM invoice_file_list i
LEFT JOIN zonas z ON i.zona_id = z.id
WHERE LOWER(i.konsumen) LIKE '%bitung%' 
   OR LOWER(i.konsumen) LIKE '%pasar kemis%' 
   OR LOWER(i.konsumen) LIKE '%kutabumi%'
GROUP BY i.zona_id, z.id, z.kode, z.nama;

-- 4. Cek: admin_zona_zona 01 punya zona_id berapa?
SELECT 
    id,
    email,
    zona_id,
    (SELECT kode FROM zonas WHERE id = users.zona_id) as zona_kode,
    (SELECT COUNT(*) FROM invoice_file_list WHERE zona_id = users.zona_id) as invoice_count
FROM users
WHERE email = 'admin_zona_zona 01';

-- 5. Cek mapping antara admin_zona zone dan invoice zone
SELECT 
    u.email,
    u.zona_id as user_zona_id,
    uz.kode as user_zona_kode,
    iz.id as invoice_zona_id,
    iz.kode as invoice_zona_kode,
    COUNT(i.id) as invoices_in_this_user_zone
FROM users u
LEFT JOIN zonas uz ON u.zona_id = uz.id
LEFT JOIN zonas iz ON u.zona_id = iz.id
LEFT JOIN invoice_file_list i ON i.zona_id = u.zona_id
WHERE u.role = 'admin_zona'
GROUP BY u.id, u.email, u.zona_id, uz.kode, iz.id, iz.kode
ORDER BY u.zona_id;

-- 6. Lihat zona table lengkap
SELECT 
    id,
    kode,
    nama
FROM zonas
ORDER BY id;

-- 7. Quick check: berapa total invoices yang sudah ter-assign zona_id?
SELECT 
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) as with_zona_id,
    COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as without_zona_id
FROM invoice_file_list;
