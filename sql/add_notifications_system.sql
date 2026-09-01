-- ============================================================
-- SMART NOTIFICATIONS SYSTEM
-- Enhanced notification system with multiple types and preferences
-- ============================================================

-- Main notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('update', 'file_upload', 'comment', 'quota', 'maintenance', 'approval', 'share', 'system')),
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    icon TEXT, -- emoji or icon name
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- User notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT false,
    email_frequency TEXT DEFAULT 'instant' CHECK (email_frequency IN ('instant', 'daily', 'weekly', 'never')),
    types_enabled JSONB DEFAULT '{"update":true,"file_upload":true,"comment":true,"quota":true,"maintenance":true,"approval":true,"share":true,"system":true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trigger_update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Create default preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Add comments
COMMENT ON TABLE notifications IS 'System-wide notification storage for all users';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification delivery and types';
COMMENT ON COLUMN notifications.type IS 'Notification type: update, file_upload, comment, quota, maintenance, approval, share, system';
COMMENT ON COLUMN notification_preferences.email_frequency IS 'How often to send email notifications: instant, daily, weekly, never';
COMMENT ON COLUMN notification_preferences.types_enabled IS 'JSON object indicating which notification types are enabled for this user';
