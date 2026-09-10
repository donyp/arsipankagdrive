-- Clear old WhatsApp invoice notifications that don't have proper id fields
DELETE FROM whatsapp_invoice_notifications 
WHERE notification_type = 'invoice_upload';

-- Verify deletion
SELECT COUNT(*) as remaining_messages FROM whatsapp_invoice_notifications;
