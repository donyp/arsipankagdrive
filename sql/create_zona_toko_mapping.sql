-- Create zona_toko_mapping table for zone-based toko filtering
-- This table links each toko to its corresponding zona for quick lookups

CREATE TABLE IF NOT EXISTS zona_toko_mapping (
    id SERIAL PRIMARY KEY,
    zona_id INTEGER NOT NULL REFERENCES zonas(id) ON DELETE CASCADE,
    toko_id INTEGER NOT NULL REFERENCES toko(id) ON DELETE CASCADE,
    toko_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(zona_id, toko_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_zona_toko_mapping_zona_id ON zona_toko_mapping(zona_id);
CREATE INDEX IF NOT EXISTS idx_zona_toko_mapping_toko_id ON zona_toko_mapping(toko_id);

-- Populate zona_toko_mapping from existing toko table
INSERT INTO zona_toko_mapping (zona_id, toko_id, toko_name)
SELECT zona_id, id, nama
FROM toko
WHERE zona_id IS NOT NULL
ON CONFLICT (zona_id, toko_id) DO NOTHING;

-- Verify the data was inserted
SELECT 
    z.nama as zona_name,
    COUNT(ztm.id) as toko_count,
    STRING_AGG(ztm.toko_name, ', ' ORDER BY ztm.toko_name) as toko_list
FROM zonas z
LEFT JOIN zona_toko_mapping ztm ON z.id = ztm.zona_id
GROUP BY z.id, z.nama
ORDER BY z.id;
