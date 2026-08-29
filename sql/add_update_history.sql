-- ============================================================
-- Update History Table
-- Track all updates, bug fixes, and feature changes
-- ============================================================

CREATE TABLE IF NOT EXISTS update_history (
    id BIGSERIAL PRIMARY KEY,
    version TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('UPDATE', 'BUG_FIX', 'FEATURE', 'IMPROVEMENT', 'MAINTENANCE')),
    category TEXT,  -- e.g., 'PDF Preview', 'Dashboard', 'Performance', etc
    status TEXT DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED')),
    severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),  -- for bug fixes
    impact_areas TEXT,  -- comma-separated list of affected areas
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Flags
    requires_action BOOLEAN DEFAULT FALSE,  -- if user action needed
    is_breaking_change BOOLEAN DEFAULT FALSE
);

-- Add indexes
CREATE INDEX idx_update_history_type ON update_history(type);
CREATE INDEX idx_update_history_status ON update_history(status);
CREATE INDEX idx_update_history_created_at ON update_history(created_at DESC);

-- Add RLS policies
ALTER TABLE update_history ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view published updates
CREATE POLICY "Users can view published updates" 
ON update_history 
FOR SELECT 
USING (status = 'PUBLISHED' OR auth.uid() = created_by);

-- Allow moderators/super_admins to manage updates
CREATE POLICY "Moderators can manage updates"
ON update_history
USING (
    auth.uid() IN (
        SELECT id FROM public.users 
        WHERE role IN ('super_admin', 'moderator')
    )
);
