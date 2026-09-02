-- ============================================================
-- Invoice System Verification Queries
-- Run these to verify installation
-- ============================================================

-- 1. Check if tables exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('invoice_file_list', 'excel_upload_batches')
ORDER BY table_name;

-- 2. Check invoice_file_list structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'invoice_file_list'
ORDER BY ordinal_position;

-- 3. Check excel_upload_batches structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'excel_upload_batches'
ORDER BY ordinal_position;

-- 4. Check if function exists
SELECT proname, prorettype, pronargs
FROM pg_proc
WHERE proname = 'get_invoice_statistics';

-- 5. Test statistics function
SELECT * FROM get_invoice_statistics();

-- 6. Check indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('invoice_file_list', 'excel_upload_batches')
ORDER BY tablename, indexname;

-- 7. Count current records (should be 0 initially)
SELECT 
    'invoice_file_list' as table_name,
    COUNT(*) as record_count
FROM invoice_file_list
UNION ALL
SELECT 
    'excel_upload_batches' as table_name,
    COUNT(*) as record_count
FROM excel_upload_batches;

-- ============================================================
-- Sample Test Data Insert (Optional)
-- Uncomment to test with sample data
-- ============================================================

-- INSERT INTO invoice_file_list (
--     tanggal, toko, toko_raw, faktur, metode_bayar, 
--     jenis_transaksi, konsumen, keterangan, 
--     total_jumlah_jual, item_count, status
-- ) VALUES 
-- ('2026-10-02', 'ANKA BEKASI', 'ANKA', '835100310', 'CASH', 
--  'JUAL', 'Toko Berkah', 'PPN', 2000000, 2, 'PENDING'),
-- ('2026-10-03', 'ANKA PEMALANG', 'ANKA PEMALANG', '724200450', 'PIUTANG', 
--  'JUAL', 'Toko Makmur', 'NON PPN', 2000000, 1, 'PENDING');

-- Test query after insert
-- SELECT * FROM invoice_file_list ORDER BY created_at DESC;
-- SELECT * FROM get_invoice_statistics();
