-- ============================================================
-- Update History Items Table
-- Store individual update items (titles and descriptions)
-- ============================================================

CREATE TABLE IF NOT EXISTS update_history_items (
    id BIGSERIAL PRIMARY KEY,
    update_id BIGINT NOT NULL REFERENCES update_history(id) ON DELETE CASCADE,
    item_number SMALLINT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('UPDATE', 'BUG_FIX', 'FEATURE', 'IMPROVEMENT')),
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_update_history_items_update_id ON update_history_items(update_id);
CREATE INDEX IF NOT EXISTS idx_update_history_items_item_number ON update_history_items(item_number);

-- Add RLS policies
ALTER TABLE update_history_items ENABLE ROW LEVEL SECURITY;

-- Drop old policies if exist
DROP POLICY IF EXISTS "Users can view items from published updates" ON update_history_items;
DROP POLICY IF EXISTS "Moderators can manage items" ON update_history_items;

-- Allow all authenticated users to view items from published updates
CREATE POLICY "Users can view items from published updates" 
ON update_history_items 
FOR SELECT 
USING (
    update_id IN (
        SELECT id FROM update_history WHERE status = 'PUBLISHED'
    ) OR update_id IN (
        SELECT id FROM update_history WHERE created_by = auth.uid()
    )
);

-- Allow moderators/super_admins to manage items
CREATE POLICY "Moderators can manage items"
ON update_history_items
FOR ALL
USING (
    auth.uid() IN (
        SELECT id FROM public.users 
        WHERE role IN ('super_admin', 'moderator')
    )
);
