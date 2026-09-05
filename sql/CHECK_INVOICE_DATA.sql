-- Check what's in invoice_file_list
SELECT 
    COUNT(*) as total_invoices,
    COUNT(DISTINCT zona_id) as distinct_zonas,
    COUNT(DISTINCT konsumen) as distinct_konsumen,
    COUNT(DISTINCT CASE WHEN zona_id IS NULL THEN 1 END) as null_zona_count
FROM invoice_file_list;

-- Check invoices per zona
SELECT 
    ifl.zona_id,
    z.kode,
    z.nama,
    COUNT(*) as invoice_count,
    COUNT(DISTINCT ifl.konsumen) as unique_konsumen
FROM invoice_file_list ifl
LEFT JOIN zonas z ON z.id = ifl.zona_id
GROUP BY ifl.zona_id, z.kode, z.nama
ORDER BY ifl.zona_id;

-- Check sample konsumen names
SELECT DISTINCT konsumen FROM invoice_file_list WHERE zona_id IS NOT NULL LIMIT 20;
