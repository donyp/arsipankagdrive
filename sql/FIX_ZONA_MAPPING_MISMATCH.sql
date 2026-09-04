-- ============================================
-- FIX ZONA MAPPING MISMATCH
-- Update admin_zona users to use correct zona_id
-- from NEW zona set (121-139) instead of old (64-82)
-- ============================================

-- STEP 1: Map old zona_id to new zona_id
-- Old: 64-82 (64=Zona01, 65=Zona02, etc)
-- New: 121-139 (121=Zona01, 122=Zona02, etc)
-- Formula: new_id = old_id + 57

-- STEP 2: Update admin_zona users
UPDATE users
SET zona_id = zona_id + 57
WHERE role = 'admin_zona'
  AND zona_id BETWEEN 64 AND 82;

-- STEP 3: Verify the update
SELECT 
    id,
    email,
    zona_id,
    (SELECT kode FROM zonas WHERE id = users.zona_id) as zona_kode,
    (SELECT COUNT(*) FROM invoice_file_list WHERE zona_id = users.zona_id) as invoice_count
FROM users
WHERE role = 'admin_zona'
ORDER BY zona_id;

-- STEP 4: Summary - check if now admin_zona users can see invoices
SELECT 
    u.email,
    u.zona_id,
    z.kode,
    COUNT(i.id) as invoice_count_for_user
FROM users u
LEFT JOIN zonas z ON u.zona_id = z.id
LEFT JOIN invoice_file_list i ON i.zona_id = u.zona_id
WHERE u.role = 'admin_zona'
GROUP BY u.id, u.email, u.zona_id, z.kode
ORDER BY u.zona_id;
