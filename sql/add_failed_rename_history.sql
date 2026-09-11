-- Failed Rename Attempts Tracking
-- Stores info about files that failed to rename (OCR couldn't extract invoice number)
-- For manual processing later

CREATE TABLE IF NOT EXISTS failed_rename_attempts (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    original_filename TEXT NOT NULL,
    error_reason TEXT NOT NULL,
    file_size_bytes BIGINT,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_failed_rename_user ON failed_rename_attempts(user_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_failed_rename_date ON failed_rename_attempts(attempted_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE failed_rename_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own failed attempts
CREATE POLICY failed_rename_user_policy ON failed_rename_attempts
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON failed_rename_attempts TO authenticated;
GRANT SELECT ON failed_rename_attempts TO service_role;
