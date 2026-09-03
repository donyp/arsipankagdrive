#!/usr/bin/env node

/**
 * Generate rclone.conf from environment variables
 * This allows us to deploy without committing sensitive credentials
 * 
 * For Google Drive: Set GDRIVE_CONFIG_JSON environment variable with the gdrive section
 */

const fs = require('fs');
const path = require('path');

// Default values (can be overridden by environment variables)
const config = {
    // Terabox WebDAV config (localhost for Alist, no longer used)
    terabox_url: process.env.TERABOX_WEBDAV_URL || 'http://localhost:5244/dav/terabox',
    terabox_user: process.env.TERABOX_USER || 'admin',
    terabox_pass: process.env.TERABOX_PASS || 'jQWUqfvMZ6pXuG8G4epx4upNt6M-Soje9zIJZBecww',
    
    // Terabox Direct WebDAV (direct connection to Terabox API)
    // IMPORTANT: Password must be obscured using: rclone obscure "password"
    terabox_direct_url: process.env.TERABOX_DIRECT_URL || 'https://pan.baidu.com/api/publicweb/terabox.php',
    terabox_direct_user: process.env.TERABOX_DIRECT_USER || process.env.TERABOX_USER || 'ptggianka@gmail.com',
    // Pre-obscured: rclone obscure "ptggianka2022" => IvFf-goPigjVmVBFyCed7xA3PhyqttMDByo0UOk
    terabox_direct_pass: process.env.TERABOX_DIRECT_PASS || 'IvFf-goPigjVmVBFyCed7xA3PhyqttMDByo0UOk',
    
    // Terabox Crypt config
    terabox_crypt_password: process.env.TERABOX_CRYPT_PASSWORD || 'uR-oRsbNnnKcfycXNO_4o4i5luHbnE-ncDCN3JaRvC4',
    
    // Storj S3 config
    storj_access_key: process.env.STORJ_ACCESS_KEY || 'dummy',
    storj_secret_key: process.env.STORJ_SECRET_KEY || 'dummy',
    storj_endpoint: process.env.STORJ_ENDPOINT || 'https://gateway.storjshare.io'
};

// Generate rclone.conf content - start with existing remotes
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

// Add Google Drive configuration if GDRIVE_CONFIG_JSON is provided
if (process.env.GDRIVE_CONFIG_JSON) {
    try {
        const gdriveConfig = JSON.parse(process.env.GDRIVE_CONFIG_JSON);
        rcloneConfig += '\n[gdrive]\n';
        Object.entries(gdriveConfig).forEach(([key, value]) => {
            rcloneConfig += `${key} = ${value}\n`;
        });
        console.log('[RcloneConfig] ✅ Google Drive configuration added from GDRIVE_CONFIG_JSON');
    } catch (err) {
        console.warn('[RcloneConfig] ⚠️  Failed to parse GDRIVE_CONFIG_JSON:', err.message);
    }
}

// Write to file - Railway default location
// Ensure directory exists
const configDir = path.join(process.env.HOME || '/root', '.config', 'rclone');
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

const configPath = path.join(configDir, 'rclone.conf');
fs.writeFileSync(configPath, rcloneConfig, 'utf8');

console.log('[RcloneConfig] Generated rclone.conf from environment variables');
console.log(`[RcloneConfig] Config written to: ${configPath}`);
console.log(`[RcloneConfig] HOME: ${process.env.HOME || '/root'}`);
if (process.env.GDRIVE_CONFIG_JSON) {
    console.log('[RcloneConfig] ✅ GDRIVE_CONFIG_JSON found and processed');
} else {
    console.log('[RcloneConfig] ⚠️  GDRIVE_CONFIG_JSON not set - Google Drive upload will fail');
}
console.log(`[RcloneConfig] Terabox (Alist) URL: ${config.terabox_url}`);
console.log(`[RcloneConfig] Terabox Direct URL: ${config.terabox_direct_url}`);
console.log(`[RcloneConfig] Terabox Direct User: ${config.terabox_direct_user}`);
console.log(`[RcloneConfig] Storj Endpoint: ${config.storj_endpoint}`);
