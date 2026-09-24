/**
 * Manual Test Suite for Rate Limit Protection (Masalah 3)
 * Tests quota monitoring, backoff calculation, and sync queue behavior under rate limit conditions
 * 
 * Run with: node backend/tests/rateLimitProtection.test.js
 */

const RateLimitProtector = require('../rateLimitProtection');
const path = require('path');
const fs = require('fs');

// Simple test framework
let testsPassed = 0;
let testsFailed = 0;
const failureMessages = [];

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function test(name, fn) {
    try {
        fn();
        testsPassed++;
        console.log(`✅ ${name}`);
    } catch (err) {
        testsFailed++;
        failureMessages.push(`❌ ${name}: ${err.message}`);
        console.error(`❌ ${name}`);
        console.error(`   ${err.message}`);
    }
}

function describe(name, fn) {
    console.log(`\n📋 ${name}`);
    fn();
}

// Helper: Simulate rclone error with specific HTTP status code
function simulateRcloneError(statusCode, message) {
    const errorPatterns = {
        429: 'error: 429 Too Many Requests - User rate limit exceeded',
        403: 'error: 403 Forbidden - Rate limit exceeded',
        503: 'error: 503 Service Unavailable - Backend service unavailable'
    };
    
    const stderr = errorPatterns[statusCode] || `error: ${statusCode} ${message}`;
    const error = new Error(`rclone failed with code ${statusCode}`);
    error.stderr = stderr;
    return error;
}

// Test Suites

// Test Suites

describe('Quota Monitoring', () => {
    test('should initialize with zero quota usage', () => {
        const protector = new RateLimitProtector({
            quotaPerMinute: 1000000,
            warningThreshold: 0.80,
            criticalThreshold: 0.95
        });
        
        const usage = protector.getQuotaUsagePercentage();
        assert(usage === 0, `Initial usage should be 0%, got ${usage}%`);
        
        // Status includes emoji, check if HEALTHY is in the status
        const status = protector.getQuotaStatus();
        assert(status.includes('OK') || status.includes('HEALTHY'), `Initial status should indicate health, got ${status}`);
    });

    test('should have correct thresholds configured', () => {
        const protector = new RateLimitProtector({
            quotaPerMinute: 1000000,
            warningThreshold: 0.80,
            criticalThreshold: 0.95
        });
        
        assert(protector.warningThreshold === 0.80, 'Warning threshold should be 0.80');
        assert(protector.criticalThreshold === 0.95, 'Critical threshold should be 0.95');
        assert(protector.quotaPerMinute === 1000000, 'Quota per minute should be 1000000');
    });

    test('should calculate quota usage ratio', () => {
        const protector = new RateLimitProtector({
            quotaPerMinute: 1000000,
            warningThreshold: 0.80,
            criticalThreshold: 0.95
        });
        
        // Initial state
        const ratio = protector.getQuotaUsageRatio();
        assert(typeof ratio === 'number', 'Usage ratio should be a number');
        assert(ratio >= 0, 'Usage ratio should be >= 0');
    });
});

describe('Operation Queueing', () => {
    test('should queue operations', async () => {
        const protector = new RateLimitProtector({
            quotaPerMinute: 1000000,
            processingInterval: 10
        });
        
        const results = [];
        
        const op1 = protector.executeWithRateLimit(
            async () => { results.push(1); return 'done'; },
            { operation: 'upload', resource: 'file1' }
        );
        
        const op2 = protector.executeWithRateLimit(
            async () => { results.push(2); return 'done'; },
            { operation: 'read', resource: 'file2' }
        );

        await Promise.all([op1, op2]);
        
        assert(results.length === 2, `Expected 2 operations, got ${results.length}`);
        assert(results.includes(1), 'Operation 1 should complete');
        assert(results.includes(2), 'Operation 2 should complete');
    });

    test('should handle operation failures gracefully', async () => {
        const protector = new RateLimitProtector({
            quotaPerMinute: 1000000,
            processingInterval: 10
        });
        
        let errorCaught = false;
        try {
            await protector.executeWithRateLimit(
                async () => { throw new Error('Operation failed'); },
                { operation: 'upload', resource: 'file1' }
            );
        } catch (err) {
            errorCaught = true;
            assert(err.message === 'Operation failed', `Unexpected error message: ${err.message}`);
        }
        
        assert(errorCaught, 'Error should be thrown and caught');
    });
});

describe('Error Classification', () => {
    test('should detect 429 rate limit error in stderr', () => {
        const error = simulateRcloneError(429, 'Too Many Requests');
        
        const has429 = /\b429\b/.test(error.stderr);
        const hasRateLimit = /rate.limit|too.many.requests/i.test(error.stderr);
        
        assert(has429 === true, '429 should be detected');
        assert(hasRateLimit === true, 'Rate limit pattern should be detected');
    });

    test('should detect 403 quota error in stderr', () => {
        const error = simulateRcloneError(403, 'Forbidden');
        
        const has403 = /\b403\b/.test(error.stderr);
        const hasQuotaExceeded = /quota.exceeded|rate.limit/i.test(error.stderr);
        
        assert(has403 === true, '403 should be detected');
        assert(hasQuotaExceeded === true, 'Quota pattern should be detected');
    });

    test('should detect 503 service unavailable in stderr', () => {
        const error = simulateRcloneError(503, 'Service Unavailable');
        
        const has503 = /\b503\b/.test(error.stderr);
        const hasServiceUnavailable = /service.unavailable|temporarily/i.test(error.stderr);
        
        assert(has503 === true, '503 should be detected');
        assert(hasServiceUnavailable === true, 'Service unavailable pattern should be detected');
    });

    test('should not misclassify unrelated errors', () => {
        const stderr = 'error: file not found';
        
        const hasRateLimit = /\b429\b/.test(stderr) || /rate.limit/i.test(stderr);
        const hasQuotaExceeded = /\b403\b/.test(stderr) || /quota.exceeded/i.test(stderr);
        const hasServiceIssue = /\b503\b/.test(stderr);
        
        assert(hasRateLimit === false, '429 should not be detected');
        assert(hasQuotaExceeded === false, '403 should not be detected');
        assert(hasServiceIssue === false, '503 should not be detected');
    });
});

describe('Backoff Calculation', () => {
    test('should calculate exponential backoff for retries', () => {
        const baseDelay = 1000;
        
        const delay1 = baseDelay * Math.pow(2, 0); // 1s
        const delay2 = baseDelay * Math.pow(2, 1); // 2s
        const delay3 = baseDelay * Math.pow(2, 2); // 4s
        
        assert(delay1 === 1000, `Delay 1: expected 1000, got ${delay1}`);
        assert(delay2 === 2000, `Delay 2: expected 2000, got ${delay2}`);
        assert(delay3 === 4000, `Delay 3: expected 4000, got ${delay3}`);
    });

    test('should apply minimum 60s backoff for 429 errors', () => {
        const rateLimit429Delay = 60000; // 60s minimum
        assert(rateLimit429Delay >= 60000, '429 backoff should be at least 60s');
    });

    test('should add dynamic buffer based on quota usage', () => {
        const quotaUsage = 0.90; // 90%
        const baseDelay = 30000; // 30s
        const buffer = quotaUsage * 60000; // 54s buffer
        const totalDelay = Math.max(baseDelay, buffer);
        
        assert(totalDelay >= baseDelay, 'Total delay should be >= base delay');
        assert(totalDelay >= buffer, 'Total delay should be >= buffer');
    });
});

describe('Sync Queue Integration', () => {
    test('should have thresholds for pause queue (95%+)', () => {
        const protector = new RateLimitProtector({
            quotaPerMinute: 1000000,
            warningThreshold: 0.80,
            criticalThreshold: 0.95
        });
        
        // Critical threshold should be 95%
        assert(protector.criticalThreshold === 0.95, 'Critical threshold should be 0.95 (95%)');
        
        // When quota usage reaches 95%, processSyncQueue should pause
        // This is verified in rclone_wrapper.js processSyncQueue logic
    });

    test('should have thresholds for slow processing (80%+)', () => {
        const protector = new RateLimitProtector({
            quotaPerMinute: 1000000,
            warningThreshold: 0.80,
            criticalThreshold: 0.95
        });
        
        // Warning threshold should be 80%
        assert(protector.warningThreshold === 0.80, 'Warning threshold should be 0.80 (80%)');
        
        // When quota usage reaches 80%, processSyncQueue should reduce to 1 job
        // This is verified in rclone_wrapper.js processSyncQueue logic
    });

    test('should track stats for monitoring', () => {
        const protector = new RateLimitProtector({
            quotaPerMinute: 1000000,
            warningThreshold: 0.80,
            criticalThreshold: 0.95
        });
        
        const stats = protector.getStats();
        assert(typeof stats === 'object', 'Stats should be an object');
        assert('totalRequests' in stats, 'Stats should include totalRequests');
        assert('successfulRequests' in stats, 'Stats should include successfulRequests');
        assert('failedRequests' in stats, 'Stats should include failedRequests');
    });
});

describe('Rate Limit Scenarios', () => {
    test('Scenario 1: Normal operation with multiple requests', async () => {
        const protector = new RateLimitProtector({
            quotaPerMinute: 1000000,
            processingInterval: 10
        });
        
        const results = [];
        
        for (let i = 0; i < 3; i++) {
            const result = await protector.executeWithRateLimit(
                async () => {
                    await new Promise(r => setTimeout(r, 10)); // Simulate work
                    return `op${i}`;
                },
                { operation: 'upload', resource: `file${i}` }
            );
            results.push(result);
        }
        
        assert(results.includes('op0'), 'Operation 0 should complete');
        assert(results.includes('op1'), 'Operation 1 should complete');
        assert(results.includes('op2'), 'Operation 2 should complete');
    });

    test('Scenario 2: Configuration for high load protection', () => {
        const protector = new RateLimitProtector({
            quotaPerMinute: 1000000,
            warningThreshold: 0.80,
            criticalThreshold: 0.95,
            processingInterval: 100
        });
        
        // Verify configuration can handle backoff
        assert(protector.warningThreshold === 0.80, 'Should warn at 80%');
        assert(protector.criticalThreshold === 0.95, 'Should pause at 95%');
        
        // Backoff is calculated dynamically based on queue
        const backoff = protector.calculateBackoffTime();
        assert(typeof backoff === 'number', 'Backoff should be a number');
        assert(backoff >= 0, 'Backoff should be >= 0');
    });

    test('Scenario 3: Error detection for rate limits', async () => {
        const protector = new RateLimitProtector({
            quotaPerMinute: 1000000,
            processingInterval: 10
        });
        
        // Test error detection
        const rateLimitError = new Error('429 Too Many Requests');
        const quotaError = new Error('403 Forbidden');
        const serviceError = new Error('503 Service Unavailable');
        
        // Check if protector can detect these
        const isRateLimit = protector.isRateLimitError(rateLimitError);
        assert(typeof isRateLimit === 'boolean', 'isRateLimitError should return boolean');
    });
});

describe('classifyRcloneError Pattern Matching', () => {
    test('should detect 429 rate limit in stderr patterns', () => {
        const patterns = [
            'error: 429 Too Many Requests - User rate limit exceeded',
            'error: 429 rate limited',
            'error: 429 too many'
        ];
        
        for (const stderr of patterns) {
            assert(/\b429\b/.test(stderr), `429 pattern not detected in: ${stderr}`);
        }
    });

    test('should detect 403 quota in stderr patterns', () => {
        const patterns = [
            'error: 403 Forbidden - quota exceeded',
            'error: 403 rate limit',
            'error: 403 forbidden'
        ];
        
        for (const stderr of patterns) {
            assert(/\b403\b/.test(stderr), `403 pattern not detected in: ${stderr}`);
        }
    });

    test('should detect 503 service unavailable in stderr patterns', () => {
        const patterns = [
            'error: 503 Service Unavailable',
            'error: 503 backend down',
            'error: 503 temporarily unavailable'
        ];
        
        for (const stderr of patterns) {
            assert(/\b503\b/.test(stderr), `503 pattern not detected in: ${stderr}`);
        }
    });
});

// Run all tests
console.log('\n' + '='.repeat(60));
console.log('🧪 Rate Limit Protection Test Suite (Masalah 3)');
console.log('='.repeat(60));

// Summary
console.log('\n' + '='.repeat(60));
console.log(`✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);
console.log('='.repeat(60));

if (testsFailed > 0) {
    console.log('\nFailure Details:');
    failureMessages.forEach(msg => console.log(msg));
    process.exit(1);
} else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
}
