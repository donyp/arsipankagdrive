// ============================================================
// Generate rclone.conf from Environment Variables
// This is needed because .gitignore prevents rclone.conf from being committed
// So we generate it at runtime from Railway environment variables
// ============================================================

const fs = require('fs');
const path = require('path');

/**
 * Generate rclone.conf from environment variables
 * This allows Railway to have secure rclone config without committing it to git
 */
function generateRcloneConfig() {
    try {
        console.log('[RcloneConfig] Generating rclone.conf from environment variables...');

        // Check if we have Google Drive OAuth credentials in env
        const hasGDriveOAuth = process.env.GDRIVE_OAUTH_TOKEN || 
                               process.env.GDRIVE_CLIENT_ID || 
                               process.env.GDRIVE_CLIENT_SECRET;

        if (!hasGDriveOAuth) {
            console.warn('[RcloneConfig] ⚠️  No Google Drive OAuth found in env vars');
            console.warn('[RcloneConfig] Using fallback/empty config');
            
            // Create minimal config
            const minimalConfig = `[gdrive]
type = drive
scope = drive
`;
            const configPath = path.join(__dirname, '..', 'rclone.conf');
            fs.writeFileSync(configPath, minimalConfig);
            console.log('[RcloneConfig] ✅ Minimal config written to:', configPath);
            return;
        }

        // Build full rclone config from env vars
        let config = '';

        // ============================================================
        // PRIMARY - Google Drive
        // ============================================================
        config += `[gdrive]
type = drive
scope = drive
`;

        // Add OAuth token if available
        if (process.env.GDRIVE_OAUTH_TOKEN) {
            config += `token = ${process.env.GDRIVE_OAUTH_TOKEN}\n`;
        }

        // Add client ID
        if (process.env.GDRIVE_CLIENT_ID) {
            config += `client_id = ${process.env.GDRIVE_CLIENT_ID}\n`;
        }

        // Add client secret
        if (process.env.GDRIVE_CLIENT_SECRET) {
            config += `client_secret = ${process.env.GDRIVE_CLIENT_SECRET}\n`;
        }

        // Add performance settings
        config += `team_drive = 
fast_list = true
use_trash = false
chunk_size = 32M
upload_cutoff = 32M
max_sleep_interval = 30s
disable_http2 = false
timeout = 5m
drive_acknowledge_abuse = true
keep_alive = 30s

`;

        // ============================================================
        // ENCRYPTION: Google Drive with client-side encryption
        // ============================================================
        config += `[gdrive_crypt]
type = crypt
remote = gdrive:/arsip_encrypted
filename_encryption = standard
directory_name_encryption = true
password = uR-oRsbNnnKcfycXNO_4o4i5luHbnE-ncDCN3JaRvC4

`;

        // ============================================================
        // CACHE: Local cache for frequently accessed files
        // ============================================================
        config += `[gdrive_cache]
type = cache
remote = gdrive:/
chunk_size = 10M
db_path = ./cache/gdrive.db
chunk_path = ./cache/chunks
db_wait_time = 1m
chunk_total_size = 2G
info_age = 1h
chunk_clean_interval = 15m

`;

        // ============================================================
        // BACKUP: Backblaze B2 (optional)
        // ============================================================
        if (process.env.B2_ACCOUNT_ID && process.env.B2_APP_KEY) {
            config += `[b2]
type = b2
account_id = ${process.env.B2_ACCOUNT_ID}
app_key = ${process.env.B2_APP_KEY}

`;
        }

        // ============================================================
        // DECENTRALIZED: Storj (optional)
        // ============================================================
        config += `[storj]
type = s3
provider = other
env_auth = false
access_key_id = dummy
secret_access_key = dummy
endpoint = https://gateway.storjshare.io

`;

        // Write to file
        const configPath = path.join(__dirname, '..', 'rclone.conf');
        fs.writeFileSync(configPath, config);

        console.log('[RcloneConfig] ✅ rclone.conf generated successfully');
        console.log('[RcloneConfig] Config path:', configPath);
        console.log('[RcloneConfig] Remote [gdrive] configured: ✓');

        // Verify it was written
        if (fs.existsSync(configPath)) {
            const size = fs.statSync(configPath).size;
            console.log('[RcloneConfig] File size:', size, 'bytes');
        }

        return configPath;

    } catch (err) {
        console.error('[RcloneConfig] ❌ Error generating rclone config:', err.message);
        throw err;
    }
}

/**
 * Verify rclone.conf exists and has [gdrive] section
 */
function verifyRcloneConfig() {
    try {
        const configPath = path.join(__dirname, '..', 'rclone.conf');
        
        if (!fs.existsSync(configPath)) {
            console.warn('[RcloneConfig] ⚠️  rclone.conf does not exist at:', configPath);
            return false;
        }

        const content = fs.readFileSync(configPath, 'utf8');
        
        if (!content.includes('[gdrive]')) {
            console.warn('[RcloneConfig] ⚠️  [gdrive] section not found in rclone.conf');
            return false;
        }

        console.log('[RcloneConfig] ✅ rclone.conf verified - [gdrive] section found');
        return true;

    } catch (err) {
        console.error('[RcloneConfig] Error verifying rclone config:', err.message);
        return false;
    }
}

module.exports = {
    generateRcloneConfig,
    verifyRcloneConfig
};
