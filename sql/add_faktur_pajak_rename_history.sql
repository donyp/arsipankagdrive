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
  
  -- Indexes
  CONSTRAINT fk_rename_history_invoice FOREIGN KEY (invoice_id) 
    REFERENCES invoices(id) ON DELETE CASCADE,
  
  INDEX idx_faktur_pajak_rename_faktur (faktur),
  INDEX idx_faktur_pajak_rename_renamed_by (renamed_by),
  INDEX idx_faktur_pajak_rename_renamed_at (renamed_at),
  INDEX idx_faktur_pajak_rename_zona (zona_id)
);

-- =====================================================================
-- CLEANUP FUNCTION - Auto delete records older than 1 day
-- =====================================================================

CREATE EVENT IF NOT EXISTS cleanup_faktur_pajak_rename_history
ON SCHEDULE EVERY 1 HOUR
DO
  DELETE FROM faktur_pajak_rename_history
  WHERE renamed_at < NOW() - INTERVAL '1 day';

-- =====================================================================
-- HELPER FUNCTIONS
-- =====================================================================

-- Function to log rename history
DELIMITER $$

CREATE FUNCTION IF NOT EXISTS log_faktur_pajak_rename(
  p_invoice_id BIGINT,
  p_faktur VARCHAR(100),
  p_old_filename VARCHAR(500),
  p_new_filename VARCHAR(500),
  p_old_path VARCHAR(1000),
  p_new_path VARCHAR(1000),
  p_renamed_by VARCHAR(100),
  p_user_email VARCHAR(100),
  p_reason VARCHAR(500),
  p_zona_id INT
)
RETURNS BIGINT
DETERMINISTIC
MODIFIES SQL DATA
BEGIN
  DECLARE new_id BIGINT;
  
  INSERT INTO faktur_pajak_rename_history (
    invoice_id, faktur, old_filename, new_filename,
    old_path, new_path, renamed_by, user_email,
    reason, zona_id, status
  ) VALUES (
    p_invoice_id, p_faktur, p_old_filename, p_new_filename,
    p_old_path, p_new_path, p_renamed_by, p_user_email,
    p_reason, p_zona_id, 'completed'
  );
  
  SET new_id = LAST_INSERT_ID();
  RETURN new_id;
END$$

DELIMITER ;

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
