# Multi-Domain Fix: CORS Configuration

## Problem
Login failed on custom domain `https://arsipdigitalanka.my.id` while working on `https://arsipankagdrive-production.up.railway.app`

Network log showed:
```
Request URL: http://localhost:5000/api/auth/login
Referrer Policy: strict-origin-when-cross-origin
```

Root cause: Aplikasi masih hardcoded ke `http://localhost:5000` ketika diakses dari custom domain.

## Solution Implemented

### 1. Frontend: `js/config.js`
**Before:** Only detected `railway` or `replit` hostname
```javascript
API_URL: (typeof window !== 'undefined' && (window.location.hostname.includes('railway') || window.location.hostname.includes('replit'))) 
    ? '' 
    : 'http://localhost:5000'
```

**After:** Now detects ANY non-localhost hostname as production
```javascript
API_URL: (typeof window !== 'undefined' && !window.location.hostname.match(/^(localhost|127\.0\.0\.1)$/)) 
    ? '' 
    : 'http://localhost:5000'
```

**Logic:**
- If hostname is `localhost` or `127.0.0.1` → use `http://localhost:5000` (development)
- If hostname is ANYTHING else (Railway, custom domain, etc) → use empty string for relative URL (production)

### 2. Backend: `backend/.env`
**Before:**
```env
ALLOWED_ORIGINS=http://localhost:3000,https://arsipankagdrive-production.up.railway.app
```

**After:**
```env
ALLOWED_ORIGINS=http://localhost:3000,https://arsipankagdrive-production.up.railway.app,https://arsipdigitalanka.my.id
```

## CORS Flow
1. Frontend makes API request from `https://arsipdigitalanka.my.id`
2. Browser sends `Origin: https://arsipdigitalanka.my.id` header
3. Backend `getAllowedOrigins()` function checks if origin is in ALLOWED_ORIGINS
4. If allowed → request succeeds with CORS headers
5. If not allowed → CORS error (blocked by browser)

## Changes Made
- ✅ `js/config.js` - Updated API_URL detection logic (commit: 6b8c65a)
- ✅ `backend/.env` - Added custom domain to ALLOWED_ORIGINS
- ✅ `.env` is git-ignored (security best practice)

## Deployment Steps for Railway

1. **Update Railway Environment Variables:**
   - Go to https://railway.app
   - Select your project → Backend service
   - Go to Variables tab
   - Update `ALLOWED_ORIGINS` to include both domains:
     ```
     http://localhost:3000,https://arsipankagdrive-production.up.railway.app,https://arsipdigitalanka.my.id
     ```
   - Deploy changes (Railway will auto-redeploy)

2. **Testing:**
   - Test login on `https://arsipankagdrive-production.up.railway.app` ✓
   - Test login on `https://arsipdigitalanka.my.id` ✓
   - Both should work seamlessly

## Future Domains
To add more custom domains in future:
1. Add to `backend/.env` (or Railway Variables):
   ```
   ALLOWED_ORIGINS=http://localhost:3000,https://arsipankagdrive-production.up.railway.app,https://arsipdigitalanka.my.id,https://new-domain.com
   ```
2. Frontend will auto-detect any non-localhost as production domain
3. No code changes needed!

## Technical Details
- Frontend now uses **relative URLs** for all production deployments
- This allows same codebase to work on ANY domain without code changes
- Backend CORS validation ensures only allowed origins can access API
- Development mode (localhost) still uses explicit `http://localhost:5000`

## Related Files
- `js/config.js` - API URL detection
- `backend/server.js` - CORS middleware (lines ~107-142)
- `backend/.env` - ALLOWED_ORIGINS configuration
