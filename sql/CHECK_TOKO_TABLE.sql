-- Check if toko table is populated
SELECT COUNT(*) as toko_count FROM toko;

-- Show sample toko entries
SELECT id, kode, nama, zona_id FROM toko LIMIT 10;

-- Count toko per zona
SELECT zona_id, COUNT(*) FROM toko GROUP BY zona_id ORDER BY zona_id;
