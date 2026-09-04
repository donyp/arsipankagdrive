-- Check which stores/toko are in Zona 1 from uploaded invoices
SELECT 
    'ZONA 1 - TOKO' as kategori,
    z.id as zona_id,
    z.kode as zona_kode,
    z.nama as zona_nama,
    t.id as toko_id,
    t.nama as toko_nama,
    COUNT(i.id) as total_invoices,
    COUNT(i.id) FILTER (WHERE i.status = 'PENDING') as pending_count,
    COUNT(i.id) FILTER (WHERE i.status = 'UPLOADED') as uploaded_count,
    COUNT(i.id) FILTER (WHERE i.status = 'MISSING') as missing_count
FROM zonas z
LEFT JOIN toko t ON t.zona_id = z.id
LEFT JOIN invoice_file_list i ON i.toko = t.nama AND i.zona_id = z.id
WHERE z.id = 1  -- Zona 1
GROUP BY z.id, z.kode, z.nama, t.id, t.nama
ORDER BY toko_nama;

-- Show summary of invoices by toko in zona 1
SELECT 
    'ZONA 1 INVOICES SUMMARY' as report,
    toko,
    COUNT(*) as jumlah_faktur,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
    COUNT(*) FILTER (WHERE status = 'UPLOADED') as uploaded,
    COUNT(*) FILTER (WHERE status = 'MISSING') as missing,
    SUM(total_jumlah_jual) as total_nominal
FROM invoice_file_list
WHERE zona_id = 1
GROUP BY toko
ORDER BY COUNT(*) DESC;

-- Show all invoices in zona 1 (sample first 20)
SELECT 
    id,
    tanggal,
    toko,
    faktur,
    konsumen,
    metode_bayar,
    status,
    total_jumlah_jual,
    keterangan
FROM invoice_file_list
WHERE zona_id = 1
ORDER BY tanggal DESC, created_at DESC
LIMIT 20;
