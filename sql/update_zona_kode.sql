-- Update zona kode from zona-XX format to numeric/alphanumeric format
-- Convert zona-01, zona-02 to 1, 2
-- Convert zona-03a, zona-03b to 3a, 3b
-- Convert zona-06a, zona-06b to 6a, 6b
-- Keep numbering consistent across all 17 zones

-- First, check current zonas
SELECT id, kode, nama FROM zonas ORDER BY id;

-- Update all zona codes by removing 'zona-' prefix and leading zeros
UPDATE zonas SET kode = 
  CASE 
    WHEN kode = 'zona-01' THEN '1'
    WHEN kode = 'zona-02' THEN '2'
    WHEN kode = 'zona-03a' THEN '3a'
    WHEN kode = 'zona-03b' THEN '3b'
    WHEN kode = 'zona-04' THEN '4'
    WHEN kode = 'zona-05' THEN '5'
    WHEN kode = 'zona-06a' THEN '6a'
    WHEN kode = 'zona-06b' THEN '6b'
    WHEN kode = 'zona-07' THEN '7'
    WHEN kode = 'zona-08' THEN '8'
    WHEN kode = 'zona-09' THEN '9'
    WHEN kode = 'zona-10' THEN '10'
    WHEN kode = 'zona-11' THEN '11'
    WHEN kode = 'zona-12' THEN '12'
    WHEN kode = 'zona-13' THEN '13'
    WHEN kode = 'zona-14' THEN '14'
    WHEN kode = 'zona-15' THEN '15'
    WHEN kode = 'zona-16' THEN '16'
    WHEN kode = 'zona-17' THEN '17'
    ELSE kode
  END
WHERE kode LIKE 'zona-%';

-- Verify updates
SELECT id, kode, nama FROM zonas ORDER BY id;
