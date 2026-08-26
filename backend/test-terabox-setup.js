#!/usr/bin/env node

/**
 * Test Terabox Setup with Credential Manager
 * 
 * Usage: node test-terabox-setup.js
 * 
 * Tests:
 * - Terabox Credential Manager initialization
 * - Alist authentication
 * - Rclone configuration
 * - File operations (list, upload, download)
 * - Health check
 * 
 * @author Arsip Anka Team
 * @date August 2026
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const TeraboxCredentialManager = require('./teraboxCredentialManager');
const TeraboxStorageHandler = require('./teraboxStorageHandler');
const fs = require('fs');
const path = require('path');

class TeraboxSetupTester {
  constructor() {
    this.testResults = [];
    this.logger = {
      log: (msg) => console.log(`[TEST] ${msg}`),
      warn: (msg) => console.warn(`[⚠️  TEST] ${msg}`),
      error: (msg) => console.error(`[❌ TEST] ${msg}`),
      success: (msg) => console.log(`[✅ TEST] ${msg}`)
    };
  }

  async runAllTests() {
    console.log('\n' + '='.repeat(60));
    console.log('TERABOX CREDENTIAL MANAGER - SETUP TEST');
    console.log('='.repeat(60) + '\n');

    try {
      // Test 1: Credential Manager initialization
      await this.testCredentialManagerInit();

      // Test 2: Alist authentication
      await this.testAlistAuth();

      // Test 3: Rclone configuration
      await this.testRcloneConfig();

      // Test 4: Storage Handler initialization
      await this.testStorageHandlerInit();

      // Test 5: Health check
      await this.testHealthCheck();

      // Test 6: File operations
      await this.testFileOperations();

      // Summary
      this.printSummary();

    } catch (err) {
      this.logger.error('Test suite failed: ' + err.message);
      process.exit(1);
    }
  }

  async testCredentialManagerInit() {
    console.log('\n📋 Test 1: Credential Manager Initialization');
    console.log('-'.repeat(60));

    try {
      const credManager = new TeraboxCredentialManager({
        alistUrl: 'http://localhost:5244',
        alistUser: 'admin',
        alistPassword: process.env.ALIST_ADMIN_PASSWORD || 'admin123',
        logger: this.logger
      });

      const result = await credManager.initialize();

      if (result.success) {
        this.logger.success('Credential Manager initialized');
        const status = credManager.getStatus();
        console.log(`   Provider: ${status.provider}`);
        console.log(`   Status: ${status.status}`);
        console.log(`   Terabox: ${status.teraboxName}`);
        this.testResults.push({ test: 'CredentialManager Init', result: 'PASS' });
      } else {
        this.logger.error('Initialization failed: ' + result.error);
        this.testResults.push({ test: 'CredentialManager Init', result: 'FAIL' });
      }

      credManager.destroy();

    } catch (err) {
      this.logger.error('Test failed: ' + err.message);
      this.testResults.push({ test: 'CredentialManager Init', result: 'FAIL' });
    }
  }

  async testAlistAuth() {
    console.log('\n🔐 Test 2: Alist Authentication');
    console.log('-'.repeat(60));

    try {
      const credManager = new TeraboxCredentialManager({
        alistUrl: 'http://localhost:5244',
        alistUser: 'admin',
        alistPassword: process.env.ALIST_ADMIN_PASSWORD || 'admin123',
        logger: this.logger
      });

      const token = await credManager.getAlistToken();

      if (token && token.length > 0) {
        this.logger.success(`Alist authentication successful`);
        console.log(`   Token length: ${token.length} chars`);
        console.log(`   Token preview: ${token.substring(0, 30)}...`);
        this.testResults.push({ test: 'Alist Auth', result: 'PASS' });
      } else {
        this.logger.error('No token received');
        this.testResults.push({ test: 'Alist Auth', result: 'FAIL' });
      }

      credManager.destroy();

    } catch (err) {
      this.logger.error('Test failed: ' + err.message);
      this.testResults.push({ test: 'Alist Auth', result: 'FAIL' });
    }
  }

  async testRcloneConfig() {
    console.log('\n⚙️  Test 3: Rclone Configuration');
    console.log('-'.repeat(60));

    try {
      const rcloneConfPath = process.env.RCLONE_CONFIG_PATH || './rclone.conf.txt';

      if (!fs.existsSync(rcloneConfPath)) {
        this.logger.warn(`Rclone config not found at ${rcloneConfPath}`);
        this.testResults.push({ test: 'Rclone Config', result: 'WARN' });
        return;
      }

      const config = fs.readFileSync(rcloneConfPath, 'utf8');

      // Check for required sections
      const sections = {
        'terabox': config.includes('[terabox]'),
        'terabox_crypt': config.includes('[terabox_crypt]'),
        'terabox_cache': config.includes('[terabox_cache]')
      };

      let allGood = true;
      for (const [section, exists] of Object.entries(sections)) {
        if (exists) {
          this.logger.success(`Section [${section}] found`);
        } else {
          this.logger.warn(`Section [${section}] not found`);
          allGood = false;
        }
      }

      if (allGood) {
        this.testResults.push({ test: 'Rclone Config', result: 'PASS' });
      } else {
        this.testResults.push({ test: 'Rclone Config', result: 'WARN' });
      }

      console.log(`   Config file size: ${config.length} bytes`);
      console.log(`   Location: ${rcloneConfPath}`);

    } catch (err) {
      this.logger.error('Test failed: ' + err.message);
      this.testResults.push({ test: 'Rclone Config', result: 'FAIL' });
    }
  }

  async testStorageHandlerInit() {
    console.log('\n💾 Test 4: Storage Handler Initialization');
    console.log('-'.repeat(60));

    try {
      const storageHandler = new TeraboxStorageHandler({
        alistUrl: 'http://localhost:5244',
        alistUser: 'admin',
        alistPassword: process.env.ALIST_ADMIN_PASSWORD || 'admin123',
        logger: this.logger
      });

      const result = await storageHandler.initialize();

      if (result.success) {
        this.logger.success('Storage Handler initialized');
        console.log(`   Status: ${result.status.status}`);
        console.log(`   Provider: ${result.status.provider}`);
        this.testResults.push({ test: 'Storage Handler Init', result: 'PASS' });
      } else {
        this.logger.error('Initialization failed: ' + result.error);
        this.testResults.push({ test: 'Storage Handler Init', result: 'FAIL' });
      }

      storageHandler.destroy();

    } catch (err) {
      this.logger.error('Test failed: ' + err.message);
      this.testResults.push({ test: 'Storage Handler Init', result: 'FAIL' });
    }
  }

  async testHealthCheck() {
    console.log('\n❤️  Test 5: Health Check');
    console.log('-'.repeat(60));

    try {
      const storageHandler = new TeraboxStorageHandler({
        alistUrl: 'http://localhost:5244',
        alistUser: 'admin',
        alistPassword: process.env.ALIST_ADMIN_PASSWORD || 'admin123',
        logger: this.logger
      });

      const health = await storageHandler.healthCheck();

      if (health.healthy) {
        this.logger.success('Storage health check passed');
        console.log(`   Status: ${health.status.status}`);
        console.log(`   Provider: ${health.status.provider}`);
        this.testResults.push({ test: 'Health Check', result: 'PASS' });
      } else {
        this.logger.error('Health check failed: ' + health.error);
        this.testResults.push({ test: 'Health Check', result: 'FAIL' });
      }

      storageHandler.destroy();

    } catch (err) {
      this.logger.error('Test failed: ' + err.message);
      this.testResults.push({ test: 'Health Check', result: 'FAIL' });
    }
  }

  async testFileOperations() {
    console.log('\n📁 Test 6: File Operations (Mock)');
    console.log('-'.repeat(60));

    try {
      // Note: Actual file ops need Rclone binary installed
      // This test just verifies the handler is callable
      
      const storageHandler = new TeraboxStorageHandler({
        alistUrl: 'http://localhost:5244',
        alistUser: 'admin',
        alistPassword: process.env.ALIST_ADMIN_PASSWORD || 'admin123',
        logger: this.logger
      });

      const status = storageHandler.getStatus();
      console.log(`   Handler status: ${status.healthy ? 'Healthy' : 'Not healthy'}`);
      console.log(`   Ready to operate: ${status.readyToOperate ? 'Yes' : 'No'}`);

      this.logger.success('Storage Handler methods available');
      this.testResults.push({ test: 'File Operations', result: 'READY' });

      storageHandler.destroy();

    } catch (err) {
      this.logger.error('Test failed: ' + err.message);
      this.testResults.push({ test: 'File Operations', result: 'FAIL' });
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60) + '\n');

    console.log('📊 Results:\n');
    for (const result of this.testResults) {
      const icon = result.result === 'PASS' ? '✅' : 
                   result.result === 'READY' ? '⚙️ ' :
                   result.result === 'WARN' ? '⚠️ ' : '❌';
      console.log(`${icon} ${result.test}: ${result.result}`);
    }

    const passCount = this.testResults.filter(r => r.result === 'PASS').length;
    const totalCount = this.testResults.length;

    console.log(`\n📈 Total: ${passCount}/${totalCount} tests passed\n`);

    if (passCount === totalCount) {
      console.log('🎉 ALL TESTS PASSED - Setup is ready!\n');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests did not pass - review configuration\n');
      process.exit(1);
    }
  }
}

// Run tests
const tester = new TeraboxSetupTester();
tester.runAllTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
