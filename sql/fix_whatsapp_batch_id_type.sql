-- ============================================================
-- Fix: Change batch_id from UUID to TEXT
-- ============================================================
-- The batch_id column was defined as UUID but we're using TEXT strings
-- This migration changes it to TEXT to match the actual usage

-- Step 1: Alter the column type
ALTER TABLE whatsapp_invoice_notifications 
ALTER COLUMN batch_id TYPE TEXT;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '✅ WhatsApp batch_id column type changed from UUID to TEXT';
END $$;
