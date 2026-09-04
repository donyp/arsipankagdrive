-- Debug: Check invoice data and zona assignments

-- 1. Total invoices and zona_id status
SELECT 
    'TOTAL' as category,
    COUNT(*) as count,
    COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as null_count,
    COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) as with_zona
FROM invoice_file_list;

-- 2. Distribution by zona
SELECT 
    z.id,
    z.kode,
    z.nama,
    COUNT(i.id) as invoice_count
FROM zonas z
LEFT JOIN invoice_file_list i ON i.zona_id = z.id
GROUP BY z.id, z.kode, z.nama
ORDER BY z.id;

-- 3. Check admin_zona users
SELECT 
    id,
    email,
    role,
    zona_id,
    (SELECT kode FROM zonas WHERE id = users.zona_id) as zona_kode,
    (SELECT COUNT(*) FROM invoice_file_list WHERE zona_id = users.zona_id) as invoice_count
FROM "user"
WHERE role = 'admin_zona'
ORDER BY zona_id;

-- 4. Sample invoices with zona_id populated
SELECT 
    id,
    tanggal,
    konsumen,
    toko,
    faktur,
    zona_id,
    (SELECT kode FROM zonas WHERE id = invoice_file_list.zona_id) as zona_kode,
    status
FROM invoice_file_list
WHERE zona_id IS NOT NULL
ORDER BY zona_id, tanggal DESC
LIMIT 10;

-- 5. Check if any invoices still have NULL zona_id (should be 0)
SELECT 
    COUNT(*) as null_zona_count,
    STRING_AGG(DISTINCT konsumen, ', ' ORDER BY konsumen) as sample_konsumen
FROM invoice_file_list
WHERE zona_id IS NULL
LIMIT 20;

-- 6. Try the exact query the API would run (for admin_zona with zona_id=1)
SELECT 
    id,
    tanggal,
    toko,
    konsumen,
    faktur,
    zona_id,
    status
FROM invoice_file_list
WHERE zona_id = (SELECT id FROM zonas WHERE kode = '01' LIMIT 1)
ORDER BY tanggal DESC
LIMIT 5;

-- 7. Find zona ID for kode '01'
SELECT id, kode, nama FROM zonas WHERE kode = '01';

-- 8. Try hardcoded: get first admin_zona user
SELECT 
    u.id,
    u.email,
    u.zona_id,
    z.kode,
    z.nama,
    COUNT(i.id) as invoice_for_this_zona
FROM "user" u
LEFT JOIN zonas z ON u.zona_id = z.id
LEFT JOIN invoice_file_list i ON i.zona_id = u.zona_id
WHERE u.role = 'admin_zona'
GROUP BY u.id, u.email, u.zona_id, z.kode, z.nama
LIMIT 5;
