-- Debug: Check invoice paths
SELECT 
    faktur,
    keterangan,
    files_uploaded_count,
    files_required_count,
    invoice_pdf_path,
    bukti_bayar_path,
    faktur_pajak_path,
    updated_at
FROM invoice_file_list
WHERE files_uploaded_count > 0
   OR invoice_pdf_path IS NOT NULL
   OR bukti_bayar_path IS NOT NULL
   OR faktur_pajak_path IS NOT NULL
ORDER BY updated_at DESC
LIMIT 20;
