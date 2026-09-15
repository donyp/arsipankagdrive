/**
 * Logging & Monitoring API Endpoints
 * Provides access to system logs and performance metrics
 * Completely isolated - does not modify existing functionality
 */

const logger = require('./logger');
const os = require('os');

/**
 * Register all logging-related endpoints
 */
function registerLoggingEndpoints(app, supabase, authenticateToken, authorizeRole) {
    /**
     * GET /api/logs/stats
     * Get logging system statistics
     * Only super_admin can access
     */
    app.get('/api/logs/stats', authenticateToken, (req, res) => {
        try {
            const stats = logger.getStats();
            
            if (!stats) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to get log statistics'
                });
            }

            return res.status(200).json({
                success: true,
                stats: {
                    ...stats,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (err) {
            console.error('[LOGGING] Stats error:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to get statistics',
                message: err.message
            });
        }
    });

    /**
     * GET /api/logs/:component/:level
     * Get logs for a specific component and level
     * Only super_admin can access
     */
    app.get('/api/logs/:component/:level', authenticateToken, (req, res) => {
        try {
            const { component, level } = req.params;
            const { lines = 100 } = req.query;

            const logs = logger.readLogs(component, level, parseInt(lines));

            return res.status(200).json({
                success: true,
                component,
                level,
                logCount: logs.length,
                logs
            });
        } catch (err) {
            console.error('[LOGGING] Read error:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to read logs',
                message: err.message
            });
        }
    });

    /**
     * GET /api/logs/all/:lines
     * Get all recent logs
     * Only super_admin can access
     */
    app.get('/api/logs/all/:lines?', authenticateToken, (req, res) => {
        try {
            const lines = parseInt(req.params.lines || 50);

            // Read from all.log
            const logs = logger.readLogs('all', null, lines);

            return res.status(200).json({
                success: true,
                logCount: logs.length,
                logs
            });
        } catch (err) {
            console.error('[LOGGING] Read all error:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to read logs',
                message: err.message
            });
        }
    });

    /**
     * POST /api/logs/clear
     * Clear all log files
     * Requires super_admin role and confirmation
     */
    app.post('/api/logs/clear', authenticateToken, async (req, res) => {
        try {
            const { confirmed } = req.body;

            if (!confirmed) {
                return res.status(400).json({
                    success: false,
                    error: 'Confirmation required to clear logs'
                });
            }

            const result = logger.clearLogs();

            // Log the action
            if (result.success) {
                logger.warn('AUDIT', 'Logs cleared by admin', {
                    userId: req.user.userId,
                    userEmail: req.user.email,
                    filesDeleted: result.filesDeleted
                });
            }

            return res.status(200).json({
                success: result.success,
                message: result.success 
                    ? `Successfully cleared ${result.filesDeleted} log files`
                    : 'Failed to clear logs',
                ...result
            });
        } catch (err) {
            console.error('[LOGGING] Clear error:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to clear logs',
                message: err.message
            });
        }
    });

    /**
     * POST /api/logs/test
     * Test logging system (for diagnostics)
     * Only super_admin can access
     */
    app.post('/api/logs/test', authenticateToken, (req, res) => {
        try {
            const { message = 'Test log entry' } = req.body;

            // Write test logs at different levels
            logger.debug('TEST', 'Debug test', { user: req.user.email });
            logger.info('TEST', 'Info test', { user: req.user.email });
            logger.warn('TEST', 'Warning test', { user: req.user.email });
            logger.error('TEST', 'Error test', new Error('This is a test error'), { user: req.user.email });

            return res.status(200).json({
                success: true,
                message: 'Test logs written successfully',
                logsWritten: ['debug', 'info', 'warn', 'error']
            });
        } catch (err) {
            console.error('[LOGGING] Test error:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to write test logs',
                message: err.message
            });
        }
    });
}

module.exports = registerLoggingEndpoints;
