-- Find invoices with incorrect zona_id mapping
-- Problem: File exists in zona X tapi seharusnya di zona Y

-- 1. Check invoices and match to toko table
SELECT 
    i.id,
    i.tanggal,
    i.konsumen,
    i.toko,
    i.zona_id as current_zona_id,
    z1.kode as current_zona_kode,
    t.zona_id as toko_zona_id,
    z2.kode as toko_zona_kode,
    CASE 
        WHEN i.zona_id = t.zona_id THEN '✅ MATCH'
        ELSE '❌ MISMATCH'
    END as status
FROM invoice_file_list i
LEFT JOIN zonas z1 ON i.zona_id = z1.id
LEFT JOIN toko t ON LOWER(TRIM(i.konsumen)) = LOWER(TRIM(t.nama))
LEFT JOIN zonas z2 ON t.zona_id = z2.id
WHERE i.zona_id IS NOT NULL
  AND t.zona_id IS NOT NULL
  AND i.zona_id != t.zona_id
ORDER BY i.konsumen;

-- 2. Summary of mismatches
SELECT 
    COUNT(*) as total_mismatches,
    COUNT(DISTINCT i.zona_id) as wrong_zonas,
    COUNT(DISTINCT t.zona_id) as correct_zonas
FROM invoice_file_list i
LEFT JOIN toko t ON LOWER(TRIM(i.konsumen)) = LOWER(TRIM(t.nama))
WHERE i.zona_id IS NOT NULL
  AND t.zona_id IS NOT NULL
  AND i.zona_id != t.zona_id;

-- 3. Find specific files that don't match their toko
SELECT 
    i.id,
    i.konsumen,
    i.zona_id,
    z1.kode as wrong_zone,
    t.zona_id as should_be_zona_id,
    z2.kode as should_be_zone
FROM invoice_file_list i
LEFT JOIN zonas z1 ON i.zona_id = z1.id
LEFT JOIN toko t ON LOWER(TRIM(i.konsumen)) = LOWER(TRIM(t.nama))
LEFT JOIN zonas z2 ON t.zona_id = z2.id
WHERE i.zona_id IS NOT NULL
  AND t.zona_id IS NOT NULL
  AND i.zona_id != t.zona_id
LIMIT 20;
