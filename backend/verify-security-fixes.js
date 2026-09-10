#!/usr/bin/env node
/**
 * Comprehensive Security Fix Verification
 * 
 * This script verifies that all 3 CRITICAL security fixes are properly applied:
 * 1. Hardcoded secrets removed from .env
 * 2. Admin endpoints protected with authentication
 * 3. Rate limiting applied to login and share endpoints
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('SECURITY FIX VERIFICATION - PHASE 1 CRITICAL FIXES');
console.log('='.repeat(80));

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function checkItem(name, passed, details = '') {
    totalChecks++;
    const status = passed ? '✓' : '✗';
    const result = passed ? 'PASS' : 'FAIL';
    console.log(`  [${status}] ${result}: ${name}`);
    if (details) {
        console.log(`        ${details}`);
    }
    if (passed) {
        passedChecks++;
    } else {
        failedChecks++;
    }
    return passed;
}

// ============================================================================
// CHECK 1: Hardcoded Secrets Removed
// ============================================================================
console.log('\n[CHECK 1] Hardcoded Secrets Removed from .env');
console.log('-'.repeat(80));

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Check that secrets are NOT in .env file
const hasSupabaseUrl = envContent.includes('https://') && envContent.includes('supabase.co');
const hasServiceKey = envContent.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
const hasJWTSecret = envContent.includes('12d3f1aa32abfc3ff4c19da3ad692a898bc7163bc38dbdeec715e24b295b00d5');
const hasFontneToken = envContent.includes('t7YZdAN9Ec9EHE2WCJSx');

checkItem('SUPABASE_URL is empty', !hasSupabaseUrl, 'No hardcoded Supabase URL found');
checkItem('SUPABASE_SERVICE_ROLE_KEY is empty', !hasServiceKey, 'No hardcoded service key found');
checkItem('JWT_SECRET is empty', !hasJWTSecret, 'No hardcoded JWT secret found');
checkItem('FONNTE_TOKEN is empty', !hasFontneToken, 'No hardcoded Fonnte token found');

// Check that .env.example exists
const envExamplePath = path.join(__dirname, '.env.example');
const envExampleExists = fs.existsSync(envExamplePath);
checkItem('.env.example template exists', envExampleExists, 'Template file created for reference');

// Check .gitignore includes .env
const gitignorePath = path.join(__dirname, '..', '.gitignore');
const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
const ignoresEnv = gitignoreContent.includes('backend/.env');
checkItem('.gitignore includes backend/.env', ignoresEnv, '.env properly ignored from git');

// ============================================================================
// CHECK 2: Admin Endpoints Protected
// ============================================================================
console.log('\n[CHECK 2] Admin Endpoints Protected with Authentication');
console.log('-'.repeat(80));

const serverPath = path.join(__dirname, 'server.js');
const serverContent = fs.readFileSync(serverPath, 'utf8');

// Check that admin endpoints have authenticateToken and authorizeRole
const endpoints = [
    { name: '/api/admin/fix-admin-zona-zona-id', pattern: "app\\.post\\('/api/admin/fix-admin-zona-zona-id',\\s*authenticateToken,\\s*authorizeRole" },
    { name: '/api/admin/migrate-zona-codes', pattern: "app\\.post\\('/api/admin/migrate-zona-codes',\\s*authenticateToken,\\s*authorizeRole" },
    { name: '/api/admin/recreate-admin-zona-users', pattern: "app\\.post\\('/api/admin/recreate-admin-zona-users',\\s*authenticateToken,\\s*authorizeRole" },
    { name: '/api/debug/fix-sizes', pattern: "app\\.get\\('/api/debug/fix-sizes',\\s*authenticateToken,\\s*authorizeRole" },
];

endpoints.forEach(endpoint => {
    const regex = new RegExp(endpoint.pattern, 'm');
    const isProtected = regex.test(serverContent);
    checkItem(`${endpoint.name} protected`, isProtected, 'Has authenticateToken + authorizeRole middleware');
});

// Check that authenticateToken middleware exists
const hasAuthenticateToken = /function authenticateToken\(/.test(serverContent);
checkItem('authenticateToken middleware exists', hasAuthenticateToken, 'JWT validation middleware found');

// Check that authorizeRole middleware exists
const hasAuthorizeRole = /function authorizeRole\(/.test(serverContent);
checkItem('authorizeRole middleware exists', hasAuthorizeRole, 'RBAC authorization middleware found');

// ============================================================================
// CHECK 3: Rate Limiting Applied
// ============================================================================
console.log('\n[CHECK 3] Rate Limiting Applied to Endpoints');
console.log('-'.repeat(80));

// Check that express-rate-limit is imported
const hasRateLimitImport = /const rateLimit = require\('express-rate-limit'\)/.test(serverContent);
checkItem('express-rate-limit imported', hasRateLimitImport, 'Rate limiting library loaded');

// Check that loginLimiter is defined
const hasLoginLimiter = /const loginLimiter = rateLimit\({/.test(serverContent);
checkItem('loginLimiter middleware defined', hasLoginLimiter, 'Login rate limiter configured');

// Check that shareLimiter is defined
const hasShareLimiter = /const shareLimiter = rateLimit\({/.test(serverContent);
checkItem('shareLimiter middleware defined', hasShareLimiter, 'Share token rate limiter configured');

// Check that loginLimiter is applied to /api/auth/login
const loginLimiterApplied = /app\.post\('\/api\/auth\/login',\s*loginLimiter/.test(serverContent);
checkItem('loginLimiter applied to /api/auth/login', loginLimiterApplied, 'Login endpoint rate limited');

// Check that shareLimiter is applied to /api/share/:token
const shareLimiterApplied1 = /app\.get\('\/api\/share\/:token',\s*shareLimiter/.test(serverContent);
checkItem('shareLimiter applied to /api/share/:token', shareLimiterApplied1, 'Share access rate limited');

// Check that shareLimiter is applied to /api/share/:token/download
const shareLimiterApplied2 = /app\.get\('\/api\/share\/:token\/download',\s*shareLimiter/.test(serverContent);
checkItem('shareLimiter applied to /api/share/:token/download', shareLimiterApplied2, 'Share download rate limited');

// ============================================================================
// CHECK 4: Package Dependencies
// ============================================================================
console.log('\n[CHECK 4] Package Dependencies Updated');
console.log('-'.repeat(80));

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const hasRateLimitDep = !!packageJson.dependencies['express-rate-limit'];
checkItem('express-rate-limit added to package.json', hasRateLimitDep, 'Dependency version: ' + packageJson.dependencies['express-rate-limit']);

// ============================================================================
// CHECK 5: Test Files Created
// ============================================================================
console.log('\n[CHECK 5] Security Test Files Created');
console.log('-'.repeat(80));

const adminTestPath = path.join(__dirname, 'test-admin-endpoints-auth.js');
const adminTestExists = fs.existsSync(adminTestPath);
checkItem('test-admin-endpoints-auth.js created', adminTestExists, 'Test suite for admin endpoint authentication');

const rateLimitTestPath = path.join(__dirname, 'test-rate-limiting.js');
const rateLimitTestExists = fs.existsSync(rateLimitTestPath);
checkItem('test-rate-limiting.js created', rateLimitTestExists, 'Test suite for rate limiting');

// ============================================================================
// CHECK 6: Documentation
// ============================================================================
console.log('\n[CHECK 6] Security Documentation');
console.log('-'.repeat(80));

const securityDocPath = path.join(__dirname, '..', 'SECURITY.md');
const securityDocExists = fs.existsSync(securityDocPath);
checkItem('SECURITY.md created', securityDocExists, 'Comprehensive security documentation');

if (securityDocExists) {
    const securityDoc = fs.readFileSync(securityDocPath, 'utf8');
    const hasPhase1Fixes = securityDoc.includes('Phase 1 Critical Fixes');
    checkItem('SECURITY.md includes Phase 1 fixes', hasPhase1Fixes, 'Documentation updated with fix details');
}

// ============================================================================
// FINAL RESULTS
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(80));

console.log(`  Total Checks: ${totalChecks}`);
console.log(`  Passed: ${passedChecks}`);
console.log(`  Failed: ${failedChecks}`);

if (failedChecks === 0) {
    console.log('\n✅ ALL SECURITY FIXES VERIFIED SUCCESSFULLY!');
    console.log('   Phase 1 Critical fixes are properly implemented.');
    console.log('   Ready for testing and deployment.');
    process.exit(0);
} else {
    console.error(`\n❌ ${failedChecks} CHECK(S) FAILED!`);
    console.error('   Please review the failed checks above.');
    process.exit(1);
}
