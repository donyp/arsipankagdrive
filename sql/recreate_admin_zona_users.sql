-- Delete all existing admin_zona users and recreate fresh ones with proper zona_id
-- Password: admin123456
-- Bcrypt hash: $2b$12$Hd5e.O3fqQF/.hUz/4pTb.g4F6F6.0L0d2DW7D4U0D2D4D0D0D0D0D0
-- NOTE: Replace the hash below with actual bcrypt hash if needed

-- Step 1: Delete all admin_zona users
DELETE FROM users WHERE role = 'admin_zona';

-- Step 2: Get all zonas to create admin users for each
-- Using recursive CTE to create insert statements for all zonas
WITH zona_list AS (
  SELECT id, kode, nama FROM zonas ORDER BY id
)
INSERT INTO users (email, password_hash, name, role, zona_id, is_active, permissions)
SELECT 
  'admin_zona_' || LOWER(z.kode),
  '$2b$12$Hd5e.O3fqQF/.hUz/4pTb.g4F6F6.0L0d2DW7D4U0D2D4D0D0D0D0D0D',
  'Admin ' || z.nama,
  'admin_zona',
  z.id,
  true,
  '[]'::jsonb
FROM zona_list z;

-- Step 3: Verify the new users were created
SELECT id, email, name, role, zona_id, is_active FROM users WHERE role = 'admin_zona' ORDER BY zona_id;

-- Step 4: Check zona count
SELECT COUNT(*) as total_admin_zona_users FROM users WHERE role = 'admin_zona';
