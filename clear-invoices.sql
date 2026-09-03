-- ============================================================
-- Clear Invoice Data from Database
-- ============================================================

-- Clear invoice_file_list (uploaded invoices)
DELETE FROM invoice_file_list;

-- Clear excel_upload_batches (upload batch records)
DELETE FROM excel_upload_batches;

-- Verify
SELECT 
    (SELECT COUNT(*) FROM invoice_file_list) as invoice_count,
    (SELECT COUNT(*) FROM excel_upload_batches) as batch_count;
