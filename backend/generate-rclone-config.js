// ============================================================
// Generate rclone.conf from Environment Variables
// This is needed because .gitignore prevents rclone.conf from being committed
// So we generate it at runtime from Railway environment variables
// ============================================================

const fs = require('fs');
const path = require('path');

// Default values (can be overridden by environment variables)
const config = {
    terabox_url: process.env.TERABOX_WEBDAV_URL || 'http://localhost:5244/dav/terabox',
    terabox_user: process.env.TERABOX_USER || 'admin',
    terabox_pass: process.env.TERABOX_PASS || 'jQWUqfvMZ6pXuG8G4epx4upNt6M-Soje9zIJZBecww',
    terabox_direct_url: process.env.TERABOX_DIRECT_URL || 'https://pan.baidu.com/api/publicweb/terabox.php',
    terabox_direct_user: process.env.TERABOX_DIRECT_USER || process.env.TERABOX_USER || 'ptggianka@gmail.com',
    terabox_direct_pass: process.env.TERABOX_DIRECT_PASS || 'IvFf-goPigjVmVBFyCed7xA3PhyqttMDByo0UOk',
    terabox_crypt_password: process.env.TERABOX_CRYPT_PASSWORD || 'uR-oRsbNnnKcfycXNO_4o4i5luHbnE-ncDCN3JaRvC4',
    storj_access_key: process.env.STORJ_ACCESS_KEY || 'dummy',
    storj_secret_key: process.env.STORJ_SECRET_KEY || 'dummy',
    storj_endpoint: process.env.STORJ_ENDPOINT || 'https://gateway.storjshare.io'
};

let rcloneConfig = `[terabox]
type = webdav
url = ${config.terabox_url}
vendor = other
user = ${config.terabox_user}
pass = ${config.terabox_pass}
read_timeout = 5m
write_timeout = 5m
idle_timeout = 5m

[terabox_direct]
type = webdav
url = ${config.terabox_direct_url}
vendor = other
user = ${config.terabox_direct_user}
pass = ${config.terabox_direct_pass}
read_timeout = 10m
write_timeout = 10m
idle_timeout = 10m

[terabox_crypt]
type = crypt
remote = terabox_direct:/arsip_encrypted
filename_encryption = standard
directory_name_encryption = true
password = ${config.terabox_crypt_password}

[storj]
type = s3
provider = other
env_auth = false
access_key_id = ${config.storj_access_key}
secret_access_key = ${config.storj_secret_key}
endpoint = ${config.storj_endpoint}
`;

/**
 * Generate rclone.conf from environment variables
 * This allows Railway to have secure rclone config without committing it to git
 */
function generateRcloneConfig() {
    try {
        console.log('[RcloneConfig] ========== NEW VERSION - PARSING AT RUNTIME ==========');
        console.log('[RcloneConfig] Generating rclone.conf from environment variables...');
        
        let finalConfig = rcloneConfig;
        
        // Add Google Drive configuration if GDRIVE_CONFIG_JSON is provided
        if (process.env.GDRIVE_CONFIG_JSON) {
            try {
                const gdriveConfig = JSON.parse(process.env.GDRIVE_CONFIG_JSON);
                console.log('[RcloneConfig] ✅ Successfully parsed GDRIVE_CONFIG_JSON');
                console.log('[RcloneConfig] Parsed keys:', Object.keys(gdriveConfig).join(', '));
                console.log('[RcloneConfig] team_drive:', gdriveConfig.team_drive);
                console.log('[RcloneConfig] use_team_drive:', gdriveConfig.use_team_drive);
                
                finalConfig += '\n[gdrive]\n';
                
                // Process each config field
                Object.entries(gdriveConfig).forEach(([key, value]) => {
                    let configValue;
                    
                    if (key === 'token') {
                        configValue = JSON.stringify(value);
                        console.log('[RcloneConfig] ✅ Token JSON object written');
                    } else if (typeof value === 'boolean') {
                        configValue = value ? 'true' : 'false';
                        console.log(`[RcloneConfig] ✅ ${key} = ${configValue}`);
                    } else if (typeof value === 'string' && value.length > 0) {
                        configValue = value;
                        console.log(`[RcloneConfig] ✅ ${key} = ${value}`);
                    } else if (typeof value === 'string' && value.length === 0) {
                        console.log(`[RcloneConfig] ⚠️  Skipping empty value for: ${key}`);
                        return;
                    } else {
                        configValue = String(value);
                        console.log(`[RcloneConfig] ✅ ${key} = ${value}`);
                    }
                    
                    finalConfig += `${key} = ${configValue}\n`;
                });
                
                console.log('[RcloneConfig] ✅ Google Drive configuration added');
                console.log('[RcloneConfig] use_team_drive:', gdriveConfig.use_team_drive === true ? '✓ true' : '✗ not set');
                console.log('[RcloneConfig] team_drive ID:', gdriveConfig.team_drive || '⚠️  (EMPTY - will upload to My Drive!)');
                
                if (!gdriveConfig.use_team_drive || gdriveConfig.use_team_drive !== true) {
                    console.error('[RcloneConfig] ❌ ERROR: use_team_drive must be true!');
                }
                if (!gdriveConfig.team_drive || gdriveConfig.team_drive.length === 0) {
                    console.error('[RcloneConfig] ❌ ERROR: team_drive ID is empty! Files will upload to My Drive, not Shared Drive!');
                }
            } catch (err) {
                console.warn('[RcloneConfig] ⚠️  Failed to parse GDRIVE_CONFIG_JSON:', err.message);
            }
        } else {
            console.warn('[RcloneConfig] ⚠️  GDRIVE_CONFIG_JSON not set - Google Drive upload will fail!');
        }
        
        // Write to file
        const configPath = process.env.RCLONE_CONFIG 
            || (process.env.RAILWAY_ENVIRONMENT ? '/app/rclone.conf' : path.join(process.env.HOME || '/root', '.config', 'rclone', 'rclone.conf'));
        
        const configDir = path.dirname(configPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(configPath, finalConfig, 'utf8');
        
        console.log('[RcloneConfig] Generated rclone.conf from environment variables');
        console.log(`[RcloneConfig] Config written to: ${configPath}`);

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
        const configPath = process.env.RCLONE_CONFIG 
            || (process.env.RAILWAY_ENVIRONMENT ? '/app/rclone.conf' : path.join(process.env.HOME || '/root', '.config', 'rclone', 'rclone.conf'));
        
        if (!fs.existsSync(configPath)) {
            console.warn('[RcloneConfig] ⚠️  rclone.conf does not exist at:', configPath);
            return false;
        }

        const content = fs.readFileSync(configPath, 'utf8');
        
        if (!content.includes('[gdrive]')) {
            console.warn('[RcloneConfig] ⚠️  [gdrive] section not found in rclone.conf');
            return false;
        }

        // Check for use_team_drive and team_drive
        if (!content.includes('use_team_drive')) {
            console.warn('[RcloneConfig] ⚠️  use_team_drive not set - uploads may go to My Drive');
        } else if (content.includes('use_team_drive = true')) {
            console.log('[RcloneConfig] ✅ use_team_drive = true found');
        }

        if (!content.includes('team_drive')) {
            console.warn('[RcloneConfig] ⚠️  team_drive ID not set');
        } else {
            console.log('[RcloneConfig] ✅ team_drive found');
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
