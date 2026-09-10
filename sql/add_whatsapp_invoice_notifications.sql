-- ============================================================
-- WhatsApp Invoice Notifications Table
-- Stores per-invoice WhatsApp messages for zona groups
-- Format: UPDATE INVOICE ZONA with individual invoice items
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_invoice_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zona_id INTEGER NOT NULL REFERENCES zonas(id),
    moderator_id UUID NOT NULL REFERENCES auth.users(id),
    invoice_count INTEGER NOT NULL,
    invoice_details JSONB DEFAULT '[]', -- Details of each invoice {tipe, konsumen, nominal}
    message TEXT NOT NULL, -- Pre-formatted WhatsApp message
    notification_type TEXT DEFAULT 'invoice_upload', -- 'invoice_upload' for individual uploads
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE, -- NULL if not sent yet
    batch_id UUID, -- Group messages from same upload batch
    
    -- Constraints
    CONSTRAINT chk_invoice_count CHECK (invoice_count > 0),
    CONSTRAINT chk_notification_type CHECK (notification_type IN ('invoice_upload', 'excel_upload'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_inv_zona_id ON whatsapp_invoice_notifications(zona_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inv_moderator_id ON whatsapp_invoice_notifications(moderator_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inv_batch_id ON whatsapp_invoice_notifications(batch_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inv_sent_at ON whatsapp_invoice_notifications(sent_at) WHERE sent_at IS NULL; -- Pending messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_inv_type ON whatsapp_invoice_notifications(notification_type);

-- Comments
COMMENT ON TABLE whatsapp_invoice_notifications IS 'Stores per-invoice WhatsApp messages for manual copy-paste to zona groups - format: UPDATE INVOICE ZONA';
COMMENT ON COLUMN whatsapp_invoice_notifications.sent_at IS 'Timestamp when moderator marked as sent to group';
COMMENT ON COLUMN whatsapp_invoice_notifications.batch_id IS 'Batch ID from upload session for grouping related uploads';
COMMENT ON COLUMN whatsapp_invoice_notifications.invoice_details IS 'JSON array of invoice details: [{tipe, konsumen, nominal}, ...]';
COMMENT ON COLUMN whatsapp_invoice_notifications.notification_type IS 'Type of notification: invoice_upload (individual PDFs) or excel_upload (bulk Excel)';

