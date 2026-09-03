-- Add zona_id column to invoice_file_list table
-- This allows zone-based access control for admin_zona users

-- Add zona_id column if it doesn't exist
ALTER TABLE IF EXISTS invoice_file_list 
ADD COLUMN IF NOT EXISTS zona_id INT REFERENCES zonas(id) ON DELETE SET NULL;

-- Add index for zona_id for better query performance
CREATE INDEX IF NOT EXISTS idx_invoice_zona ON invoice_file_list(zona_id);

-- Add toko_id column to reference toko table directly
ALTER TABLE IF EXISTS invoice_file_list 
ADD COLUMN IF NOT EXISTS toko_id INT REFERENCES toko(id) ON DELETE SET NULL;

-- Add index for toko_id
CREATE INDEX IF NOT EXISTS idx_invoice_toko_id ON invoice_file_list(toko_id);

-- Migration: Populate zona_id by matching toko name with toko table
-- This will find the zone for each invoice based on the toko (store) name
UPDATE invoice_file_list i
SET 
    toko_id = t.id,
    zona_id = t.zona_id
FROM toko t
WHERE LOWER(i.toko) = LOWER(t.nama)
AND i.zona_id IS NULL
AND i.toko_id IS NULL;

-- Log the results
SELECT 
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) as invoices_with_zona,
    COUNT(CASE WHEN zona_id IS NULL THEN 1 END) as invoices_without_zona
FROM invoice_file_list;
