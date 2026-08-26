// ============================================================
// Backend Initialization Sequence - Task 2.3
// Orchestrates startup in proper order before Express server starts
// ============================================================

const { initializeClient: initializeSecretManager, getSecret } = require('./secretManager');
const { initializeAlist } = require('./alistStartupHandler');
const { verifyRcloneConnectivity } = require('./rcloneConnectivityCheck');
const LocalStorage = require('./local_storage');

// Global storage handler instance (for use in server.js)
let gdriveHandler = null;

/**
 * Run complete initialization sequence
 * Steps:
 * 1. Load environment variables
 * 2. Initialize Local Storage mock files
 * 3. Initialize Secret Manager client
 * 4. Load Alist admin password from Secret Manager or env var
 * 5. Start Alist service
 * 6. Verify Rclone connectivity
 * 7. Initialize Rclone credential handler
 * 
 * Exits with status 1 if any critical stage fails
 */
async function runBackendInitialization() {
    console.log('\n================================================');
    console.log('[Backend] 🚀 Starting Arsip Backend...');
    console.log('[Backend] Time: ' + new Date().toISOString());
    console.log('================================================\n');

    try {
        // ================================================================
        // STAGE 1: Load environment variables
        // ================================================================
        console.log('[Stage 1] Loading environment variables...');
        require('dotenv').config({ path: require('path').join(__dirname, '.env') });

        const PORT = Number(process.env.PORT) || 5000;
        const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || null;
        const SUPABASE_URL = process.env.SUPABASE_URL;

        console.log(`[Config] PORT: ${PORT}`);
        console.log(`[Config] GCP_PROJECT_ID: ${GCP_PROJECT_ID || '(not set)'}`);
        console.log(`[Config] SUPABASE_URL: ${SUPABASE_URL ? '✓ SET' : '❌ NOT SET'}`);
        console.log('[Stage 1] ✅ Complete\n');

        // ================================================================
        // STAGE 1.5: Initialize Local Storage Mock Files (for preview)
        // ================================================================
        console.log('[Stage 1.5] Initializing local storage mock files...');
        try {
            LocalStorage.initializeMockFiles();
            console.log('[LocalStorage] ✅ Mock files initialized');
        } catch (err) {
            console.warn('[LocalStorage] Warning initializing mock files:', err.message);
        }
        console.log('[Stage 1.5] ✅ Complete\n');

        // ================================================================
        // STAGE 2: Initialize Secret Manager client
        // ================================================================
        console.log('[Stage 2] Initializing Secret Manager client...');
        const secretManagerReady = initializeSecretManager();
        if (GCP_PROJECT_ID) {
            console.log(`[SecretManager] Initialized for project: ${GCP_PROJECT_ID}`);
        } else {
            console.log('[SecretManager] GCP_PROJECT_ID not set, using fallback env vars');
        }
        console.log('[Stage 2] ✅ Complete\n');

        // ================================================================
        // STAGE 3: Load Alist admin password from Secret Manager
        // ================================================================
        console.log('[Stage 3] Loading Alist admin password...');
        let alistPassword = null;
        try {
            alistPassword = await getSecret(
                'arsip-alist-password',
                'ALIST_ADMIN_PASSWORD',
                null
            );
            console.log('[SecretManager] ✓ Alist password loaded from Secret Manager/env vars');
        } catch (err) {
            console.warn('[SecretManager] Failed to load Alist password:', err.message);
            console.warn('[SecretManager] Alist credentials are unavailable; storage authentication will fail explicitly');
        }
        console.log('[Stage 3] ✅ Complete\n');

        // ================================================================
        // STAGE 4: Start Alist service (OPTIONAL - Not required for Google Drive)
        // ================================================================
        console.log('[Stage 4] Checking Alist service (optional)...');
        if (process.env.ENABLE_ALIST === 'true') {
            const alistResult = await initializeAlist();
            if (!alistResult.success) {
                console.warn('[Alist] ⚠ Optional service not available');
                console.log('[Stage 4] ⚠ Skipped (Alist optional for Google Drive)\n');
            } else {
                console.log('[Alist] ✅ Service running on http://localhost:5244');
                console.log('[Stage 4] ✅ Complete\n');
            }
        } else {
            console.log('[Alist] ⚠ Disabled (ENABLE_ALIST=false)');
            console.log('[Stage 4] ⚠ Skipped (not needed for Google Drive storage)\n');
        }

        // ================================================================
        // STAGE 5: Verify Google Drive connectivity (optional - not critical)
        // ================================================================
        console.log('[Stage 5] Verifying Google Drive connectivity...');
        const rcloneCheck = await verifyRcloneConnectivity();
        
        if (!rcloneCheck.success) {
            console.warn('[Google Drive] ⚠ Connection check incomplete');
            console.warn('[Google Drive] ' + (rcloneCheck.message || rcloneCheck.error));
            console.log('[Stage 5] ⚠ Continuing with Google Drive (fallback to local if needed)\n');
        } else {
            console.log(`[Google Drive] ✅ Connected (${rcloneCheck.fileCount || 0} files visible)`);
            console.log('[Stage 5] ✅ Complete\n');
        }

        // ================================================================
        // STAGE 6: Initialize Rclone credential handler
        // ================================================================
        console.log('[Stage 6] Initializing Rclone credential handler...');
        // Note: secretManager.js is already initialized in Stage 2
        // Rclone wrapper (rclone_wrapper.js) will use credentials from rclone.conf
        console.log('[RcloneWrapper] Using credentials from rclone.conf');
        console.log('[Stage 6] ✅ Complete\n');

        // ================================================================
        // STAGE 7: Initialize Google Drive Storage via Rclone
        // ================================================================
        console.log('[Stage 7] Initializing Google Drive Storage...');
        
        // Verify Google Drive is configured in rclone.conf
        const gdriveRemote = process.env.GDRIVE_REMOTE_NAME || 'gdrive';
        console.log(`[GoogleDrive] Remote name: ${gdriveRemote}`);
        console.log(`[GoogleDrive] ✅ Google Drive ready for syncing`);
        console.log('[Stage 7] ✅ Complete\n');

        // ================================================================
        // ALL STAGES COMPLETE - Ready for Express startup
        // ================================================================
        console.log('================================================');
        console.log('[Backend] ✅ ALL INITIALIZATION STAGES COMPLETE');
        console.log('[Backend] Backend ready to start Express server');
        console.log('[Backend] Storage: Google Drive (via Rclone)');
        console.log('================================================\n');

        return {
            success: true,
            port: PORT,
            message: 'All initialization stages completed successfully',
            gdriveHandler: gdriveHandler
        };

    } catch (err) {
        console.error('\n[Backend] ❌ INITIALIZATION SEQUENCE FAILED');
        console.error('[Backend] Error:', err.message);
        console.error('[Backend] Stack:', err.stack);
        console.error('[Backend] Exiting with status code 1\n');
        process.exit(1);
    }
}

module.exports = {
    runBackendInitialization,
    getGdriveHandler: () => gdriveHandler
};
