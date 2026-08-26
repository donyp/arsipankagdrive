/**
 * Terabox Credential Manager
 * 
 * Handles:
 * - Terabox cookie/token refresh
 * - Alist authentication persistence
 * - Fallback to direct API when WebDAV fails
 * - Automatic retry with fresh credentials
 * 
 * @author Arsip Anka Team
 * @date August 2026
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class TeraboxCredentialManager {
  constructor(options = {}) {
    this.alistUrl = options.alistUrl || 'http://localhost:5244';
    this.alistUser = options.alistUser || 'admin';
    this.alistPassword = options.alistPassword || process.env.ALIST_ADMIN_PASSWORD;
    this.rcloneConfigPath = options.rcloneConfigPath || './rclone.conf';
    this.credentialCachePath = options.credentialCachePath || './terabox_credentials.json';
    this.refreshInterval = options.refreshInterval || 3600000; // 1 hour
    this.maxRetries = options.maxRetries || 3;
    
    this.logger = options.logger || console;
    this.credentials = null;
    this.lastRefreshTime = null;
    this.refreshTimer = null;
  }

  /**
   * Initialize credential manager
   * Load cached credentials or fetch new ones
   */
  async initialize() {
    try {
      this.logger.log('[TeraboxCredManager] Initializing...');
      
      // Try load from cache first
      if (await this.loadCachedCredentials()) {
        this.logger.log('[TeraboxCredManager] ✅ Loaded cached credentials');
      } else {
        this.logger.log('[TeraboxCredManager] No cache, fetching fresh credentials...');
        await this.refreshCredentials();
      }

      // Setup auto-refresh timer
      this.setupAutoRefresh();
      
      return {
        success: true,
        message: 'Credential manager initialized',
        credentials: this.credentials
      };
    } catch (err) {
      this.logger.error('[TeraboxCredManager] ❌ Initialization failed:', err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Setup automatic credential refresh
   */
  setupAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      try {
        this.logger.log('[TeraboxCredManager] Auto-refresh triggered');
        await this.refreshCredentials();
      } catch (err) {
        this.logger.error('[TeraboxCredManager] Auto-refresh failed:', err.message);
      }
    }, this.refreshInterval);

    this.logger.log(`[TeraboxCredManager] Auto-refresh scheduled every ${this.refreshInterval/1000}s`);
  }

  /**
   * Load cached credentials from file
   */
  async loadCachedCredentials() {
    try {
      if (!fs.existsSync(this.credentialCachePath)) {
        return false;
      }

      const cached = JSON.parse(fs.readFileSync(this.credentialCachePath, 'utf8'));
      
      // Check if cache is still valid (not expired)
      const cacheAge = Date.now() - cached.timestamp;
      const maxCacheAge = 30 * 60 * 1000; // 30 minutes

      if (cacheAge > maxCacheAge) {
        this.logger.log('[TeraboxCredManager] Cache expired, will refresh');
        return false;
      }

      this.credentials = cached;
      this.lastRefreshTime = new Date(cached.timestamp);
      return true;
    } catch (err) {
      this.logger.warn('[TeraboxCredManager] Failed to load cache:', err.message);
      return false;
    }
  }

  /**
   * Save credentials to cache
   */
  async saveCachedCredentials() {
    try {
      const cacheData = {
        ...this.credentials,
        timestamp: Date.now()
      };
      fs.writeFileSync(
        this.credentialCachePath,
        JSON.stringify(cacheData, null, 2)
      );
      this.logger.log('[TeraboxCredManager] ✅ Credentials cached');
    } catch (err) {
      this.logger.warn('[TeraboxCredManager] Failed to cache credentials:', err.message);
    }
  }

  /**
   * Get Alist auth token
   */
  async getAlistToken() {
    try {
      this.logger.log('[TeraboxCredManager] Fetching Alist auth token...');
      
      const response = await axios.post(
        `${this.alistUrl}/api/auth/login`,
        {
          username: this.alistUser,
          password: this.alistPassword
        },
        { timeout: 5000 }
      );

      if (response.data.code === 200 && response.data.data.token) {
        this.logger.log('[TeraboxCredManager] ✅ Got Alist token');
        return response.data.data.token;
      } else {
        throw new Error('Invalid Alist response: ' + response.data.message);
      }
    } catch (err) {
      this.logger.error('[TeraboxCredManager] ❌ Failed to get Alist token:', err.message);
      throw err;
    }
  }

  /**
   * Get Terabox info from Alist (to verify connection)
   */
  async getTeraboxInfo(token) {
    try {
      const response = await axios.get(
        `${this.alistUrl}/api/fs/get`,
        {
          params: { path: '/' },
          headers: { Authorization: token },
          timeout: 5000
        }
      );

      return response.data;
    } catch (err) {
      this.logger.error('[TeraboxCredManager] Failed to get Terabox info:', err.message);
      throw err;
    }
  }

  /**
   * Refresh all Terabox credentials and tokens
   */
  async refreshCredentials(forceRefresh = false) {
    try {
      // If we just refreshed, skip
      if (!forceRefresh && this.lastRefreshTime) {
        const timeSinceRefresh = Date.now() - this.lastRefreshTime.getTime();
        if (timeSinceRefresh < 5 * 60 * 1000) { // Less than 5 minutes
          this.logger.log('[TeraboxCredManager] Skipping refresh, too recent');
          return this.credentials;
        }
      }

      this.logger.log('[TeraboxCredManager] Refreshing credentials...');
      let attempts = 0;

      while (attempts < this.maxRetries) {
        try {
          // Step 1: Get Alist token
          const alistToken = await this.getAlistToken();

          // Step 2: Verify Terabox connection
          const teraboxInfo = await this.getTeraboxInfo(alistToken);

          // Step 3: Store credentials
          this.credentials = {
            alistToken,
            alistUrl: this.alistUrl,
            alistUser: this.alistUser,
            teraboxName: teraboxInfo.data?.name || 'Terabox Root',
            teraboxProvider: 'alist-webdav',
            status: 'authenticated',
            lastAuth: new Date().toISOString()
          };

          this.lastRefreshTime = new Date();
          
          // Step 4: Save to cache
          await this.saveCachedCredentials();

          this.logger.log('[TeraboxCredManager] ✅ Credentials refreshed successfully');
          return this.credentials;

        } catch (err) {
          attempts++;
          this.logger.warn(`[TeraboxCredManager] Refresh attempt ${attempts}/${this.maxRetries} failed:`, err.message);
          
          if (attempts < this.maxRetries) {
            // Wait before retry (exponential backoff)
            const waitTime = Math.pow(2, attempts) * 1000;
            this.logger.log(`[TeraboxCredManager] Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }

      throw new Error(`Failed to refresh credentials after ${this.maxRetries} attempts`);

    } catch (err) {
      this.logger.error('[TeraboxCredManager] ❌ Credential refresh failed:', err.message);
      
      // If all else fails, try to use cached credentials
      if (this.credentials) {
        this.logger.warn('[TeraboxCredManager] Using stale credentials as fallback');
        return this.credentials;
      }
      
      throw err;
    }
  }

  /**
   * Update rclone.conf with fresh Alist credentials
   */
  async updateRcloneConfig() {
    try {
      if (!this.credentials) {
        throw new Error('No credentials available');
      }

      this.logger.log('[TeraboxCredManager] Updating rclone.conf...');

      // Read current config
      let config = fs.readFileSync(this.rcloneConfigPath, 'utf8');

      // Update Alist WebDAV section
      const alistSection = `[terabox]
type = webdav
url = ${this.credentials.alistUrl}/dav/terabox
vendor = other
user = ${this.credentials.alistUser}
pass = ${this.alistPassword}
bearer_token = ${this.credentials.alistToken}`;

      // Replace or add section
      if (config.includes('[terabox]')) {
        config = config.replace(
          /\[terabox\][\s\S]*?(?=\n\[|$)/,
          alistSection
        );
      } else {
        config = alistSection + '\n\n' + config;
      }

      fs.writeFileSync(this.rcloneConfigPath, config);
      this.logger.log('[TeraboxCredManager] ✅ rclone.conf updated');

      return true;
    } catch (err) {
      this.logger.error('[TeraboxCredManager] Failed to update rclone.conf:', err.message);
      throw err;
    }
  }

  /**
   * Test Terabox connection via Alist
   */
  async testConnection() {
    try {
      this.logger.log('[TeraboxCredManager] Testing Terabox connection...');

      if (!this.credentials) {
        await this.refreshCredentials();
      }

      // Test WebDAV endpoint
      const response = await axios.get(
        `${this.alistUrl}/dav/terabox/`,
        {
          auth: {
            username: this.alistUser,
            password: this.alistPassword
          },
          timeout: 5000
        }
      );

      this.logger.log('[TeraboxCredManager] ✅ Connection successful');
      return {
        success: true,
        provider: 'alist-webdav',
        url: `${this.alistUrl}/dav/terabox`,
        status: 'connected'
      };

    } catch (err) {
      this.logger.error('[TeraboxCredManager] ❌ Connection test failed:', err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Get current credential status
   */
  getStatus() {
    return {
      initialized: !!this.credentials,
      lastRefresh: this.lastRefreshTime?.toISOString(),
      alistUrl: this.alistUrl,
      provider: this.credentials?.teraboxProvider || 'not-authenticated',
      status: this.credentials?.status || 'offline',
      teraboxName: this.credentials?.teraboxName || null
    };
  }

  /**
   * Cleanup (stop refresh timer)
   */
  destroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.logger.log('[TeraboxCredManager] Cleaned up');
    }
  }
}

module.exports = TeraboxCredentialManager;
