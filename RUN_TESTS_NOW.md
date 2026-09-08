# 🧪 Run Production Tests Now

**Status**: Feature flag enabled ✅  
**Next**: Execute 15-point test suite

---

## ⚡ Quick Test (30 seconds)

### 1. Get Your Railway URL

Go to: https://railway.app/dashboard
- Select your "Arsipan Anka" project
- Look for "Domain" or "Public URL" in the deployment info
- Copy the URL (format: `https://your-project.up.railway.app`)

### 2. Verify Deployment Ready

Replace `YOUR_RAILWAY_URL` with your actual URL:

```bash
curl -X GET https://YOUR_RAILWAY_URL/api/health
```

Expected response:
```
HTTP/1.1 200 OK
```

### 3. Check Feature is Enabled

```bash
curl -X POST https://YOUR_RAILWAY_URL/api/files/init \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.pdf",
    "fileSize": 1048576,
    "fileType": "application/pdf"
  }'
```

Expected response (contains `sessionId`):
```json
{
  "sessionId": "sess_xxxxx",
  "fileName": "test.pdf",
  "fileSize": 1048576,
  "uploadedBytes": 0,
  "progressPercent": 0
}
```

If you see this → Feature is enabled! ✅

---

## 🧪 Full Test Suite (5-10 minutes)

### Step 1: Set Environment Variable

```bash
# Windows PowerShell
$env:RAILWAY_URL="https://YOUR_RAILWAY_URL"

# Linux/Mac
export RAILWAY_URL="https://YOUR_RAILWAY_URL"
```

### Step 2: Run Test Script

```bash
bash TEST_CHUNKED_UPLOAD_PRODUCTION.sh
```

### Step 3: Expected Output

```
✅ Health check passed
✅ Session created: sess_xxxxx
✅ Chunk 1 uploaded successfully
✅ Chunk 2 uploaded successfully
✅ Upload completed and assembled
✅ Metrics endpoint working
✅ Active sessions endpoint working
✅ Session aborted successfully
✅ Cache hit detected
✅ Parallelization: 5 concurrent checks in 120ms
✅ Invalid session properly rejected
✅ Oversized file properly rejected

Tests Passed: 15
Tests Failed: 0
Success Rate: 100%

✅ ALL TESTS PASSED!
Your chunked upload system is ready for production.
```

---

## 📊 Manual Test Commands

If test script doesn't work, try individual commands:

### Test 1: Health Check
```bash
curl https://YOUR_RAILWAY_URL/api/health
```

### Test 2: Initialize Session
```bash
curl -X POST https://YOUR_RAILWAY_URL/api/files/init \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.pdf",
    "fileSize": 10485760,
    "fileType": "application/pdf",
    "chunkSize": 5242880,
    "metadata": {"zona_id": 1, "toko_id": 1}
  }'
```

Save the `sessionId` from response, then use it in next commands.

### Test 3: Check Status (Before Upload)
```bash
curl "https://YOUR_RAILWAY_URL/api/files/status?sessionId=SESSION_ID"
```

### Test 4: Upload Chunk (5MB)
```bash
# Create 5MB test file
dd if=/dev/urandom of=/tmp/chunk.bin bs=1M count=5

# Upload
curl -X POST "https://YOUR_RAILWAY_URL/api/files/chunk?sessionId=SESSION_ID&chunkNumber=1&totalChunks=1" \
  -F "chunk=@/tmp/chunk.bin"
```

### Test 5: Complete Upload
```bash
curl -X POST https://YOUR_RAILWAY_URL/api/files/complete \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "SESSION_ID",
    "finalFileName": "test-final.pdf"
  }'
```

### Test 6: Check Metrics
```bash
curl https://YOUR_RAILWAY_URL/api/files/metrics | jq '.'
```

Expected metrics:
```json
{
  "totalUploads": 1,
  "successfulUploads": 1,
  "avgUploadTime": 8500,
  "cacheHitRate": 0.95,
  "parallelizationSpeedup": 1.22,
  "avgChunkProcessTime": 450,
  "totalBytesUploaded": 10485760,
  "activeSessionCount": 0
}
```

---

## ✅ Success Criteria

All must be true:

- [ ] Feature flag shows: `[ChunkedUpload] ✅ Enabled`
- [ ] /api/health returns 200
- [ ] /api/files/init creates session
- [ ] All 15 tests pass
- [ ] Metrics show upload data
- [ ] No errors in logs

---

## ⚠️ Troubleshooting

### Issue: Connection refused
- **Check**: Is Railway deployment running? (green status)
- **Check**: Correct URL? (should end with .up.railway.app)
- **Wait**: 1-2 minutes after variable set before testing

### Issue: Feature still disabled
- **Check**: Logs show `[ChunkedUpload] ✅ Enabled`?
- **Check**: Variable is set to lowercase `true` (not `True`)?
- **Try**: Hard refresh browser, wait 30 seconds, retry

### Issue: Upload fails
- **Check**: Chunk size matches (should be 5MB)
- **Check**: SessionId is valid
- **Check**: Total chunks matches chunkNumber
- **Try**: Run simpler test (/api/health) first

---

## 🎯 Next After Tests Pass

1. ✅ All 15 tests passed
2. ✅ Metrics show data
3. → Run regression tests (30 tests, 2-3 hours)
   - See: TASK6_REGRESSION_TESTING_PLAN.md
4. → Execute gradual rollout (4 phases, 7 days)
   - See: TASK7_PRODUCTION_DEPLOYMENT_GUIDE.md

---

## 📞 Need Help?

1. Check Railway logs: dashboard → Deployments → View Logs
2. Read: ENABLE_FEATURE_FLAG_RAILWAY.md
3. Review: ROLLBACK_INSTRUCTIONS.md (if needed)

---

**Status**: Ready to test! 🚀

Tell me your Railway URL and I'll help you run the complete test suite!
