-- ============================================================
-- Add file missing tracking to monitor files that exist in 
-- database but are missing from Google Drive
-- ============================================================

ALTER TABLE files
ADD COLUMN IF NOT EXISTS is_missing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_error TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_files_is_missing ON files(is_missing) WHERE is_missing = TRUE;
CREATE INDEX IF NOT EXISTS idx_files_last_synced ON files(last_synced_at);

-- Update existing files to have initial sync timestamp
UPDATE files 
SET last_synced_at = NOW(), is_missing = FALSE
WHERE last_synced_at IS NULL;

COMMIT;
