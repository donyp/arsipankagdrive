-- Clear old zona and toko data safely
-- Delete ALL files first (they reference zonas)

-- Step 1: Delete ALL files (archive files - will be re-uploaded if needed)
DELETE FROM files;

-- Step 2: Clear invoice_file_list (references toko and zonas)
DELETE FROM invoice_file_list;

-- Step 3: Clear toko
DELETE FROM toko;

-- Step 4: Clear users that reference old zonas
UPDATE users 
SET zona_id = NULL 
WHERE zona_id IS NOT NULL;

-- Step 5: Now safely delete old zonas (all FK references cleared)
DELETE FROM zonas;

-- Step 6: Recreate zonas table with all 17 zones
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

-- Step 7: Insert all toko data with their kode and zona
INSERT INTO toko (kode, nama, zona_id) VALUES
-- Zona 01
('8474003', 'Mega Baja Balaraja', (SELECT id FROM zonas WHERE kode='Zona 01')),
('8474005', 'Mega Baja Serang Timur', (SELECT id FROM zonas WHERE kode='Zona 01')),
('8474034', 'Mega Baja Bitung', (SELECT id FROM zonas WHERE kode='Zona 01')),
('8474059', 'Mega Baja Cipondoh', (SELECT id FROM zonas WHERE kode='Zona 01')),
('8474069', 'Mega Baja Pasar Kemis', (SELECT id FROM zonas WHERE kode='Zona 01')),
('8474073', 'Mega Baja Kutabumi', (SELECT id FROM zonas WHERE kode='Zona 01')),
('8474107', 'MEGA BAJA CILEGON', (SELECT id FROM zonas WHERE kode='Zona 01')),
('8474110', 'Mega Baja Ciruas', (SELECT id FROM zonas WHERE kode='Zona 01')),
('8474155', 'Mega Baja Karawaci', (SELECT id FROM zonas WHERE kode='Zona 01')),

-- Zona 02
('8474009', 'Mega Baja Bintaro', (SELECT id FROM zonas WHERE kode='Zona 02')),
('8474015', 'Mega Baja Sawangan', (SELECT id FROM zonas WHERE kode='Zona 02')),
('8474022', 'Mega Baja Gading Serpong', (SELECT id FROM zonas WHERE kode='Zona 02')),
('8474029', 'Mega Baja Ciledug', (SELECT id FROM zonas WHERE kode='Zona 02')),
('8474035', 'Mega Baja Pinang', (SELECT id FROM zonas WHERE kode='Zona 02')),
('8474045', 'Mega Baja Cengkareng', (SELECT id FROM zonas WHERE kode='Zona 02')),
('8474074', 'Mega Baja Joglo', (SELECT id FROM zonas WHERE kode='Zona 02')),
('8474076', 'Mega Baja Sawangan 2', (SELECT id FROM zonas WHERE kode='Zona 02')),
('8474108', 'Mega Baja Karang Tengah', (SELECT id FROM zonas WHERE kode='Zona 02')),

-- Zona 03A
('8474017', 'Fitrah Jaya Stainles', (SELECT id FROM zonas WHERE kode='Zona 03A')),
('8474031', 'Mega Baja Jatiwaringin', (SELECT id FROM zonas WHERE kode='Zona 03A')),
('8474052', 'Mega Baja Condet', (SELECT id FROM zonas WHERE kode='Zona 03A')),
('8474053', 'Mega Baja Harapan Indah', (SELECT id FROM zonas WHERE kode='Zona 03A')),
('8474056', 'Mega Baja Duren Sawit', (SELECT id FROM zonas WHERE kode='Zona 03A')),
('8474088', 'Mega Aluminium', (SELECT id FROM zonas WHERE kode='Zona 03A')),
('8474093', 'Mega Baja Rorotan', (SELECT id FROM zonas WHERE kode='Zona 03A')),
('8474133', 'Mega Aluminium Karawang', (SELECT id FROM zonas WHERE kode='Zona 03A')),
('8474144', 'Mega Aluminium Leuwiliang', (SELECT id FROM zonas WHERE kode='Zona 03A')),

-- Zona 03B
('8474100', 'Mega Granit', (SELECT id FROM zonas WHERE kode='Zona 03B')),
('8474145', 'Mega Warna Kalimalang', (SELECT id FROM zonas WHERE kode='Zona 03B')),

-- Zona 04
('8474008', 'Mega Baja Indonesia Cibubur', (SELECT id FROM zonas WHERE kode='Zona 04')),
('8474010', 'Mega Baja Cibubur', (SELECT id FROM zonas WHERE kode='Zona 04')),
('8474020', 'Mega Baja Bantar Gebang', (SELECT id FROM zonas WHERE kode='Zona 04')),
('8474047', 'Dunia Baja Komsen', (SELECT id FROM zonas WHERE kode='Zona 04')),
('8474055', 'Mega Baja Cikeas', (SELECT id FROM zonas WHERE kode='Zona 04')),
('8474080', 'Mega Baja Pedurenan', (SELECT id FROM zonas WHERE kode='Zona 04')),
('8474094', 'Mega Baja Cimanggis', (SELECT id FROM zonas WHERE kode='Zona 04')),
('8474131', 'Mega Baja Setu', (SELECT id FROM zonas WHERE kode='Zona 04')),

-- Zona 05
('8474012', 'Mega Baja Dramaga', (SELECT id FROM zonas WHERE kode='Zona 05')),
('8474040', 'Mega Baja Rangkas Bitung', (SELECT id FROM zonas WHERE kode='Zona 05')),
('8474078', 'Mega Baja Karadenan', (SELECT id FROM zonas WHERE kode='Zona 05')),
('8474081', 'Mega Baja Jasinga', (SELECT id FROM zonas WHERE kode='Zona 05')),
('8474092', 'Mega Baja Leuwiliang', (SELECT id FROM zonas WHERE kode='Zona 05')),
('8474132', 'Mega Stainless Leuwiliang', (SELECT id FROM zonas WHERE kode='Zona 05')),
('8474143', 'Mega Baja Sentul', (SELECT id FROM zonas WHERE kode='Zona 05')),
('8474154', 'Mega Baja Parung', (SELECT id FROM zonas WHERE kode='Zona 05')),

-- Zona 06A
('8474002', 'Mega Baja Sukabumi', (SELECT id FROM zonas WHERE kode='Zona 06A')),
('8474006', 'Mega Baja Bogor', (SELECT id FROM zonas WHERE kode='Zona 06A')),
('8474036', 'Mega Baja Ciawi', (SELECT id FROM zonas WHERE kode='Zona 06A')),
('8474048', 'Mega Baja Cianjur', (SELECT id FROM zonas WHERE kode='Zona 06A')),
('8474077', 'Mega Baja Cipeuyeum', (SELECT id FROM zonas WHERE kode='Zona 06A')),
('8474079', 'Mega Baja Cigombong', (SELECT id FROM zonas WHERE kode='Zona 06A')),
('8474147', 'Mega Baja Sukaraja', (SELECT id FROM zonas WHERE kode='Zona 06A')),
('8474152', 'Mega Baja Pelabuhan Ratu', (SELECT id FROM zonas WHERE kode='Zona 06A')),

-- Zona 06B
('8474027', 'Mega Baja Garut (CV Bainit Unggul)', (SELECT id FROM zonas WHERE kode='Zona 06B')),
('8474039', 'Mega Baja Majalaya', (SELECT id FROM zonas WHERE kode='Zona 06B')),
('8474096', 'Mega Baja Soreang', (SELECT id FROM zonas WHERE kode='Zona 06B')),
('8474097', 'Mega Baja Cikalong', (SELECT id FROM zonas WHERE kode='Zona 06B')),
('8474098', 'Mega Baja Sumedang', (SELECT id FROM zonas WHERE kode='Zona 06B')),
('8474116', 'Mega Baja Cimahi', (SELECT id FROM zonas WHERE kode='Zona 06B')),
('8474141', 'Mega Baja Rancaekek', (SELECT id FROM zonas WHERE kode='Zona 06B')),
('8474153', 'Mega Baja Singaparna', (SELECT id FROM zonas WHERE kode='Zona 06B')),

-- Zona 07
('8474014', 'Mega Baja Karawang', (SELECT id FROM zonas WHERE kode='Zona 07')),
('8474026', 'Mega Baja Kedawung - Cirebon', (SELECT id FROM zonas WHERE kode='Zona 07')),
('8474028', 'Mega Baja Palimanan', (SELECT id FROM zonas WHERE kode='Zona 07')),
('8474046', 'Mega Baja Cikampek', (SELECT id FROM zonas WHERE kode='Zona 07')),
('8474051', 'Mega Baja Cirebon', (SELECT id FROM zonas WHERE kode='Zona 07')),
('8474065', 'Mega Baja Purwakarta', (SELECT id FROM zonas WHERE kode='Zona 07')),
('8474075', 'Mega Baja Karawang Timur', (SELECT id FROM zonas WHERE kode='Zona 07')),
('8474087', 'Mega Baja Subang', (SELECT id FROM zonas WHERE kode='Zona 07')),
('8474089', 'Mega Baja Rengas Dengklok', (SELECT id FROM zonas WHERE kode='Zona 07')),
('8474117', 'Mega Baja Kuningan', (SELECT id FROM zonas WHERE kode='Zona 07')),
('8474148', 'Mega Baja Majalengka', (SELECT id FROM zonas WHERE kode='Zona 07')),

-- Zona 08
('8474018', 'Mega Baja Indonesia - Semarang', (SELECT id FROM zonas WHERE kode='Zona 08')),
('8474033', 'Mega Baja Brebes', (SELECT id FROM zonas WHERE kode='Zona 08')),
('8474038', 'Mega Baja Semarang Unggaran', (SELECT id FROM zonas WHERE kode='Zona 08')),
('8474060', 'Mega Baja Pemalang', (SELECT id FROM zonas WHERE kode='Zona 08')),
('8474064', 'Mega Baja Kudus', (SELECT id FROM zonas WHERE kode='Zona 08')),
('8474067', 'Mega Baja Slawi', (SELECT id FROM zonas WHERE kode='Zona 08')),
('8474099', 'Mega Baja Kendal', (SELECT id FROM zonas WHERE kode='Zona 08')),
('8474136', 'Mega Baja Rembang', (SELECT id FROM zonas WHERE kode='Zona 08')),
('8474139', 'Mega Baja Comal', (SELECT id FROM zonas WHERE kode='Zona 08')),
('8474149', 'Mega Baja Temanggung', (SELECT id FROM zonas WHERE kode='Zona 08')),

-- Zona 09
('8474101', 'Mega Baja Yogyakarta', (SELECT id FROM zonas WHERE kode='Zona 09')),
('8474102', 'Mega Baja Solo', (SELECT id FROM zonas WHERE kode='Zona 09')),
('8474105', 'Mega Baja Magelang', (SELECT id FROM zonas WHERE kode='Zona 09')),
('8474111', 'Mega Baja Kebumen', (SELECT id FROM zonas WHERE kode='Zona 09')),
('8474119', 'Mega Baja Sragen', (SELECT id FROM zonas WHERE kode='Zona 09')),
('8474135', 'Mega Baja Prambanan', (SELECT id FROM zonas WHERE kode='Zona 09')),
('8474138', 'Mega Baja Kulon Progo', (SELECT id FROM zonas WHERE kode='Zona 09')),
('8474146', 'Mega Baja Boyolali', (SELECT id FROM zonas WHERE kode='Zona 09')),

-- Zona 10
('8474016', 'Mega Baja Surabaya', (SELECT id FROM zonas WHERE kode='Zona 10')),
('8474037', 'Mega Baja Madiun', (SELECT id FROM zonas WHERE kode='Zona 10')),
('8474049', 'Mega Baja Mojokerto', (SELECT id FROM zonas WHERE kode='Zona 10')),
('8474062', 'Mega Baja Jember', (SELECT id FROM zonas WHERE kode='Zona 10')),
('8474063', 'Mega Baja Malang', (SELECT id FROM zonas WHERE kode='Zona 10')),
('8474112', 'Mega Baja Denpasar', (SELECT id FROM zonas WHERE kode='Zona 10')),
('8474113', 'Mega Baja Kuta Bali', (SELECT id FROM zonas WHERE kode='Zona 10')),
('8474140', 'Mega Baja Denpasar Utara', (SELECT id FROM zonas WHERE kode='Zona 10')),
('8474142', 'Mega Baja Tulungagung', (SELECT id FROM zonas WHERE kode='Zona 10')),

-- Zona 11
('8474041', 'Mega Baja Lampung', (SELECT id FROM zonas WHERE kode='Zona 11')),
('8474090', 'Mega Baja Bandar Jaya', (SELECT id FROM zonas WHERE kode='Zona 11')),
('8474091', 'Mega Baja Kotabumi', (SELECT id FROM zonas WHERE kode='Zona 11')),
('8474118', 'Mega Baja Palembang', (SELECT id FROM zonas WHERE kode='Zona 11')),

-- Zona 12
('8474095', 'Mega Baja Tasikmalaya', (SELECT id FROM zonas WHERE kode='Zona 12')),
('8474103', 'Mega Baja Purwokerto', (SELECT id FROM zonas WHERE kode='Zona 12')),
('8474104', 'Mega Baja Banjarnegara', (SELECT id FROM zonas WHERE kode='Zona 12')),
('8474106', 'Mega Baja Wangon', (SELECT id FROM zonas WHERE kode='Zona 12')),

-- Zona 13
('8474115', 'Mega Baja Makassar', (SELECT id FROM zonas WHERE kode='Zona 13')),
('8474151', 'Mega Baja Gowa', (SELECT id FROM zonas WHERE kode='Zona 13')),

-- Zona 14
('8474114', 'MEGA BAJA SEPINGGAN', (SELECT id FROM zonas WHERE kode='Zona 14')),
('8474134', 'Mega Baja Kariangau - Balikpapan', (SELECT id FROM zonas WHERE kode='Zona 14')),
('8474137', 'Mega Baja Samarinda', (SELECT id FROM zonas WHERE kode='Zona 14')),

-- Zona 15
('8474120', 'Dunia Baja Kayuputih', (SELECT id FROM zonas WHERE kode='Zona 15')),
('8474121', 'Dunia Baja Jonggol', (SELECT id FROM zonas WHERE kode='Zona 15')),
('8474122', 'Dunia Baja Kaliabang', (SELECT id FROM zonas WHERE kode='Zona 15')),
('8474123', 'Mega Baja Kalimalang', (SELECT id FROM zonas WHERE kode='Zona 15')),

-- Zona 16
('8474124', 'Dunia Baja Cibitung', (SELECT id FROM zonas WHERE kode='Zona 16')),
('8474125', 'Mega Baja Deltamas', (SELECT id FROM zonas WHERE kode='Zona 16')),
('8474126', 'Mega Baja Sukatani', (SELECT id FROM zonas WHERE kode='Zona 16')),
('8474127', 'Mega Baja Pulogebang', (SELECT id FROM zonas WHERE kode='Zona 16')),
('8474150', 'Mega Baja Bandung', (SELECT id FROM zonas WHERE kode='Zona 16')),

-- Zona 17
('8474128', 'Mega Baja Cikarang', (SELECT id FROM zonas WHERE kode='Zona 17')),
('8474129', 'Mega Baja Sukadami', (SELECT id FROM zonas WHERE kode='Zona 17')),
('8474130', 'Mega Baja Cibarusah', (SELECT id FROM zonas WHERE kode='Zona 17'));

-- Step 8: Log completion and verify
SELECT 'Zona-Toko mapping update complete!' as status;
SELECT COUNT(*) as total_zonas FROM zonas;
SELECT COUNT(*) as total_tokos FROM toko;
SELECT COUNT(*) as remaining_files FROM files;
