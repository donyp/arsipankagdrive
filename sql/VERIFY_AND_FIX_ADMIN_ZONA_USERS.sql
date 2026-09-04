-- ============================================
-- VERIFY AND FIX ADMIN_ZONA USERS
-- ============================================

-- STEP 1: Check current admin_zona users
SELECT 
    id,
    email,
    name,
    role,
    zona_id,
    is_active
FROM users
WHERE role = 'admin_zona'
ORDER BY zona_id, email;

-- STEP 2: If any admin_zona has NULL zona_id, fix them
-- Recreate admin_zona users with proper zona_id
DELETE FROM users WHERE role = 'admin_zona';

-- Insert fresh admin_zona users for all zonas
WITH zona_list AS (
  SELECT id, kode, nama FROM zonas ORDER BY id
)
INSERT INTO users (email, password_hash, name, role, zona_id, is_active, permissions)
SELECT 
  'admin_zona_' || LOWER(z.kode) as email,
  '$2b$12$Hd5e.O3fqQF/.hUz/4pTb.g4F6F6.0L0d2DW7D4U0D2D4D0D0D0D0D0D' as password_hash,
  'Admin ' || z.nama as name,
  'admin_zona' as role,
  z.id as zona_id,
  true as is_active,
  '[]'::jsonb as permissions
FROM zona_list z;

-- STEP 3: Verify the users were created
SELECT 
    id,
    email,
    name,
    role,
    zona_id,
    is_active
FROM users
WHERE role = 'admin_zona'
ORDER BY zona_id, email;

-- STEP 4: Cross-check with invoices for each zona
SELECT 
    u.email,
    u.zona_id,
    (SELECT kode FROM zonas WHERE id = u.zona_id) as zona_kode,
    COUNT(i.id) as invoice_count_for_this_zona
FROM users u
LEFT JOIN invoice_file_list i ON i.zona_id = u.zona_id
WHERE u.role = 'admin_zona'
GROUP BY u.id, u.email, u.zona_id
ORDER BY u.zona_id;

-- STEP 5: Summary
SELECT 
    (SELECT COUNT(*) FROM users WHERE role = 'admin_zona') as admin_zona_count,
    (SELECT COUNT(*) FROM zonas) as total_zones,
    (SELECT COUNT(DISTINCT zona_id) FROM users WHERE role = 'admin_zona') as zones_with_admin,
    (SELECT COUNT(*) FROM invoice_file_list) as total_invoices,
    (SELECT COUNT(CASE WHEN zona_id IS NOT NULL THEN 1 END) FROM invoice_file_list) as invoices_with_zona;

-- STEP 6: Test - try to get invoices for first admin_zona user
SELECT 
    u.email,
    u.zona_id,
    COUNT(i.id) as invoice_count,
    STRING_AGG(DISTINCT i.konsumen, ', ' ORDER BY i.konsumen) as sample_konsumens
FROM users u
LEFT JOIN invoice_file_list i ON i.zona_id = u.zona_id
WHERE u.role = 'admin_zona'
GROUP BY u.id, u.email, u.zona_id
ORDER BY u.zona_id
LIMIT 3;
