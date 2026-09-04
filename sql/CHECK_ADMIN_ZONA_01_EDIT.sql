-- Check if admin_zona_zona 01 was edited or duplicated

-- 1. Count total admin_zona users (should be 19)
SELECT COUNT(*) as total_admin_zona_users FROM users WHERE role = 'admin_zona';

-- 2. Check all users for zona 01 (should be exactly 1)
SELECT 
    id,
    email,
    name,
    role,
    zona_id,
    is_active,
    created_at
FROM users
WHERE role = 'admin_zona' AND zona_id = 121
ORDER BY created_at DESC;

-- 3. Check all admin_zona users with zona_id 121 to see if there are duplicates
SELECT 
    id,
    email,
    zona_id,
    is_active,
    created_at
FROM users
WHERE role = 'admin_zona' AND zona_id = 121;

-- 4. Summary: Check if email changed successfully
SELECT 
    email,
    zona_id,
    (SELECT kode FROM zonas WHERE id = users.zona_id) as zona_kode,
    COUNT(DISTINCT id) as user_count,
    STRING_AGG(DISTINCT id::text, ', ') as user_ids
FROM users
WHERE role = 'admin_zona'
GROUP BY email, zona_id
ORDER BY zona_id;
