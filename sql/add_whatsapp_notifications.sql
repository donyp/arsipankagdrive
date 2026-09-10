-- ============================================================
-- WhatsApp Notifications Table
-- Stores auto-generated WhatsApp messages for zona groups
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zona_id INTEGER NOT NULL REFERENCES zonas(id),
    moderator_id UUID NOT NULL REFERENCES auth.users(id),
    invoice_count INTEGER NOT NULL,
    toko_list TEXT[] NOT NULL, -- Array of toko names uploaded
    message TEXT NOT NULL, -- Pre-formatted WhatsApp message
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE, -- NULL if not sent yet
    batch_id UUID, -- Group messages from same upload batch
    
    -- Indexes
    CONSTRAINT chk_invoice_count CHECK (invoice_count > 0)
);

-- Indexes for common queries
CREATE INDEX idx_whatsapp_zona_id ON whatsapp_notifications(zona_id);
CREATE INDEX idx_whatsapp_moderator_id ON whatsapp_notifications(moderator_id);
CREATE INDEX idx_whatsapp_batch_id ON whatsapp_notifications(batch_id);
CREATE INDEX idx_whatsapp_sent_at ON whatsapp_notifications(sent_at) WHERE sent_at IS NULL; -- Pending messages

-- Add audit log
COMMENT ON TABLE whatsapp_notifications IS 'Stores auto-generated WhatsApp messages for manual copy-paste to zona groups';
COMMENT ON COLUMN whatsapp_notifications.sent_at IS 'Timestamp when moderator marked as sent to group';
COMMENT ON COLUMN whatsapp_notifications.batch_id IS 'Batch ID from excel upload session for grouping related uploads';
