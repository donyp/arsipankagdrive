-- ============================================================
-- NEW INVOICE SYSTEM - Database Schema
-- Excel-based invoice tracking system
-- ============================================================

-- Table: excel_upload_batches
-- Track Excel file uploads
CREATE TABLE IF NOT EXISTS excel_upload_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    total_rows INT NOT NULL DEFAULT 0,
    processed_rows INT NOT NULL DEFAULT 0,
    failed_rows INT NOT NULL DEFAULT 0,
    duplicate_rows INT NOT NULL DEFAULT 0,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'processing', -- processing/completed/failed
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: invoice_file_list
-- Master list of invoices from Excel (aggregated by faktur)
CREATE TABLE IF NOT EXISTS invoice_file_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- From Excel Data (First row data for each unique faktur)
    tanggal DATE NOT NULL,
    toko VARCHAR(255) NOT NULL, -- ANKA BEKASI / ANKA PEMALANG (normalized)
    toko_raw TEXT, -- Raw toko name from Excel
    faktur VARCHAR(100) NOT NULL UNIQUE, -- Invoice number (unique identifier)
    metode_bayar VARCHAR(50), -- Piutang/Bank/Cash
    jenis_transaksi VARCHAR(50), -- jual/beli/etc
    konsumen TEXT, -- Customer name
    keterangan VARCHAR(50), -- PPN/NON PPN
    
    -- Aggregated Data (SUM of all rows with same faktur)
    total_jumlah_jual DECIMAL(15,2) NOT NULL DEFAULT 0, -- SUM(JUMLAH JUAL) per faktur
    item_count INT NOT NULL DEFAULT 0, -- Number of items in this invoice
    
    -- File Status Tracking
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING/UPLOADED/MISSING
    uploaded_file_path TEXT, -- Full path in Google Drive
    uploaded_at TIMESTAMPTZ,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Excel Batch Tracking
    excel_batch_id UUID REFERENCES excel_upload_batches(id) ON DELETE SET NULL,
    excel_uploaded_at TIMESTAMPTZ,
    excel_uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_invoice_faktur ON invoice_file_list(faktur);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoice_file_list(status);
CREATE INDEX IF NOT EXISTS idx_invoice_tanggal ON invoice_file_list(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_toko ON invoice_file_list(toko);
CREATE INDEX IF NOT EXISTS idx_invoice_keterangan ON invoice_file_list(keterangan);
CREATE INDEX IF NOT EXISTS idx_invoice_batch ON invoice_file_list(excel_batch_id);
CREATE INDEX IF NOT EXISTS idx_invoice_date_status ON invoice_file_list(tanggal, status);
CREATE INDEX IF NOT EXISTS idx_invoice_jenis ON invoice_file_list(jenis_transaksi);

-- Full-text search index for konsumen
CREATE INDEX IF NOT EXISTS idx_invoice_konsumen_search ON invoice_file_list USING gin(to_tsvector('indonesian', konsumen));

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invoice_updated_at
    BEFORE UPDATE ON invoice_file_list
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_updated_at();

CREATE TRIGGER trigger_batch_updated_at
    BEFORE UPDATE ON excel_upload_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_updated_at();

-- Function: Get Invoice Statistics
CREATE OR REPLACE FUNCTION get_invoice_statistics()
RETURNS TABLE (
    total_count BIGINT,
    uploaded_count BIGINT,
    pending_count BIGINT,
    missing_count BIGINT,
    uploaded_percentage NUMERIC,
    pending_percentage NUMERIC,
    missing_percentage NUMERIC,
    total_modal_sum NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_count,
        COUNT(*) FILTER (WHERE status = 'UPLOADED')::BIGINT as uploaded_count,
        COUNT(*) FILTER (WHERE status = 'PENDING')::BIGINT as pending_count,
        COUNT(*) FILTER (WHERE status = 'MISSING')::BIGINT as missing_count,
        ROUND((COUNT(*) FILTER (WHERE status = 'UPLOADED')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as uploaded_percentage,
        ROUND((COUNT(*) FILTER (WHERE status = 'PENDING')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as pending_percentage,
        ROUND((COUNT(*) FILTER (WHERE status = 'MISSING')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as missing_percentage,
        SUM(total_jumlah_jual) as total_jumlah_jual_sum
    FROM invoice_file_list;
END;
$$ LANGUAGE plpgsql;

-- Function: Mark old pending files as missing (auto-run nightly)
CREATE OR REPLACE FUNCTION mark_old_pending_as_missing(days_threshold INT DEFAULT 3)
RETURNS TABLE (
    updated_count INT,
    faktur_list TEXT[]
) AS $$
DECLARE
    v_updated_count INT;
    v_faktur_list TEXT[];
BEGIN
    -- Update old pending files
    WITH updated AS (
        UPDATE invoice_file_list
        SET status = 'MISSING',
            updated_at = NOW()
        WHERE status = 'PENDING'
          AND tanggal < CURRENT_DATE - (days_threshold || ' days')::INTERVAL
        RETURNING faktur
    )
    SELECT COUNT(*)::INT, ARRAY_AGG(faktur)
    INTO v_updated_count, v_faktur_list
    FROM updated;
    
    RETURN QUERY SELECT v_updated_count, v_faktur_list;
END;
$$ LANGUAGE plpgsql;

-- View: Invoice Dashboard Summary
CREATE OR REPLACE VIEW invoice_dashboard_summary AS
SELECT 
    DATE(tanggal) as tanggal,
    toko,
    keterangan,
    COUNT(*) as total_files,
    COUNT(*) FILTER (WHERE status = 'UPLOADED') as uploaded_files,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_files,
    COUNT(*) FILTER (WHERE status = 'MISSING') as missing_files,
    SUM(total_jumlah_jual) as total_jumlah_jual,
    ROUND((COUNT(*) FILTER (WHERE status = 'UPLOADED')::NUMERIC / COUNT(*) * 100), 2) as upload_percentage
FROM invoice_file_list
GROUP BY DATE(tanggal), toko, keterangan
ORDER BY tanggal DESC, toko, keterangan;

-- Insert sample comment for documentation
COMMENT ON TABLE invoice_file_list IS 'Master list of invoices parsed from Excel REKAP_LABA.xls';
COMMENT ON COLUMN invoice_file_list.faktur IS 'Invoice number from Excel - Unique identifier for matching uploaded PDFs';
COMMENT ON COLUMN invoice_file_list.status IS 'PENDING: awaiting upload, UPLOADED: file uploaded, MISSING: overdue (>3 days)';
COMMENT ON COLUMN invoice_file_list.keterangan IS 'PPN or NON PPN - determines upload path category';

-- Grant permissions (adjust as needed)
GRANT SELECT, INSERT, UPDATE ON invoice_file_list TO authenticated;
GRANT SELECT, INSERT, UPDATE ON excel_upload_batches TO authenticated;
GRANT EXECUTE ON FUNCTION get_invoice_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_old_pending_as_missing(INT) TO authenticated;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Invoice file list system tables created successfully';
    RAISE NOTICE '📊 Run: SELECT * FROM get_invoice_statistics() to see stats';
    RAISE NOTICE '🔍 Run: SELECT * FROM invoice_dashboard_summary to see summary';
END $$;
