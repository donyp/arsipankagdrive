# Task 5: Endpoint Testing & Feature Flag Integration

**Date**: September 1, 2026  
**Status**: READY FOR TESTING  
**Feature Flag**: ENABLE_CHUNKED_UPLOAD  

---

## Pre-Testing Checklist

### ✅ Environment Setup
```bash
# 1. Set feature flag
export ENABLE_CHUNKED_UPLOAD=true

# 2. Verify Node.js version (14+)
node --version

# 3. Verify dependencies installed
npm list express multer crypto fs

# 4. Start server
npm start

# 5. Verify server running
curl http://localhost:5000/api/health
# Should return 200 OK
```

### ✅ Verify Feature Enabled
```bash
# Check if endpoints exist
curl http://localhost:5000/api/files/metrics
# Should return 200 with metrics (if enabled)
# Or 404 if disabled
```

---

## Unit Tests: Session Manager

### Test 1: Create Upload Session
```bash
curl -X POST http://localhost:5000/api/files/init \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.pdf",
    "fileSize": 10485760,
    "fileType": "application/pdf",
    "chunkSize": 5242880,
    "metadata": {"zona_id": 1, "toko_id": 1, "category": "INVOICE"}
  }'

# Expected Response (200):
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "fileName": "test.pdf",
  "fileSize": 10485760,
  "chunkSize": 5242880,
  "totalChunks": 2,
  "status": "initialized",
  "createdAt": "2026-09-01T10:00:00.000Z",
  "expiresAt": "2026-09-02T10:00:00.000Z"
}
```

**Verification Points**:
- [ ] uploadId is UUID format
- [ ] totalChunks = Math.ceil(fileSize / chunkSize)
- [ ] status is "initialized"
- [ ] expiresAt is 24 hours from createdAt

---

### Test 2: Upload Single Chunk
```bash
# Create test chunk (5MB)
dd if=/dev/urandom of=chunk1.bin bs=1024 count=5120

# Upload chunk
curl -X POST http://localhost:5000/api/files/chunk \
  -F "uploadId=550e8400-e29b-41d4-a716-446655440000" \
  -F "chunkNumber=1" \
  -F "totalChunks=2" \
  -F "chunk=@chunk1.bin"

# Expected Response (200):
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "chunkNumber": 1,
  "status": "received",
  "uploadedBytes": 5242880,
  "totalBytes": 10485760,
  "progress": 50,
  "nextChunk": 2,
  "eta": "1 minute"
}
```

**Verification Points**:
- [ ] Chunk accepted (status: "received")
- [ ] Progress calculated correctly
- [ ] ETA displayed
- [ ] nextChunk suggests next upload

---

### Test 3: Check Upload Status
```bash
curl http://localhost:5000/api/files/status?uploadId=550e8400-e29b-41d4-a716-446655440000

# Expected Response (200):
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "fileName": "test.pdf",
  "status": "in_progress",
  "uploadedChunks": [1],
  "missingChunks": [2],
  "uploadedBytes": 5242880,
  "totalBytes": 10485760,
  "progress": 50,
  "eta": "1 minute",
  "lastUpdate": "2026-09-01T10:05:00.000Z",
  "expiresAt": "2026-09-02T10:00:00.000Z"
}
```

**Verification Points**:
- [ ] uploadedChunks correct
- [ ] missingChunks correct
- [ ] progress accurate
- [ ] status is "in_progress"

---

### Test 4: Upload Remaining Chunks
```bash
# Create and upload chunk 2
dd if=/dev/urandom of=chunk2.bin bs=1024 count=5120

curl -X POST http://localhost:5000/api/files/chunk \
  -F "uploadId=550e8400-e29b-41d4-a716-446655440000" \
  -F "chunkNumber=2" \
  -F "totalChunks=2" \
  -F "chunk=@chunk2.bin"

# Expected Response (200):
{
  "progress": 100,
  "uploadedBytes": 10485760,
  "nextChunk": null
}
```

**Verification Points**:
- [ ] Progress shows 100%
- [ ] All chunks uploaded
- [ ] nextChunk is null

---

### Test 5: Complete Upload
```bash
# Calculate file checksum (simulate on client)
# For testing, use any SHA256 hash
CHECKSUM="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

curl -X POST http://localhost:5000/api/files/complete \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "550e8400-e29b-41d4-a716-446655440000",
    "checksum": "'$CHECKSUM'",
    "remoteDestination": "ARSIPINVOICE/2026/test.pdf"
  }'

# Expected Response (200):
{
  "success": true,
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "fileName": "test.pdf",
  "fileSize": 10485760,
  "checksum": "e3b0c44...",
  "remoteDestination": "ARSIPINVOICE/2026/test.pdf",
  "status": "completed",
  "completedAt": "2026-09-01T10:10:00.000Z"
}
```

**Verification Points**:
- [ ] Upload completed successfully
- [ ] Temporary chunks cleaned up (no files in /temp/uploads)
- [ ] Session marked as completed
- [ ] Remote file can be accessed

---

### Test 6: Abort Upload
```bash
# Start new upload
UPLOAD_ID=$(curl -X POST http://localhost:5000/api/files/init \
  -H "Content-Type: application/json" \
  -d '{"fileName":"abort-test.pdf","fileSize":10485760}' \
  | grep -o '"uploadId":"[^"]*' | cut -d'"' -f4)

# Upload 1 chunk
dd if=/dev/urandom of=chunk.bin bs=1024 count=5120
curl -X POST http://localhost:5000/api/files/chunk \
  -F "uploadId=$UPLOAD_ID" \
  -F "chunkNumber=1" \
  -F "totalChunks=2" \
  -F "chunk=@chunk.bin"

# Abort upload
curl -X POST http://localhost:5000/api/files/abort \
  -H "Content-Type: application/json" \
  -d '{"uploadId":"'$UPLOAD_ID'","reason":"test_abort"}'

# Expected Response (200):
{
  "success": true,
  "uploadId": "...",
  "status": "aborted",
  "message": "Upload cancelled and temporary files cleaned up"
}

# Verify temp files cleaned
ls /temp/uploads/
# Directory should be empty or not exist
```

**Verification Points**:
- [ ] Session marked as aborted
- [ ] Temporary files cleaned
- [ ] Status check returns aborted session

---

## Error Scenario Tests

### Test 7: Session Expired
```bash
# This test requires waiting 24 hours OR modifying TTL for testing

# Shorter TTL for testing (modify in code: sessionTTL: 60000 for 1 minute)
# Wait for expiration
sleep 70

# Try to upload to expired session
curl -X POST http://localhost:5000/api/files/chunk \
  -F "uploadId=old-upload-id" \
  -F "chunkNumber=1" \
  -F "totalChunks=2" \
  -F "chunk=@chunk.bin"

# Expected Response (404):
{
  "error": "Upload session not found or expired"
}
```

**Verification Points**:
- [ ] Expired session rejected
- [ ] Clear error message provided
- [ ] No old session files remain

---

### Test 8: Missing Chunks Before Complete
```bash
# Start upload
UPLOAD_ID=$(curl -X POST http://localhost:5000/api/files/init \
  -H "Content-Type: application/json" \
  -d '{"fileName":"missing-test.pdf","fileSize":15728640}' \
  | grep -o '"uploadId":"[^"]*' | cut -d'"' -f4)

# Upload only chunk 1
dd if=/dev/urandom of=chunk1.bin bs=1024 count=5120
curl -X POST http://localhost:5000/api/files/chunk \
  -F "uploadId=$UPLOAD_ID" \
  -F "chunkNumber=1" \
  -F "totalChunks=3" \
  -F "chunk=@chunk1.bin"

# Try to complete without all chunks
curl -X POST http://localhost:5000/api/files/complete \
  -H "Content-Type: application/json" \
  -d '{"uploadId":"'$UPLOAD_ID'","checksum":"abc123","remoteDestination":"path/file.pdf"}'

# Expected Response (400):
{
  "error": "Not all chunks uploaded",
  "uploadedCount": 1,
  "totalCount": 3,
  "missingChunks": [2, 3]
}
```

**Verification Points**:
- [ ] Missing chunks detected
- [ ] Cannot complete incomplete upload
- [ ] Clear error showing which chunks missing

---

### Test 9: Duplicate Chunk Upload
```bash
# Start upload and upload chunk 1
UPLOAD_ID=$(curl -X POST http://localhost:5000/api/files/init \
  -H "Content-Type: application/json" \
  -d '{"fileName":"dup-test.pdf","fileSize":10485760}' \
  | grep -o '"uploadId":"[^"]*' | cut -d'"' -f4)

dd if=/dev/urandom of=chunk.bin bs=1024 count=5120

# Upload chunk 1
curl -X POST http://localhost:5000/api/files/chunk \
  -F "uploadId=$UPLOAD_ID" \
  -F "chunkNumber=1" \
  -F "totalChunks=2" \
  -F "chunk=@chunk.bin"

# Try to upload same chunk again
curl -X POST http://localhost:5000/api/files/chunk \
  -F "uploadId=$UPLOAD_ID" \
  -F "chunkNumber=1" \
  -F "totalChunks=2" \
  -F "chunk=@chunk.bin"

# Expected Response (409):
{
  "error": "Chunk 1 already uploaded",
  "uploadedChunks": [1]
}
```

**Verification Points**:
- [ ] Duplicate chunk rejected
- [ ] 409 Conflict status returned
- [ ] uploadedChunks list shown

---

### Test 10: Chunk Too Large
```bash
# Create 15MB chunk (exceeds 10MB limit)
dd if=/dev/urandom of=large-chunk.bin bs=1024 count=15360

curl -X POST http://localhost:5000/api/files/chunk \
  -F "uploadId=test-id" \
  -F "chunkNumber=1" \
  -F "totalChunks=10" \
  -F "chunk=@large-chunk.bin"

# Expected Response (413):
{
  "error": "Chunk size 15728640 exceeds max 10485760"
}
```

**Verification Points**:
- [ ] Large chunks rejected
- [ ] 413 Payload Too Large status
- [ ] Size limit enforced

---

## Load Tests

### Test 11: Concurrent Uploads (10 files)
```bash
#!/bin/bash

for i in {1..10}; do
  (
    # Initialize
    UPLOAD_ID=$(curl -s -X POST http://localhost:5000/api/files/init \
      -H "Content-Type: application/json" \
      -d "{\"fileName\":\"concurrent-$i.pdf\",\"fileSize\":10485760}" \
      | grep -o '"uploadId":"[^"]*' | cut -d'"' -f4)
    
    # Create and upload 2 chunks
    dd if=/dev/urandom of=chunk-$i-1.bin bs=1024 count=5120 2>/dev/null
    dd if=/dev/urandom of=chunk-$i-2.bin bs=1024 count=5120 2>/dev/null
    
    curl -s -X POST http://localhost:5000/api/files/chunk \
      -F "uploadId=$UPLOAD_ID" \
      -F "chunkNumber=1" \
      -F "totalChunks=2" \
      -F "chunk=@chunk-$i-1.bin" > /dev/null
    
    curl -s -X POST http://localhost:5000/api/files/chunk \
      -F "uploadId=$UPLOAD_ID" \
      -F "chunkNumber=2" \
      -F "totalChunks=2" \
      -F "chunk=@chunk-$i-2.bin" > /dev/null
    
    # Complete
    curl -s -X POST http://localhost:5000/api/files/complete \
      -H "Content-Type: application/json" \
      -d "{\"uploadId\":\"$UPLOAD_ID\",\"checksum\":\"abc123\",\"remoteDestination\":\"test/$i.pdf\"}" > /dev/null
    
    echo "Upload $i completed"
  ) &
done

wait

echo "All concurrent uploads completed"
```

**Verification Points**:
- [ ] All 10 uploads succeed
- [ ] No memory leaks
- [ ] Server remains responsive
- [ ] No errors in logs

---

### Test 12: Parallel Chunks (1 file, 5 concurrent chunks)
```bash
# This tests parallel chunk uploads of single file

UPLOAD_ID=$(curl -s -X POST http://localhost:5000/api/files/init \
  -H "Content-Type: application/json" \
  -d '{"fileName":"parallel-test.pdf","fileSize":26214400}' \
  | grep -o '"uploadId":"[^"]*' | cut -d'"' -f4)

# Create 5 chunks
for i in {1..5}; do
  dd if=/dev/urandom of=chunk-$i.bin bs=1024 count=5120 2>/dev/null &
done
wait

# Upload chunks in parallel
for i in {1..5}; do
  (
    curl -s -X POST http://localhost:5000/api/files/chunk \
      -F "uploadId=$UPLOAD_ID" \
      -F "chunkNumber=$i" \
      -F "totalChunks=5" \
      -F "chunk=@chunk-$i.bin" > /dev/null
    echo "Chunk $i uploaded"
  ) &
done
wait

# Complete
curl -X POST http://localhost:5000/api/files/complete \
  -H "Content-Type: application/json" \
  -d "{\"uploadId\":\"$UPLOAD_ID\",\"checksum\":\"abc123\",\"remoteDestination\":\"test/parallel.pdf\"}"
```

**Verification Points**:
- [ ] All 5 chunks accepted
- [ ] Order doesn't matter (chunks tracked by number)
- [ ] File successfully completed
- [ ] No race conditions

---

## Regression Tests (Verify Old Endpoints)

### Test 13: Old Upload Endpoint Still Works
```bash
# Test that old /api/files/upload still works (if existing clients use it)

dd if=/dev/urandom of=test-file.pdf bs=1024 count=10240

curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-file.pdf" \
  -F "zona_id=1" \
  -F "toko_id=1" \
  -F "category=INVOICE"

# Should return 200 with file uploaded
# Old functionality unchanged
```

**Verification Points**:
- [ ] Old endpoint still works
- [ ] No regression in existing uploads
- [ ] File uploaded successfully

---

### Test 14: Download Still Works
```bash
# Verify download functionality not affected

curl -X GET "http://localhost:5000/api/files/download?zona_id=1&toko_id=1&filename=test.pdf" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Should return file or proper error
```

**Verification Points**:
- [ ] Downloads still work
- [ ] File access not affected
- [ ] Proper authentication checks

---

### Test 15: File Existence Check Still Works
```bash
# Verify file checks not affected (cache should still work)

curl -X GET "http://localhost:5000/api/files/exists?remote_path=ARSIPINVOICE/test.pdf"

# Should return existence status
```

**Verification Points**:
- [ ] File checks still work
- [ ] Cache still providing performance benefit
- [ ] No regression

---

## Admin Utility Endpoints

### Test 16: Metrics Endpoint
```bash
curl http://localhost:5000/api/files/metrics

# Expected Response:
{
  "totalCreated": 42,
  "totalCompleted": 35,
  "totalAborted": 5,
  "totalExpired": 2,
  "activeCount": 0,
  "activeSessions": 0,
  "uptime": 3600000
}
```

**Verification Points**:
- [ ] Metrics accurately tracked
- [ ] Counts make sense
- [ ] Can use for monitoring

---

### Test 17: Active Sessions Endpoint
```bash
# Start a long-running upload first
UPLOAD_ID=$(curl -s -X POST http://localhost:5000/api/files/init \
  -H "Content-Type: application/json" \
  -d '{"fileName":"long-test.pdf","fileSize":104857600}' \
  | grep -o '"uploadId":"[^"]*' | cut -d'"' -f4)

# Upload first chunk
dd if=/dev/urandom of=chunk.bin bs=1024 count=5120 2>/dev/null
curl -s -X POST http://localhost:5000/api/files/chunk \
  -F "uploadId=$UPLOAD_ID" \
  -F "chunkNumber=1" \
  -F "totalChunks=20" \
  -F "chunk=@chunk.bin" > /dev/null

# Check active sessions
curl http://localhost:5000/api/files/active-sessions

# Expected Response:
{
  "count": 1,
  "sessions": [
    {
      "uploadId": "...",
      "fileName": "long-test.pdf",
      "status": "in_progress",
      "uploadedChunks": [1],
      "missingChunks": [2, 3, ...],
      "progress": 5,
      ...
    }
  ]
}
```

**Verification Points**:
- [ ] Active sessions listed
- [ ] Progress shown
- [ ] Useful for admin monitoring

---

## Performance Benchmarks

### Test 18: Latency Measurements

```bash
#!/bin/bash

echo "Performance Benchmark"
echo "===================="

# Test 1: Single 10MB file (old vs new approach simulation)
echo -n "Old approach (single upload): "
time dd if=/dev/urandom of=test10mb.bin bs=1024 count=10240 2>/dev/null && \
curl -s -X POST http://localhost:5000/api/files/upload \
  -F "file=@test10mb.bin" > /dev/null

# Test 2: Same file with chunked (2 x 5MB chunks)
echo -n "New approach (2 chunks): "
time (
  UPLOAD_ID=$(curl -s -X POST http://localhost:5000/api/files/init \
    -H "Content-Type: application/json" \
    -d '{"fileName":"bench.pdf","fileSize":10485760}' \
    | grep -o '"uploadId":"[^"]*' | cut -d'"' -f4)
  
  curl -s -X POST http://localhost:5000/api/files/chunk \
    -F "uploadId=$UPLOAD_ID" \
    -F "chunkNumber=1" \
    -F "totalChunks=2" \
    -F "chunk=@chunk1.bin" > /dev/null
  
  curl -s -X POST http://localhost:5000/api/files/chunk \
    -F "uploadId=$UPLOAD_ID" \
    -F "chunkNumber=2" \
    -F "totalChunks=2" \
    -F "chunk=@chunk2.bin" > /dev/null
)
```

**Expectations**:
- [ ] Chunked approach comparable or faster
- [ ] Parallel uploads significantly faster
- [ ] Memory usage reasonable

---

## Reporting Results

### Test Summary Template
```markdown
# Chunked Upload - Test Results

**Date**: [Date]  
**Tester**: [Name]  
**Duration**: [Time]  

## Unit Tests
- [ ] Session Creation: ✅ PASS
- [ ] Session Retrieval: ✅ PASS
- [ ] Session Update: ✅ PASS
- [ ] Session Completion: ✅ PASS
- [ ] Session Abort: ✅ PASS
- [ ] Chunk Save: ✅ PASS
- [ ] Chunk Assembly: ✅ PASS

## Endpoint Tests
- [ ] POST /init: ✅ PASS
- [ ] POST /chunk: ✅ PASS
- [ ] GET /status: ✅ PASS
- [ ] POST /complete: ✅ PASS
- [ ] POST /abort: ✅ PASS

## Error Scenarios
- [ ] Session Expired: ✅ PASS
- [ ] Missing Chunks: ✅ PASS
- [ ] Duplicate Chunk: ✅ PASS
- [ ] Chunk Too Large: ✅ PASS

## Load Tests
- [ ] 10 Concurrent Uploads: ✅ PASS
- [ ] 5 Parallel Chunks: ✅ PASS
- [ ] Memory Usage: ✅ OK
- [ ] Server Responsiveness: ✅ OK

## Regression Tests
- [ ] Old Upload Works: ✅ PASS
- [ ] Downloads Work: ✅ PASS
- [ ] File Checks Work: ✅ PASS
- [ ] Cache Working: ✅ PASS

## Performance
- Upload 10MB: [X] ms
- Upload 50MB: [X] ms
- Average Latency: [X] ms
- P95 Latency: [X] ms

## Issues Found
- [None / List issues]

## Recommendations
- [Continue / Fix issues first / Deploy]
```

---

## Cleanup After Testing
```bash
# Remove test files
rm -f chunk*.bin test*.pdf test*.bin dup-test* abort-test* missing-test* parallel-test* concurrent-* large-chunk* bench.pdf

# Remove test uploads directory
rm -rf /temp/test-uploads
rm -rf /data/test-sessions

# Verify cleanup
ls /temp/uploads/  # Should be empty
ls /data/upload-sessions/  # Should be empty
```

---

## Next Steps After Testing

1. ✅ All unit tests pass
2. ✅ All endpoint tests pass
3. ✅ No regressions detected
4. ✅ Performance acceptable
5. ✅ Load tests successful
6. **→ Move to Task 6: Regression Testing**

---

## Troubleshooting

### Issue: Feature flag not working
```bash
# Verify environment variable
echo $ENABLE_CHUNKED_UPLOAD

# Check server logs for initialization
npm start | grep -i "chunked"

# Verify in code
grep -n "ENABLE_CHUNKED_UPLOAD" backend/server.js
```

### Issue: Port already in use
```bash
# Find and kill existing process
lsof -i :5000
kill -9 [PID]

# Or use different port
PORT=5001 npm start
```

### Issue: Permission errors
```bash
# Check directory permissions
ls -la /temp/uploads
ls -la /data/upload-sessions

# Fix permissions if needed
chmod -R 755 /temp/uploads
chmod -R 755 /data/upload-sessions
```

---

**Ready to test!** Let me know when you're ready to start or if you have questions.
