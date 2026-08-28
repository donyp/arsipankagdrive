-- Add avatar column to users table for storing profile photos
-- Format: base64 encoded data URL (e.g., data:image/jpeg;base64,/9j/4AAQ...)

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT NULL;

-- Add contact_email column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT NULL;

-- Add permissions column if it doesn't exist (for moderator flag and other permissions)
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Verify the changes
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;
