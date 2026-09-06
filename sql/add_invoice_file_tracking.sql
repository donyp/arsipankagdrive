-- ============================================================
-- INVOICE FILE TRACKING ENHANCEMENT
-- Add columns for tracking individual file uploads (invoice, bukti bayar, faktur pajak)
-- Change status from PENDING/UPLOADED to progress format: 0/2, 1/2, 2/2 (NON PPN) or 0/3, 1/3, 2/3, 3/3 (PPN)
-- ============================================================

-- Add new columns for file path tracking
ALTER TABLE invoice_file_list 
ADD COLUMN IF NOT EXISTS invoice_pdf_path TEXT,
ADD COLUMN IF NOT EXISTS invoice_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bukti_bayar_path TEXT,
ADD COLUMN IF NOT EXISTS bukti_bayar_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS faktur_pajak_path TEXT,
ADD COLUMN IF NOT EXISTS faktur_pajak_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS files_uploaded_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS files_required_count INT DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoice_files_count ON invoice_file_list(files_uploaded_count, files_required_count);

-- Function to calculate required files count based on keterangan
CREATE OR REPLACE FUNCTION calculate_required_files_count(p_keterangan VARCHAR)
RETURNS INT AS $$
BEGIN
    -- PPN requires 3 files (invoice, bukti bayar, faktur pajak)
    -- NON PPN and GUNGGUNG require 2 files (invoice, bukti bayar)
    IF UPPER(p_keterangan) = 'PPN' THEN
        RETURN 3;
    ELSE
        RETURN 2;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate uploaded files count
CREATE OR REPLACE FUNCTION calculate_uploaded_files_count(
    p_invoice_path TEXT,
    p_bukti_bayar_path TEXT,
    p_faktur_pajak_path TEXT
)
RETURNS INT AS $$
DECLARE
    v_count INT := 0;
BEGIN
    IF p_invoice_path IS NOT NULL AND p_invoice_path <> '' THEN
        v_count := v_count + 1;
    END IF;
    
    IF p_bukti_bayar_path IS NOT NULL AND p_bukti_bayar_path <> '' THEN
        v_count := v_count + 1;
    END IF;
    
    IF p_faktur_pajak_path IS NOT NULL AND p_faktur_pajak_path <> '' THEN
        v_count := v_count + 1;
    END IF;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing records to set files_required_count
UPDATE invoice_file_list
SET files_required_count = calculate_required_files_count(keterangan)
WHERE files_required_count = 0 OR files_required_count IS NULL;

-- Migrate existing uploaded_file_path to invoice_pdf_path if exists
UPDATE invoice_file_list
SET invoice_pdf_path = uploaded_file_path,
    invoice_uploaded_at = uploaded_at,
    files_uploaded_count = CASE WHEN uploaded_file_path IS NOT NULL THEN 1 ELSE 0 END
WHERE uploaded_file_path IS NOT NULL 
  AND (invoice_pdf_path IS NULL OR invoice_pdf_path = '');

-- Trigger to auto-update files counts when paths change
CREATE OR REPLACE FUNCTION update_invoice_files_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate required files based on keterangan
    NEW.files_required_count := calculate_required_files_count(NEW.keterangan);
    
    -- Calculate uploaded files count
    NEW.files_uploaded_count := calculate_uploaded_files_count(
        NEW.invoice_pdf_path,
        NEW.bukti_bayar_path,
        NEW.faktur_pajak_path
    );
    
    -- Update legacy status field for backward compatibility
    IF NEW.files_uploaded_count = 0 THEN
        NEW.status := 'PENDING';
    ELSIF NEW.files_uploaded_count >= NEW.files_required_count THEN
        NEW.status := 'UPLOADED';
    ELSE
        NEW.status := 'PARTIAL';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_invoice_files_count ON invoice_file_list;

-- Create trigger
CREATE TRIGGER trigger_update_invoice_files_count
    BEFORE INSERT OR UPDATE OF invoice_pdf_path, bukti_bayar_path, faktur_pajak_path, keterangan
    ON invoice_file_list
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_files_count();

-- Function: Get Invoice File Status (returns X/Y format)
CREATE OR REPLACE FUNCTION get_invoice_file_status(p_faktur VARCHAR)
RETURNS TABLE (
    faktur VARCHAR,
    status_display VARCHAR,
    files_uploaded INT,
    files_required INT,
    has_invoice BOOLEAN,
    has_bukti_bayar BOOLEAN,
    has_faktur_pajak BOOLEAN,
    is_complete BOOLEAN,
    invoice_path TEXT,
    bukti_bayar_path TEXT,
    faktur_pajak_path TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ifl.faktur,
        ifl.files_uploaded_count || '/' || ifl.files_required_count as status_display,
        ifl.files_uploaded_count,
        ifl.files_required_count,
        (ifl.invoice_pdf_path IS NOT NULL AND ifl.invoice_pdf_path <> '') as has_invoice,
        (ifl.bukti_bayar_path IS NOT NULL AND ifl.bukti_bayar_path <> '') as has_bukti_bayar,
        (ifl.faktur_pajak_path IS NOT NULL AND ifl.faktur_pajak_path <> '') as has_faktur_pajak,
        (ifl.files_uploaded_count >= ifl.files_required_count) as is_complete,
        ifl.invoice_pdf_path,
        ifl.bukti_bayar_path,
        ifl.faktur_pajak_path
    FROM invoice_file_list ifl
    WHERE ifl.faktur = p_faktur;
END;
$$ LANGUAGE plpgsql;

-- View: Invoice File Status Summary
CREATE OR REPLACE VIEW invoice_file_status_summary AS
SELECT 
    id,
    faktur,
    tanggal,
    toko,
    konsumen,
    keterangan,
    total_jumlah_jual,
    files_uploaded_count || '/' || files_required_count as status_display,
    files_uploaded_count,
    files_required_count,
    (invoice_pdf_path IS NOT NULL AND invoice_pdf_path <> '') as has_invoice,
    (bukti_bayar_path IS NOT NULL AND bukti_bayar_path <> '') as has_bukti_bayar,
    (faktur_pajak_path IS NOT NULL AND faktur_pajak_path <> '') as has_faktur_pajak,
    (files_uploaded_count >= files_required_count) as is_complete,
    invoice_pdf_path,
    bukti_bayar_path,
    faktur_pajak_path,
    created_at,
    updated_at
FROM invoice_file_list
ORDER BY tanggal DESC, faktur;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_required_files_count(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_uploaded_files_count(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invoice_file_status(VARCHAR) TO authenticated;
GRANT SELECT ON invoice_file_status_summary TO authenticated;

-- Update statistics function to include new metrics
CREATE OR REPLACE FUNCTION get_invoice_statistics_v2()
RETURNS TABLE (
    total_count BIGINT,
    complete_count BIGINT,
    partial_count BIGINT,
    pending_count BIGINT,
    complete_percentage NUMERIC,
    partial_percentage NUMERIC,
    pending_percentage NUMERIC,
    total_jumlah_jual_sum NUMERIC,
    ppn_complete BIGINT,
    ppn_total BIGINT,
    non_ppn_complete BIGINT,
    non_ppn_total BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_count,
        COUNT(*) FILTER (WHERE files_uploaded_count >= files_required_count)::BIGINT as complete_count,
        COUNT(*) FILTER (WHERE files_uploaded_count > 0 AND files_uploaded_count < files_required_count)::BIGINT as partial_count,
        COUNT(*) FILTER (WHERE files_uploaded_count = 0)::BIGINT as pending_count,
        ROUND((COUNT(*) FILTER (WHERE files_uploaded_count >= files_required_count)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as complete_percentage,
        ROUND((COUNT(*) FILTER (WHERE files_uploaded_count > 0 AND files_uploaded_count < files_required_count)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as partial_percentage,
        ROUND((COUNT(*) FILTER (WHERE files_uploaded_count = 0)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as pending_percentage,
        SUM(total_jumlah_jual) as total_jumlah_jual_sum,
        COUNT(*) FILTER (WHERE UPPER(keterangan) = 'PPN' AND files_uploaded_count >= files_required_count)::BIGINT as ppn_complete,
        COUNT(*) FILTER (WHERE UPPER(keterangan) = 'PPN')::BIGINT as ppn_total,
        COUNT(*) FILTER (WHERE UPPER(keterangan) <> 'PPN' AND files_uploaded_count >= files_required_count)::BIGINT as non_ppn_complete,
        COUNT(*) FILTER (WHERE UPPER(keterangan) <> 'PPN')::BIGINT as non_ppn_total
    FROM invoice_file_list;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_invoice_statistics_v2() TO authenticated;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Invoice file tracking columns added successfully';
    RAISE NOTICE '📊 New status format: X/Y (e.g., 0/3, 1/3, 2/3, 3/3)';
    RAISE NOTICE '🔍 Run: SELECT * FROM invoice_file_status_summary to see new status';
    RAISE NOTICE '📈 Run: SELECT * FROM get_invoice_statistics_v2() to see new stats';
END $$;
