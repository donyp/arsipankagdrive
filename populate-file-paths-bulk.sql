-- ============================================================
-- Populate File Paths - Bulk Update for BEKASI/Sept 2026
-- ============================================================

-- Update all BEKASI invoices with file paths based on pattern:
-- ARSIPINVOICE/ARSIPINVOICE/BEKASI/2026/SEPTEMBER/02/[FILETYPE]/[FILENAME]

UPDATE invoice_file_list i
SET 
    invoice_pdf_path = CONCAT('ARSIPINVOICE/ARSIPINVOICE/BEKASI/2026/SEPTEMBER/02/PPN/', i.faktur, '.pdf'),
    bukti_bayar_path = CONCAT('ARSIPINVOICE/ARSIPINVOICE/BEKASI/2026/SEPTEMBER/02/BUKTIBAYAR/', i.faktur, '.pdf'),
    faktur_pajak_path = CONCAT('ARSIPINVOICE/ARSIPINVOICE/BEKASI/2026/SEPTEMBER/02/FAKTURPAJAK/tax-', i.faktur, ' SEMESTA GEMILANG 21.658.256.pdf'),
    files_uploaded_count = 3,
    files_required_count = 3,
    updated_at = NOW()
WHERE 
    toko LIKE '%BEKASI%' 
    AND keterangan = 'PPN'
    AND (invoice_pdf_path IS NULL OR files_uploaded_count = 0);

-- Verify the updates
SELECT 
    COUNT(*) as updated_count,
    SUM(CASE WHEN files_uploaded_count = 3 THEN 1 ELSE 0 END) as complete_invoices
FROM invoice_file_list
WHERE toko LIKE '%BEKASI%' AND keterangan = 'PPN';

-- Show sample of updated records
SELECT 
    faktur,
    toko,
    keterangan,
    files_uploaded_count,
    files_required_count,
    invoice_pdf_path,
    bukti_bayar_path,
    faktur_pajak_path
FROM invoice_file_list
WHERE toko LIKE '%BEKASI%' AND keterangan = 'PPN'
ORDER BY faktur DESC
LIMIT 10;
