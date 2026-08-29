/**
 * Logger utility to control log verbosity
 * Set LOG_LEVEL environment variable to control what gets logged
 * 
 * Levels:
 * - 'silent' : no logs
 * - 'error'  : only errors
 * - 'warn'   : errors and warnings
 * - 'info'   : errors, warnings, and important info (DEFAULT)
 * - 'debug'  : all logs
 */

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();

const LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const currentLevel = LEVELS[LOG_LEVEL] || LEVELS.info;

const logger = {
    error: (prefix, message, data) => {
        if (currentLevel >= LEVELS.error) {
            const msg = data ? `${prefix} ${message}` : `${prefix} ${message}`;
            console.error('❌', msg, data || '');
        }
    },
    
    warn: (prefix, message, data) => {
        if (currentLevel >= LEVELS.warn) {
            const msg = data ? `${prefix} ${message}` : `${prefix} ${message}`;
            console.warn('⚠️ ', msg, data || '');
        }
    },
    
    info: (prefix, message, data) => {
        if (currentLevel >= LEVELS.info) {
            const msg = data ? `${prefix} ${message}` : `${prefix} ${message}`;
            console.log('ℹ️ ', msg, data || '');
        }
    },
    
    debug: (prefix, message, data) => {
        if (currentLevel >= LEVELS.debug) {
            const msg = data ? `${prefix} ${message}` : `${prefix} ${message}`;
            console.log('🔍', msg, data || '');
        }
    },
    
    // Special log for startup/boot
    boot: (message) => {
        if (currentLevel >= LEVELS.info) {
            console.log(message);
        }
    }
};

module.exports = logger;
