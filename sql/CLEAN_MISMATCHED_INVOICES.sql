-- ============================================
-- CLEAN UP MISMATCHED INVOICES
-- Set zona_id to NULL jika tidak match dengan toko table
-- ============================================

-- STEP 1: Find all mismatches
SELECT 
    i.id,
    i.konsumen,
    i.toko,
    i.zona_id as current_wrong_zona,
    t.zona_id as correct_zona,
    CASE 
        WHEN i.zona_id != t.zona_id THEN 'FIX NEEDED'
        ELSE 'OK'
    END as status
FROM invoice_file_list i
LEFT JOIN toko t ON LOWER(TRIM(i.konsumen)) = LOWER(TRIM(t.nama))
WHERE i.zona_id IS NOT NULL
  AND t.id IS NOT NULL
  AND i.zona_id != t.zona_id;

-- STEP 2: Count mismatches before fix
SELECT 
    COUNT(*) as mismatch_count
FROM invoice_file_list i
LEFT JOIN toko t ON LOWER(TRIM(i.konsumen)) = LOWER(TRIM(t.nama))
WHERE i.zona_id IS NOT NULL
  AND t.id IS NOT NULL
  AND i.zona_id != t.zona_id;

-- STEP 3: Fix - Set wrong zona_id to NULL
UPDATE invoice_file_list i
SET zona_id = NULL
WHERE i.zona_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM toko t
    WHERE LOWER(TRIM(i.konsumen)) = LOWER(TRIM(t.nama))
      AND t.zona_id IS NOT NULL
      AND i.zona_id != t.zona_id
  );

-- STEP 4: Verify fix - should return 0
SELECT 
    COUNT(*) as remaining_mismatches
FROM invoice_file_list i
LEFT JOIN toko t ON LOWER(TRIM(i.konsumen)) = LOWER(TRIM(t.nama))
WHERE i.zona_id IS NOT NULL
  AND t.id IS NOT NULL
  AND i.zona_id != t.zona_id;

-- STEP 5: Show distribution after fix
SELECT 
    z.kode,
    z.nama,
    COUNT(i.id) as invoice_count
FROM zonas z
LEFT JOIN invoice_file_list i ON i.zona_id = z.id
WHERE z.id BETWEEN 121 AND 139
GROUP BY z.id, z.kode, z.nama
ORDER BY z.id;

-- STEP 6: Show invoices with NULL zona_id (unmatched)
SELECT 
    COUNT(*) as null_zona_count,
    COUNT(DISTINCT konsumen) as unique_unmatched_tokos
FROM invoice_file_list
WHERE zona_id IS NULL;
