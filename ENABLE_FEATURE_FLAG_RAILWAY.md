# 🚀 Enable Chunked Upload Feature Flag on Railway

**Objective**: Enable `ENABLE_CHUNKED_UPLOAD=true` environment variable to activate the chunked upload feature

**Time Required**: 2-3 minutes

---

## ✅ Step-by-Step Guide

### Option A: Railway Dashboard (Recommended)

#### Step 1: Go to Railway Dashboard
- Open: https://railway.app/dashboard
- Login with your account

#### Step 2: Select Your Project
- Find and click on **"Arsipan Anka"** project
- Or your custom project name

#### Step 3: Navigate to Variables Tab
1. Look for the **"Variables"** tab in the project menu
   - Usually next to "Deployments" or "Services"
2. Click it

#### Step 4: Add New Environment Variable
1. Click **"Add Variable"** button (or similar)
2. Fill in:
   ```
   KEY:   ENABLE_CHUNKED_UPLOAD
   VALUE: true
   ```

#### Step 5: Save and Redeploy
1. Click **"Save"** or **"Apply"**
2. Railway will automatically trigger a redeploy
3. Monitor the deployment logs (usually auto-opens)

#### Step 6: Wait for Deployment
- Watch the logs for:
  ```
  ✅ Build successful
  ✅ Healthcheck passed
  ```
- Usually takes 2-5 minutes

#### Step 7: Verify Feature is Enabled
- After deployment, check logs for:
  ```
  [ChunkedUpload] ✅ Enabled (ENABLE_CHUNKED_UPLOAD=true)
  ```
  
If you see this, feature is active!

---

### Option B: Railway CLI (Alternative)

#### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
# or
yarn global add @railway/cli
```

#### Step 2: Login to Railway
```bash
railway login
```
Follow the prompts in your browser

#### Step 3: Link Your Project
```bash
cd d:\DOWNLOAD\arsipankanew-replit-source\arsipankanew-replit-source
railway link
```
Select your "Arsipan Anka" project

#### Step 4: Set Environment Variable
```bash
railway variables set ENABLE_CHUNKED_UPLOAD=true
```

#### Step 5: Redeploy
```bash
railway up
```

#### Step 6: Monitor Deployment
```bash
railway logs
```
Watch for deployment completion

---

## 🔍 Verification Checklist

After deployment completes, verify:

- [ ] Deployment shows ✅ (green checkmark)
- [ ] No error messages in logs
- [ ] Logs show `[ChunkedUpload] ✅ Enabled`
- [ ] Server still running on port 8080
- [ ] Health check passed

---

## 🧪 Test After Enabling

Once enabled, run the test script:

```bash
# Set your Railway URL
export RAILWAY_URL="https://your-project.up.railway.app"

# Or for localhost (if testing locally)
export RAILWAY_URL="http://localhost:8080"

# Run tests
bash TEST_CHUNKED_UPLOAD_PRODUCTION.sh
```

Expected output:
```
✅ Session created: [sessionId]
✅ Chunk 1 uploaded successfully
✅ Chunk 2 uploaded successfully
✅ Upload completed and assembled
✅ ALL TESTS PASSED!
```

---

## 📊 Expected Logs After Enable

### Before Enabling
```
[ChunkedUpload] ⏸️  Disabled (set ENABLE_CHUNKED_UPLOAD=true to enable)
```

### After Enabling
```
[ChunkedUpload] ✅ Enabled (ENABLE_CHUNKED_UPLOAD=true)
[ChunkedUpload] Upload session manager initialized
[ChunkedUpload] Chunk handler initialized
[ChunkedUpload] File assembler initialized
[ChunkedUpload] 5 API endpoints registered
```

---

## ⚠️ Troubleshooting

### Issue: Variable not saving
- **Solution**: Refresh page and try again, or use CLI method

### Issue: Deployment fails
- **Solution**: Check that value is exactly `true` (lowercase, no quotes)
- Check other environment variables are still set (SUPABASE_URL, etc.)

### Issue: Feature still showing as disabled after redeploy
- **Solution**: 
  1. Wait 30 seconds for full startup
  2. Check logs for: `ENABLE_CHUNKED_UPLOAD` value
  3. Hard-refresh browser cache
  4. Try redeploy again

### Issue: Tests fail with "Connection refused"
- **Solution**:
  1. Verify Railway URL is correct
  2. Check deployment status (should be green)
  3. Wait for healthcheck to pass (shows in Railway dashboard)
  4. Try again after 1-2 minutes

---

## 🎯 Next Steps After Enabling

1. ✅ Verify feature enabled (logs check)
2. ✅ Run test script: `TEST_CHUNKED_UPLOAD_PRODUCTION.sh`
3. ✅ Monitor metrics: `/api/files/metrics` endpoint
4. ✅ Check cache hits (Phase 2 verification)
5. ✅ Check parallelization (Phase 1 verification)
6. ✅ Review test results
7. ✅ Run regression tests: `TASK6_REGRESSION_TESTING_PLAN.md`
8. ✅ Gradual rollout if all passed

---

## 📞 Need Help?

If something goes wrong:

1. **Check logs**: Railway dashboard → Deployments → View logs
2. **Review docs**: See `TASK7_PRODUCTION_DEPLOYMENT_GUIDE.md`
3. **Rollback**: See `ROLLBACK_INSTRUCTIONS.md` for immediate revert

---

**Status**: Ready to enable! 🚀

---

*Created: September 8, 2026*  
*Last Updated: September 8, 2026*
