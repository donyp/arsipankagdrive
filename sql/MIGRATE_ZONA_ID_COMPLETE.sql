-- ============================================
-- COMPLETE ZONA_ID MIGRATION
-- Fixes admin_zona dashboard showing 0 invoices
-- ============================================

-- STEP 1: Ensure all zonas exist
INSERT INTO public.zonas (kode, nama) VALUES
('01', 'Zona 01'),
('02', 'Zona 02'),
('03A', 'Zona 03A'),
('03B', 'Zona 03B'),
('04', 'Zona 04'),
('05', 'Zona 05'),
('06A', 'Zona 06A'),
('06B', 'Zona 06B'),
('07', 'Zona 07'),
('08', 'Zona 08'),
('09', 'Zona 09'),
('10', 'Zona 10'),
('11', 'Zona 11'),
('12', 'Zona 12'),
('13', 'Zona 13'),
('14', 'Zona 14'),
('15', 'Zona 15'),
('16', 'Zona 16'),
('17', 'Zona 17')
ON CONFLICT (kode) DO UPDATE SET nama = EXCLUDED.nama;

-- STEP 2: Verify zona columns exist
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'invoice_file_list' 
  AND column_name IN ('zona_id', 'toko_id')
ORDER BY ordinal_position;

-- STEP 3: Show status BEFORE migration
SELECT 
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) as with_zona_id,
    COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as missing_zona_id
FROM invoice_file_list;

-- STEP 4: Migration 1 - Match by KONSUMEN (actual store name)
-- This is the main matching strategy
UPDATE invoice_file_list i
SET 
    zona_id = t.zona_id,
    toko_id = t.id,
    updated_at = NOW()
FROM toko t
WHERE LOWER(TRIM(i.konsumen)) = LOWER(TRIM(t.nama))
  AND i.zona_id IS NULL
  AND t.zona_id IS NOT NULL;

-- STEP 5: Check progress after primary match
SELECT 
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) as with_zona_id,
    COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as still_missing
FROM invoice_file_list;

-- STEP 6: Show remaining unmatched invoices
SELECT 
    DISTINCT 
    konsumen,
    toko,
    COUNT(*) as count
FROM invoice_file_list
WHERE zona_id IS NULL
GROUP BY konsumen, toko
ORDER BY count DESC
LIMIT 20;

-- STEP 7: Migration 2 - Handle special cases (Non-Member, ANKA, etc.)
-- Assign to Zona 08 (Pemalang - headquarters area)
UPDATE invoice_file_list
SET 
    zona_id = (SELECT id FROM zonas WHERE kode = '08' LIMIT 1),
    updated_at = NOW()
WHERE zona_id IS NULL
  AND (
    LOWER(TRIM(konsumen)) LIKE '%non-member%'
    OR LOWER(TRIM(toko)) LIKE '%anka%'
    OR LOWER(TRIM(konsumen)) LIKE '%anka%'
  );

-- STEP 8: Check progress after special cases
SELECT 
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) as with_zona_id,
    COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as still_missing
FROM invoice_file_list;

-- STEP 9: Show final unmatched (if any)
SELECT 
    DISTINCT 
    konsumen,
    toko,
    COUNT(*) as count
FROM invoice_file_list
WHERE zona_id IS NULL
GROUP BY konsumen, toko
ORDER BY count DESC;

-- STEP 10: Show distribution by zona
SELECT 
    z.id,
    z.kode,
    z.nama,
    COUNT(i.id) as invoice_count,
    COUNT(DISTINCT i.konsumen) as unique_tokos,
    MIN(i.tanggal) as earliest_invoice,
    MAX(i.tanggal) as latest_invoice,
    ROUND(SUM(COALESCE(i.total_jumlah_jual, 0))::numeric, 0) as total_nominal
FROM invoice_file_list i
RIGHT JOIN zonas z ON i.zona_id = z.id
GROUP BY z.id, z.kode, z.nama
ORDER BY z.id;

-- STEP 11: Verify critical stats
SELECT 
    'Total invoices' as metric,
    COUNT(*) as value,
    '' as note
FROM invoice_file_list

UNION ALL

SELECT 
    'Invoices with zona_id' as metric,
    COUNT(*) as value,
    '✅ Ready for filtering' as note
FROM invoice_file_list
WHERE zona_id IS NOT NULL

UNION ALL

SELECT 
    'Invoices without zona_id' as metric,
    COUNT(*) as value,
    '⚠️ Still unmatched' as note
FROM invoice_file_list
WHERE zona_id IS NULL

UNION ALL

SELECT 
    'Unique zones assigned' as metric,
    COUNT(DISTINCT zona_id) as value,
    'Should be 17-19' as note
FROM invoice_file_list
WHERE zona_id IS NOT NULL;

-- STEP 12: Sample data verification
SELECT 
    id,
    tanggal,
    toko,
    konsumen,
    faktur,
    zona_id,
    status
FROM invoice_file_list
WHERE zona_id IS NOT NULL
ORDER BY zona_id, tanggal DESC
LIMIT 20;

-- STEP 13: Final summary
SELECT 
    CASE 
        WHEN COUNT(*) = COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) 
        THEN '✅ SUCCESS: All invoices have zona_id assigned'
        ELSE '⚠️ WARNING: ' || COUNT(CASE WHEN zona_id IS NULL THEN 1 END) || ' invoices still missing zona_id'
    END as migration_status,
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) as assigned,
    COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as unassigned
FROM invoice_file_list;
