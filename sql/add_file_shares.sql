-- ============================================================
-- FILE SHARING WITH EXPIRY LINKS
-- Migration to add file sharing functionality
-- ============================================================

-- Table to store file share links
CREATE TABLE IF NOT EXISTS file_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    access_count INTEGER DEFAULT 0,
    max_access_count INTEGER, -- NULL = unlimited
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to track file share access logs
CREATE TABLE IF NOT EXISTS file_share_access_logs (
    id SERIAL PRIMARY KEY,
    share_id UUID NOT NULL REFERENCES file_shares(id) ON DELETE CASCADE,
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN DEFAULT true
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_file_shares_file_id ON file_shares(file_id);
CREATE INDEX IF NOT EXISTS idx_file_shares_token ON file_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_file_shares_created_by ON file_shares(created_by);
CREATE INDEX IF NOT EXISTS idx_file_shares_expires_at ON file_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_file_share_logs_share_id ON file_share_access_logs(share_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_file_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_file_shares_updated_at ON file_shares;
CREATE TRIGGER trigger_update_file_shares_updated_at
    BEFORE UPDATE ON file_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_file_shares_updated_at();

-- Add audit log for share creation
COMMENT ON TABLE file_shares IS 'Stores shareable links for files with expiration and access control';
COMMENT ON TABLE file_share_access_logs IS 'Tracks access to shared file links';
