-- Step 1: Add zona_id column if it doesn't exist
ALTER TABLE invoice_file_list 
ADD COLUMN IF NOT EXISTS zona_id INT REFERENCES zonas(id) ON DELETE SET NULL;

-- Step 2: Add toko_id column if it doesn't exist  
ALTER TABLE invoice_file_list
ADD COLUMN IF NOT EXISTS toko_id INT REFERENCES toko(id) ON DELETE SET NULL;

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoice_zona ON invoice_file_list(zona_id);
CREATE INDEX IF NOT EXISTS idx_invoice_toko_id ON invoice_file_list(toko_id);

-- Step 4: Check current status before migration
SELECT 
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) as with_zona_id,
    COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as missing_zona_id
FROM invoice_file_list;

-- Step 5: Migrate zona_id - match toko names with toko table
UPDATE invoice_file_list i
SET 
    zona_id = t.zona_id,
    toko_id = t.id,
    updated_at = NOW()
FROM toko t
WHERE LOWER(TRIM(i.toko)) = LOWER(TRIM(t.nama))
  AND i.zona_id IS NULL;

-- Step 6: Check result after migration
SELECT 
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) as with_zona_id,
    COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as missing_zona_id,
    CASE 
        WHEN COUNT(CASE WHEN zona_id IS NULL THEN 1 END) = 0 THEN '✅ All invoices have zona_id'
        ELSE '⚠️ ' || COUNT(CASE WHEN zona_id IS NULL THEN 1 END) || ' invoices still missing zona_id'
    END as status
FROM invoice_file_list;

-- Step 7: Show which toko names could not be matched (if any)
SELECT DISTINCT toko, COUNT(*) as count
FROM invoice_file_list
WHERE zona_id IS NULL
GROUP BY toko
ORDER BY count DESC;

-- Step 8: Show the migration results - invoices by zona
SELECT 
    z.id as zona_id,
    z.kode as zona_kode,
    z.nama as zona_nama,
    COUNT(i.id) as invoice_count,
    COUNT(DISTINCT i.toko) as toko_count,
    STRING_AGG(DISTINCT i.toko, ', ') as tokos
FROM invoice_file_list i
LEFT JOIN zonas z ON i.zona_id = z.id
GROUP BY z.id, z.kode, z.nama
ORDER BY z.id;

