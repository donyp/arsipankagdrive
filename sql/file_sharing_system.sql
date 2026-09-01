-- ============================================================
-- File Sharing System with Expiry Links
-- Created: 2026-08-29
-- ============================================================

-- Table for storing file share links
CREATE TABLE IF NOT EXISTS file_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    access_count INTEGER DEFAULT 0,
    max_access_count INTEGER, -- NULL = unlimited
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes for faster lookups
    CONSTRAINT unique_active_share UNIQUE (file_id, share_token)
);

CREATE INDEX IF NOT EXISTS idx_file_shares_token ON file_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_file_shares_file_id ON file_shares(file_id);
CREATE INDEX IF NOT EXISTS idx_file_shares_expires_at ON file_shares(expires_at);

-- Table for tracking share link access logs
CREATE TABLE IF NOT EXISTS file_share_access_logs (
    id SERIAL PRIMARY KEY,
    share_id UUID NOT NULL REFERENCES file_shares(id) ON DELETE CASCADE,
    accessed_at TIMESTAMP DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    
    -- Add index for analytics
    CONSTRAINT fk_share_access FOREIGN KEY (share_id) REFERENCES file_shares(id)
);

CREATE INDEX IF NOT EXISTS idx_share_access_share_id ON file_share_access_logs(share_id);
CREATE INDEX IF NOT EXISTS idx_share_access_accessed_at ON file_share_access_logs(accessed_at);

-- Function to generate unique share token
CREATE OR REPLACE FUNCTION generate_share_token() RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    token TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..32 LOOP
        token := token || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-deactivate expired shares (can be called via cron)
CREATE OR REPLACE FUNCTION deactivate_expired_shares() RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE file_shares
    SET is_active = false
    WHERE is_active = true 
      AND expires_at < NOW();
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Optional: Add comment column to file_shares for notes
ALTER TABLE file_shares ADD COLUMN IF NOT EXISTS notes TEXT;

-- Migration complete
-- To rollback: 
-- DROP TABLE IF EXISTS file_share_access_logs CASCADE;
-- DROP TABLE IF NOT EXISTS file_shares CASCADE;
-- DROP FUNCTION IF EXISTS generate_share_token();
-- DROP FUNCTION IF EXISTS deactivate_expired_shares();

COMMENT ON TABLE file_shares IS 'Stores shareable links for files with expiration and access limits';
COMMENT ON TABLE file_share_access_logs IS 'Tracks every access to shared links for analytics and security';
