-- Quick status check before and after migration
-- Run this to see current state

-- 1. Invoice counts
SELECT 
    'Invoices with zona_id' as check_name,
    COUNT(*) as count
FROM invoice_file_list
WHERE zona_id IS NOT NULL

UNION ALL

SELECT 
    'Invoices NULL zona_id' as check_name,
    COUNT(*) as count
FROM invoice_file_list
WHERE zona_id IS NULL

UNION ALL

SELECT 
    'Total invoices' as check_name,
    COUNT(*) as count
FROM invoice_file_list;

-- 2. Zones available
SELECT 
    'Zones defined' as check_name,
    COUNT(*) as count
FROM zonas;

-- 3. Admin zona users
SELECT 
    'Admin_zona users' as check_name,
    COUNT(*) as count
FROM "user"
WHERE role = 'admin_zona';

-- 4. Distribution by zone
SELECT 
    z.kode || ' - ' || z.nama as zone_name,
    COUNT(i.id) as invoice_count,
    COUNT(DISTINCT i.konsumen) as toko_count
FROM zonas z
LEFT JOIN invoice_file_list i ON i.zona_id = z.id
GROUP BY z.id, z.kode, z.nama
ORDER BY z.id;

-- 5. Sample data
SELECT 
    'Sample invoices' as label,
    id,
    tanggal,
    konsumen,
    faktur,
    zona_id
FROM invoice_file_list
WHERE zona_id IS NOT NULL
ORDER BY tanggal DESC
LIMIT 5;
