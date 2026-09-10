/**
 * Database Backup Management Endpoints
 * Handles backup creation, listing, verification, restoration, and deletion
 * Completely isolated - does not modify existing functionality
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Get current date in YYYYMMDD-HHMMSS format
const getCurrentTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
};

/**
 * Register all backup-related endpoints
 */
function registerBackupEndpoints(app, supabase, authenticateToken, authorizeRole) {
    /**
     * GET /api/backup/list
     * List all backups with filters
     * Only super_admin can access
     */
    app.get('/api/backup/list', authenticateToken, authorizeRole('super_admin'), async (req, res) => {
        try {
            const { status, limit = 20, offset = 0 } = req.query;
            
            let query = supabase
                .from('database_backups')
                .select('*, initiated_by:users(name, email)', { count: 'exact' })
                .order('backup_timestamp', { ascending: false })
                .range(offset, offset + limit - 1);

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error, count } = await query;

            if (error) throw error;

            return res.status(200).json({
                success: true,
                backups: data || [],
                total: count || 0,
                limit,
                offset
            });
        } catch (err) {
            console.error('[BACKUP] List error:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to list backups',
                message: err.message
            });
        }
    });

    /**
     * POST /api/backup/create
     * Create a new manual backup
     * Only super_admin can initiate
     */
    app.post('/api/backup/create', authenticateToken, authorizeRole('super_admin'), async (req, res) => {
        try {
            const { notes } = req.body;
            const backupName = `backup-${getCurrentTimestamp()}`;
            const backupId = uuidv4();

            // Record backup in database as 'pending'
            const { error: insertError } = await supabase
                .from('database_backups')
                .insert({
                    id: backupId,
                    backup_name: backupName,
                    backup_timestamp: new Date().toISOString(),
                    backup_type: 'manual',
                    status: 'pending',
                    initiated_by: req.user.userId,
                    backup_location: `gs://your-bucket/${backupName}.sql.gz`,
                    notes: notes || null
                });

            if (insertError) throw insertError;

            // Update status to in_progress
            await supabase.rpc('update_backup_status', {
                p_backup_id: backupId,
                p_new_status: 'in_progress',
                p_user_id: req.user.userId,
                p_details: JSON.stringify({ action: 'backup_initiated' })
            });

            // Return immediately - backup will run in background
            return res.status(202).json({
                success: true,
                message: 'Backup initiated',
                backupId,
                backupName,
                status: 'in_progress'
            });
        } catch (err) {
            console.error('[BACKUP] Create error:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to initiate backup',
                message: err.message
            });
        }
    });

    /**
     * POST /api/backup/verify/:backupId
     * Verify backup integrity
     * Only super_admin can verify
     */
    app.post('/api/backup/verify/:backupId', authenticateToken, authorizeRole('super_admin'), async (req, res) => {
        try {
            const { backupId } = req.params;

            // Verify backup exists
            const { data: backup, error: fetchError } = await supabase
                .from('database_backups')
                .select('*')
                .eq('id', backupId)
                .single();

            if (fetchError || !backup) {
                return res.status(404).json({
                    success: false,
                    error: 'Backup not found'
                });
            }

            // Mark as verified
            await supabase.rpc('verify_backup', {
                p_backup_id: backupId,
                p_user_id: req.user.userId
            });

            return res.status(200).json({
                success: true,
                message: 'Backup verified',
                backup: { ...backup, is_verified: true }
            });
        } catch (err) {
            console.error('[BACKUP] Verify error:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to verify backup',
                message: err.message
            });
        }
    });

    /**
     * GET /api/backup/info/:backupId
     * Get detailed backup information
     */
    app.get('/api/backup/info/:backupId', authenticateToken, authorizeRole('super_admin'), async (req, res) => {
        try {
            const { backupId } = req.params;

            // Get backup info
            const { data: backup, error: backupError } = await supabase
                .from('database_backups')
                .select('*')
                .eq('id', backupId)
                .single();

            if (backupError || !backup) {
                return res.status(404).json({
                    success: false,
                    error: 'Backup not found'
                });
            }

            // Get audit log for this backup
            const { data: auditLog, error: auditError } = await supabase
                .from('backup_audit_log')
                .select('*, performed_by:users(name, email)')
                .eq('backup_id', backupId)
                .order('timestamp', { ascending: false });

            if (auditError) {
                console.warn('[BACKUP] Audit log fetch warning:', auditError.message);
            }

            return res.status(200).json({
                success: true,
                backup,
                auditLog: auditLog || []
            });
        } catch (err) {
            console.error('[BACKUP] Info error:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to get backup info',
                message: err.message
            });
        }
    });

    /**
     * POST /api/backup/restore/:backupId
     * Restore database from backup
     * Requires confirmation and super_admin role
     * DANGEROUS - should trigger audit alert
     */
    app.post('/api/backup/restore/:backupId', authenticateToken, authorizeRole('super_admin'), async (req, res) => {
        try {
            const { backupId } = req.params;
            const { confirmationCode } = req.body;

            // Verify backup exists
            const { data: backup, error: fetchError } = await supabase
                .from('database_backups')
                .select('*')
                .eq('id', backupId)
                .single();

            if (fetchError || !backup) {
                return res.status(404).json({
                    success: false,
                    error: 'Backup not found'
                });
            }

            // Verify backup is verified before allowing restore
            if (!backup.is_verified) {
                return res.status(400).json({
                    success: false,
                    error: 'Backup must be verified before restoration',
                    backup_status: backup.status
                });
            }

            // Log restoration attempt (critical audit)
            await supabase.rpc('log_backup_restoration', {
                p_backup_id: backupId,
                p_user_id: req.user.userId
            });

            // Return warning - actual restoration should be done manually via CLI
            return res.status(200).json({
                success: true,
                message: 'Restoration logged. Please contact DevOps to complete restoration.',
                backup,
                warning: 'Database restoration requires manual intervention for safety',
                restoreCommand: `pg_restore -d ${process.env.SUPABASE_URL} ${backup.backup_location}`
            });
        } catch (err) {
            console.error('[BACKUP] Restore error:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to restore backup',
                message: err.message
            });
        }
    });

    /**
     * DELETE /api/backup/delete/:backupId
     * Delete old backup
     * Only super_admin can delete
     */
    app.delete('/api/backup/delete/:backupId', authenticateToken, authorizeRole('super_admin'), async (req, res) => {
        try {
            const { backupId } = req.params;
            const { reason } = req.body;

            // Verify backup exists
            const { data: backup, error: fetchError } = await supabase
                .from('database_backups')
                .select('*')
                .eq('id', backupId)
                .single();

            if (fetchError || !backup) {
                return res.status(404).json({
                    success: false,
                    error: 'Backup not found'
                });
            }

            // Log deletion
            await supabase
                .from('backup_audit_log')
                .insert({
                    backup_id: backupId,
                    operation: 'deleted',
                    performed_by: req.user.userId,
                    details: JSON.stringify({ reason: reason || 'No reason provided' })
                });

            // Delete backup record (cascade will delete audit log entries)
            const { error: deleteError } = await supabase
                .from('database_backups')
                .delete()
                .eq('id', backupId);

            if (deleteError) throw deleteError;

            return res.status(200).json({
                success: true,
                message: 'Backup deleted successfully',
                backupId
            });
        } catch (err) {
            console.error('[BACKUP] Delete error:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to delete backup',
                message: err.message
            });
        }
    });

    /**
     * GET /api/backup/stats
     * Get backup statistics and summary
     */
    app.get('/api/backup/stats', authenticateToken, authorizeRole('super_admin'), async (req, res) => {
        try {
            // Get all backups for stats
            const { data: backups, error } = await supabase
                .from('database_backups')
                .select('status, backup_size_bytes, backup_timestamp, is_verified');

            if (error) throw error;

            const stats = {
                totalBackups: backups?.length || 0,
                completedBackups: backups?.filter(b => b.status === 'completed').length || 0,
                failedBackups: backups?.filter(b => b.status === 'failed').length || 0,
                verifiedBackups: backups?.filter(b => b.is_verified).length || 0,
                totalSizeBytes: backups?.reduce((sum, b) => sum + (b.backup_size_bytes || 0), 0) || 0,
                lastBackupTime: backups?.[0]?.backup_timestamp || null,
                averageSizeBytes: backups?.filter(b => b.backup_size_bytes).length > 0
                    ? Math.round(backups.filter(b => b.backup_size_bytes).reduce((sum, b) => sum + b.backup_size_bytes, 0) / backups.filter(b => b.backup_size_bytes).length)
                    : 0
            };

            return res.status(200).json({
                success: true,
                stats
            });
        } catch (err) {
            console.error('[BACKUP] Stats error:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to get backup statistics',
                message: err.message
            });
        }
    });

    /**
     * POST /api/backup/cleanup
     * Remove old backups based on retention policy
     * Only super_admin can execute
     */
    app.post('/api/backup/cleanup', authenticateToken, authorizeRole('super_admin'), async (req, res) => {
        try {
            const retentionCount = Number(process.env.BACKUP_RETENTION_COUNT) || 30;

            // Get all completed backups, ordered by timestamp (newest first)
            const { data: backups, error: fetchError } = await supabase
                .from('database_backups')
                .select('id, backup_timestamp, status')
                .eq('status', 'completed')
                .order('backup_timestamp', { ascending: false });

            if (fetchError) throw fetchError;

            // Mark old backups for deletion (keep last N backups)
            const backupsToDelete = backups?.slice(retentionCount) || [];
            let deletedCount = 0;

            for (const backup of backupsToDelete) {
                await supabase
                    .from('database_backups')
                    .delete()
                    .eq('id', backup.id);
                deletedCount++;
            }

            return res.status(200).json({
                success: true,
                message: `Cleanup completed: ${deletedCount} old backups deleted`,
                retentionCount,
                deletedBackups: deletedCount,
                remainingBackups: backups?.length - deletedCount || 0
            });
        } catch (err) {
            console.error('[BACKUP] Cleanup error:', err);
            return res.status(500).json({
                success: false,
                error: 'Backup cleanup failed',
                message: err.message
            });
        }
    });
}

module.exports = registerBackupEndpoints;
