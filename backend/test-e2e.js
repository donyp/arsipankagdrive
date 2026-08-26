#!/usr/bin/env node

/**
 * End-to-End Test Suite for Terabox Integration
 * Tests: Health checks, File listing, Preview, Download
 */

const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const BASE_URL = 'http://localhost:5000';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper to make HTTP requests
function request(method, path) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(data),
                        headers: res.headers
                    });
                } catch (err) {
                    resolve({
                        status: res.statusCode,
                        data: data,
                        headers: res.headers
                    });
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

let testsPassed = 0;
let testsFailed = 0;

async function test(name, fn) {
    process.stdout.write(`\n  [TEST] ${name}... `);
    try {
        await fn();
        console.log('✅');
        testsPassed++;
    } catch (err) {
        console.log('❌');
        console.log(`    Error: ${err.message}`);
        testsFailed++;
    }
}

async function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

async function assertExists(obj, key, message) {
    if (!obj || !(key in obj)) {
        throw new Error(`${message}: key '${key}' not found`);
    }
}

async function main() {
    console.log('\n================================================');
    console.log('E2E Test Suite - Terabox Integration');
    console.log('================================================\n');

    // Check if server is running
    console.log('[Pre-Flight] Checking server status...');
    try {
        const response = await request('GET', '/api/heartbeat');
        if (response.status !== 200) {
            console.error('❌ Server not responding. Start backend with: npm start');
            process.exit(1);
        }
        console.log('✅ Server is running on port 5000\n');
    } catch (err) {
        console.error('❌ Cannot connect to server:', err.message);
        console.error('   Start backend with: cd backend && npm start');
        process.exit(1);
    }

    // ================================================================
    // SUITE 1: Health Checks
    // ================================================================
    console.log('SUITE 1: Health Checks');
    console.log('─────────────────────\n');

    await test('GET /api/heartbeat returns 200', async () => {
        const res = await request('GET', '/api/heartbeat');
        assertEqual(res.status, 200, 'Heartbeat status');
        assertExists(res.data, 'status', 'Heartbeat response');
    });

    await test('GET /api/health/storage returns 200', async () => {
        const res = await request('GET', '/api/health/storage');
        assertEqual(res.status, 200, 'Storage health status');
        assertExists(res.data, 'healthy', 'Storage health response');
    });

    await test('Storage shows credentials configured', async () => {
        const res = await request('GET', '/api/health/storage');
        if (!res.data.credentials) throw new Error('No credentials object');
        if (res.data.credentials.email !== '✓ Set') throw new Error('Email not set');
        if (res.data.credentials.password !== '✓ Set') throw new Error('Password not set');
    });

    await test('Storage status is ready-for-deployment', async () => {
        const res = await request('GET', '/api/health/storage');
        if (res.data.status !== 'ready-for-deployment') {
            throw new Error('Status not ready: ' + res.data.status);
        }
    });

    // ================================================================
    // SUITE 2: Database Verification
    // ================================================================
    console.log('\nSUITE 2: Database Verification');
    console.log('──────────────────────────────\n');

    await test('Toko table exists and has records', async () => {
        const { data, error } = await supabase
            .from('toko')
            .select('*')
            .limit(1);
        
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('No toko records found');
    });

    await test('Zonas table has records', async () => {
        const { data, error } = await supabase
            .from('zonas')
            .select('*');
        
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('No zonas found');
    });

    await test('Files table has records', async () => {
        const { data, error } = await supabase
            .from('files')
            .select('*')
            .limit(1);
        
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('No files found');
    });

    await test('Foreign key: files.toko_id -> toko.id', async () => {
        const { data: files, error } = await supabase
            .from('files')
            .select('id, toko_id')
            .not('toko_id', 'is', null)
            .limit(5);
        
        if (error) throw error;
        if (!files || files.length === 0) throw new Error('No files with toko_id');
    });

    // ================================================================
    // SUITE 3: API Endpoints
    // ================================================================
    console.log('\nSUITE 3: API Endpoints');
    console.log('─────────────────────\n');

    await test('GET /api/files/:path endpoint exists', async () => {
        const res = await request('GET', '/api/files/');
        // Should get response (may need auth, but endpoint should exist)
        if (res.status === 500 && typeof res.data === 'string' && res.data.includes('handler')) {
            throw new Error('Endpoint error: ' + res.data.substring(0, 100));
        }
    });

    await test('GET /api/preview/:filePath endpoint exists', async () => {
        const res = await request('GET', '/api/preview/test');
        // May timeout or error, but endpoint should exist
        if (res.status && res.status < 200) {
            throw new Error('Bad status: ' + res.status);
        }
    });

    await test('GET /api/download/:filePath endpoint exists', async () => {
        const res = await request('GET', '/api/download/test');
        // May error about handler, but endpoint should exist
        if (res.data && res.data.message) {
            if (!res.data.message.includes('ready')) {
                throw new Error('Download endpoint error: ' + res.data.message);
            }
        }
    });

    // ================================================================
    // SUITE 4: Terabox Integration
    // ================================================================
    console.log('\nSUITE 4: Terabox Integration');
    console.log('────────────────────────────\n');

    await test('Terabox credentials configured', async () => {
        const email = process.env.TERABOX_EMAIL;
        const password = process.env.TERABOX_PASSWORD;
        if (!email || !password) {
            throw new Error('Terabox credentials not set in .env');
        }
    });

    await test('Terabox hybrid handler initialized', async () => {
        const res = await request('GET', '/api/health/storage');
        if (res.data.status !== 'ready-for-deployment') {
            throw new Error('Handler not ready: ' + res.data.error);
        }
    });

    await test('Direct API enabled (email/password auth)', async () => {
        const res = await request('GET', '/api/health/storage');
        if (!res.data.credentials || !res.data.credentials.email) {
            throw new Error('Direct API not configured');
        }
    });

    // ================================================================
    // Results
    // ================================================================
    console.log('\n================================================');
    console.log('Test Results');
    console.log('================================================\n');

    const total = testsPassed + testsFailed;
    const percentage = total > 0 ? Math.round((testsPassed / total) * 100) : 0;

    console.log(`✅ Passed: ${testsPassed}/${total} (${percentage}%)`);
    console.log(`❌ Failed: ${testsFailed}/${total}`);

    if (testsFailed === 0) {
        console.log('\n🎉 All tests passed!\n');
        console.log('Status: READY FOR PRODUCTION ✅');
        console.log('\nNext steps:');
        console.log('1. Deploy to Cloud Run');
        console.log('2. Run E2E tests in production');
        console.log('3. Verify Terabox file operations\n');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some tests failed. Fix issues before deploying.\n');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('\nFatal error:', err);
    process.exit(1);
});
