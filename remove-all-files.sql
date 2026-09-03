-- ============================================================
-- Remove ALL Files from Database
-- WARNING: This will delete ALL files from the system
-- ============================================================

-- Step 1: Delete all file_revisions (depends on files)
DELETE FROM file_revisions;

-- Step 2: Delete all file_comments (depends on files)
DELETE FROM file_comments;

-- Step 3: Delete all file_shares (depends on files)
DELETE FROM file_shares;

-- Step 4: Delete all update_history_items (depends on files)
DELETE FROM update_history_items;

-- Step 5: Delete all update_history
DELETE FROM update_history;

-- Step 6: Delete all files
DELETE FROM files;

-- Step 7: Verify
SELECT 
    (SELECT COUNT(*) FROM files) as file_count,
    (SELECT COUNT(*) FROM file_revisions) as revision_count,
    (SELECT COUNT(*) FROM file_comments) as comment_count,
    (SELECT COUNT(*) FROM file_shares) as share_count,
    (SELECT COUNT(*) FROM update_history) as history_count;

-- Done! All files removed from database
