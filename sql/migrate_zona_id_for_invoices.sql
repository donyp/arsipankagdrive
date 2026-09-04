-- Migrate zona_id for all invoices without it
-- Match toko name with toko table to get zona_id

-- First, check how many invoices are missing zona_id
SELECT 
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) as with_zona_id,
    COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as missing_zona_id
FROM invoice_file_list;

-- Update all invoices with matching toko
UPDATE invoice_file_list i
SET 
    zona_id = t.zona_id,
    toko_id = t.id,
    updated_at = NOW()
FROM toko t
WHERE LOWER(TRIM(i.toko)) = LOWER(TRIM(t.nama))
  AND i.zona_id IS NULL;

-- Check result
SELECT 
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) as with_zona_id,
    COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as missing_zona_id,
    CASE 
        WHEN COUNT(CASE WHEN zona_id IS NULL THEN 1 END) = 0 THEN '✅ All invoices have zona_id'
        ELSE '⚠️ ' || COUNT(CASE WHEN zona_id IS NULL THEN 1 END) || ' invoices still missing zona_id'
    END as status
FROM invoice_file_list;

-- Show which toko names could not be matched
SELECT DISTINCT toko, COUNT(*) as count
FROM invoice_file_list
WHERE zona_id IS NULL
GROUP BY toko
ORDER BY count DESC;
