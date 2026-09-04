-- Check if admin_zona users have zona_id populated

-- 1. Check all users
SELECT 
    id,
    email,
    role,
    zona_id,
    is_active
FROM "user"
ORDER BY role, email;

-- 2. Check admin_zona users specifically
SELECT 
    id,
    email,
    role,
    zona_id,
    is_active,
    (SELECT COUNT(*) FROM invoice_file_list WHERE zona_id = users.zona_id) as invoice_count
FROM "user"
WHERE role = 'admin_zona'
ORDER BY zona_id;

-- 3. Get zona info for admin_zona users
SELECT 
    u.id,
    u.email,
    u.zona_id,
    z.kode,
    z.nama,
    COUNT(i.id) as invoices_in_this_zona
FROM "user" u
LEFT JOIN zonas z ON u.zona_id = z.id
LEFT JOIN invoice_file_list i ON i.zona_id = u.zona_id
WHERE u.role = 'admin_zona'
GROUP BY u.id, u.email, u.zona_id, z.kode, z.nama
ORDER BY u.zona_id;

-- 4. Count invoices by zona
SELECT 
    z.id,
    z.kode,
    z.nama,
    COUNT(i.id) as invoice_count
FROM zonas z
LEFT JOIN invoice_file_list i ON i.zona_id = z.id
GROUP BY z.id, z.kode, z.nama
ORDER BY z.id;

-- 5. Check if zona_id column in users table exists
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user'
  AND (column_name = 'zona_id' OR column_name LIKE '%zona%')
ORDER BY ordinal_position;

-- 6. Test the exact query the API would run
-- Assume first admin_zona user has zona_id = 1
SELECT 
    i.id,
    i.tanggal,
    i.konsumen,
    i.toko,
    i.faktur,
    i.zona_id,
    i.status
FROM invoice_file_list i
WHERE i.zona_id = (
    SELECT zona_id FROM "user" 
    WHERE role = 'admin_zona' 
    LIMIT 1
)
LIMIT 5;
