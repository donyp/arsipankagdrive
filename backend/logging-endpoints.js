/**
 * Logging & Monitoring API Endpoints
 * Provides access to system logs and performance metrics
 * Completely isolated - does not modify existing functionality
 * Optimized for safe moderator access with rate limits and input validation
 */

const logger = require('./logger');
const os = require('os');

// Rate limiting: track requests per user per minute
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = {
    '/api/logs/stats': 10,
    '/api/logs/:component/:level': 20,
    '/api/logs/all/:lines': 15,
    '/api/logs/clear': 3,
    '/api/logs/test': 5
};

/**
 * Check rate limit for endpoint
 */
function checkRateLimit(userId, endpoint) {
    const key = `${userId}:${endpoint}`;
    const now = Date.now();
    
    if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        return true;
    }
    
    const limit = rateLimitStore.get(key);
    if (now > limit.resetAt) {
        rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        return true;
    }
    
    const maxRequests = RATE_LIMIT_MAX_REQUESTS[endpoint] || 10;
    if (limit.count >= maxRequests) {
        return false;
    }
    
    limit.count++;
    return true;
}

/**
 * Validate log lines parameter
 */
function validateLines(lines) {
    const parsed = parseInt(lines);
    if (isNaN(parsed) || parsed < 1) return 50; // default
    if (parsed > 1000) return 1000; // cap at 1000
    return parsed;
}

/**
 * Validate component name (alphanumeric, underscore, hyphen)
 */
function validateComponent(component) {
    return /^[a-zA-Z0-9_-]+$/.test(component);
}

/**
 * Validate log level (debug, info, warn, error)
 */
function validateLogLevel(level) {
    return ['debug', 'info', 'warn', 'error'].includes(level.toLowerCase());
}

/**
 * Register all logging-related endpoints
 */
function registerLoggingEndpoints(app, supabase, authenticateToken, authorizeRole) {
    /**
     * GET /api/logs/stats
     * Get logging system statistics
     * Only super_admin and moderator can access
     * Rate limited to 10 requests per minute per user
     */
    app.get('/api/logs/stats', authenticateToken, authorizeRole('super_admin', 'moderator'), (req, res) => {
        try {
            // Check rate limit
            if (!checkRateLimit(req.user.userId, '/api/logs/stats')) {
                return res.status(429).json({
                    success: false,
                    error: 'Rate limit exceeded. Maximum 10 requests per minute.'
                });
            }

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
     * Only super_admin and moderator can access
     * Rate limited to 20 requests per minute per user
     * Input validation: component (alphanumeric), level (debug|info|warn|error)
     */
    app.get('/api/logs/:component/:level', authenticateToken, authorizeRole('super_admin', 'moderator'), (req, res) => {
        try {
            // Check rate limit
            if (!checkRateLimit(req.user.userId, '/api/logs/:component/:level')) {
                return res.status(429).json({
                    success: false,
                    error: 'Rate limit exceeded. Maximum 20 requests per minute.'
                });
            }

            const { component, level } = req.params;
            const { lines = 100 } = req.query;

            // Validate component (prevent path traversal)
            if (!validateComponent(component)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid component name. Use only alphanumeric characters, underscores, and hyphens.'
                });
            }

            // Validate log level
            if (!validateLogLevel(level)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid log level. Must be one of: debug, info, warn, error`
                });
            }

            // Validate and cap lines
            const validatedLines = validateLines(lines);

            const logs = logger.readLogs(component, level, validatedLines);

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
     * GET /api/logs/all
     * Get all recent logs (default 50 lines)
     * GET /api/logs/all/:lines
     * Get all recent logs with specified number of lines
     * Only super_admin and moderator can access
     * Rate limited to 15 requests per minute per user
     * Input validation: lines capped at 1000 maximum
     */
    app.get('/api/logs/all/:lines?', authenticateToken, authorizeRole('super_admin', 'moderator'), (req, res) => {
        try {
            // Check rate limit
            if (!checkRateLimit(req.user.userId, '/api/logs/all/:lines')) {
                return res.status(429).json({
                    success: false,
                    error: 'Rate limit exceeded. Maximum 15 requests per minute.'
                });
            }

            // Validate and cap lines - handle both numeric and non-numeric params
            let lines = 50; // default
            if (req.params.lines && req.params.lines !== '') {
                // Only validate if it's actually provided
                const parsed = parseInt(req.params.lines);
                if (!isNaN(parsed)) {
                    lines = validateLines(parsed);
                } else {
                    // Non-numeric param like 'all' - return 400
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid lines parameter. Must be a number between 1 and 1000.'
                    });
                }
            }

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
     * Requires super_admin role ONLY (not moderator)
     * Rate limited to 3 requests per minute per user
     * Requires confirmation flag in request body
     */
    app.post('/api/logs/clear', authenticateToken, authorizeRole('super_admin'), async (req, res) => {
        try {
            // Check rate limit
            if (!checkRateLimit(req.user.userId, '/api/logs/clear')) {
                return res.status(429).json({
                    success: false,
                    error: 'Rate limit exceeded. Maximum 3 requests per minute.'
                });
            }

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
     * Rate limited to 5 requests per minute per user
     */
    app.post('/api/logs/test', authenticateToken, authorizeRole('super_admin'), (req, res) => {
        try {
            // Check rate limit
            if (!checkRateLimit(req.user.userId, '/api/logs/test')) {
                return res.status(429).json({
                    success: false,
                    error: 'Rate limit exceeded. Maximum 5 requests per minute.'
                });
            }

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
