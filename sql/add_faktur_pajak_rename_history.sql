-- =====================================================================
-- FAKTUR PAJAK RENAME HISTORY TABLE
-- =====================================================================
-- 
-- Menyimpan history perubahan nama faktur pajak
-- Hanya menyimpan teks/metadata (tidak menyimpan file)
-- Auto delete records lebih dari 1 hari
--
-- =====================================================================

CREATE TABLE IF NOT EXISTS faktur_pajak_rename_history (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  
  -- Invoice Reference
  invoice_id BIGINT NOT NULL,
  faktur VARCHAR(100) NOT NULL,
  zona_id INT,
  
  -- Rename Details
  old_filename VARCHAR(500) NOT NULL,
  new_filename VARCHAR(500) NOT NULL,
  old_path VARCHAR(1000),
  new_path VARCHAR(1000),
  
  -- User Info
  renamed_by VARCHAR(100) NOT NULL,
  user_email VARCHAR(100),
  
  -- Timestamps
  renamed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Metadata
  reason VARCHAR(500),
  status VARCHAR(50) DEFAULT 'completed',
  notes TEXT,
  
  -- Foreign Key
  CONSTRAINT fk_rename_history_invoice FOREIGN KEY (invoice_id) 
    REFERENCES invoice_file_list(id) ON DELETE CASCADE
);

-- Create indexes separately (PostgreSQL syntax)
CREATE INDEX IF NOT EXISTS idx_faktur_pajak_rename_faktur 
  ON faktur_pajak_rename_history(faktur);

CREATE INDEX IF NOT EXISTS idx_faktur_pajak_rename_renamed_by 
  ON faktur_pajak_rename_history(renamed_by);

CREATE INDEX IF NOT EXISTS idx_faktur_pajak_rename_renamed_at 
  ON faktur_pajak_rename_history(renamed_at);

CREATE INDEX IF NOT EXISTS idx_faktur_pajak_rename_zona 
  ON faktur_pajak_rename_history(zona_id);

-- =====================================================================
-- CLEANUP FUNCTION - Auto delete records older than 1 day (PostgreSQL)
-- =====================================================================
-- Note: For production use, implement cleanup via application cron job
-- or use pg_cron extension if available on your PostgreSQL instance

CREATE OR REPLACE FUNCTION cleanup_faktur_pajak_rename_history()
RETURNS void AS $$
BEGIN
  DELETE FROM faktur_pajak_rename_history
  WHERE renamed_at < NOW() - INTERVAL '1 day';
  
  RAISE NOTICE 'Cleanup complete: Deleted old faktur pajak rename history records';
END;
$$ LANGUAGE plpgsql;

-- For pg_cron users (if available):
-- SELECT cron.schedule('cleanup_faktur_pajak_rename', '0 */6 * * *', 'SELECT cleanup_faktur_pajak_rename_history()');

-- =====================================================================
-- HELPER FUNCTION - Log rename history (PostgreSQL)
-- =====================================================================

CREATE OR REPLACE FUNCTION log_faktur_pajak_rename(
  p_invoice_id BIGINT,
  p_faktur VARCHAR,
  p_old_filename VARCHAR,
  p_new_filename VARCHAR,
  p_old_path VARCHAR,
  p_new_path VARCHAR,
  p_renamed_by VARCHAR,
  p_user_email VARCHAR,
  p_reason VARCHAR,
  p_zona_id INT
)
RETURNS BIGINT AS $$
DECLARE
  new_id BIGINT;
BEGIN
  INSERT INTO faktur_pajak_rename_history (
    invoice_id, faktur, old_filename, new_filename,
    old_path, new_path, renamed_by, user_email,
    reason, zona_id, status, renamed_at
  ) VALUES (
    p_invoice_id, p_faktur, p_old_filename, p_new_filename,
    p_old_path, p_new_path, p_renamed_by, p_user_email,
    p_reason, p_zona_id, 'completed', NOW()
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- MAINTENANCE - To run cleanup manually (or via cron job)
-- =====================================================================
-- SELECT cleanup_faktur_pajak_rename_history();

-- =====================================================================
-- SAMPLE QUERIES
-- =====================================================================

-- Get rename history for specific faktur
-- SELECT * FROM faktur_pajak_rename_history 
-- WHERE faktur = 'INV-2024-001' 
-- ORDER BY renamed_at DESC;

-- Get all renames by specific user
-- SELECT * FROM faktur_pajak_rename_history 
-- WHERE renamed_by = 'user@example.com' 
-- ORDER BY renamed_at DESC;

-- Get recent renames (last 24 hours)
-- SELECT * FROM faktur_pajak_rename_history 
-- WHERE renamed_at > NOW() - INTERVAL '1 day'
-- ORDER BY renamed_at DESC;

-- Count renames per user
-- SELECT renamed_by, COUNT(*) as total_renames 
-- FROM faktur_pajak_rename_history 
-- WHERE renamed_at > NOW() - INTERVAL '1 day'
-- GROUP BY renamed_by
-- ORDER BY total_renames DESC;
