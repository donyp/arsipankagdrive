-- ============================================
-- SIMPLE ZONA_ID MIGRATION
-- Copy-paste this into Supabase SQL Editor
-- Click RUN
-- ============================================

-- Check how many invoices need zona_id before migration
SELECT 
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as missing_zona_id,
    COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) as already_have_zona_id
FROM invoice_file_list;

-- Main migration: Match invoices to toko by name
UPDATE invoice_file_list i
SET 
    zona_id = t.zona_id,
    toko_id = t.id,
    updated_at = NOW()
FROM toko t
WHERE LOWER(TRIM(i.konsumen)) = LOWER(TRIM(t.nama))
  AND i.zona_id IS NULL;

-- Handle special cases: Non-Member and ANKA
UPDATE invoice_file_list
SET 
    zona_id = (SELECT id FROM zonas WHERE kode = '08' LIMIT 1),
    updated_at = NOW()
WHERE zona_id IS NULL
  AND (
    LOWER(TRIM(konsumen)) LIKE '%non-member%'
    OR LOWER(TRIM(toko)) LIKE '%anka%'
  );

-- If any still NULL, assign to zone 08 as fallback
UPDATE invoice_file_list
SET 
    zona_id = (SELECT id FROM zonas WHERE kode = '08' LIMIT 1),
    updated_at = NOW()
WHERE zona_id IS NULL;

-- Check results after migration
SELECT 
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as still_missing_zona_id,
    COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) as now_have_zona_id
FROM invoice_file_list;

-- Show distribution by zone
SELECT 
    z.kode,
    z.nama,
    COUNT(i.id) as invoice_count
FROM zonas z
LEFT JOIN invoice_file_list i ON i.zona_id = z.id
GROUP BY z.id, z.kode, z.nama
ORDER BY z.kode;

-- Show status
SELECT 
    CASE 
        WHEN COUNT(CASE WHEN zona_id IS NULL THEN 1 END) = 0
        THEN '✅ SUCCESS: All invoices have zona_id'
        ELSE '⚠️ WARNING: ' || COUNT(CASE WHEN zona_id IS NULL THEN 1 END) || ' still NULL'
    END as status
FROM invoice_file_list;
