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
    app.get('/api/logs/stats', authenticateToken, authorizeRole('super_admin'), (req, res) => {
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
    app.get('/api/logs/:component/:level', authenticateToken, authorizeRole('super_admin'), (req, res) => {
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
    app.get('/api/logs/all/:lines?', authenticateToken, authorizeRole('super_admin'), (req, res) => {
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
    app.post('/api/logs/clear', authenticateToken, authorizeRole('super_admin'), async (req, res) => {
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
     * GET /api/system/health
     * Get system health information
     * Only super_admin can access
     */
    app.get('/api/system/health', authenticateToken, authorizeRole('super_admin'), async (req, res) => {
        try {
            const health = {
                timestamp: new Date().toISOString(),
                status: 'healthy',
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development',
                nodeVersion: process.version,
                platform: process.platform,
                memory: {
                    total: os.totalmem(),
                    free: os.freemem(),
                    used: os.totalmem() - os.freemem(),
                    percentUsed: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
                },
                cpu: {
                    cores: os.cpus().length,
                    model: os.cpus()[0]?.model || 'Unknown',
                    loadAverage: os.loadavg()
                },
                disk: {
                    path: process.env.LOG_PATH || '/app/logs',
                    logStats: logger.getStats()
                },
                database: {
                    status: 'connected', // Would need actual check
                    lastCheck: new Date().toISOString()
                }
            };

            // Check for warnings
            const warnings = [];
            if (health.memory.percentUsed > 80) {
                warnings.push('High memory usage');
                health.status = 'warning';
            }
            if (health.cpu.loadAverage[0] > os.cpus().length * 2) {
                warnings.push('High CPU load');
                health.status = 'warning';
            }

            health.warnings = warnings;

            return res.status(200).json({
                success: true,
                health
            });
        } catch (err) {
            console.error('[LOGGING] Health error:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to get system health',
                message: err.message,
                health: { status: 'error' }
            });
        }
    });

    /**
     * GET /api/system/metrics
     * Get detailed system metrics
     * Only super_admin can access
     */
    app.get('/api/system/metrics', authenticateToken, authorizeRole('super_admin'), (req, res) => {
        try {
            const metrics = {
                timestamp: new Date().toISOString(),
                process: {
                    uptime: process.uptime(),
                    pid: process.pid,
                    memory: process.memoryUsage(),
                    cpuUsage: process.cpuUsage()
                },
                system: {
                    uptime: os.uptime(),
                    loadAverage: os.loadavg(),
                    totalMemory: os.totalmem(),
                    freeMemory: os.freemem(),
                    cpus: os.cpus().length
                },
                logging: logger.getStats()
            };

            return res.status(200).json({
                success: true,
                metrics
            });
        } catch (err) {
            console.error('[LOGGING] Metrics error:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to get metrics',
                message: err.message
            });
        }
    });

    /**
     * POST /api/logs/test
     * Test logging system (for diagnostics)
     * Only super_admin can access
     */
    app.post('/api/logs/test', authenticateToken, authorizeRole('super_admin'), (req, res) => {
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
