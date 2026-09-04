# Rename Faktur Pajak - Troubleshooting Guide

## Problem: "Sistem masih sedang diinisialisasi"

This error means `pdf-parse` module is not installed on Railway yet.

## Solution: Force Railway to Reinstall Dependencies

### Option 1: Railway Dashboard (Recommended)
1. Go to Railway Dashboard
2. Find your project
3. Click "Settings"
4. Click "Redeploy" or "Restart"
5. Wait 3-5 minutes for npm install to complete

### Option 2: Add package-lock.json
If you have node_modules locally:
```bash
npm install
git add package-lock.json
git commit -m "Add package-lock for Railway"
git push
```

### Option 3: Trigger Rebuild
Make a small change to force rebuild:
```bash
# Add a comment to package.json or any file
git commit --allow-empty -m "Trigger Railway rebuild"
git push
```

## Check System Status

Visit: `https://your-railway-url.railway.app/api/invoice/rename-faktur/status`

Should return:
```json
{
  "ready": true,
  "message": "PDF processing ready"
}
```

## Alternative: Test Locally First

1. Install dependencies locally:
```bash
npm install
```

2. Start server:
```bash
npm start
```

3. Test at http://localhost:8080/rename-faktur.html

## Dependencies Required

From `package.json`:
- `pdf-parse: ^1.1.1` - PDF text extraction
- `busboy` - Built-in with Node.js 18+ (no install needed)

## Common Issues

### Issue: Module not found after deploy
**Solution**: Wait 5 minutes, Railway is still running npm install

### Issue: Works locally but not on Railway
**Solution**: Check Railway logs for npm install errors

### Issue: 500 error after file upload
**Solution**: Check backend logs - likely pdf-parse not loaded yet

## Railway-Specific Notes

Railway runs these commands on deploy:
1. `npm install` (installs dependencies from package.json)
2. `npm start` (starts the server)

If npm install fails or is slow, the server starts without dependencies.

## Contact Info

If issue persists after 10 minutes, check:
- Railway deployment logs
- Package.json is committed
- Node version matches (>=18.0.0)
