-- ============================================================
-- Update Existing Invoice File Counts
-- Populate files_uploaded_count and files_required_count for existing invoices
-- ============================================================

-- Step 1: Verify new columns exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoice_file_list' 
        AND column_name = 'files_uploaded_count'
    ) THEN
        RAISE EXCEPTION 'Column files_uploaded_count does not exist! Run add_invoice_file_tracking.sql first.';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoice_file_list' 
        AND column_name = 'files_required_count'
    ) THEN
        RAISE EXCEPTION 'Column files_required_count does not exist! Run add_invoice_file_tracking.sql first.';
    END IF;
    
    RAISE NOTICE 'âœ" New columns exist';
END $$;

-- Step 2: Update all existing invoices to trigger the calculation
-- This will force the trigger to recalculate files_uploaded_count and files_required_count

UPDATE invoice_file_list
SET updated_at = NOW()
WHERE files_uploaded_count IS NULL 
   OR files_required_count IS NULL;

-- Step 3: Verify the results
SELECT 
    keterangan,
    COUNT(*) as total,
    AVG(files_uploaded_count) as avg_uploaded,
    AVG(files_required_count) as avg_required,
    COUNT(CASE WHEN files_uploaded_count = files_required_count THEN 1 END) as complete_count,
    COUNT(CASE WHEN files_uploaded_count < files_required_count THEN 1 END) as incomplete_count
FROM invoice_file_list
GROUP BY keterangan
ORDER BY keterangan;

-- Step 4: Show sample data
SELECT 
    faktur,
    keterangan,
    invoice_pdf_path,
    bukti_bayar_path,
    faktur_pajak_path,
    files_uploaded_count,
    files_required_count,
    CONCAT(files_uploaded_count, '/', files_required_count) as status_display
FROM invoice_file_list
ORDER BY created_at DESC
LIMIT 20;

RAISE NOTICE 'âœ" Update complete. Check the results above.';
