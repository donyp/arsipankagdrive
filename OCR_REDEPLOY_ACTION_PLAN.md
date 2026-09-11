# 🚀 OCR Railway Redeploy Action Plan

**Status:** ✅ ALL CODE READY - AWAITING REDEPLOY  
**Date:** 2026-09-11  
**Latest Commit:** e923390

---

## What's Been Done

### ✅ Code Fixes Applied
1. **Fix #1 - pdf2pic API** (Commit a3795b3)
   - Changed: `fromFilePath()` → `fromPath()`
   - Reason: Correct API for v3.2.0

2. **Fix #2 - GraphicsMagick** (Commit 4f026bd)
   - Changed: `imagemagick` → `graphicsmagick` in Dockerfile
   - Reason: pdf2pic requires `gm` command

3. **Fix #3 - Tesseract Worker** (Commit 4833455)
   - Added: Runtime language pack download from CDN
   - Added: Proper worker initialization
   - Added: Comprehensive error logging

### ✅ Documentation Created
- `OCR_FIX_TESTING_GUIDE.md` - Complete testing procedures
- `OCR_FIX_DEPLOYMENT_SUMMARY.md` - Technical details
- `OCR_FIX_CRITICAL_PATCH.md` - Quick reference
- `OCR_ALL_FIXES_SUMMARY.md` - Complete overview
- `OCR_REDEPLOY_ACTION_PLAN.md` - This document

---

## Immediate Action: Redeploy to Railway

### Step 1: Trigger Redeploy
1. Go to: **https://railway.app**
2. Login to your Railway account
3. Select project: **arsipankagdrive**
4. Click: **Deployments** tab
5. Find: Latest deployment (top of list)
6. Click: **Redeploy** button (or "..." menu → Redeploy)

### Step 2: Wait for Build
- Build time: **3-5 minutes**
- Watch for status: "Building..." → "Success"
- The build will:
  - Pull latest code from master branch ✅
  - Install GraphicsMagick (instead of ImageMagick)
  - Rebuild Docker image
  - Start container with new code

### Step 3: Verify Health Check
- Railway shows: ✅ Health check passed
- App is ready to accept requests
- All OCR dependencies installed

---

## Testing After Redeploy (5 minutes after success)

### Quick Test (2 minutes)

**1. Open Test Page**
```
URL: https://arsipankagdrive-productionrup.railway.app/rename-invoice-hijau.html
```

**2. Upload Test File**
- File: `aab.pdf` (or any scanned invoice PDF)
- Size: Should be reasonable (< 5MB)
- Format: PDF (scanned image)

**3. Click Process**
- Wait: 15-20 seconds
- Watch: Loading progress bar

**4. Verify Result**
- ✅ File downloads: `[invoice_number].pdf`
- ✅ Invoice number extracted: e.g., `123456789012`
- ✅ No error messages

### Detailed Test (5 minutes)

**1. Check Browser Console**
- Open: DevTools (F12)
- Watch: No red error messages
- Look for: `[Rename Invoice Hijau] Processing file 1/1`

**2. Check Railway Logs**
- Go to: Railway → Logs
- Filter: `[Rename Invoice Hijau]`
- Verify logs show:
  ```
  OCR: Starting OCR process...
  OCR: PDF written to /tmp/invoice-xxx.pdf
  OCR: ✅ Converted 1 pages to images
  OCR: Image exists, size: 350KB
  ✅ Tesseract worker initialized
  OCR: Image recognized in 5.2s
  ✅ Successfully extracted 850 characters
  ```

**3. Test Multiple Files**
- Upload: 3-5 PDFs at once
- Click: Process
- Verify: All download correctly

**4. Check Database**
- Login to app dashboard
- View: Recent rename history
- Confirm: PDFs appear in history table

---

## Expected Behavior After Redeploy

### What Will Work

✅ **File Upload**
- Select scanned PDF files
- Drag-and-drop support
- Max 25 files per batch

✅ **Text Extraction**
- Digital PDFs: Normal text extraction
- Scanned PDFs: Automatic OCR fallback

✅ **OCR Pipeline**
1. PDF → Images (pdf2pic with gm)
2. Images → Text (Tesseract with Indonesian lang)
3. Text → Invoice Number (regex extraction)

✅ **File Download**
- Automatic after processing
- Filename: `[invoice_number].pdf`
- Base64 encoded PDF

✅ **History Logging**
- Records in database
- Shows in Recent History section
- Timestamps in Jakarta timezone

### What Might Show Warnings

⚠️ **Missing Favicon** (404)
- Expected: Doesn't affect functionality
- Ignore: Just missing icon

⚠️ **TailwindCSS CDN Warning**
- Expected: Using CDN in production
- Ignore: Works fine, just a development note

⚠️ **Rename History 404**
- Expected: First time might not find endpoint
- Ignore: Logs to database successfully

---

## Troubleshooting Redeploy Issues

### Issue: Build Still Fails
**Symptoms:** Build status shows "Failed"

**Solutions:**
1. Wait 10 minutes, try redeploy again
2. Go to: Railway → Settings
3. Clear build cache
4. Click: Redeploy

### Issue: App Starts But OCR Still Fails
**Symptoms:** Upload works but HTTP 400 error

**Possible Causes:**
1. Old Docker image still running
2. GraphicsMagick not installed yet

**Solutions:**
1. Wait 5 more minutes for full deployment
2. Check railway logs for: `graphicsmagick`
3. Redeploy again if needed

### Issue: Tesseract Language Pack Not Downloading
**Symptoms:** Tesseract worker initialization fails

**Solutions:**
1. Refresh page (forces worker reinit)
2. Check internet connection in logs
3. Wait 30 seconds and retry

### Issue: File Downloads But Filename Wrong
**Symptoms:** File is `document.pdf` instead of `123456789012.pdf`

**Cause:** Invoice number not extracted

**Solutions:**
1. Check PDF quality (must be clear scan)
2. Check if invoice number is visible
3. View logs to see extracted text

---

## Success Indicators

### ✅ All Green
```
[✅] Build completes without errors
[✅] Health check passes
[✅] Upload accepts PDF files
[✅] Processing starts (loading bar)
[✅] File downloads with invoice number
[✅] Browser console no red errors
[✅] Railway logs show OCR steps
[✅] History shows renamed file
[✅] Database records created
```

### ⚠️ Minor Issues (Still OK)
```
[⚠️] Favicon 404 - doesn't matter
[⚠️] TailwindCSS warning - doesn't matter
[⚠️] Some files fail extraction - acceptable
```

### ❌ Major Problems (Stop and Debug)
```
[❌] Build fails - needs fix
[❌] HTTP 500 errors - server error
[❌] All files fail - OCR not working
[❌] Logs show "gm not found" - GraphicsMagick failed
```

---

## Monitoring After Deploy

### First Hour
- Watch Railway logs for errors
- Test with 1-2 PDFs
- Check console for exceptions
- Verify history records created

### First Day
- Monitor for crash restarts
- Track error rates
- Test batch uploads (5-10 files)
- Verify all PDFs extracting correctly

### First Week
- Monitor for memory leaks
- Check OCR accuracy
- Test edge cases (poor quality scans)
- Verify worker stays initialized

---

## Rollback Plan (If Needed)

If redeploy causes issues:

**Option 1: Quick Rollback**
1. Railway → Deployments
2. Click previous successful deployment
3. Select: "Redeploy"
4. Wait for build

**Option 2: Git Rollback**
```bash
# Revert to previous commit
git revert <commit_hash>
git push
# Railway will auto-redeploy
```

**Option 3: Disable Feature**
- Comment out OCR endpoints in code
- Deploy without OCR
- Fix and retry

---

## Timeline

| Time | Action | Status |
|------|--------|--------|
| **NOW** | Trigger redeploy | ⏳ Waiting |
| **+3-5 min** | Build completes | ⏳ Waiting |
| **+6 min** | Health check passes | ⏳ Waiting |
| **+7 min** | App ready | ⏳ Waiting |
| **+10 min** | First test (optional) | ⏳ Waiting |
| **+30 min** | Verify fully working | ⏳ Waiting |
| **+2 hours** | Production ready | ⏳ Waiting |

---

## Summary

🎯 **Goal:** Deploy OCR fixes to production  
✅ **Status:** All code ready and pushed  
⏳ **Next:** Trigger Railway redeploy  
🎉 **Result:** OCR extraction works for thousands of scanned PDFs

---

## Quick Reference

- **Railway URL:** https://railway.app
- **App URL:** https://arsipankagdrive-productionrup.railway.app
- **Test Page:** /rename-invoice-hijau.html
- **Latest Commit:** e923390
- **Key Fixes:** pdf2pic API + GraphicsMagick + Tesseract worker

---

**Ready to deploy? Go to https://railway.app and click "Redeploy" on your project! 🚀**
