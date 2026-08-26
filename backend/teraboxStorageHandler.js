/**
 * Terabox Storage Handler with Credential Management
 * 
 * Features:
 * - Automatic credential refresh
 * - Fallback mechanisms
 * - Retry logic with exponential backoff
 * - Health monitoring
 * 
 * @author Arsip Anka Team
 * @date August 2026
 */

const { spawn } = require('child_process');
const TeraboxCredentialManager = require('./teraboxCredentialManager');

class TeraboxStorageHandler {
  constructor(options = {}) {
    this.credentialManager = new TeraboxCredentialManager({
      alistUrl: options.alistUrl || 'http://localhost:5244',
      alistUser: options.alistUser || 'admin',
      alistPassword: options.alistPassword || process.env.ALIST_ADMIN_PASSWORD,
      rcloneConfigPath: options.rcloneConfigPath || './rclone.conf',
      logger: options.logger || console
    });

    this.maxRetries = options.maxRetries || 3;
    this.retryDelayMs = options.retryDelayMs || 1000;
    this.operationTimeout = options.operationTimeout || 300000; // 5 minutes
    this.logger = options.logger || console;
    this.isHealthy = false;
  }

  /**
   * Initialize storage handler and credential manager
   */
  async initialize() {
    try {
      this.logger.log('[TeraboxStorageHandler] Initializing...');

      // Initialize credential manager
      const credResult = await this.credentialManager.initialize();
      if (!credResult.success) {
        throw new Error(credResult.error);
      }

      // Test connection
      const testResult = await this.credentialManager.testConnection();
      if (!testResult.success) {
        throw new Error('Connection test failed: ' + testResult.error);
      }

      // Update rclone config
      await this.credentialManager.updateRcloneConfig();

      this.isHealthy = true;
      this.logger.log('[TeraboxStorageHandler] ✅ Initialized successfully');

      return {
        success: true,
        message: 'Terabox storage handler ready',
        status: this.credentialManager.getStatus()
      };

    } catch (err) {
      this.logger.error('[TeraboxStorageHandler] ❌ Initialization failed:', err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Execute rclone command with retry logic
   */
  async executeRclone(command, args = []) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Before each attempt, ensure credentials are fresh
        if (attempt > 1) {
          this.logger.log(`[TeraboxStorageHandler] Attempt ${attempt}: Refreshing credentials...`);
          await this.credentialManager.refreshCredentials(true);
          await this.credentialManager.updateRcloneConfig();
        }

        this.logger.log(`[TeraboxStorageHandler] Executing: rclone ${command} ${args.join(' ')} (attempt ${attempt})`);

        const result = await this.executeCommand(command, args);
        this.isHealthy = true;
        return result;

      } catch (err) {
        lastError = err;
        this.logger.warn(
          `[TeraboxStorageHandler] Attempt ${attempt}/${this.maxRetries} failed:`,
          err.message
        );

        if (attempt < this.maxRetries) {
          // Exponential backoff
          const waitTime = Math.pow(2, attempt - 1) * this.retryDelayMs;
          this.logger.log(`[TeraboxStorageHandler] Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    this.isHealthy = false;
    this.logger.error('[TeraboxStorageHandler] ❌ All retry attempts failed');
    throw lastError || new Error('Operation failed');
  }

  /**
   * Execute rclone command (internal)
   */
  executeCommand(command, args) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Command timeout after ${this.operationTimeout}ms`));
      }, this.operationTimeout);

      let stdout = '';
      let stderr = '';

      const proc = spawn('rclone', [command, ...args], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          resolve({
            success: true,
            output: stdout,
            exitCode: code
          });
        } else {
          reject(new Error(`Rclone failed with code ${code}: ${stderr || stdout}`));
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * List files in Terabox
   */
  async listFiles(remotePath = '/') {
    try {
      this.logger.log(`[TeraboxStorageHandler] Listing: terabox:${remotePath}`);
      
      const result = await this.executeRclone('lsf', [
        `terabox:${remotePath}`,
        '--csv'
      ]);

      const files = result.output
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => {
          const [name, size, mtime] = line.split(',');
          return { name, size: parseInt(size), mtime };
        });

      this.logger.log(`[TeraboxStorageHandler] ✅ Listed ${files.length} files`);
      return files;

    } catch (err) {
      this.logger.error('[TeraboxStorageHandler] List failed:', err.message);
      throw err;
    }
  }

  /**
   * Upload file to Terabox
   */
  async uploadFile(localPath, remotePath) {
    try {
      this.logger.log(`[TeraboxStorageHandler] Uploading: ${localPath} → terabox:${remotePath}`);
      
      const result = await this.executeRclone('copy', [
        localPath,
        `terabox:${remotePath}`
      ]);

      this.logger.log('[TeraboxStorageHandler] ✅ Upload complete');
      return { success: true, file: remotePath };

    } catch (err) {
      this.logger.error('[TeraboxStorageHandler] Upload failed:', err.message);
      throw err;
    }
  }

  /**
   * Download file from Terabox
   */
  async downloadFile(remotePath, localPath) {
    try {
      this.logger.log(`[TeraboxStorageHandler] Downloading: terabox:${remotePath} → ${localPath}`);
      
      const result = await this.executeRclone('copy', [
        `terabox:${remotePath}`,
        localPath
      ]);

      this.logger.log('[TeraboxStorageHandler] ✅ Download complete');
      return { success: true, file: localPath };

    } catch (err) {
      this.logger.error('[TeraboxStorageHandler] Download failed:', err.message);
      throw err;
    }
  }

  /**
   * Sync directory with Terabox
   */
  async syncToTerabox(localPath, remotePath) {
    try {
      this.logger.log(`[TeraboxStorageHandler] Syncing: ${localPath} → terabox:${remotePath}`);
      
      const result = await this.executeRclone('sync', [
        localPath,
        `terabox:${remotePath}`,
        '--progress',
        '--stats=1s'
      ]);

      this.logger.log('[TeraboxStorageHandler] ✅ Sync complete');
      return { success: true, source: localPath, destination: remotePath };

    } catch (err) {
      this.logger.error('[TeraboxStorageHandler] Sync failed:', err.message);
      throw err;
    }
  }

  /**
   * Get storage size info
   */
  async getSize(remotePath = '/') {
    try {
      this.logger.log(`[TeraboxStorageHandler] Getting size: terabox:${remotePath}`);
      
      const result = await this.executeRclone('size', [
        `terabox:${remotePath}`
      ]);

      // Parse output format: "Total objects: X, Total size: Y bytes"
      const match = result.output.match(/Total size: (\d+) bytes/);
      const bytes = match ? parseInt(match[1]) : 0;
      const gb = (bytes / (1024 * 1024 * 1024)).toFixed(2);

      this.logger.log(`[TeraboxStorageHandler] ✅ Size: ${gb} GB`);
      return { bytes, gb };

    } catch (err) {
      this.logger.error('[TeraboxStorageHandler] Size check failed:', err.message);
      throw err;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      this.logger.log('[TeraboxStorageHandler] Running health check...');

      // Refresh credentials if needed
      const status = this.credentialManager.getStatus();
      
      if (!status.initialized) {
        await this.credentialManager.refreshCredentials();
      }

      // Test connection
      const testResult = await this.credentialManager.testConnection();
      
      if (!testResult.success) {
        this.isHealthy = false;
        return {
          healthy: false,
          error: testResult.error,
          status: this.credentialManager.getStatus()
        };
      }

      // Quick list test
      await this.executeRclone('lsf', ['terabox:/', '--max-depth=1']);

      this.isHealthy = true;
      this.logger.log('[TeraboxStorageHandler] ✅ Health check passed');

      return {
        healthy: true,
        status: this.credentialManager.getStatus()
      };

    } catch (err) {
      this.isHealthy = false;
      this.logger.error('[TeraboxStorageHandler] ❌ Health check failed:', err.message);
      return {
        healthy: false,
        error: err.message,
        status: this.credentialManager.getStatus()
      };
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      healthy: this.isHealthy,
      credentialStatus: this.credentialManager.getStatus(),
      readyToOperate: this.isHealthy && this.credentialManager.getStatus().status === 'authenticated'
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this.credentialManager.destroy();
    this.logger.log('[TeraboxStorageHandler] Cleaned up');
  }
}

module.exports = TeraboxStorageHandler;
