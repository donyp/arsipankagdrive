-- ============================================================
-- Manual Clear Invoice Data Script
-- Run this in Supabase SQL Editor to clear test data
-- ============================================================

-- Step 1: Drop UNIQUE constraint on faktur (ROOT CAUSE!)
ALTER TABLE invoice_file_list DROP CONSTRAINT invoice_file_list_faktur_key;

-- Step 2: Delete all invoices
DELETE FROM invoice_file_list;

-- Step 3: Delete all batch records
DELETE FROM excel_upload_batches;

-- Step 4: Add INDEX instead of UNIQUE (for search performance, NOT constraint)
CREATE INDEX IF NOT EXISTS idx_invoice_faktur_unique ON invoice_file_list(faktur);

-- Step 5: Verify
SELECT 
    (SELECT COUNT(*) FROM invoice_file_list) as invoice_count,
    (SELECT COUNT(*) FROM excel_upload_batches) as batch_count;

-- Done! Constraint removed, data cleared, index added for fast search

