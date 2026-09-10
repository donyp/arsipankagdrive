#!/usr/bin/env node
/**
 * Security Test: Verify Admin Endpoints Require Authentication
 * 
 * This script tests that all admin/debug endpoints properly reject
 * requests without valid authentication tokens.
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';

// Test cases: [method, endpoint, description]
const testCases = [
    ['POST', '/api/admin/fix-admin-zona-zona-id', 'Fix admin_zona users'],
    ['POST', '/api/admin/migrate-zona-codes', 'Migrate zona codes'],
    ['POST', '/api/admin/recreate-admin-zona-users', 'Recreate admin_zona users'],
    ['GET', '/api/debug/fix-sizes', 'Fix NULL sizes (debug endpoint)'],
];

async function testEndpoint(method, path) {
    return new Promise((resolve) => {
        const url = new URL(BASE_URL + path);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json',
                // Deliberately NOT sending any Authorization header
                // to test that endpoints require authentication
            },
            timeout: 5000,
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: parsed,
                        authenticated: res.statusCode !== 401 && res.statusCode !== 403,
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: data,
                        authenticated: res.statusCode !== 401 && res.statusCode !== 403,
                    });
                }
            });
        });

        req.on('error', (err) => {
            resolve({
                error: err.message,
                authenticated: false,
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                error: 'Request timeout',
                authenticated: false,
            });
        });

        req.end();
    });
}

async function runTests() {
    console.log('='.repeat(70));
    console.log('SECURITY TEST: Admin Endpoints Authentication Check');
    console.log('='.repeat(70));
    console.log('\nTesting that all admin/debug endpoints require authentication...\n');

    let passed = 0;
    let failed = 0;

    for (const [method, path, desc] of testCases) {
        process.stdout.write(`  Testing ${method} ${path}... `);
        
        const result = await testEndpoint(method, path);

        // We expect 401 (Unauthorized) or 403 (Forbidden) when no token is provided
        const isProtected = result.status === 401 || result.status === 403;
        const statusText = isProtected ? '✓' : '✗';
        const status = isProtected ? 'PASS' : 'FAIL';

        if (isProtected) {
            console.log(`${statusText} ${status} (${result.status})`);
            passed++;
        } else {
            console.log(`${statusText} ${status} (${result.status})`);
            console.log(`    Expected: 401 or 403, Got: ${result.status}`);
            failed++;
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(70));

    if (failed > 0) {
        console.error('\n❌ SECURITY FAILURE: Some endpoints are not protected!');
        process.exit(1);
    } else {
        console.log('\n✅ SECURITY SUCCESS: All admin/debug endpoints require authentication!');
        process.exit(0);
    }
}

// Run tests
runTests().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
