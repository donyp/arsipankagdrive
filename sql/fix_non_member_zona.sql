-- ============================================
-- Fix Non-Member Invoices - Assign to Zone
-- ============================================

-- For Non-Member invoices, use TOKO (supplier) to determine zona
-- Logic: ANKA BEKASI → Zona 08 (Pemalang area)
--        ANKA PEMALANG → Zona 08 (Pemalang area)

-- Check current status
SELECT 
    konsumen,
    COUNT(*) as count,
    COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as null_count
FROM invoice_file_list
WHERE konsumen LIKE '%Non-Member%' OR toko LIKE '%ANKA%'
GROUP BY konsumen
ORDER BY count DESC;

-- Map ANKA BEKASI and ANKA PEMALANG to their zones
-- First, verify these tokos exist
SELECT id, nama, zona_id FROM toko WHERE nama LIKE '%Pemalang%' OR nama LIKE '%Bekasi%';

-- Assign zona_id for invoices with Non-Member or unmatched konsumen
-- Using TOKO (supplier) field to determine the zona
UPDATE invoice_file_list i
SET 
    zona_id = (
        CASE 
            -- ANKA BEKASI items → Usually Zona 08 (Pemalang is the headquarters for ANKA suppliers)
            WHEN LOWER(TRIM(i.toko)) LIKE '%anka bekasi%' THEN 
                (SELECT id FROM zonas WHERE kode = '08' LIMIT 1)
            -- ANKA PEMALANG items → Zona 08
            WHEN LOWER(TRIM(i.toko)) LIKE '%anka pemalang%' THEN 
                (SELECT id FROM zonas WHERE kode = '08' LIMIT 1)
            -- Non-Member default to Zona 08
            WHEN LOWER(TRIM(i.konsumen)) LIKE '%non-member%' THEN 
                (SELECT id FROM zonas WHERE kode = '08' LIMIT 1)
            ELSE i.zona_id
        END
    ),
    updated_at = NOW()
WHERE zona_id IS NULL
  AND (
    LOWER(TRIM(i.toko)) LIKE '%anka%' 
    OR LOWER(TRIM(i.konsumen)) LIKE '%non-member%'
  );

-- Verify results
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) as with_zona,
    COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as still_null
FROM invoice_file_list;

-- Show invoices by zona
SELECT 
    z.kode,
    z.nama,
    COUNT(i.id) as invoice_count
FROM invoice_file_list i
LEFT JOIN zonas z ON i.zona_id = z.id
GROUP BY z.id, z.kode, z.nama
ORDER BY z.kode;

-- Show sample Non-Member invoices
SELECT id, tanggal, toko, konsumen, zona_id FROM invoice_file_list 
WHERE konsumen LIKE '%Non-Member%' 
LIMIT 10;
