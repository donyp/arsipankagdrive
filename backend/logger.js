/**
 * Centralized Logging System
 * Provides structured logging with file persistence and rotation
 * Completely isolated - does not modify existing console.log calls
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class Logger {
    constructor(options = {}) {
        this.logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
        this.logPath = process.env.LOG_PATH || path.join(__dirname, '..', 'logs');
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
        this.maxFiles = options.maxFiles || 30;
        this.logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
        
        this.ensureLogDirectory();
    }

    /**
     * Ensure log directory exists
     */
    ensureLogDirectory() {
        if (!fs.existsSync(this.logPath)) {
            fs.mkdirSync(this.logPath, { recursive: true });
        }
    }

    /**
     * Get log level numeric value
     */
    getLogLevelValue(level) {
        return this.logLevels[level] || 1;
    }

    /**
     * Check if log should be written based on level
     */
    shouldLog(level) {
        return this.getLogLevelValue(level) >= this.getLogLevelValue(this.logLevel);
    }

    /**
     * Format log entry as JSON
     */
    formatLogEntry(level, component, message, data = {}) {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            component,
            message,
            ...data,
            pid: process.pid,
            version: require('../package.json').version
        });
    }

    /**
     * Write log to file with rotation
     */
    writeToFile(level, component, message, data = {}) {
        try {
            const logEntry = this.formatLogEntry(level, component, message, data);
            const logFile = path.join(this.logPath, `${component}-${level}.log`);
            const allLogsFile = path.join(this.logPath, 'all.log');

            // Check if file needs rotation
            if (fs.existsSync(logFile)) {
                const stats = fs.statSync(logFile);
                if (stats.size > this.maxFileSize) {
                    this.rotateLogFile(logFile);
                }
            }

            if (fs.existsSync(allLogsFile)) {
                const stats = fs.statSync(allLogsFile);
                if (stats.size > this.maxFileSize) {
                    this.rotateLogFile(allLogsFile);
                }
            }

            // Write to component-specific log
            fs.appendFileSync(logFile, logEntry + '\n');
            
            // Write to all.log
            fs.appendFileSync(allLogsFile, logEntry + '\n');

            // Clean up old files
            this.cleanupOldLogs();
        } catch (err) {
            // Fail silently - don't crash the app if logging fails
            console.error('[Logger] Write error:', err.message);
        }
    }

    /**
     * Rotate log file
     */
    rotateLogFile(filePath) {
        try {
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').split('T')[0];
            const ext = path.extname(filePath);
            const base = path.basename(filePath, ext);
            const dir = path.dirname(filePath);
            const rotatedName = `${base}-${timestamp}-${Date.now()}${ext}`;
            const rotatedPath = path.join(dir, rotatedName);

            fs.renameSync(filePath, rotatedPath);
            
            // Gzip the rotated file (optional)
            // For now, just keep it as-is for simplicity
        } catch (err) {
            console.error('[Logger] Rotation error:', err.message);
        }
    }

    /**
     * Clean up old log files based on retention policy
     */
    cleanupOldLogs() {
        try {
            const files = fs.readdirSync(this.logPath)
                .filter(f => f.endsWith('.log'))
                .map(f => ({
                    name: f,
                    path: path.join(this.logPath, f),
                    time: fs.statSync(path.join(this.logPath, f)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);

            // Delete files beyond retention limit
            if (files.length > this.maxFiles) {
                files.slice(this.maxFiles).forEach(file => {
                    try {
                        fs.unlinkSync(file.path);
                    } catch (err) {
                        console.error('[Logger] Cleanup error:', err.message);
                    }
                });
            }
        } catch (err) {
            console.error('[Logger] Cleanup error:', err.message);
        }
    }

    /**
     * Log debug level message
     */
    debug(component, message, data = {}) {
        if (this.shouldLog('debug')) {
            console.log(`[${component}] ${message}`, data);
            this.writeToFile('debug', component, message, data);
        }
    }

    /**
     * Log info level message
     */
    info(component, message, data = {}) {
        if (this.shouldLog('info')) {
            console.log(`[${component}] ${message}`, data);
            this.writeToFile('info', component, message, data);
        }
    }

    /**
     * Log warning level message
     */
    warn(component, message, data = {}) {
        if (this.shouldLog('warn')) {
            console.warn(`[${component}] WARN: ${message}`, data);
            this.writeToFile('warn', component, message, data);
        }
    }

    /**
     * Log error level message
     */
    error(component, message, error = null, data = {}) {
        if (this.shouldLog('error')) {
            const errorData = {
                ...data,
                error: error?.message || String(error),
                ...(error?.stack && { stack: error.stack })
            };
            console.error(`[${component}] ERROR: ${message}`, errorData);
            this.writeToFile('error', component, message, errorData);
        }
    }

    /**
     * Log HTTP request
     */
    logRequest(component, method, url, statusCode, duration, data = {}) {
        const level = statusCode >= 400 ? 'warn' : 'info';
        if (this.shouldLog(level)) {
            const message = `${method} ${url} - ${statusCode}`;
            console.log(`[${component}] ${message} (${duration}ms)`);
            this.writeToFile(level, component, message, { 
                method, 
                url, 
                statusCode, 
                duration,
                ...data 
            });
        }
    }

    /**
     * Log API call
     */
    logApiCall(component, endpoint, method, statusCode, duration, data = {}) {
        const level = statusCode >= 400 ? 'warn' : 'info';
        if (this.shouldLog(level)) {
            const message = `API ${method} ${endpoint}`;
            console.log(`[${component}] ${message} - ${statusCode} (${duration}ms)`);
            this.writeToFile(level, component, message, {
                endpoint,
                method,
                statusCode,
                duration,
                ...data
            });
        }
    }

    /**
     * Get log statistics
     */
    getStats() {
        try {
            const files = fs.readdirSync(this.logPath).filter(f => f.endsWith('.log'));
            let totalSize = 0;
            const fileSizes = {};

            files.forEach(file => {
                const filePath = path.join(this.logPath, file);
                const size = fs.statSync(filePath).size;
                totalSize += size;
                fileSizes[file] = size;
            });

            return {
                totalFiles: files.length,
                totalSize,
                fileSizes,
                logLevel: this.logLevel,
                logPath: this.logPath
            };
        } catch (err) {
            console.error('[Logger] Stats error:', err.message);
            return null;
        }
    }

    /**
     * Read recent logs from a specific component and level
     */
    readLogs(component, level = null, lines = 100) {
        try {
            const fileName = level 
                ? `${component}-${level}.log`
                : `${component}-info.log`;
            
            const filePath = path.join(this.logPath, fileName);

            if (!fs.existsSync(filePath)) {
                return [];
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const logLines = content.split('\n').filter(line => line.trim());
            
            // Return last N lines
            return logLines.slice(Math.max(0, logLines.length - lines))
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch (err) {
                        return { raw: line };
                    }
                });
        } catch (err) {
            console.error('[Logger] Read error:', err.message);
            return [];
        }
    }

    /**
     * Clear all logs
     */
    clearLogs() {
        try {
            const files = fs.readdirSync(this.logPath).filter(f => f.endsWith('.log'));
            files.forEach(file => {
                const filePath = path.join(this.logPath, file);
                fs.unlinkSync(filePath);
            });
            return { success: true, filesDeleted: files.length };
        } catch (err) {
            console.error('[Logger] Clear error:', err.message);
            return { success: false, error: err.message };
        }
    }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
