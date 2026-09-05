-- Check invoice data
SELECT 
    COUNT(*) as total,
    COUNT(DISTINCT zona_id) as distinct_zonas,
    COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as null_zona,
    COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) as with_zona
FROM invoice_file_list;

-- Show sample invoices
SELECT id, faktur, konsumen, zona_id, toko FROM invoice_file_list LIMIT 10;

-- Check by zona
SELECT zona_id, COUNT(*) as count FROM invoice_file_list GROUP BY zona_id ORDER BY zona_id;
