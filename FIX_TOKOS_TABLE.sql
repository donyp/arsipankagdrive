-- ============================================================
-- CREATE MISSING TOKO TABLE - FINAL FIXED VERSION
-- Fix 1: Database verification found toko table missing
-- Fix 2: zona_id is INTEGER (not UUID) to match zonas table
-- Fix 3: id is INTEGER (not UUID) to match files.toko_id
-- Fix 4: Table name is "toko" (not "tokos") to match schema
-- ============================================================

-- Drop old broken table if exists
DROP TABLE IF EXISTS toko CASCADE;

-- Step 1: Create toko table (with correct INTEGER id and zona_id)
CREATE TABLE toko (
    id SERIAL PRIMARY KEY,
    nama TEXT NOT NULL,
    zona_id INTEGER NOT NULL REFERENCES zonas(id) ON DELETE CASCADE,
    kota TEXT,
    provinsi TEXT,
    alamat TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(nama, zona_id)
);

-- Step 2: Create indexes for performance
CREATE INDEX idx_toko_zona_id ON toko(zona_id);
CREATE INDEX idx_toko_nama ON toko(nama);

-- Step 3: Grant permissions
GRANT ALL ON toko TO authenticated;
GRANT ALL ON toko TO service_role;

-- Step 4: Seed sample data (optional but recommended)
-- This inserts one toko per zona
INSERT INTO toko (nama, zona_id, kota, provinsi)
SELECT 
    'Toko ' || z.nama as nama,
    z.id,
    CASE 
        WHEN z.nama LIKE '%Karawang%' THEN 'Karawang'
        WHEN z.nama LIKE '%Jakarta%' THEN 'Jakarta'
        ELSE 'Indonesia'
    END as kota,
    'Indonesia' as provinsi
FROM zonas z
ON CONFLICT (nama, zona_id) DO NOTHING;

-- Step 5: Verify table created
SELECT 'toko table creation' as status, COUNT(*) as record_count FROM toko;

-- Step 6: Verify foreign key works
SELECT 
    f.id,
    f.nama_file,
    f.category,
    z.nama as zona_name,
    t.nama as toko_name
FROM files f
LEFT JOIN zonas z ON f.zona_id = z.id
LEFT JOIN toko t ON f.toko_id = t.id
LIMIT 5;

-- ============================================================
-- ALTERNATIVE: If toko table already exists but is wrong,
-- uncomment below to recreate it
-- ============================================================

-- DROP TABLE IF EXISTS toko CASCADE;
-- Then run the CREATE TABLE statement above

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Verify: All tables now exist
SELECT 
    'Verification' as check_type,
    'All tables present' as description,
    COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('files', 'users', 'zonas', 'toko', 'notifications');

-- Verify: toko has data
SELECT 
    'toko' as table_name,
    COUNT(*) as record_count
FROM toko;

-- Verify: Foreign key relationships
SELECT 
    'Foreign Key Check' as check_type,
    COUNT(DISTINCT f.toko_id) as files_with_toko,
    COUNT(DISTINCT f.id) as total_files,
    ROUND(100.0 * COUNT(DISTINCT f.toko_id) / COUNT(DISTINCT f.id), 2) as percentage_with_toko
FROM files f
WHERE f.toko_id IS NOT NULL;

-- ============================================================
-- END OF SCRIPT
-- ============================================================
