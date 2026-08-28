-- Add Kalimalang toko
INSERT INTO toko (nama, zona_id, kode)
VALUES ('Kalimalang', 1, 'TOKO-KALIMALANG')
ON CONFLICT (nama, zona_id) DO NOTHING;

-- Verify it was added
SELECT id, nama, zona_id FROM toko WHERE nama = 'Kalimalang';
