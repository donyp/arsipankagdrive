/**
 * Terabox Hybrid Handler
 * 
 * Supports both:
 * - Direct Terabox API (primary)
 * - WebDAV via Alist (fallback)
 * 
 * Automatically uses best available method
 * 
 * @author Arsip Anka Team
 * @date August 2026
 */

const TeraboxDirectAPI = require('./teraboxDirectAPI');
const TeraboxStorageHandler = require('./teraboxStorageHandler');

class TeraboxHybridHandler {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.directAPI = null;
    this.webdavHandler = null;
    this.preferredMethod = options.preferredMethod || 'direct'; // 'direct' or 'webdav'
    this.activeMethod = null;
    this.fallbackEnabled = options.fallbackEnabled !== false;
  }

  /**
   * Initialize both methods and try direct first
   */
  async initialize() {
    try {
      this.logger.log('[TeraboxHybrid] Initializing...');

      // Try Direct API first (preferred)
      if (this.preferredMethod === 'direct') {
        this.logger.log('[TeraboxHybrid] Attempting direct API...');
        const directResult = await this.initializeDirectAPI();
        
        if (directResult.success) {
          this.activeMethod = 'direct';
          this.logger.log('[TeraboxHybrid] ✅ Using Direct API (primary)');
          return { success: true, method: 'direct', message: directResult.message };
        }
        
        this.logger.warn('[TeraboxHybrid] Direct API failed:', directResult.error);
      }

      // Try WebDAV fallback if enabled
      if (this.fallbackEnabled) {
        this.logger.log('[TeraboxHybrid] Attempting WebDAV fallback...');
        const webdavResult = await this.initializeWebDAV();
        
        if (webdavResult.success) {
          this.activeMethod = 'webdav';
          this.logger.log('[TeraboxHybrid] ✅ Using WebDAV (fallback)');
          return { success: true, method: 'webdav', message: webdavResult.message };
        }
        
        this.logger.warn('[TeraboxHybrid] WebDAV failed:', webdavResult.error);
      }

      throw new Error('No working storage method available');

    } catch (err) {
      this.logger.error('[TeraboxHybrid] ❌ Initialization failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Initialize Direct API
   */
  async initializeDirectAPI() {
    try {
      this.directAPI = new TeraboxDirectAPI({
        email: process.env.TERABOX_EMAIL,
        password: process.env.TERABOX_PASSWORD,
        appKey: process.env.TERABOX_APP_KEY,
        appSecret: process.env.TERABOX_APP_SECRET,
        accessToken: process.env.TERABOX_ACCESS_TOKEN || process.env.TERABOX_OAUTH_TOKEN,
        tokenCachePath: process.env.TERABOX_TOKEN_CACHE_PATH || './terabox_token.json',
        maxRetries: parseInt(process.env.TERABOX_MAX_RETRIES || 3),
        retryDelayMs: parseInt(process.env.TERABOX_RETRY_DELAY_MS || 1000),
        logger: this.logger
      });

      const result = await this.directAPI.initialize();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Verify it works
      const health = await this.directAPI.healthCheck();
      if (!health.healthy) {
        throw new Error('Health check failed: ' + health.error);
      }

      return { success: true, message: 'Direct API initialized' };

    } catch (err) {
      this.logger.warn('[TeraboxHybrid] DirectAPI init failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Initialize WebDAV fallback
   */
  async initializeWebDAV() {
    try {
      this.webdavHandler = new TeraboxStorageHandler({
        alistUrl: 'http://localhost:5244',
        alistUser: 'admin',
        alistPassword: process.env.ALIST_ADMIN_PASSWORD || 'admin123',
        rcloneConfigPath: process.env.RCLONE_CONFIG_PATH || './rclone.conf',
        logger: this.logger
      });

      const result = await this.webdavHandler.initialize();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return { success: true, message: 'WebDAV initialized' };

    } catch (err) {
      this.logger.warn('[TeraboxHybrid] WebDAV init failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * List files (uses active method)
   */
  async listFiles(remotePath = '/') {
    if (!this.activeMethod) {
      throw new Error('No active storage method');
    }

    try {
      if (this.activeMethod === 'direct') {
        const data = await this.directAPI.listFiles(remotePath);
        
        // Format response to match WebDAV
        if (data.list) {
          return data.list.map(file => ({
            name: file.server_filename,
            size: file.size,
            mtime: file.local_mtime,
            isdir: file.isdir
          }));
        }
        return [];
      } else {
        return await this.webdavHandler.listFiles(remotePath);
      }

    } catch (err) {
      if (this.fallbackEnabled && this.activeMethod === 'direct') {
        this.logger.warn('[TeraboxHybrid] Direct API failed, switching to WebDAV fallback');
        this.activeMethod = 'webdav';
        if (!this.webdavHandler) {
          await this.initializeWebDAV();
        }
        return await this.webdavHandler.listFiles(remotePath);
      }
      throw err;
    }
  }

  /**
   * Get storage quota
   */
  async getQuota() {
    if (!this.activeMethod) {
      throw new Error('No active storage method');
    }

    try {
      if (this.activeMethod === 'direct') {
        return await this.directAPI.getQuota();
      } else {
        // WebDAV - estimate from size check
        const size = await this.webdavHandler.getSize('/');
        return {
          used: size.bytes,
          total: 1099511627776, // 1TB estimate
          free: 1099511627776 - size.bytes
        };
      }

    } catch (err) {
      if (this.fallbackEnabled && this.activeMethod === 'direct') {
        this.activeMethod = 'webdav';
        if (!this.webdavHandler) {
          await this.initializeWebDAV();
        }
        return await this.getQuota();
      }
      throw err;
    }
  }

  /**
   * Upload file
   */
  async uploadFile(localPath, remotePath) {
    if (!this.activeMethod) {
      throw new Error('No active storage method');
    }

    try {
      if (this.activeMethod === 'direct') {
        // Direct API upload would need to be implemented
        // For now, fall back to WebDAV for uploads
        throw new Error('Direct API uploads not yet implemented, using WebDAV');
      } else {
        return await this.webdavHandler.uploadFile(localPath, remotePath);
      }

    } catch (err) {
      if (this.fallbackEnabled && this.activeMethod === 'direct') {
        this.activeMethod = 'webdav';
        if (!this.webdavHandler) {
          await this.initializeWebDAV();
        }
        return await this.webdavHandler.uploadFile(localPath, remotePath);
      }
      throw err;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      this.logger.log('[TeraboxHybrid] Running health check...');

      if (this.activeMethod === 'direct' && this.directAPI) {
        const health = await this.directAPI.healthCheck();
        return {
          healthy: health.healthy,
          method: 'direct',
          quota: health.quota,
          error: health.error
        };
      } else if (this.activeMethod === 'webdav' && this.webdavHandler) {
        const health = await this.webdavHandler.healthCheck();
        return {
          healthy: health.healthy,
          method: 'webdav',
          status: health.status,
          error: health.error
        };
      }

      return {
        healthy: false,
        method: null,
        error: 'No active method'
      };

    } catch (err) {
      this.logger.error('[TeraboxHybrid] Health check failed:', err.message);
      return {
        healthy: false,
        method: this.activeMethod,
        error: err.message
      };
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      activeMethod: this.activeMethod,
      directAPIReady: !!this.directAPI,
      webdavReady: !!this.webdavHandler,
      fallbackEnabled: this.fallbackEnabled,
      directStatus: this.directAPI?.getStatus() || null,
      webdavStatus: this.webdavHandler?.getStatus() || null
    };
  }

  /**
   * Try switch to direct API if available
   */
  async switchToDirect() {
    try {
      this.logger.log('[TeraboxHybrid] Attempting to switch to direct API...');
      const result = await this.initializeDirectAPI();
      
      if (result.success) {
        this.activeMethod = 'direct';
        this.logger.log('[TeraboxHybrid] ✅ Switched to direct API');
        return true;
      }
      
      return false;

    } catch (err) {
      this.logger.warn('[TeraboxHybrid] Switch to direct failed:', err.message);
      return false;
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.directAPI) {
      this.directAPI.destroy();
    }
    if (this.webdavHandler) {
      this.webdavHandler.destroy();
    }
    this.logger.log('[TeraboxHybrid] Cleaned up');
  }
}

module.exports = TeraboxHybridHandler;
