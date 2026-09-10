-- =====================================================================
-- Add full_name column to faktur_pajak_rename_history
-- =====================================================================
-- Store user's full name for better audit trail visibility

ALTER TABLE faktur_pajak_rename_history
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_faktur_pajak_rename_full_name 
ON faktur_pajak_rename_history(full_name);

-- Verify column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'faktur_pajak_rename_history' 
AND column_name = 'full_name';
