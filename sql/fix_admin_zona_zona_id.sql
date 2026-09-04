-- Fix admin_zona users to have correct zona_id
-- Step 1: Check existing admin_zona users
SELECT id, email, role, zona_id FROM users WHERE role = 'admin_zona' ORDER BY email;

-- Step 2: Assign zona_id based on patterns in email
-- Pattern: admin_zona_1, admin_zona_2, etc should get zona_id = 1, 2, etc
-- For now, we'll assign zona_id = 1 to all admin_zona users without zona_id

-- First, extract zone number from email if it exists
UPDATE users 
SET zona_id = COALESCE(
    CAST(substring(email, '\D+(\d+)') AS INT),
    1
)
WHERE role = 'admin_zona' AND zona_id IS NULL;

-- If pattern doesn't work, ensure at least zona_id = 1 for any remaining NULL
UPDATE users 
SET zona_id = 1
WHERE role = 'admin_zona' AND zona_id IS NULL;

-- Step 3: Verify the fix
SELECT id, email, role, zona_id FROM users WHERE role = 'admin_zona' ORDER BY email;
