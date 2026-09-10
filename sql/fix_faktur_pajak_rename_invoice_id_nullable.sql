-- =====================================================================
-- MIGRATION: Make invoice_id nullable in faktur_pajak_rename_history
-- =====================================================================
-- 
-- Reason: invoice_id may be NULL when rename history is logged from UI
-- without a corresponding invoice record in invoice_file_list
--
-- Steps:
-- 1. Drop the existing foreign key constraint
-- 2. Modify column to allow NULL
-- 3. Recreate foreign key with nullable column
--
-- =====================================================================

-- Step 1: Drop existing foreign key constraint
ALTER TABLE faktur_pajak_rename_history
DROP CONSTRAINT IF EXISTS fk_rename_history_invoice;

-- Step 2: Modify column to allow NULL
ALTER TABLE faktur_pajak_rename_history
ALTER COLUMN invoice_id DROP NOT NULL;

-- Step 3: Recreate foreign key with nullable column
ALTER TABLE faktur_pajak_rename_history
ADD CONSTRAINT fk_rename_history_invoice 
FOREIGN KEY (invoice_id) 
REFERENCES invoice_file_list(id) ON DELETE CASCADE;

-- Verify
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'faktur_pajak_rename_history' 
AND column_name = 'invoice_id';
