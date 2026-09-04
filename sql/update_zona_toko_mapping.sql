-- Clear old zona and toko data safely
-- Temporarily disable FK constraints, then delete and recreate zonas

-- Step 1: Disable all FK constraints
SET CONSTRAINTS ALL DEFERRED;

-- Step 2: Delete ALL dependent tables/records (in order of FK dependencies)
DELETE FROM notifications;     -- references zonas
DELETE FROM bug_reports;       -- references zonas
DELETE FROM files;             -- references zonas
DELETE FROM invoice_file_list; -- references toko
DELETE FROM toko;              -- references zonas

-- Step 3: Clear users that reference old zonas
UPDATE users 
SET zona_id = NULL 
WHERE zona_id IS NOT NULL;

-- Step 4: Now safely delete old zonas (all FK references cleared)
DELETE FROM zonas;

-- Step 5: Recreate zonas table with all 17 zones
INSERT INTO zonas (kode, nama) VALUES
('Zona 01', 'Zona 01'),
('Zona 02', 'Zona 02'),
('Zona 03A', 'Zona 03A'),
('Zona 03B', 'Zona 03B'),
('Zona 04', 'Zona 04'),
('Zona 05', 'Zona 05'),
('Zona 06A', 'Zona 06A'),
('Zona 06B', 'Zona 06B'),
('Zona 07', 'Zona 07'),
('Zona 08', 'Zona 08'),
('Zona 09', 'Zona 09'),
('Zona 10', 'Zona 10'),
('Zona 11', 'Zona 11'),
('Zona 12', 'Zona 12'),
('Zona 13', 'Zona 13'),
('Zona 14', 'Zona 14'),
('Zona 15', 'Zona 15'),
('Zona 16', 'Zona 16'),
('Zona 17', 'Zona 17');

-- Step 6: Insert all toko data with their zona (without kode column - it doesn't exist)
INSERT INTO toko (nama, zona_id) VALUES
-- Zona 01
('Mega Baja Balaraja', (SELECT id FROM zonas WHERE kode='Zona 01')),
('Mega Baja Serang Timur', (SELECT id FROM zonas WHERE kode='Zona 01')),
('Mega Baja Bitung', (SELECT id FROM zonas WHERE kode='Zona 01')),
('Mega Baja Cipondoh', (SELECT id FROM zonas WHERE kode='Zona 01')),
('Mega Baja Pasar Kemis', (SELECT id FROM zonas WHERE kode='Zona 01')),
('Mega Baja Kutabumi', (SELECT id FROM zonas WHERE kode='Zona 01')),
('MEGA BAJA CILEGON', (SELECT id FROM zonas WHERE kode='Zona 01')),
('Mega Baja Ciruas', (SELECT id FROM zonas WHERE kode='Zona 01')),
('Mega Baja Karawaci', (SELECT id FROM zonas WHERE kode='Zona 01')),

-- Zona 02
('Mega Baja Bintaro', (SELECT id FROM zonas WHERE kode='Zona 02')),
('Mega Baja Sawangan', (SELECT id FROM zonas WHERE kode='Zona 02')),
('Mega Baja Gading Serpong', (SELECT id FROM zonas WHERE kode='Zona 02')),
('Mega Baja Ciledug', (SELECT id FROM zonas WHERE kode='Zona 02')),
('Mega Baja Pinang', (SELECT id FROM zonas WHERE kode='Zona 02')),
('Mega Baja Cengkareng', (SELECT id FROM zonas WHERE kode='Zona 02')),
('Mega Baja Joglo', (SELECT id FROM zonas WHERE kode='Zona 02')),
('Mega Baja Sawangan 2', (SELECT id FROM zonas WHERE kode='Zona 02')),
('Mega Baja Karang Tengah', (SELECT id FROM zonas WHERE kode='Zona 02')),

-- Zona 03A
('Fitrah Jaya Stainles', (SELECT id FROM zonas WHERE kode='Zona 03A')),
('Mega Baja Jatiwaringin', (SELECT id FROM zonas WHERE kode='Zona 03A')),
('Mega Baja Condet', (SELECT id FROM zonas WHERE kode='Zona 03A')),
('Mega Baja Harapan Indah', (SELECT id FROM zonas WHERE kode='Zona 03A')),
('Mega Baja Duren Sawit', (SELECT id FROM zonas WHERE kode='Zona 03A')),
('Mega Aluminium', (SELECT id FROM zonas WHERE kode='Zona 03A')),
('Mega Baja Rorotan', (SELECT id FROM zonas WHERE kode='Zona 03A')),
('Mega Aluminium Karawang', (SELECT id FROM zonas WHERE kode='Zona 03A')),
('Mega Aluminium Leuwiliang', (SELECT id FROM zonas WHERE kode='Zona 03A')),

-- Zona 03B
('Mega Granit', (SELECT id FROM zonas WHERE kode='Zona 03B')),
('Mega Warna Kalimalang', (SELECT id FROM zonas WHERE kode='Zona 03B')),

-- Zona 04
('Mega Baja Indonesia Cibubur', (SELECT id FROM zonas WHERE kode='Zona 04')),
('Mega Baja Cibubur', (SELECT id FROM zonas WHERE kode='Zona 04')),
('Mega Baja Bantar Gebang', (SELECT id FROM zonas WHERE kode='Zona 04')),
('Dunia Baja Komsen', (SELECT id FROM zonas WHERE kode='Zona 04')),
('Mega Baja Cikeas', (SELECT id FROM zonas WHERE kode='Zona 04')),
('Mega Baja Pedurenan', (SELECT id FROM zonas WHERE kode='Zona 04')),
('Mega Baja Cimanggis', (SELECT id FROM zonas WHERE kode='Zona 04')),
('Mega Baja Setu', (SELECT id FROM zonas WHERE kode='Zona 04')),

-- Zona 05
('Mega Baja Dramaga', (SELECT id FROM zonas WHERE kode='Zona 05')),
('Mega Baja Rangkas Bitung', (SELECT id FROM zonas WHERE kode='Zona 05')),
('Mega Baja Karadenan', (SELECT id FROM zonas WHERE kode='Zona 05')),
('Mega Baja Jasinga', (SELECT id FROM zonas WHERE kode='Zona 05')),
('Mega Baja Leuwiliang', (SELECT id FROM zonas WHERE kode='Zona 05')),
('Mega Stainless Leuwiliang', (SELECT id FROM zonas WHERE kode='Zona 05')),
('Mega Baja Sentul', (SELECT id FROM zonas WHERE kode='Zona 05')),
('Mega Baja Parung', (SELECT id FROM zonas WHERE kode='Zona 05')),

-- Zona 06A
('Mega Baja Sukabumi', (SELECT id FROM zonas WHERE kode='Zona 06A')),
('Mega Baja Bogor', (SELECT id FROM zonas WHERE kode='Zona 06A')),
('Mega Baja Ciawi', (SELECT id FROM zonas WHERE kode='Zona 06A')),
('Mega Baja Cianjur', (SELECT id FROM zonas WHERE kode='Zona 06A')),
('Mega Baja Cipeuyeum', (SELECT id FROM zonas WHERE kode='Zona 06A')),
('Mega Baja Cigombong', (SELECT id FROM zonas WHERE kode='Zona 06A')),
('Mega Baja Sukaraja', (SELECT id FROM zonas WHERE kode='Zona 06A')),
('Mega Baja Pelabuhan Ratu', (SELECT id FROM zonas WHERE kode='Zona 06A')),

-- Zona 06B
('Mega Baja Garut (CV Bainit Unggul)', (SELECT id FROM zonas WHERE kode='Zona 06B')),
('Mega Baja Majalaya', (SELECT id FROM zonas WHERE kode='Zona 06B')),
('Mega Baja Soreang', (SELECT id FROM zonas WHERE kode='Zona 06B')),
('Mega Baja Cikalong', (SELECT id FROM zonas WHERE kode='Zona 06B')),
('Mega Baja Sumedang', (SELECT id FROM zonas WHERE kode='Zona 06B')),
('Mega Baja Cimahi', (SELECT id FROM zonas WHERE kode='Zona 06B')),
('Mega Baja Rancaekek', (SELECT id FROM zonas WHERE kode='Zona 06B')),
('Mega Baja Singaparna', (SELECT id FROM zonas WHERE kode='Zona 06B')),

-- Zona 07
('Mega Baja Karawang', (SELECT id FROM zonas WHERE kode='Zona 07')),
('Mega Baja Kedawung - Cirebon', (SELECT id FROM zonas WHERE kode='Zona 07')),
('Mega Baja Palimanan', (SELECT id FROM zonas WHERE kode='Zona 07')),
('Mega Baja Cikampek', (SELECT id FROM zonas WHERE kode='Zona 07')),
('Mega Baja Cirebon', (SELECT id FROM zonas WHERE kode='Zona 07')),
('Mega Baja Purwakarta', (SELECT id FROM zonas WHERE kode='Zona 07')),
('Mega Baja Karawang Timur', (SELECT id FROM zonas WHERE kode='Zona 07')),
('Mega Baja Subang', (SELECT id FROM zonas WHERE kode='Zona 07')),
('Mega Baja Rengas Dengklok', (SELECT id FROM zonas WHERE kode='Zona 07')),
('Mega Baja Kuningan', (SELECT id FROM zonas WHERE kode='Zona 07')),
('Mega Baja Majalengka', (SELECT id FROM zonas WHERE kode='Zona 07')),

-- Zona 08
('Mega Baja Indonesia - Semarang', (SELECT id FROM zonas WHERE kode='Zona 08')),
('Mega Baja Brebes', (SELECT id FROM zonas WHERE kode='Zona 08')),
('Mega Baja Semarang Unggaran', (SELECT id FROM zonas WHERE kode='Zona 08')),
('Mega Baja Pemalang', (SELECT id FROM zonas WHERE kode='Zona 08')),
('Mega Baja Kudus', (SELECT id FROM zonas WHERE kode='Zona 08')),
('Mega Baja Slawi', (SELECT id FROM zonas WHERE kode='Zona 08')),
('Mega Baja Kendal', (SELECT id FROM zonas WHERE kode='Zona 08')),
('Mega Baja Rembang', (SELECT id FROM zonas WHERE kode='Zona 08')),
('Mega Baja Comal', (SELECT id FROM zonas WHERE kode='Zona 08')),
('Mega Baja Temanggung', (SELECT id FROM zonas WHERE kode='Zona 08')),

-- Zona 09
('Mega Baja Yogyakarta', (SELECT id FROM zonas WHERE kode='Zona 09')),
('Mega Baja Solo', (SELECT id FROM zonas WHERE kode='Zona 09')),
('Mega Baja Magelang', (SELECT id FROM zonas WHERE kode='Zona 09')),
('Mega Baja Kebumen', (SELECT id FROM zonas WHERE kode='Zona 09')),
('Mega Baja Sragen', (SELECT id FROM zonas WHERE kode='Zona 09')),
('Mega Baja Prambanan', (SELECT id FROM zonas WHERE kode='Zona 09')),
('Mega Baja Kulon Progo', (SELECT id FROM zonas WHERE kode='Zona 09')),
('Mega Baja Boyolali', (SELECT id FROM zonas WHERE kode='Zona 09')),

-- Zona 10
('Mega Baja Surabaya', (SELECT id FROM zonas WHERE kode='Zona 10')),
('Mega Baja Madiun', (SELECT id FROM zonas WHERE kode='Zona 10')),
('Mega Baja Mojokerto', (SELECT id FROM zonas WHERE kode='Zona 10')),
('Mega Baja Jember', (SELECT id FROM zonas WHERE kode='Zona 10')),
('Mega Baja Malang', (SELECT id FROM zonas WHERE kode='Zona 10')),
('Mega Baja Denpasar', (SELECT id FROM zonas WHERE kode='Zona 10')),
('Mega Baja Kuta Bali', (SELECT id FROM zonas WHERE kode='Zona 10')),
('Mega Baja Denpasar Utara', (SELECT id FROM zonas WHERE kode='Zona 10')),
('Mega Baja Tulungagung', (SELECT id FROM zonas WHERE kode='Zona 10')),

-- Zona 11
('Mega Baja Lampung', (SELECT id FROM zonas WHERE kode='Zona 11')),
('Mega Baja Bandar Jaya', (SELECT id FROM zonas WHERE kode='Zona 11')),
('Mega Baja Kotabumi', (SELECT id FROM zonas WHERE kode='Zona 11')),
('Mega Baja Palembang', (SELECT id FROM zonas WHERE kode='Zona 11')),

-- Zona 12
('Mega Baja Tasikmalaya', (SELECT id FROM zonas WHERE kode='Zona 12')),
('Mega Baja Purwokerto', (SELECT id FROM zonas WHERE kode='Zona 12')),
('Mega Baja Banjarnegara', (SELECT id FROM zonas WHERE kode='Zona 12')),
('Mega Baja Wangon', (SELECT id FROM zonas WHERE kode='Zona 12')),

-- Zona 13
('Mega Baja Makassar', (SELECT id FROM zonas WHERE kode='Zona 13')),
('Mega Baja Gowa', (SELECT id FROM zonas WHERE kode='Zona 13')),

-- Zona 14
('MEGA BAJA SEPINGGAN', (SELECT id FROM zonas WHERE kode='Zona 14')),
('Mega Baja Kariangau - Balikpapan', (SELECT id FROM zonas WHERE kode='Zona 14')),
('Mega Baja Samarinda', (SELECT id FROM zonas WHERE kode='Zona 14')),

-- Zona 15
('Dunia Baja Kayuputih', (SELECT id FROM zonas WHERE kode='Zona 15')),
('Dunia Baja Jonggol', (SELECT id FROM zonas WHERE kode='Zona 15')),
('Dunia Baja Kaliabang', (SELECT id FROM zonas WHERE kode='Zona 15')),
('Mega Baja Kalimalang', (SELECT id FROM zonas WHERE kode='Zona 15')),

-- Zona 16
('Dunia Baja Cibitung', (SELECT id FROM zonas WHERE kode='Zona 16')),
('Mega Baja Deltamas', (SELECT id FROM zonas WHERE kode='Zona 16')),
('Mega Baja Sukatani', (SELECT id FROM zonas WHERE kode='Zona 16')),
('Mega Baja Pulogebang', (SELECT id FROM zonas WHERE kode='Zona 16')),
('Mega Baja Bandung', (SELECT id FROM zonas WHERE kode='Zona 16')),

-- Zona 17
('Mega Baja Cikarang', (SELECT id FROM zonas WHERE kode='Zona 17')),
('Mega Baja Sukadami', (SELECT id FROM zonas WHERE kode='Zona 17')),
('Mega Baja Cibarusah', (SELECT id FROM zonas WHERE kode='Zona 17'));

-- Step 7: Log completion and verify
SELECT 'Zona-Toko mapping update complete!' as status;
SELECT COUNT(*) as total_zonas FROM zonas;
SELECT COUNT(*) as total_tokos FROM toko;
SELECT COUNT(*) as total_files FROM files;
SELECT COUNT(*) as total_bug_reports FROM bug_reports;
SELECT COUNT(*) as total_notifications FROM notifications;
