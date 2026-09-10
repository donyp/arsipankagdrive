#!/usr/bin/env node
/**
 * Security Test: Verify Rate Limiting Works
 * 
 * This script tests that rate limiting is properly configured
 * on login and share token endpoints.
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';

async function makeRequest(method, path, body = null) {
    return new Promise((resolve) => {
        const url = new URL(BASE_URL + path);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json',
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
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: data,
                    });
                }
            });
        });

        req.on('error', (err) => {
            resolve({
                error: err.message,
                status: 0,
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                error: 'Request timeout',
                status: 0,
            });
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function testLoginRateLimit() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 1: Login Rate Limiting (5 attempts per 15 minutes)');
    console.log('='.repeat(70));

    let passed = 0;
    let failed = 0;

    for (let i = 1; i <= 6; i++) {
        process.stdout.write(`  Attempt ${i}/6... `);
        
        const result = await makeRequest('POST', '/api/auth/login', {
            email: 'test@example.com',
            password: 'wrongpassword'
        });

        if (i <= 5) {
            // First 5 requests should fail with 401 (Unauthorized) due to wrong credentials
            if (result.status === 401) {
                console.log('✓ PASS (401 - Wrong credentials)');
                passed++;
            } else {
                console.log(`✗ FAIL (Expected 401, got ${result.status})`);
                failed++;
            }
        } else {
            // 6th request should fail with 429 (Too Many Requests) due to rate limiting
            if (result.status === 429) {
                console.log('✓ PASS (429 - Rate limited)');
                passed++;
                console.log(`      Message: ${result.body.error}`);
            } else {
                console.log(`✗ FAIL (Expected 429, got ${result.status})`);
                failed++;
            }
        }
    }

    console.log(`\n  Results: ${passed} passed, ${failed} failed`);
    return failed === 0;
}

async function testShareRateLimit() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST 2: Share Token Rate Limiting (10 attempts per 1 minute)');
    console.log('='.repeat(70));

    let passed = 0;
    let failed = 0;

    for (let i = 1; i <= 11; i++) {
        process.stdout.write(`  Attempt ${i}/11... `);
        
        const result = await makeRequest('GET', '/api/share/invalid-token-test');

        if (i <= 10) {
            // First 10 requests should fail with 404 (Not Found) - token doesn't exist
            if (result.status === 404 || result.status === 200) {
                console.log(`✓ PASS (${result.status} - Token check)`);
                passed++;
            } else {
                console.log(`✗ FAIL (Expected 404/200, got ${result.status})`);
                failed++;
            }
        } else {
            // 11th request should fail with 429 (Too Many Requests) due to rate limiting
            if (result.status === 429) {
                console.log('✓ PASS (429 - Rate limited)');
                passed++;
                console.log(`      Message: ${result.body.error}`);
            } else {
                console.log(`✗ FAIL (Expected 429, got ${result.status})`);
                failed++;
            }
        }
    }

    console.log(`\n  Results: ${passed} passed, ${failed} failed`);
    return failed === 0;
}

async function runTests() {
    console.log('='.repeat(70));
    console.log('SECURITY TEST: Rate Limiting Check');
    console.log('='.repeat(70));

    const test1Pass = await testLoginRateLimit();
    const test2Pass = await testShareRateLimit();

    console.log('\n' + '='.repeat(70));
    if (test1Pass && test2Pass) {
        console.log('✅ ALL TESTS PASSED: Rate limiting is working!');
        console.log('='.repeat(70));
        process.exit(0);
    } else {
        console.error('❌ SOME TESTS FAILED: Check rate limiting configuration');
        console.log('='.repeat(70));
        process.exit(1);
    }
}

// Run tests
runTests().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
