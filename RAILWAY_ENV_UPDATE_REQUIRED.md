# ⚠️ URGENT: Update Railway Environment Variables

## Problem
Custom domain `https://arsipdigitalanka.my.id` login fails with CORS error:
```
Error: CORS policy: Origin 'https://arsipdigitalanka.my.id' not allowed
```

Root cause: Backend `.env` file is NOT tracked in git (for security). When Railway auto-deploys from git, it uses the OLD environment variables that don't include the custom domain.

## Solution: Update Railway Backend Service Variables

### Steps:
1. **Go to Railway Dashboard**
   - URL: https://railway.app
   - Select your project
   - Click "Backend" service

2. **Click "Variables" tab**

3. **Find `ALLOWED_ORIGINS` variable**
   - Current value (OLD): `http://localhost:3000,https://arsipankagdrive-production.up.railway.app`
   - New value (REQUIRED): `http://localhost:3000,https://arsipankagdrive-production.up.railway.app,https://arsipdigitalanka.my.id`

4. **Update the value**
   - Copy the new value above
   - Replace the `ALLOWED_ORIGINS` value in Railway Variables
   - Click "Update"

5. **Trigger Redeploy**
   - Railway should auto-redeploy after variable change
   - Or manually trigger: Click "Deploy" → Select latest commit

### Verification:
After update, test:
- `https://arsipankagdrive-production.up.railway.app` - Login ✓
- `https://arsipdigitalanka.my.id` - Login ✓

Both should work without CORS errors.

## Why This Happened
- `backend/.env` is git-ignored (security best practice)
- Code changes deployed to Railway via git
- But `.env` variables not included in git deployment
- Railway still had old `.env` values without custom domain
- Solution: Manually update variables in Railway dashboard

## Files Related
- `backend/.env` - Local development (NOT in git)
- `js/config.js` - Frontend API URL detection (UPDATED in git)
- `backend/server.js` - CORS middleware (already supports dynamic origins)

## For Future Custom Domains
Just add them to Railway `ALLOWED_ORIGINS`:
```
http://localhost:3000,https://arsipankagdrive-production.up.railway.app,https://arsipdigitalanka.my.id,https://new-domain.com
```
