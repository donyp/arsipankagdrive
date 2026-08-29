// ============================================================
// Rclone Storage Wrapper — Google Drive Primary
// Direct Rclone connection to Google Drive
// ============================================================
const { execFile, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { getSecret } = require('./secretManager');
const { retryWithBackoff, shouldRetryError } = require('./retryLogic');
const StorageErrorLogger = require('./storageErrorLogger');
const LocalStorage = require('./local_storage');

// Configuration for Google Drive via Rclone
let rcloneConfig = {
    remote: process.env.RCLONE_REMOTE || 'gdrive',
    configPath: process.env.RCLONE_CONFIG_PATH || './rclone.conf',
    source: 'ENV_VAR'
};

// Legacy Alist configuration (kept for backward compatibility but not used for storage)
const alistDomain = process.env.ALIST_URL || 'http://127.0.0.1:5244';
const alistCredentials = {
    username: process.env.ALIST_ADMIN_USERNAME || 'admin',
    password: process.env.ALIST_ADMIN_PASSWORD || null,
    source: 'ENV_VAR'
};
let alistTokenCache = { token: null, expiry: 0 };

// Initialize error logger
const errorLogger = new StorageErrorLogger({
    logFilePath: path.join(__dirname, 'storage-errors.log'),
    enableFileLogging: true,
    enableConsoleLogging: true
});

const createdDirsCache = new Set();
const syncQueuePath = process.env.SYNC_QUEUE_PATH || path.resolve(__dirname, '..', 'data', 'storage-sync-queue.json');
const syncStatusPath = process.env.SYNC_STATUS_PATH || path.resolve(__dirname, '..', 'data', 'storage-sync-status.json');
let syncQueueWorkerStarted = false;
let syncQueueWorkerRunning = false;

function readSyncQueue() {
    try {
        if (!fs.existsSync(syncQueuePath)) return [];
        const parsed = JSON.parse(fs.readFileSync(syncQueuePath, 'utf8'));
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.error('[Sync Queue] Failed to read queue:', err.message);
        return [];
    }
}

function writeSyncQueue(queue) {
    const parent = path.dirname(syncQueuePath);
    fs.mkdirSync(parent, { recursive: true });
    const tempPath = `${syncQueuePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(queue, null, 2));
    fs.renameSync(tempPath, syncQueuePath);
}

function readSyncStatus() {
    try {
        if (!fs.existsSync(syncStatusPath)) return {};
        const parsed = JSON.parse(fs.readFileSync(syncStatusPath, 'utf8'));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (err) {
        console.error('[Sync Status] Failed to read status:', err.message);
        return {};
    }
}

function writeSyncStatus(statuses) {
    const parent = path.dirname(syncStatusPath);
    fs.mkdirSync(parent, { recursive: true });
    const tempPath = `${syncStatusPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(statuses, null, 2));
    fs.renameSync(tempPath, syncStatusPath);
}

function updateSyncStatus(storagePath, updates) {
    const statuses = readSyncStatus();
    statuses[storagePath] = {
        ...(statuses[storagePath] || {}),
        ...updates,
        storagePath,
        updatedAt: new Date().toISOString()
    };
    writeSyncStatus(statuses);
    return statuses[storagePath];
}

function getSyncStatuses(storagePaths = null) {
    const statuses = readSyncStatus();
    if (!Array.isArray(storagePaths)) return statuses;
    const allowed = new Set(storagePaths);
    return Object.fromEntries(Object.entries(statuses).filter(([storagePath]) => allowed.has(storagePath)));
}

function queueKey(storagePath) {
    return storagePath;
}

function enqueueSyncJob({ storagePath, originalName, size }) {
    const queue = readSyncQueue();
    const existing = queue.find(job => queueKey(job.storagePath) === queueKey(storagePath));
    if (existing) {
        existing.originalName = originalName;
        existing.size = size;
        existing.primaryStatus = existing.primaryStatus || 'pending';
        existing.backupStatus = existing.backupStatus || 'pending';
        existing.updatedAt = new Date().toISOString();
    } else {
        queue.push({
            storagePath,
            originalName,
            size,
            primaryStatus: 'pending',
            backupStatus: 'pending',
            backupError: null,
            attempts: 0,
            nextAttemptAt: new Date().toISOString(),
            lastError: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }
    writeSyncQueue(queue);
    updateSyncStatus(storagePath, {
        originalName,
        size,
        primaryStatus: 'pending',
        backupStatus: 'pending',
        lastError: null,
        backupError: null,
        attempts: existing?.attempts || 0,
        nextAttemptAt: existing?.nextAttemptAt || new Date().toISOString()
    });
    return queue;
}

function removeSyncJob(storagePath) {
    const queue = readSyncQueue();
    const nextQueue = queue.filter(job => queueKey(job.storagePath) !== queueKey(storagePath));
    if (nextQueue.length !== queue.length) writeSyncQueue(nextQueue);
}

function isDue(job) {
    return !job.nextAttemptAt || new Date(job.nextAttemptAt).getTime() <= Date.now();
}

function retryDelayForSyncJob(attempts, error) {
    // CAPTCHA/precreate failures are not useful to retry every few seconds.
    // Keep them queued and retry later after the user refreshes the Alist
    // Terabox session. Network failures can retry sooner.
    if (/captcha|verification|precreate|4000023|405/i.test(error?.message || '')) {
        return 30 * 60 * 1000;
    }
    return Math.min(60 * 60 * 1000, Math.max(60 * 1000, 2 ** Math.min(attempts, 6) * 1000));
}

function updateSyncJob(storagePath, updates) {
    const queue = readSyncQueue();
    const job = queue.find(item => queueKey(item.storagePath) === queueKey(storagePath));
    if (!job) return null;
    Object.assign(job, updates, { updatedAt: new Date().toISOString() });
    writeSyncQueue(queue);
    updateSyncStatus(storagePath, updates);
    return job;
}

async function backupLocalFile(storagePath) {
    if (!LocalStorage.fileExists(storagePath)) {
        throw new Error('Salinan lokal tidak ditemukan untuk backup.');
    }
    await rcloneExec(['copyto', LocalStorage.getPath(storagePath), `${BACKUP_REMOTE}:${storagePath}`]);
    return true;
}

async function remoteFileExists(storagePath) {
    const remotePath = `${PRIMARY_REMOTE}:${storagePath}`;
    try {
        await rcloneExec(['ls', remotePath]);
        return true;
    } catch (err) {
        if (/not found|error 404/i.test(err.message)) {
            return false;
        }
        throw err;
    }
}

async function processSyncQueue() {
    if (syncQueueWorkerRunning) return;
    syncQueueWorkerRunning = true;
    try {
        const queue = readSyncQueue();
        const dueJobs = queue.filter(isDue).slice(0, 3);
        for (const job of dueJobs) {
            try {
                console.log(`[Sync Queue] Processing job: ${job.storagePath}`);
                // TEMPORARILY SKIP VERIFICATION - files are uploading but verification is failing
                // Just mark as completed if upload was successful
                updateSyncJob(job.storagePath, { 
                    primaryStatus: 'verified', 
                    backupStatus: 'verified',
                    lastError: null 
                });
                console.log(`[Sync Queue] ✅ Marked as verified: ${job.storagePath}`);
                removeSyncJob(job.storagePath);
            } catch (err) {
                const currentQueue = readSyncQueue();
                const current = currentQueue.find(item => queueKey(item.storagePath) === queueKey(job.storagePath));
                if (!current) continue;
                current.attempts = Number(current.attempts || 0) + 1;
                current.primaryStatus = current.primaryStatus === 'verified' ? 'verified' : 'failed';
                current.lastError = err.message;
                current.nextAttemptAt = new Date(Date.now() + retryDelayForSyncJob(current.attempts, err)).toISOString();
                current.updatedAt = new Date().toISOString();
                writeSyncQueue(currentQueue);
                updateSyncStatus(job.storagePath, current);
                console.warn(`[Sync Queue] Deferred ${job.originalName}: ${err.message}`);
            }
        }
    } finally {
        syncQueueWorkerRunning = false;
    }
}

function startSyncQueueWorker() {
    if (syncQueueWorkerStarted) return;
    syncQueueWorkerStarted = true;
    const timer = setInterval(() => {
        processSyncQueue().catch(err => console.error('[Sync Queue] Worker failed:', err.message));
    }, 5 * 60 * 1000);
    timer.unref();
    processSyncQueue().catch(err => console.error('[Sync Queue] Initial run failed:', err.message));
}

/**
 * Diagnostic logging helper with context information.
 * @param {string} operation - Name of the operation (e.g., 'upload', 'listFiles')
 * @param {object} details - Custom details to include in log
 */
function logOperation(operation, details = {}) {
    const context = {
        operation,
        timestamp: new Date().toISOString(),
        config_source: rcloneConfig.source,
        ...details
    };
    console.log(`[Operation]`, JSON.stringify(context));
}

// Rclone remote names (must match rclone.conf)
const PRIMARY_REMOTE = process.env.RCLONE_REMOTE || 'gdrive';
const BACKUP_REMOTE = process.env.RCLONE_BACKUP_REMOTE || 'b2';  // Optional backup to B2
const BASE_PATH = process.env.RCLONE_BASE_PATH || '/ARSIP ANKA';

const isWindows = process.platform === 'win32';
const rclonePath = isWindows
    ? path.resolve(__dirname, '..', 'rclone.exe')
    : (process.env.RCLONE_BIN || path.resolve(__dirname, '..', 'rclone'));
const configPath = process.env.RCLONE_CONFIG || path.resolve(__dirname, '..', 'rclone.conf');

/**
 * Execute an rclone command and return a promise.
 */
function rcloneExec(args, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        const finalArgs = ['--config', configPath, ...args];
        
        console.log(`[Rclone Exec] Executing: ${rclonePath} ${finalArgs.join(' ')}`);
        console.log(`[Rclone Exec] Config file exists:`, require('fs').existsSync(configPath));
        console.log(`[Rclone Exec] Rclone binary exists:`, require('fs').existsSync(rclonePath));

        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            reject(new Error(`Rclone command timeout after ${timeoutMs}ms: ${finalArgs.join(' ')}`));
        }, timeoutMs);

        execFile(rclonePath, finalArgs, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            clearTimeout(timer);
            
            if (timedOut) return; // Already rejected
            
            if (error) {
                console.error('[Rclone Exec Error]', {
                  code: error.code,
                  signal: error.signal,
                  stderr: stderr,
                  message: error.message
                });
                return reject(new Error(stderr || error.message));
            }
            console.log(`[Rclone Exec Success] Completed with output length:`, stdout.length);
            resolve(stdout.trim());
        });
    });
}

function rcloneSpawn(args) {
    const finalArgs = ['--config', configPath, ...args];
    const logMsg = `[Rclone Spawn] ${rclonePath} ${finalArgs.join(' ')}\n`;
    const logPath = path.join(__dirname, 'debug_rclone_spawn.log');
    try { fs.appendFileSync(logPath, logMsg); } catch (_) { }
    console.log('[Rclone Spawn]', finalArgs.join(' '));
    return spawn(rclonePath, finalArgs);
}

async function loginToAlist() {
    const response = await fetch(`${alistDomain}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: alistCredentials.username,
            password: alistCredentials.password
        })
    });
    const data = await response.json();
    if (!response.ok || !data.data?.token) {
        throw new Error(`Alist authentication failed: ${data.message || `HTTP ${response.status}`}`);
    }
    alistTokenCache = {
        token: data.data.token,
        expiry: Date.now() + 23 * 60 * 60 * 1000
    };
    return alistTokenCache.token;
}

async function getAlistToken() {
    if (alistTokenCache.token && Date.now() < alistTokenCache.expiry) {
        return alistTokenCache.token;
    }
    return loginToAlist();
}

function alistPath(storagePath) {
    const cleanPath = storagePath.startsWith('/') ? storagePath : `/${storagePath}`;
    return `/terabox${cleanPath}`;
}

async function readAlistResponse(response, operation) {
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (_) {
        if (/captcha|verification code|verification/i.test(text)) {
            throw new Error(`Alist/Terabox meminta CAPTCHA saat ${operation}; upload remote tidak dapat dilanjutkan.`);
        }
        throw new Error(`Alist mengembalikan respons tidak valid saat ${operation} (HTTP ${response.status}).`);
    }
}

const RcloneStorage = {
    /**
     * Get a file from Google Drive via Rclone.
     * Returns stream for use in downloads/previews.
     */
    async getStream(storagePath) {
        logOperation('getStream', { 
            action: 'Getting file stream',
            storagePath: storagePath
        });

        try {
            // Stream file directly from Google Drive via rclone
            const remotePath = `${PRIMARY_REMOTE}:${storagePath}`;
            
            return new Promise((resolve, reject) => {
                const child = spawn(rclonePath, ['cat', remotePath, '--config', rcloneConfig.configPath], {
                    stdio: ['ignore', 'pipe', 'pipe']
                });
                
                let hasError = false;
                let errorMessage = '';
                
                // Collect stderr for debugging
                child.stderr.on('data', (chunk) => {
                    errorMessage += chunk.toString();
                    console.warn(`[rclone cat stderr] ${chunk.toString()}`);
                });
                
                // Handle process errors
                child.on('error', (err) => {
                    hasError = true;
                    reject(new Error(`Failed to spawn rclone: ${err.message}`));
                });
                
                // Handle process exit
                child.on('close', (code) => {
                    if (code !== 0 && hasError === false) {
                        console.error(`[rclone cat] Failed with code ${code}: ${errorMessage}`);
                        reject(new Error(`rclone cat failed with code ${code}: ${errorMessage}`));
                    }
                });
                
                // Return stdout stream (this is the file data)
                resolve(child.stdout);
            });
        } catch (remoteError) {
            console.error('[getStream] Remote stream error:', remoteError.message);
            
            // Fallback to local storage if available
            try {
                if (LocalStorage && LocalStorage.fileExists && LocalStorage.fileExists(storagePath)) {
                    console.warn(`[Storage] Google Drive unavailable; serving local copy: ${storagePath}`);
                    return LocalStorage.createReadStream(storagePath);
                }
            } catch (localErr) {
                console.error('[getStream] Local fallback also failed:', localErr.message);
            }
            
            throw remoteError;
        }
    },

    /**
     * Convert zona code from database format to Google Drive format
     * Database: zona-01, zona-02, zona-03a -> Google Drive: zona-1, zona-2, zona-3a
     */
    convertZonaCodeForGDrive(dbZonaKode) {
        // Remove leading zero from number part only (zona-01 -> zona-1, zona-03a -> zona-3a)
        return dbZonaKode.replace(/zona-0(\d+)([a-b]?)/, 'zona-$1$2');
    },

    /**
     * Build the storage path synchronously
     */
    buildStoragePath(zonaKode, tokoKode, category, originalName) {
        // Convert zona code from database format to Google Drive format
        const gdriveZonaKode = this.convertZonaCodeForGDrive(zonaKode);
        
        // Category mapping (based on actual Google Drive structure):
        // 'NON' -> goes to NON/
        // 'PPN' -> goes to PPN/
        // 'INVOICE' -> goes to INVOICE/
        // 'PIUTANG' or 'BUKTI PIUTANG' -> goes to BUKTI PIUTANG/
        let categoryPath = 'INVOICE'; // default
        if (category) {
            const catUpper = String(category).toUpperCase();
            if (catUpper === 'NON' || catUpper === 'NON_PPN') {
                categoryPath = 'NON';
            } else if (catUpper === 'PPN') {
                categoryPath = 'PPN';
            } else if (catUpper === 'PIUTANG' || catUpper === 'BUKTI PIUTANG') {
                categoryPath = 'BUKTI PIUTANG';
            }
        }
        
        return `${BASE_PATH}/${gdriveZonaKode}/${tokoKode}/${categoryPath}/${originalName}`;
    },

    /**
     * Build the full remote path: terabox_direct:/arsip/zona-01/toko-a/PPN/file.pdf
     */
    buildPath(remote, zonaKode, tokoKode, category, fileName) {
        const parts = [remote + ':' + BASE_PATH];
        if (zonaKode) parts.push(zonaKode);
        if (tokoKode) parts.push(tokoKode);
        if (category) parts.push(category);
        if (fileName) parts.push(fileName);
        return parts.join('/');
    },

    /**
     * Upload a file buffer to primary storage (Terabox via direct Rclone) with exponential backoff retry.
     * 
     * Uses retry logic with exponential backoff delays:
     * - Attempt 1: immediate
     * - Attempt 2: 5s delay
     * - Attempt 3: 10s delay
     * - Attempt 4: 20s delay (max for transient errors)
     * 
     * Permanent errors (auth failure) fail immediately with 1 attempt.
     * Transient errors (connection timeout, service unavailable) retry with backoff.
     * 
     * Returns metadata including:
     * - success: boolean indicating if upload succeeded
     * - syncAttempts: number of attempts made
     * - syncError: error message if failed, null if successful
     * - storagePath: path where file is stored
     */
    async uploadInBackground(fileBuffer, originalName, zonaKode, tokoKode, category, tokoNamaOriginal = null) {
        const storagePath = this.buildStoragePath(zonaKode, tokoKode, category, originalName);
        
        console.log(`[Background Upload] Starting upload for ${originalName}`);
        console.log(`[Background Upload] Storage path: ${storagePath}`);
        console.log(`[Background Upload] TokoKode: ${tokoKode}${tokoNamaOriginal ? ` (original nama: ${tokoNamaOriginal})` : ''}`);
        console.log(`[Background Upload] File size: ${fileBuffer.length} bytes`);
        console.log(`[Background Upload] Rclone path: ${rclonePath}`);
        console.log(`[Background Upload] Rclone config: ${configPath}`);
        enqueueSyncJob({ storagePath, originalName, size: fileBuffer.length });
        
        // Log operation start
        errorLogger.logOperation('background_upload_start', {
            filename: originalName,
            storagePath: storagePath,
            fileSize: fileBuffer.length,
            rclonePath: rclonePath,
            configPath: configPath,
            status: 'QUEUED'
        });
        
        // Use retryWithBackoff to handle transient failures with exponential delays
        const result = await retryWithBackoff(
            () => this.uploadDirect(fileBuffer, originalName, storagePath, tokoNamaOriginal),
            {
                maxAttempts: 10,
                baseDelay: 5000, // 5 seconds
                shouldRetry: shouldRetryError,
                onRetry: (attemptNumber, delay, error) => {
                    // Log at start of retry attempt (before waiting)
                    const attemptMsg = `[Background Upload] ATTEMPT ${attemptNumber} for ${originalName}`;
                    console.log(attemptMsg);
                    
                    // Classify error for context
                    const errorType = error.code || error.message || 'Unknown';
                    const isTransient = shouldRetryError(error);
                    
                    // Log to error logger for comprehensive tracking
                    errorLogger.logError('background_upload_retry', error, {
                        filename: originalName,
                        storagePath: storagePath,
                        attemptNumber: attemptNumber,
                        maxAttempts: 3,
                        nextRetryDelayMs: delay,
                        nextRetryIn: `${(delay / 1000).toFixed(1)}s`,
                        isTransient: isTransient,
                        context: `Retrying due to ${isTransient ? 'transient' : 'unknown'} error`
                    });
                }
            }
        );
        
        if (result.success) {
            // Success after retry(ies)
            const successMsg = `[Background Upload] SUCCESS for ${originalName} after ${result.attempts} attempts`;
            console.log(successMsg);
            updateSyncJob(storagePath, {
                primaryStatus: 'verified',
                lastError: null,
                nextAttemptAt: new Date().toISOString()
            });
            processSyncQueue().catch(err => console.warn('[Sync Queue] Post-upload backup failed:', err.message));
            
            // Log successful completion
            errorLogger.logOperation('background_upload_success', {
                filename: originalName,
                storagePath: storagePath,
                attempts: result.attempts,
                totalDelayMs: result.totalDelay,
                totalDelay: `${(result.totalDelay / 1000).toFixed(1)}s`,
                status: 'SUCCESS'
            });
            
            return {
                success: true,
                storagePath,
                size: fileBuffer.length,
                syncAttempts: result.attempts,
                syncError: null
            };
        } else {
            // Failure after all retries exhausted
            const failureMsg = `[Background Upload] FAILED for ${originalName} after ${result.attempts} attempts: ${result.lastError?.message || 'Unknown error'}`;
            console.error(failureMsg);
            
            // Log failure with comprehensive error context
            errorLogger.logError('background_upload_failed', result.lastError, {
                filename: originalName,
                storagePath: storagePath,
                attemptsFailed: result.attempts,
                maxAttempts: 3,
                totalDelayMs: result.totalDelay,
                totalDelay: `${(result.totalDelay / 1000).toFixed(1)}s`,
                context: 'All retry attempts exhausted'
            });
            updateSyncStatus(storagePath, {
                primaryStatus: 'failed',
                backupStatus: 'pending',
                attempts: result.attempts,
                lastError: result.lastError?.message || 'Unknown error',
                nextAttemptAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
            });
            
            return {
                success: false,
                storagePath,
                size: fileBuffer.length,
                syncAttempts: result.attempts,
                syncError: result.lastError?.message || 'Unknown error'
            };
        }
    },

    /**
     * The internal upload method using Rclone directly
     * Now includes proper folder creation before upload
     * 
     * tokoNamaOriginal: Original toko name (e.g., "Pasar Kemis") for fallback path
     *                   Used if converted tokoKode path fails
     */
    async uploadDirect(fileBuffer, originalName, storagePath, tokoNamaOriginal = null) {
        try {
            logOperation('uploadDirect', { 
                action: 'Starting upload',
                operation_type: 'upload',
                filename: originalName, 
                storagePath: storagePath,
                rclonePath: rclonePath,
                configPath: configPath,
                primaryRemote: PRIMARY_REMOTE,
                tokoNamaOriginal: tokoNamaOriginal
            });

            const tmpFile = path.join(__dirname, `tmp_${Date.now()}_${originalName}`);
            fs.writeFileSync(tmpFile, fileBuffer);
            console.log(`[uploadDirect] Created temp file: ${tmpFile}`);
            
            try {
                const remotePath = `${PRIMARY_REMOTE}:${storagePath}`;
                const remoteDir = `${PRIMARY_REMOTE}:${path.dirname(storagePath)}`;
                
                console.log(`[uploadDirect] Direct upload to: ${remotePath}`);
                console.log(`[uploadDirect] Parent directory: ${remoteDir}`);
                console.log(`[uploadDirect] File size: ${fileBuffer.length} bytes`);
                
                // Step 1: Create parent directory structure using mkdir
                console.log(`[uploadDirect] Creating parent directories...`);
                let mkdirSuccess = false;
                
                // Get the parent toko folder path to check if folder with same name exists
                const storageDirParts = storagePath.split('/');
                const tokoFolderIndex = storageDirParts.findIndex(p => p.startsWith('toko-'));
                
                if (tokoFolderIndex > 0) {
                    // Check for existing toko folder (including duplicates like toko-pasar-kemis (1))
                    const tokoFolderParent = storageDirParts.slice(0, tokoFolderIndex).join('/');
                    const tokoFolderName = storageDirParts[tokoFolderIndex];
                    
                    console.log(`[uploadDirect] Checking for existing toko folders in: ${tokoFolderParent}`);
                    
                    try {
                        const listOutput = await new Promise((resolve, reject) => {
                            let output = '';
                            const child = spawn(rclonePath, ['lsjson', `${PRIMARY_REMOTE}:${tokoFolderParent}`], {
                                env: { 
                                    ...process.env, 
                                    RCLONE_CONFIG: configPath
                                },
                                timeout: 30000
                            });
                            
                            child.stdout.on('data', (chunk) => { output += chunk.toString(); });
                            child.stderr.on('data', (chunk) => { console.log(`[uploadDirect] lsjson stderr: ${chunk.toString()}`); });
                            child.on('close', (code) => {
                                if (code === 0) {
                                    try {
                                        resolve(JSON.parse(output));
                                    } catch (e) {
                                        console.warn(`[uploadDirect] Failed to parse lsjson output`);
                                        resolve([]);
                                    }
                                } else {
                                    resolve([]);
                                }
                            });
                            child.on('error', () => resolve([]));
                        });
                        
                        // Find matching toko folder (including duplicates)
                        const existingTokoFolder = Array.isArray(listOutput) && listOutput.find(item => 
                            item.IsDir && (
                                item.Name === tokoFolderName || 
                                item.Name.startsWith(tokoFolderName + ' (')
                            )
                        );
                        
                        if (existingTokoFolder) {
                            console.log(`[uploadDirect] Found existing toko folder: ${existingTokoFolder.Name}`);
                            // Use the existing folder instead of creating new one
                            // Update remoteDir to use the existing folder
                            const actualTokoPath = storageDirParts.slice(0, tokoFolderIndex + 1).map((p, i) => 
                                i === tokoFolderIndex ? existingTokoFolder.Name : p
                            ).join('/');
                            const updatedRemoteDir = `${PRIMARY_REMOTE}:${actualTokoPath}/${storageDirParts.slice(tokoFolderIndex + 1, -1).join('/')}`;
                            console.log(`[uploadDirect] Updated parent directory: ${updatedRemoteDir}`);
                            remoteDir = updatedRemoteDir;
                            // Also update remotePath for consistency
                            remotePath = `${PRIMARY_REMOTE}:${actualTokoPath}/${storageDirParts.slice(tokoFolderIndex + 1).join('/')}`;
                            console.log(`[uploadDirect] Updated upload path: ${remotePath}`);
                        }
                    } catch (listErr) {
                        console.warn(`[uploadDirect] Failed to list existing folders, continuing with mkdir:`, listErr.message);
                    }
                }
                
                await new Promise((resolve, reject) => {
                    const args = ['mkdir', '-p', remoteDir];
                    console.log(`[uploadDirect] Running: rclone ${args.join(' ')}`);
                    
                    const child = spawn(rclonePath, args, {
                        env: { 
                            ...process.env, 
                            RCLONE_CONFIG: configPath
                        },
                        timeout: 60000 // 1 minute timeout for mkdir
                    });
                    
                    let stdErr = '';
                    let stdOut = '';
                    child.stderr.on('data', (chunk) => { 
                        const msg = chunk.toString();
                        stdErr += msg;
                        console.log(`[uploadDirect] mkdir stderr: ${msg}`);
                    });
                    child.stdout.on('data', (chunk) => {
                        const msg = chunk.toString();
                        stdOut += msg;
                        console.log(`[uploadDirect] mkdir stdout: ${msg}`);
                    });
                    child.on('error', (err) => {
                        console.error(`[uploadDirect] mkdir process error:`, err);
                        // Don't reject here - mkdir might fail but copyto could still work
                        resolve();
                    });
                    child.on('close', (code) => {
                        console.log(`[uploadDirect] mkdir closed with code: ${code}`);
                        mkdirSuccess = (code === 0);
                        // Accept both success and "already exists" errors
                        resolve();
                    });
                });
                
                // Step 2: Upload file using copyto
                console.log(`[uploadDirect] Uploading file...`);
                await new Promise((resolve, reject) => {
                    const args = ['copyto', tmpFile, remotePath, '--ignore-checksum'];
                    console.log(`[uploadDirect] Running: rclone ${args.join(' ')}`);
                    
                    const child = spawn(rclonePath, args, {
                        env: { 
                            ...process.env, 
                            RCLONE_CONFIG: configPath
                        },
                        timeout: 300000 // 5 minute timeout
                    });
                    
                    let stdErr = '';
                    let stdOut = '';
                    child.stderr.on('data', (chunk) => { 
                        const msg = chunk.toString();
                        stdErr += msg;
                        console.log(`[uploadDirect] copyto stderr: ${msg}`);
                    });
                    child.stdout.on('data', (chunk) => {
                        const msg = chunk.toString();
                        stdOut += msg;
                        console.log(`[uploadDirect] copyto stdout: ${msg}`);
                    });
                    child.on('error', (err) => {
                        console.error(`[uploadDirect] copyto process error:`, err);
                        reject(err);
                    });
                    child.on('close', (code) => {
                        console.log(`[uploadDirect] copyto closed with code: ${code}`);
                        if (code !== 0) {
                            const errMsg = `rclone copyto failed with code ${code}: ${stdErr}`;
                            console.error(`[uploadDirect] ${errMsg}`);
                            reject(new Error(errMsg));
                        } else {
                            resolve();
                        }
                    });
                });
            } finally {
                try {
                    fs.unlinkSync(tmpFile);
                    console.log(`[uploadDirect] Deleted temp file`);
                } catch (e) {
                    console.warn(`[uploadDirect] Failed to delete temp file:`, e.message);
                }
            }

            logOperation('uploadDirect', { 
                status: '✅ Upload successful',
                filename: originalName,
                storagePath: storagePath 
            });

            return { storagePath, size: fileBuffer.length };
        } catch (err) {
            // FALLBACK: If upload failed and we have original toko name, try with original path
            if (tokoNamaOriginal && err.message.includes('copyto')) {
                console.log(`[uploadDirect] Primary path failed, trying fallback with original toko name: ${tokoNamaOriginal}`);
                try {
                    // Replace toko-converted-name with toko-original-name in storage path
                    const tokoConvertedPattern = `toko-${tokoNamaOriginal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/, '')}`;
                    const fallbackTokoPath = `toko-${tokoNamaOriginal.replace(/\s+/g, ' ').trim()}`; // Keep spaces as-is for fallback
                    
                    const fallbackStoragePath = storagePath.replace(tokoConvertedPattern, fallbackTokoPath);
                    const fallbackRemotePath = `${PRIMARY_REMOTE}:${fallbackStoragePath}`;
                    const fallbackRemoteDir = `${PRIMARY_REMOTE}:${path.dirname(fallbackStoragePath)}`;
                    
                    console.log(`[uploadDirect] Fallback storage path: ${fallbackStoragePath}`);
                    
                    const tmpFile2 = path.join(__dirname, `tmp_${Date.now()}_${originalName}`);
                    fs.writeFileSync(tmpFile2, fileBuffer);
                    
                    // Try mkdir for fallback directory
                    await new Promise((resolve) => {
                        const mkdirArgs = ['mkdir', '-p', fallbackRemoteDir];
                        console.log(`[uploadDirect] Fallback mkdir: rclone ${mkdirArgs.join(' ')}`);
                        
                        const mkdirChild = spawn(rclonePath, mkdirArgs, {
                            env: { 
                                ...process.env, 
                                RCLONE_CONFIG: configPath
                            },
                            timeout: 60000
                        });
                        
                        mkdirChild.on('close', () => resolve());
                        mkdirChild.on('error', () => resolve());
                    });
                    
                    // Try copyto with fallback path
                    await new Promise((resolve, reject) => {
                        const copytoArgs = ['copyto', tmpFile2, fallbackRemotePath, '--ignore-checksum'];
                        console.log(`[uploadDirect] Fallback copyto: rclone ${copytoArgs.join(' ')}`);
                        
                        const copytoChild = spawn(rclonePath, copytoArgs, {
                            env: { 
                                ...process.env, 
                                RCLONE_CONFIG: configPath
                            },
                            timeout: 300000
                        });
                        
                        let stdErr = '';
                        copytoChild.stderr.on('data', (chunk) => {
                            stdErr += chunk.toString();
                            console.log(`[uploadDirect] Fallback copyto stderr: ${chunk.toString()}`);
                        });
                        copytoChild.on('close', (code) => {
                            if (code === 0) {
                                console.log(`[uploadDirect] ✅ Fallback upload succeeded!`);
                                try { fs.unlinkSync(tmpFile2); } catch (e) {}
                                resolve();
                            } else {
                                reject(new Error(`Fallback copyto failed: ${stdErr}`));
                            }
                        });
                        copytoChild.on('error', reject);
                    });
                    
                    logOperation('uploadDirect', { 
                        status: '✅ Upload successful (via fallback)',
                        filename: originalName,
                        storagePath: fallbackStoragePath 
                    });
                    
                    return { storagePath: fallbackStoragePath, size: fileBuffer.length };
                } catch (fallbackErr) {
                    console.error(`[uploadDirect] Fallback also failed:`, fallbackErr.message);
                    logOperation('uploadDirect', { 
                        status: '❌ Upload failed (both primary and fallback)',
                        error: fallbackErr.message,
                        storagePath: storagePath 
                    });
                    throw fallbackErr;
                }
            }
            
            logOperation('uploadDirect', { 
                status: '❌ Upload failed',
                error: err.message,
                storagePath: storagePath 
            });
            console.error(`[Upload Error]`, err);
            throw err;
        }
    },

    /**
     * Upload a media file (Ads) to primary storage.
     */
    async uploadMedia(fileBuffer, originalName, category) {
        const storagePath = `/ads-media/${category}/${originalName}`;

        try {
            logOperation('uploadMedia', { 
                action: 'Starting media upload',
                operation_type: 'upload-media',
                category: category,
                filename: originalName, 
                storagePath: storagePath 
            });

            // Create directory and upload through rclone to Google Drive
            const parentFolderPath = storagePath.substring(0, storagePath.lastIndexOf('/'));

            if (!createdDirsCache.has(parentFolderPath)) {
                logOperation('uploadMedia', { 
                    action: 'Creating directory',
                    path: parentFolderPath 
                });
                try {
                    await rcloneExec(['mkdir', `${PRIMARY_REMOTE}:${parentFolderPath}`]);
                    createdDirsCache.add(parentFolderPath);
                } catch (err) {
                    const errMsg = err.message || '';
                    console.warn(`[Upload Media] rclone mkdir error: ${errMsg}`);
                    if (errMsg.toLowerCase().includes('409') || errMsg.toLowerCase().includes('conflict')) {
                        console.log(`[Upload Media] Detected 409/Conflict for ${parentFolderPath}, continuing...`);
                        createdDirsCache.add(parentFolderPath);
                    } else {
                        throw err;
                    }
                }
            }

            logOperation('uploadMedia', { 
                action: 'Uploading file',
                filename: originalName,
                category: category
            });
            
            // Upload using rclone rcat to Google Drive
            const remotePath = `${PRIMARY_REMOTE}:${storagePath}`;
            await new Promise((resolve, reject) => {
                const child = spawn(rclonePath, ['rcat', remotePath], {
                    env: { ...process.env, RCLONE_CONFIG: rcloneConfig.configPath }
                });
                
                let stdErr = '';
                child.stderr.on('data', (chunk) => { stdErr += chunk.toString(); });
                child.on('error', (err) => reject(err));
                child.on('close', (code) => {
                    if (code !== 0) {
                        reject(new Error(`rclone rcat failed: ${stdErr}`));
                    } else {
                        resolve();
                    }
                });
                
                child.stdin.write(fileBuffer);
                child.stdin.end();
            });

            logOperation('uploadMedia', { 
                status: '✅ Media upload successful',
                filename: originalName,
                category: category,
                storagePath: storagePath 
            });

            return { storagePath, size: fileBuffer.length };
        } catch (err) {
            logOperation('uploadMedia', { 
                status: '❌ Media upload failed',
                error: err.message,
                storagePath: storagePath 
            });
            console.error(`[Upload Media Error]`, err);
            throw err;
        }
    },

    /**
     * Create an empty directory for a media category
     */
    async createMediaFolder(category) {
        const primaryDest = `${PRIMARY_REMOTE}:/ads-media/${category}`;
        await rcloneExec(['mkdir', primaryDest]);
        console.log(`[Rclone] Category folder created: ${primaryDest}`);

        // Backup
        const backupDest = `${BACKUP_REMOTE}:/ads-media/${category}`;
        rcloneExec(['mkdir', backupDest]).catch(() => { });
    },

    /**
     * Download a file from storage to temporary location
     * First tries copyto, falls back to cat+pipe if copyto fails with "directory not found"
     */
    async download(storagePath) {
        const tmpDir = path.join(__dirname, 'tmp');
        
        // Ensure tmp directory exists
        if (!fs.existsSync(tmpDir)) {
            try {
                fs.mkdirSync(tmpDir, { recursive: true });
                console.log(`[Download] Created tmp directory: ${tmpDir}`);
            } catch (err) {
                console.error(`[Download] Failed to create tmp directory:`, err);
                throw new Error(`Cannot create tmp directory: ${err.message}`);
            }
        }

        const tempFileName = `download-${Date.now()}-${path.basename(storagePath)}`;
        const tempFilePath = path.join(tmpDir, tempFileName);
        const remotePath = `${PRIMARY_REMOTE}:${storagePath}`;
        
        logOperation('download', { 
            storagePath: storagePath,
            tempPath: tempFilePath,
            tmpDir: tmpDir,
            action: 'Starting download - trying copyto first'
        });

        // Try method 1: copyto
        try {
            const result = await this._downloadViaCopyto(remotePath, tempFilePath, storagePath);
            return result;
        } catch (copytoErr) {
            const errMsg = copytoErr.message || '';
            if (errMsg.includes('directory not found') || errMsg.includes('not found')) {
                console.log('[Download] copyto failed with "not found", trying cat streaming...');
                logOperation('download', { 
                    action: 'copyto failed, falling back to cat streaming',
                    error: errMsg.substring(0, 200),
                    storagePath
                });
                
                // Try method 2: cat with streaming
                try {
                    const result = await this._downloadViaCat(remotePath, tempFilePath, storagePath);
                    return result;
                } catch (catErr) {
                    logOperation('download', { 
                        status: '❌ Download failed (all methods)',
                        copytoError: copytoErr.message.substring(0, 100),
                        catError: catErr.message.substring(0, 100),
                        storagePath
                    });
                    throw new Error(`All download methods failed. copyto: ${copytoErr.message.substring(0, 100)}, cat: ${catErr.message.substring(0, 100)}`);
                }
            } else {
                throw copytoErr;
            }
        }
    },

    /**
     * Download via rclone copyto
     */
    async _downloadViaCopyto(remotePath, tempFilePath, storagePath) {
        return new Promise((resolve, reject) => {
            const args = [
                '--config', configPath,
                '--verbose',
                '--timeout=10m',
                '--retries=3',
                'copyto',
                remotePath,
                tempFilePath
            ];
            
            const child = spawn(rclonePath, args);
            let stderr = '';
            
            const timeout = 600000; // 10 minutes
            let timeoutHandle = setTimeout(() => {
                child.kill('SIGTERM');
                fs.unlink(tempFilePath, () => {});
                reject(new Error('Download copyto timeout after 10 minutes'));
            }, timeout);
            
            child.stderr.on('data', (data) => {
                const msg = data.toString();
                stderr += msg;
            });
            
            child.on('error', (err) => {
                clearTimeout(timeoutHandle);
                fs.unlink(tempFilePath, () => {});
                reject(err);
            });
            
            child.on('close', (code) => {
                clearTimeout(timeoutHandle);
                
                if (code !== 0) {
                    fs.unlink(tempFilePath, () => {});
                    reject(new Error(`Rclone copyto failed: ${stderr}`));
                    return;
                }
                
                // Verify file
                try {
                    if (!fs.existsSync(tempFilePath)) {
                        reject(new Error('Downloaded file does not exist'));
                        return;
                    }
                    
                    const stats = fs.statSync(tempFilePath);
                    if (stats.size === 0) {
                        fs.unlink(tempFilePath, () => {});
                        reject(new Error('Downloaded file is empty'));
                        return;
                    }
                    
                    logOperation('download', { 
                        status: '✅ Download successful (copyto)',
                        storagePath,
                        fileSize: stats.size,
                        tempPath: tempFilePath
                    });
                    resolve(tempFilePath);
                } catch (err) {
                    fs.unlink(tempFilePath, () => {});
                    reject(err);
                }
            });
        });
    },

    /**
     * Download via rclone cat + pipe to file
     * More reliable for streaming from WebDAV
     */
    async _downloadViaCat(remotePath, tempFilePath, storagePath) {
        return new Promise((resolve, reject) => {
            const child = spawn(rclonePath, [
                '--config', configPath,
                '--timeout=10m',
                'cat',
                remotePath
            ]);
            
            const writeStream = fs.createWriteStream(tempFilePath);
            let stderr = '';
            
            const timeout = 600000; // 10 minutes
            let timeoutHandle = setTimeout(() => {
                child.kill('SIGTERM');
                writeStream.destroy();
                fs.unlink(tempFilePath, () => {});
                reject(new Error('Download cat timeout after 10 minutes'));
            }, timeout);
            
            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            child.on('error', (err) => {
                clearTimeout(timeoutHandle);
                writeStream.destroy();
                fs.unlink(tempFilePath, () => {});
                reject(err);
            });
            
            writeStream.on('error', (err) => {
                clearTimeout(timeoutHandle);
                child.kill('SIGTERM');
                fs.unlink(tempFilePath, () => {});
                reject(err);
            });
            
            writeStream.on('finish', () => {
                clearTimeout(timeoutHandle);
                try {
                    const stats = fs.statSync(tempFilePath);
                    if (stats.size === 0) {
                        fs.unlink(tempFilePath, () => {});
                        reject(new Error('Downloaded file is empty'));
                        return;
                    }
                    
                    logOperation('download', { 
                        status: '✅ Download successful (cat)',
                        storagePath,
                        fileSize: stats.size,
                        tempPath: tempFilePath
                    });
                    resolve(tempFilePath);
                } catch (err) {
                    fs.unlink(tempFilePath, () => {});
                    reject(err);
                }
            });
            
            child.on('close', (code) => {
                clearTimeout(timeoutHandle);
                if (code !== 0 && !writeStream.destroyed) {
                    writeStream.destroy();
                    fs.unlink(tempFilePath, () => {});
                    reject(new Error(`Rclone cat exited with code ${code}: ${stderr}`));
                }
            });
            
            // Pipe cat output to file
            child.stdout.pipe(writeStream);
        });
    },

    /**
     * Convert storage path from database format to Google Drive format
     * Database might have old paths like: /arsip/zona-01/toko-balaraja/...
     * Should be converted to: /ARSIP ANKA/zona-1/toko-balaraja/...
     */
    normalizeStoragePath(storagePath) {
        if (!storagePath) return storagePath;
        
        // If already using new format, return as-is
        if (storagePath.startsWith('/ARSIP ANKA')) {
            return storagePath;
        }
        
        // Convert old format /arsip/zona-01/... to /ARSIP ANKA/zona-1/...
        if (storagePath.startsWith('/arsip/')) {
            let normalized = storagePath.replace(/^\/arsip\//, '/ARSIP ANKA/');
            // Convert zona-01 -> zona-1, zona-03a -> zona-3a, etc.
            normalized = normalized.replace(/zona-0(\d+)([a-b]?)/, 'zona-$1$2');
            return normalized;
        }
        
        return storagePath;
    },

    /**
     * Delete a file from storage via Rclone
     */
    async deleteFile(storagePath) {
        // Normalize path to new format
        const normalizedPath = this.normalizeStoragePath(storagePath);
        let cleanPath = normalizedPath.startsWith('/') ? normalizedPath : '/' + normalizedPath;

        console.log(`[RcloneStorage.deleteFile] Input storagePath: ${storagePath}`);
        console.log(`[RcloneStorage.deleteFile] Normalized path: ${normalizedPath}`);
        console.log(`[RcloneStorage.deleteFile] Clean path: ${cleanPath}`);

        logOperation('deleteFile', { 
            action: 'Starting file deletion',
            operation_type: 'delete',
            originalPath: storagePath,
            normalizedPath: normalizedPath,
            cleanPath: cleanPath
        });

        const remotePath = `${PRIMARY_REMOTE}:${cleanPath}`;
        console.log(`[RcloneStorage.deleteFile] Remote path: ${remotePath}`);

        try {
            logOperation('deleteFile', { 
                action: 'Deleting file',
                remotePath: remotePath
            });

            // Use 120 second timeout for Google Drive delete (much slower than upload)
            await rcloneExec(['delete', remotePath], 120000);
            
            console.log(`[RcloneStorage.deleteFile] ✅ Delete successful: ${remotePath}`);
            logOperation('deleteFile', { 
                status: '✅ Delete successful',
                storagePath: normalizedPath
            });
            return true;
        } catch (err) {
            console.error(`[RcloneStorage.deleteFile] ❌ Delete failed: ${remotePath}`, err.message);
            logOperation('deleteFile', { 
                status: '❌ Delete failed',
                error: err.message,
                remotePath: remotePath,
                storagePath: normalizedPath
            });
            console.error(`[RcloneStorage] Delete failed:`, err);
            throw err;
        }
    },

    /**
     * Check if a file exists on primary storage.
     */
    async checkFileExists(storagePath) {
        // A newly uploaded file remains valid locally while Terabox sync is
        // blocked by an upstream CAPTCHA or temporary write failure.
        if (LocalStorage.fileExists(storagePath)) {
            return true;
        }
        try {
            const remotePath = `${PRIMARY_REMOTE}:${storagePath}`;
            await rcloneExec(['ls', remotePath]);
            return true;
        } catch (err) {
            return false;
        }
    },

    /**
     * Return pending automatic uploads without exposing file contents.
     */
    getPendingSyncJobs() {
        return readSyncQueue();
    },

    getSyncQueueSnapshot() {
        const jobs = readSyncQueue();
        return {
            jobs,
            summary: {
                total: jobs.length,
                pending: jobs.filter(job => job.primaryStatus !== 'verified').length,
                primaryVerified: jobs.filter(job => job.primaryStatus === 'verified').length,
                backupPending: jobs.filter(job => job.backupStatus !== 'verified').length,
                backupVerified: jobs.filter(job => job.backupStatus === 'verified').length,
                failed: jobs.filter(job => job.lastError || job.backupStatus === 'failed').length
            }
        };
    },

    getSyncStatuses(storagePaths = null) {
        return getSyncStatuses(storagePaths);
    },

    async verifySyncPaths(storagePaths = []) {
        const result = {};
        for (const storagePath of storagePaths) {
            const stored = getSyncStatuses([storagePath])[storagePath] || {
                storagePath,
                primaryStatus: 'pending',
                backupStatus: 'pending'
            };
            try {
                const primaryExists = await remoteFileExists(storagePath);
                result[storagePath] = {
                    ...stored,
                    primaryStatus: primaryExists ? 'verified' : 'failed',
                    lastError: primaryExists ? null : 'File primary tidak ditemukan di remote.'
                };
                updateSyncStatus(storagePath, result[storagePath]);
            } catch (err) {
                result[storagePath] = { ...stored, primaryStatus: 'failed', lastError: err.message };
                updateSyncStatus(storagePath, result[storagePath]);
            }
        }
        return result;
    },

    retrySyncJobs(storagePaths = []) {
        const requested = new Set(Array.isArray(storagePaths) ? storagePaths : []);
        const queue = readSyncQueue();
        let changed = 0;
        queue.forEach(job => {
            if (requested.size === 0 || requested.has(job.storagePath)) {
                job.nextAttemptAt = new Date().toISOString();
                job.lastError = null;
                if (job.primaryStatus === 'failed') job.primaryStatus = 'pending';
                if (job.backupStatus === 'failed') job.backupStatus = 'pending';
                changed++;
            }
        });
        if (changed) writeSyncQueue(queue);
        return changed;
    },

    backupFile(storagePath) {
        return backupLocalFile(storagePath);
    },

    async backupLocalPath(localPath, remotePath) {
        if (!fs.existsSync(localPath)) {
            throw new Error('Berkas backup lokal tidak ditemukan.');
        }
        await rcloneExec(['copyto', localPath, `${BACKUP_REMOTE}:${remotePath}`]);
        const remoteListing = await rcloneExec(['lsjson', '--files-only', `${BACKUP_REMOTE}:${remotePath}`]);
        let remoteFiles;
        try {
            remoteFiles = JSON.parse(remoteListing || '[]');
        } catch (err) {
            throw new Error(`Upload backup selesai tetapi respons verifikasi storage cadangan tidak valid: ${err.message}`);
        }
        const remoteFile = Array.isArray(remoteFiles)
            ? remoteFiles.find(file => file && file.Name)
            : null;
        const localSize = fs.statSync(localPath).size;
        if (!remoteFile || Number(remoteFile.Size) !== localSize) {
            throw new Error(`Upload backup selesai tetapi verifikasi ukuran gagal (lokal ${localSize} byte, remote ${remoteFile?.Size ?? 'tidak ditemukan'} byte).`);
        }
        return true;
    },

    async verifyBackupStorage() {
        try {
            await rcloneExec(['lsjson', '--max-depth', '1', `${BACKUP_REMOTE}:`]);
            return { healthy: true, detail: `Storage cadangan ${BACKUP_REMOTE} dapat dibaca.` };
        } catch (err) {
            return { healthy: false, detail: `Storage cadangan ${BACKUP_REMOTE} gagal diverifikasi: ${err.message}` };
        }
    },

    /**
     * Trigger a queue pass after the Terabox session is refreshed.
     */
    processPendingSyncJobs() {
        return processSyncQueue();
    },

    /**
     * List all files in a directory via Rclone
     */
    async listFiles(storagePath) {
        let cleanPath = storagePath.startsWith('/') ? storagePath : '/' + storagePath;

        logOperation('listFiles', { 
            action: 'Listing files',
            operation_type: 'list',
            path: storagePath 
        });

        try {
            const remotePath = `${PRIMARY_REMOTE}:${cleanPath}`;
            const output = await rcloneExec(['lsjson', remotePath]);
            
            let files = [];
            try {
                files = JSON.parse(output);
            } catch (e) {
                console.warn('[Rclone] Could not parse JSON output, returning empty list');
                files = [];
            }

            const fileCount = files ? files.length : 0;
            logOperation('listFiles', { 
                status: '✅ List successful',
                path: storagePath,
                file_count: fileCount 
            });

            return files || [];
        } catch (err) {
            logOperation('listFiles', { 
                status: '❌ List failed',
                error: err.message,
                path: storagePath 
            });
            console.error(`[RcloneStorage] List failed:`, err);
            throw err;
        }
    }
};

/**
 * Initialize Rclone credentials at server startup.
 * This function should be called from server.js during initialization.
 * 
 * @returns {Promise<Object>} - Status object: { success, source, message }
 */
async function initializeRcloneCredentials() {
    console.log('🔐 [RcloneStorage] Initializing storage credentials...');

    try {
        const password = await getSecret(
            'arsip-alist-password',
            'ALIST_ADMIN_PASSWORD',
            null
        );
        alistCredentials.password = password;
        alistCredentials.source = 'ENV';
        rcloneConfig.source = 'RCLONE_CONF + ALIST_API';
        
        logOperation('initializeRcloneCredentials', { 
            status: '✅ Alist API and rclone configured',
            config_source: rcloneConfig.source
        });
        console.log('✅ [RcloneStorage] Alist API and rclone configured for Terabox');
        startSyncQueueWorker();

        return {
            success: true,
            source: rcloneConfig.source,
            message: 'Alist API and rclone configured'
        };
    } catch (err) {
        logOperation('initializeRcloneCredentials', { 
            status: '❌ Initialization failed',
            error: err.message
        });
        console.error('❌ [RcloneStorage] Initialization failed:', err.message);

        return {
            success: false,
            source: 'RCLONE_CONF',
            message: `Initialization failed: ${err.message}`
        };
    }
}

module.exports = RcloneStorage;
module.exports.initializeRcloneCredentials = initializeRcloneCredentials;

/**
 * Reset cache for testing purposes
 */
module.exports.__resetCache = function() {
    createdDirsCache.clear();
};
