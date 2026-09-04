-- ============================================
-- CLEANUP DUPLICATE ADMIN_ZONA USERS
-- Keep: admin_zona_zona_XX (proper naming)
-- Delete: admin_zona_XX (old naming)
-- ============================================

-- STEP 1: Check duplicates
SELECT 
    zona_id,
    COUNT(*) as user_count,
    STRING_AGG(email, ', ') as emails
FROM users
WHERE role = 'admin_zona'
GROUP BY zona_id
HAVING COUNT(*) > 1
ORDER BY zona_id;

-- STEP 2: Delete old naming pattern (admin_zona_01, admin_zona_02, etc)
-- Keep new naming pattern (admin_zona_zona_01, admin_zona_zona_02, etc)
DELETE FROM users
WHERE role = 'admin_zona'
  AND email ~ '^admin_zona_[0-9]|^admin_zona_0[0-9]|^admin_zona_1[0-9a-z]$';

-- Alternative if above doesn't work - delete the ones WITHOUT "zona" in name
DELETE FROM users
WHERE role = 'admin_zona'
  AND email NOT LIKE '%zona%';

-- STEP 3: Verify - should have exactly 1 per zone now
SELECT 
    zona_id,
    COUNT(*) as user_count,
    STRING_AGG(email, ', ') as emails
FROM users
WHERE role = 'admin_zona'
GROUP BY zona_id
ORDER BY zona_id;

-- STEP 4: Verify invoices are still accessible
SELECT 
    u.email,
    u.zona_id,
    (SELECT kode FROM zonas WHERE id = u.zona_id) as zona_kode,
    COUNT(i.id) as invoice_count
FROM users u
LEFT JOIN invoice_file_list i ON i.zona_id = u.zona_id
WHERE u.role = 'admin_zona'
GROUP BY u.id, u.email, u.zona_id
ORDER BY u.zona_id;
