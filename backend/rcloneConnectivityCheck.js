// ============================================================
// Rclone Connectivity Verification - Updated for Google Drive
// Verifies Rclone can connect to Google Drive
// ============================================================

const { execFile } = require('child_process');
const path = require('path');

/**
 * Check if Rclone can successfully connect to Google Drive
 * Executes: rclone --config rclone.conf lsjson gdrive:/
 * 
 * Returns:
 * - On success: { success: true, message: "..." }
 * - On failure: { success: false, error: "...", classification: "AUTH_FAILED|UNREACHABLE|..." }
 */
async function verifyRcloneConnectivity(rcloneConfigPath = null) {
    // Default rclone.conf location
    const configPath = rcloneConfigPath || path.join(__dirname, '..', 'rclone.conf');
    
    console.log('[Rclone] Verifying connectivity to Google Drive...');
    console.log(`[Rclone] Config: ${configPath}`);

    return new Promise((resolve) => {
        const timeout = 15000; // 15 second timeout
        let timedOut = false;

        // Execute: rclone --config <path> lsjson gdrive:/
        const child = execFile('rclone', [
            '--config', configPath,
            'lsjson',
            'gdrive:/'
        ], {
            timeout,
            maxBuffer: 1024 * 1024 // 1MB buffer for output
        }, (error, stdout, stderr) => {
            if (timedOut) return; // Already rejected

            // On success: expect valid JSON array
            if (!error) {
                try {
                    const parsed = JSON.parse(stdout);
                    // Should be an array (even if empty)
                    if (Array.isArray(parsed)) {
                        console.log('[Rclone] ✅ Google Drive connection verified');
                        return resolve({
                            success: true,
                            message: 'Rclone successfully connected to Google Drive',
                            fileCount: parsed.length
                        });
                    } else {
                        throw new Error('Invalid JSON response (not an array)');
                    }
                } catch (parseErr) {
                    return resolve({
                        success: false,
                        error: `Invalid JSON response: ${parseErr.message}`,
                        classification: 'INVALID_RESPONSE',
                        stderr: stderr.substring(0, 200)
                    });
                }
            }

            // On error: classify the error type
            const stderrStr = stderr.toString();
            const errorStr = error.message || '';

            let classification = 'UNKNOWN';
            let diagnostic = '';

            // Auth failure
            if (stderrStr.includes('401') || stderrStr.includes('Unauthorized')) {
                classification = 'AUTH_FAILED';
                diagnostic = 'Check rclone.conf [gdrive] token is valid. Refresh using: rclone authorize drive gdrive';
            }
            // Connection refused
            else if (stderrStr.includes('Connection refused') || stderrStr.includes('ECONNREFUSED')) {
                classification = 'UNREACHABLE';
                diagnostic = 'Cannot reach Google Drive. Check internet connection';
            }
            // Timeout
            else if (errorStr.includes('ETIMEDOUT') || timedOut) {
                classification = 'TIMEOUT';
                diagnostic = `Rclone connection timeout after ${timeout}ms. Check internet connection`;
            }
            // Bad remote name
            else if (stderrStr.includes('didn\'t find') || stderrStr.includes('Unknown remote') || stderrStr.includes('not found section')) {
                classification = 'BAD_REMOTE';
                diagnostic = 'Remote "gdrive" not configured in rclone.conf. Check [gdrive] section exists';
            }
            // File not found / config error
            else if (stderrStr.includes('Config')) {
                classification = 'CONFIG_ERROR';
                diagnostic = `Rclone config error: ${stderrStr.substring(0, 100)}`;
            }

            const fullMessage = `[Rclone] ❌ Connection failed (${classification}): ${errorStr}. ${diagnostic}`;
            console.error(fullMessage);

            resolve({
                success: false,
                error: errorStr || stderrStr,
                classification,
                stderr: stderrStr.substring(0, 300),
                message: fullMessage
            });
        });

        // Handle timeout
        const timer = setTimeout(() => {
            timedOut = true;
            child.kill('SIGTERM');
            console.error(`[Rclone] Timeout after ${timeout}ms, killing process`);
            resolve({
                success: false,
                error: `Rclone connection timeout after ${timeout}ms`,
                classification: 'TIMEOUT',
                message: '[Rclone] ❌ Connection timeout'
            });
        }, timeout + 1000); // Add 1s buffer for kill to take effect

        // Prevent timer from keeping process alive
        child.on('exit', () => {
            clearTimeout(timer);
        });
    });
}

module.exports = {
    verifyRcloneConnectivity
};
