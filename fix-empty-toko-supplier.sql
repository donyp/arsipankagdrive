-- ============================================
-- Fix Empty Toko (Supplier) in Invoice Data
-- ============================================
-- Update invoices with empty/null toko field to default "ANKA BEKASI"

-- Check current status
SELECT 
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN toko IS NULL OR TRIM(toko) = '' OR toko = '-' THEN 1 END) as empty_toko,
    COUNT(CASE WHEN toko IS NOT NULL AND TRIM(toko) != '' AND toko != '-' THEN 1 END) as has_toko
FROM invoice_file_list;

-- Show sample of empty toko records
SELECT id, tanggal, faktur, toko, konsumen, total_jumlah_jual 
FROM invoice_file_list 
WHERE toko IS NULL OR TRIM(toko) = '' OR toko = '-'
LIMIT 10;

-- Update empty toko to "ANKA BEKASI" as default
UPDATE invoice_file_list
SET 
    toko = 'ANKA BEKASI',
    updated_at = NOW()
WHERE toko IS NULL 
   OR TRIM(toko) = '' 
   OR toko = '-';

-- Verify the fix
SELECT 
    toko,
    COUNT(*) as count
FROM invoice_file_list
GROUP BY toko
ORDER BY count DESC;

-- Show updated records
SELECT id, tanggal, faktur, toko, konsumen, total_jumlah_jual 
FROM invoice_file_list 
WHERE toko = 'ANKA BEKASI'
LIMIT 10;

-- Summary
SELECT 
    'Total Invoices' as metric,
    COUNT(*) as value
FROM invoice_file_list
UNION ALL
SELECT 
    'ANKA BEKASI' as metric,
    COUNT(*) as value
FROM invoice_file_list
WHERE toko = 'ANKA BEKASI'
UNION ALL
SELECT 
    'ANKA PEMALANG' as metric,
    COUNT(*) as value
FROM invoice_file_list
WHERE toko = 'ANKA PEMALANG'
UNION ALL
SELECT 
    'Empty/Unknown' as metric,
    COUNT(*) as value
FROM invoice_file_list
WHERE toko IS NULL OR TRIM(toko) = '' OR toko = '-';
