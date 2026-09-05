-- Compare invoice konsumen names with toko table

-- 1. Show all invoice konsumen (from new upload)
SELECT DISTINCT 
    konsumen,
    COUNT(*) as count
FROM invoice_file_list
ORDER BY konsumen;

-- 2. Show all toko names
SELECT DISTINCT 
    nama,
    zona_id,
    (SELECT kode FROM zonas WHERE id = toko.zona_id) as zona_kode
FROM toko
ORDER BY nama;

-- 3. Find mismatches - invoices NOT in toko table
SELECT DISTINCT 
    i.konsumen,
    COUNT(*) as invoice_count,
    CASE 
        WHEN t.id IS NULL THEN 'NOT IN TOKO TABLE'
        ELSE 'FOUND'
    END as status
FROM invoice_file_list i
LEFT JOIN toko t ON LOWER(TRIM(i.konsumen)) = LOWER(TRIM(t.nama))
GROUP BY i.konsumen, t.id
ORDER BY status DESC, invoice_count DESC;

-- 4. Show invoices with NULL zona_id
SELECT 
    konsumen,
    COUNT(*) as count,
    status
FROM invoice_file_list
WHERE zona_id IS NULL
GROUP BY konsumen, status
ORDER BY count DESC;

-- 5. Check: Do we have any invoices with zona_id assigned?
SELECT 
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) as with_zona,
    COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as without_zona
FROM invoice_file_list;
