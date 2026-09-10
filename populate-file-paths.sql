-- ============================================================
-- Populate File Paths in Database
-- This directly updates the database with known file paths
-- Faster than searching Google Drive
-- ============================================================

-- For invoices with known files in BEKASI location
-- Update the invoice 835100311020926004 with file paths

UPDATE invoice_file_list
SET 
    invoice_pdf_path = 'ARSIPINVOICE/ARSIPINVOICE/BEKASI/2026/SEPTEMBER/02/PPN/835100311020926004.pdf',
    bukti_bayar_path = 'ARSIPINVOICE/ARSIPINVOICE/BEKASI/2026/SEPTEMBER/02/BUKTIBAYAR/835100311020926004.pdf',
    faktur_pajak_path = 'ARSIPINVOICE/ARSIPINVOICE/BEKASI/2026/SEPTEMBER/02/FAKTURPAJAK/tax-835100311020926004 SEMESTA GEMILANG 21.658.256.pdf',
    files_uploaded_count = 3,
    files_required_count = 3,
    updated_at = NOW()
WHERE faktur = '835100311020926004';

-- Verify the update
SELECT 
    faktur,
    files_uploaded_count,
    files_required_count,
    invoice_pdf_path,
    bukti_bayar_path,
    faktur_pajak_path
FROM invoice_file_list
WHERE faktur = '835100311020926004';
