# Security Policy - Pusat Arsip Anka

## Overview
This document outlines the security practices and vulnerability remediation status for Pusat Arsip Anka.

**Last Updated:** September 1, 2026  
**Security Status:** Phase 1 Critical Fixes In Progress

---

## Critical Security Fixes - Phase 1

### 1. ✅ FIXED: Hardcoded Secrets Exposure

**Vulnerability:** Supabase keys, JWT secrets, and API tokens were hardcoded in `backend/.env` and committed to version control.

**Risk Level:** 🔴 CRITICAL  
**Impact:** 
- Complete database breach via Supabase service role key
- Session hijacking via JWT/session secrets
- Unauthorized access to Fonnte messaging service
- All authentication systems compromised

**Files Affected:**
- `backend/.env` (All lines with SUPABASE_*, JWT_*, SESSION_*, FONNTE_*)

**Remediation Applied:**

1. **Cleared all secrets from `.env`** - All sensitive values removed
2. **Created `.env.example`** - Template with placeholder values for reference
3. **Configured `.gitignore`** - Already includes `.env` and `backend/.env` (verified)
4. **Documentation** - Added instructions for generating new secrets

**How to Apply This Fix:**

```bash
# 1. Generate new JWT_SECRET (256-bit hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Generate new SESSION_SECRET (256-bit base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 3. Copy template and fill in your values
cp backend/.env.example backend/.env

# 4. Fill in actual secrets from your services:
# - SUPABASE_URL from Supabase dashboard
# - SUPABASE_SERVICE_ROLE_KEY from Supabase API keys
# - JWT_SECRET with generated value
# - SESSION_SECRET with generated value
# - FONNTE_TOKEN from Fonnte dashboard

# 5. For production deployment, set environment variables instead:
# Heroku: heroku config:set JWT_SECRET="..."
# Railway: Set in project settings
# Hugging Face Spaces: Set in app.yaml or UI
# Google Cloud Run: Set in Cloud Run service configuration
```

**Verification:**
```bash
# Verify .env is properly ignored
git status  # Should NOT show backend/.env
git check-ignore backend/.env  # Should return backend/.env

# Never commit .env to git
git log --oneline backend/.env  # Should be empty after fix
```

**Prevention Going Forward:**
- ✅ `.env` already in `.gitignore`
- ✅ Use `.env.example` for team reference
- ✅ Set production secrets via platform-specific environment variables
- ✅ Run `npm install` → installs `dotenv` for local development only
- ✅ CI/CD pipelines must set env vars, never read from `.env`

---

## Pending Critical Fixes - Phase 1

### 2. ✅ FIXED: Unprotected Admin Endpoints

**Vulnerability:** `/api/admin/*` endpoints and `/api/debug/*` routes had NO authentication checks.

**Risk Level:** 🔴 CRITICAL  
**Impact:**
- Complete admin access without credentials
- Can modify user data, delete invoices, change permissions
- Can access debug endpoints to leak system information
- Total system compromise

**Files Affected:**
- `backend/server.js` Lines 3326, 3382, 3453, 4029

**Endpoints Protected:**
```
POST /api/admin/fix-admin-zona-zona-id           [✅ NOW PROTECTED]
POST /api/admin/migrate-zona-codes               [✅ NOW PROTECTED]
POST /api/admin/recreate-admin-zona-users        [✅ NOW PROTECTED]
GET /api/debug/fix-sizes                         [✅ NOW PROTECTED]
```

**Remediation Applied:**

Added `authenticateToken, authorizeRole('super_admin')` middleware to all 4 unprotected endpoints:

1. **Line 3326:** `/api/admin/fix-admin-zona-zona-id`
2. **Line 3382:** `/api/admin/migrate-zona-codes`
3. **Line 3453:** `/api/admin/recreate-admin-zona-users`
4. **Line 4029:** `/api/debug/fix-sizes`

**Code Change:**
```javascript
// Before (VULNERABLE):
app.post('/api/admin/fix-admin-zona-zona-id', async (req, res) => {

// After (PROTECTED):
app.post('/api/admin/fix-admin-zona-zona-id', authenticateToken, authorizeRole('super_admin'), async (req, res) => {
```

**How Authorization Works:**

- `authenticateToken` middleware:
  - Validates JWT token from `Authorization: Bearer <token>` header
  - Extracts user ID, role, and permissions from token
  - Returns 401 if token is missing or invalid
  - Returns 403 if token is expired

- `authorizeRole('super_admin')` middleware:
  - Checks if authenticated user's role matches allowed roles
  - Returns 403 if user role is not in allowed list
  - Only `super_admin` users can access these endpoints

**Verification:**
```bash
# Test that endpoint rejects unauthenticated requests:
curl -X POST http://localhost:5000/api/admin/fix-admin-zona-zona-id
# Expected: 401 - Token tidak ditemukan. Silakan login.

# Test that endpoint works with valid super_admin token:
curl -H "Authorization: Bearer <valid_super_admin_token>" \
  -X POST http://localhost:5000/api/admin/fix-admin-zona-zona-id
# Expected: 200 - Success with data

# Run automated test suite:
node backend/test-admin-endpoints-auth.js
```

**Status:** ✅ FIXED

---

### 3. ✅ FIXED: No Rate Limiting on Login

**Vulnerability:** `/api/auth/login` allowed unlimited brute force attempts.

**Risk Level:** 🔴 CRITICAL  
**Impact:**
- Attackers can test millions of password combinations
- Accounts easily compromised via brute force
- No protection against credential stuffing attacks
- Share tokens also vulnerable to enumeration attacks

**Files Affected:**
- `backend/server.js` - Added rate limiting middleware (lines 90-137)
- `package.json` - Added `express-rate-limit` dependency

**Endpoints Protected:**
```
POST /api/auth/login                       [✅ 5 attempts per 15 minutes]
GET  /api/share/:token                     [✅ 10 attempts per 1 minute]
GET  /api/share/:token/download            [✅ 10 attempts per 1 minute]
```

**Remediation Applied:**

1. **Installed `express-rate-limit` package** - Industry-standard rate limiting library
2. **Created `loginLimiter` middleware:**
   - 5 login attempts per 15 minutes per IP address
   - Returns 429 status code (Too Many Requests)
   - Logs brute force attempts for security monitoring
   - Skips localhost (127.0.0.1, ::1) for development
3. **Created `shareLimiter` middleware:**
   - 10 share token access attempts per 1 minute per IP
   - Prevents token enumeration attacks
   - Returns 429 status code
4. **Applied middlewares to vulnerable endpoints**

**Code Changes:**

```javascript
// Added require at line 4
const rateLimit = require('express-rate-limit');

// Added loginLimiter configuration (lines 90-117)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,                     // max 5 requests
    skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1', // Skip localhost
    // ... logging and error handling
});

// Added shareLimiter configuration (lines 119-137)
const shareLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,   // 1 minute
    max: 10,                    // max 10 requests
    // ... logging and error handling
});

// Applied to endpoints
app.post('/api/auth/login', loginLimiter, async (req, res) => { ... }
app.get('/api/share/:token', shareLimiter, async (req, res) => { ... }
app.get('/api/share/:token/download', shareLimiter, async (req, res) => { ... }
```

**How It Works:**

When an IP address exceeds the rate limit:
1. Request is rejected with HTTP 429 (Too Many Requests)
2. Response body includes error message:
   ```json
   {
     "error": "Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit."
   }
   ```
3. Rate-Limit headers sent to client showing remaining attempts
4. Brute force attempt is logged with IP, email, and timestamp

**Testing Rate Limiting:**

```bash
# Test login rate limiting - make 6 requests rapidly
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
# Request 6 returns: 429 Too Many Requests

# Test share token rate limiting - make 11 requests rapidly
for i in {1..11}; do
  curl http://localhost:5000/api/share/invalid-token
done
# Request 11 returns: 429 Too Many Requests
```

**Configuration Notes:**

- **localhost bypass:** Development is not rate-limited (faster testing)
- **Production:** Remove localhost bypass or set different limits per environment
- **Adjustable:** Change `windowMs` and `max` values to adjust rate limits
- **Per-IP:** Rate limits are per IP address (respects proxies with `trust proxy`)

**Status:** ✅ FIXED

---

## Vulnerability Summary

### CRITICAL (3 findings)
| # | Finding | Status | File | Line |
|---|---------|--------|------|------|
| 1 | Hardcoded Secrets | ✅ FIXED | backend/.env | All |
| 2 | Unprotected Admin Endpoints | ✅ FIXED | backend/server.js | 3326, 3382, 3453, 4029 |
| 3 | No Rate Limiting (Login) | ✅ FIXED | backend/server.js | 90-137, 740, 1632, 1712 |

### HIGH (4 findings)
| # | Finding | Status | File | Line |
|---|---------|--------|------|------|
| 4 | CORS Too Permissive | ⏳ QUEUED | backend/server.js | 85 |
| 5 | Tokens in Query Params | ⏳ QUEUED | backend/server.js | 473, 4764 |
| 6 | Missing Security Headers | ⏳ QUEUED | backend/server.js | 127+ |
| 7 | JWT in localStorage | ⏳ QUEUED | js/auth.js | 106-113 |

### MEDIUM (6 findings)
| # | Finding | Status | File | Line |
|---|---------|--------|------|------|
| 8 | Weak Session IDs | ⏳ QUEUED | backend/server.js | 734-751 |
| 9 | Missing Audit Logs | ⏳ QUEUED | backend/server.js | 1294, 1400 |
| 10 | Weak Input Validation | ⏳ QUEUED | backend/server.js | 1296 |
| 11 | Share Token Brute Force | ⏳ QUEUED | backend/server.js | 1649-1702 |
| 12 | No Password Policy | ⏳ QUEUED | backend/server.js | 705-810 |
| 13 | Outdated Dependencies | ⏳ QUEUED | package.json | All |

### CLEAN (5 categories - No vulnerabilities)
- ✅ SQL Injection: Using Supabase parameterized queries only
- ✅ NoSQL Injection: No direct database access
- ✅ Command Injection: Only pdf-parse/rclone binary spawn, no user input
- ✅ Explicit XSS: Template interpolation only, no innerHTML with user data
- ✅ Severe IDOR: Zone access checks present

---

## Environment Variable Setup

### Local Development
```bash
# 1. Create .env from template
cp backend/.env.example backend/.env

# 2. Generate secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"

# 3. Fill in values in backend/.env
# 4. Add .env to .gitignore (already done)
# 5. Start development
npm run dev
```

### Production (Heroku)
```bash
heroku login
heroku config:set SUPABASE_URL="https://..."
heroku config:set SUPABASE_SERVICE_ROLE_KEY="eyJ..."
heroku config:set JWT_SECRET="..." 
heroku config:set SESSION_SECRET="..."
heroku config:set FONNTE_TOKEN="..."
heroku config:set NODE_ENV="production"
heroku config:set PORT="5000"
```

### Production (Railway)
Use Railway UI → Variables → Add each secret

### Production (Google Cloud Run)
```bash
gcloud run deploy pusat-arsip-anka \
  --set-env-vars "SUPABASE_URL=...,JWT_SECRET=...,SESSION_SECRET=..." \
  --region us-central1
```

### Production (Hugging Face Spaces)
Create `app.yaml`:
```yaml
app_port: 5000
sdk: docker
env:
  - name: JWT_SECRET
    default: changeme
  - name: SESSION_SECRET
    default: changeme
```

---

## Security Checklist - Pre-Launch

- [ ] Phase 1 Fixes Applied
  - [ ] All secrets cleared from `.env`
  - [ ] Admin endpoints protected with auth + authorization
  - [ ] Rate limiting on login endpoint
- [ ] Phase 2 Fixes Applied
  - [ ] CORS restricted to specific origins
  - [ ] Tokens removed from query parameters
  - [ ] Security headers added
  - [ ] JWT moved to HttpOnly cookies
- [ ] Phase 3 Fixes Applied
  - [ ] Session IDs cryptographically random
  - [ ] Audit logging for sensitive operations
  - [ ] Input validation/sanitization implemented
  - [ ] Share token rate limiting added
  - [ ] Password policy enforced
  - [ ] Dependencies updated
- [ ] Verification
  - [ ] All tests passing
  - [ ] No hardcoded secrets in code
  - [ ] No secrets in git history
  - [ ] .env properly ignored by git
  - [ ] Environment variables set in production

---

## Reporting Security Issues

If you discover a security vulnerability, please email security@arsipanka.id with:
1. Description of vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested remediation

Do NOT create public GitHub issues for security vulnerabilities.

---

## References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Supabase Security Documentation](https://supabase.com/docs/guides/platform/security)
