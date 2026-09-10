-- ============================================================
-- DATABASE BACKUP MANAGEMENT SYSTEM
-- ============================================================
-- This table tracks all database backups for audit, restore, and management
-- Completely isolated from existing schema - no modifications to current tables

CREATE TABLE IF NOT EXISTS database_backups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    backup_name TEXT NOT NULL UNIQUE,
    backup_timestamp TIMESTAMPTZ NOT NULL,
    backup_size_bytes BIGINT,
    backup_location TEXT NOT NULL,
    backup_type TEXT CHECK (backup_type IN ('manual', 'automatic', 'scheduled')),
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'archived')) DEFAULT 'pending',
    initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    completion_timestamp TIMESTAMPTZ,
    error_message TEXT,
    notes TEXT,
    is_verified BOOLEAN DEFAULT false,
    verification_timestamp TIMESTAMPTZ,
    restoration_count INT DEFAULT 0,
    last_restored_at TIMESTAMPTZ,
    last_restored_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups and filtering
CREATE INDEX IF NOT EXISTS idx_database_backups_status ON database_backups(status);
CREATE INDEX IF NOT EXISTS idx_database_backups_timestamp ON database_backups(backup_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_database_backups_initiated_by ON database_backups(initiated_by);

-- Audit log for backup operations
CREATE TABLE IF NOT EXISTS backup_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    backup_id UUID REFERENCES database_backups(id) ON DELETE CASCADE,
    operation TEXT NOT NULL CHECK (operation IN ('created', 'verified', 'restored', 'deleted', 'failed')),
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backup_audit_log_backup_id ON backup_audit_log(backup_id);
CREATE INDEX IF NOT EXISTS idx_backup_audit_log_timestamp ON backup_audit_log(timestamp DESC);

-- Grant permissions to system user (if exists)
-- This allows automatic backup processes to log their activities
GRANT INSERT, UPDATE, SELECT ON database_backups TO postgres;
GRANT INSERT ON backup_audit_log TO postgres;

-- Function to update backup status and log the change
CREATE OR REPLACE FUNCTION update_backup_status(
    p_backup_id UUID,
    p_new_status TEXT,
    p_user_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- Update the backup record
    UPDATE database_backups 
    SET 
        status = p_new_status,
        updated_at = NOW(),
        error_message = p_error_message,
        completion_timestamp = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completion_timestamp END,
        is_verified = CASE WHEN p_new_status = 'completed' THEN false ELSE is_verified END
    WHERE id = p_backup_id;
    
    -- Log the operation
    INSERT INTO backup_audit_log (backup_id, operation, performed_by, details)
    VALUES (p_backup_id, p_new_status, p_user_id, p_details);
END;
$$ LANGUAGE plpgsql;

-- Function to mark backup as verified
CREATE OR REPLACE FUNCTION verify_backup(p_backup_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE database_backups 
    SET 
        is_verified = true,
        verification_timestamp = NOW(),
        updated_at = NOW()
    WHERE id = p_backup_id;
    
    INSERT INTO backup_audit_log (backup_id, operation, performed_by)
    VALUES (p_backup_id, 'verified', p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Function to log restoration
CREATE OR REPLACE FUNCTION log_backup_restoration(p_backup_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE database_backups 
    SET 
        restoration_count = restoration_count + 1,
        last_restored_at = NOW(),
        last_restored_by = p_user_id,
        updated_at = NOW()
    WHERE id = p_backup_id;
    
    INSERT INTO backup_audit_log (backup_id, operation, performed_by)
    VALUES (p_backup_id, 'restored', p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Initial comment
COMMENT ON TABLE database_backups IS 'Tracks all database backups with metadata for audit and recovery';
COMMENT ON TABLE backup_audit_log IS 'Audit trail for all backup operations and restorations';
