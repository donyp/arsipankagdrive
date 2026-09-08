# Task 6: Regression Testing & Validation Plan

**Date**: September 1, 2026  
**Status**: PLANNING COMPLETE  
**Focus**: Validate zero regression in existing functionality  
**Duration**: 2-3 hours execution  

---

## Executive Summary

**Objective**: Verify that adding chunked upload system hasn't broken any existing functionality.

**Scope**:
- Upload endpoints (old `/api/files/upload`)
- Download endpoints
- File existence checks
- Cache layer (from Phase 2)
- Parallelization (from Phase 1)
- Database integrity
- Concurrent operations
- Error handling

**Expected Outcome**:
- ✅ 100% of old tests pass
- ✅ Cache still working (5-10s → 5ms)
- ✅ Parallelization still active (20-25% improvement)
- ✅ No performance regression
- ✅ No data corruption
- ✅ Ready for Task 7 (monitoring)

---

## Pre-Regression Checklist

### ✅ Environment Verification
```bash
# 1. Feature flag status
echo "ENABLE_CHUNKED_UPLOAD=$ENABLE_CHUNKED_UPLOAD"

# 2. Server running
curl http://localhost:5000/api/health
# Expected: 200 OK

# 3. Database connected
curl http://localhost:5000/api/zones
# Expected: 200 with data

# 4. File storage ready
ls -la /temp/uploads/
# Expected: directory exists or empty

# 5. Cache initialized
curl http://localhost:5000/api/files/exists?remote_path=test
# Expected: 200 with existence check
```

### ✅ Code Quality Check
```bash
# 1. Syntax check
node -c backend/server.js
node -c backend/invoice-endpoints.js
node -c backend/rclone_wrapper.js
# Expected: No syntax errors

# 2. Module imports
grep -n "require.*upload-session" backend/server.js
# Expected: Only imported if ENABLE_CHUNKED_UPLOAD=true

# 3. Route conflicts
grep -n "app.post.*'/api/files" backend/server.js
grep -n "app.get.*'/api/files" backend/server.js
# Expected: Old routes not duplicated
```

### ✅ Git Status
```bash
# 1. Current branch
git branch
# Expected: feature/chunked-upload-optimization

# 2. Uncommitted changes
git status
# Expected: clean (or only test files)

# 3. Backup branch exists
git branch | grep backup
# Expected: backup/upload-system-snapshot-before-chunked
```

---

## Phase 1: Old Upload Endpoint Tests

### Test 1.1: Single File Upload (Standard)
```bash
# Prerequisites
ZONA_ID=1
TOKO_ID=1
JWT_TOKEN="your-jwt-token-here"
FILE_SIZE="1MB"

# Create test file
dd if=/dev/urandom of=test-upload-1mb.pdf bs=1024 count=1024

# Upload
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-upload-1mb.pdf" \
  -F "zona_id=$ZONA_ID" \
  -F "toko_id=$TOKO_ID" \
  -F "category=INVOICE"

# Expected Response (200):
{
  "success": true,
  "fileName": "test-upload-1mb.pdf",
  "fileSize": 1048576,
  "remoteDestination": "ARSIPINVOICE/...",
  "message": "File uploaded successfully"
}
```

**Verification Points**:
- [ ] Upload succeeds (200 OK)
- [ ] File created on Google Drive
- [ ] Database entry created
- [ ] No chunked upload triggered
- [ ] Response includes fileId

**Regression Criteria**:
- File actually uploadable
- Size matches
- Path correct
- No errors in logs

---

### Test 1.2: Medium File Upload (10MB)
```bash
# Create 10MB test file
dd if=/dev/urandom of=test-upload-10mb.pdf bs=1024 count=10240

# Upload same as Test 1.1
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-upload-10mb.pdf" \
  -F "zona_id=$ZONA_ID" \
  -F "toko_id=$TOKO_ID" \
  -F "category=INVOICE"

# Expected Response (200) with 10MB file
```

**Timing**:
- Should take 8-15 seconds (old performance, no chunking)
- Should NOT use chunked endpoints
- Should NOT create temp files in /temp/uploads

**Verification**:
- [ ] 10MB file uploads
- [ ] Takes expected time
- [ ] File on Google Drive
- [ ] No chunking involved

---

### Test 1.3: Large File Upload (50MB)
```bash
# Create 50MB test file
dd if=/dev/urandom of=test-upload-50mb.pdf bs=1024 count=51200

# Upload
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-upload-50mb.pdf" \
  -F "zona_id=$ZONA_ID" \
  -F "toko_id=$TOKO_ID" \
  -F "category=INVOICE"

# Expected Response (200) with 50MB file
```

**Timing**:
- Should take 30-60 seconds
- Should NOT timeout (100MB limit still exists)
- Should complete successfully

**Verification**:
- [ ] 50MB file uploads completely
- [ ] No timeout errors
- [ ] File verified on Google Drive

---

### Test 1.4: Duplicate File Rejection
```bash
# Upload file first time
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-upload-1mb.pdf" \
  -F "zona_id=$ZONA_ID" \
  -F "toko_id=$TOKO_ID" \
  -F "category=INVOICE"

# Upload same file again (with same properties)
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-upload-1mb.pdf" \
  -F "zona_id=$ZONA_ID" \
  -F "toko_id=$TOKO_ID" \
  -F "category=INVOICE"

# Expected Response (409):
{
  "error": "File sudah ada di sistem",
  "existingFile": {...}
}
```

**Verification**:
- [ ] Duplicate rejected (409 Conflict)
- [ ] Error message clear
- [ ] No duplicate uploaded
- [ ] Existing file info returned

---

### Test 1.5: Invalid File Type Rejection
```bash
# Create non-PDF file
echo "This is not a PDF" > test-file.txt

# Try to upload
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-file.txt" \
  -F "zona_id=$ZONA_ID" \
  -F "toko_id=$TOKO_ID" \
  -F "category=INVOICE"

# Expected Response (400):
{
  "error": "Hanya file PDF yang diizinkan"
}
```

**Verification**:
- [ ] Non-PDF rejected (400 Bad Request)
- [ ] Error message clear
- [ ] No file stored

---

### Test 1.6: Missing Required Fields
```bash
# Upload without zona_id
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-upload-1mb.pdf" \
  -F "toko_id=$TOKO_ID" \
  -F "category=INVOICE"

# Expected Response (400):
{
  "error": "zona_id wajib diisi"
}

# Upload without file
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "zona_id=$ZONA_ID" \
  -F "toko_id=$TOKO_ID" \
  -F "category=INVOICE"

# Expected Response (400):
{
  "error": "Tidak ada file yang diupload"
}
```

**Verification**:
- [ ] Missing fields rejected
- [ ] Clear error messages
- [ ] Proper HTTP status

---

## Phase 2: Download Functionality Tests

### Test 2.1: Download Existing File
```bash
# First upload a file
UPLOADED_FILE_ID=$(curl -s -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-upload-1mb.pdf" \
  -F "zona_id=$ZONA_ID" \
  -F "toko_id=$TOKO_ID" \
  -F "category=INVOICE" | grep -o '"fileId":"[^"]*' | cut -d'"' -f4)

# Download using fileId
curl -X GET "http://localhost:5000/api/files/download?fileId=$UPLOADED_FILE_ID" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -o downloaded-file.pdf

# Verify
file downloaded-file.pdf
# Expected: PDF document

# Compare sizes
stat -c%s test-upload-1mb.pdf
stat -c%s downloaded-file.pdf
# Expected: Same size
```

**Verification**:
- [ ] File downloads successfully
- [ ] Downloaded file is valid PDF
- [ ] File size matches original
- [ ] Checksum matches (optional)

---

### Test 2.2: Download Non-Existent File
```bash
# Try to download non-existent file
curl -X GET "http://localhost:5000/api/files/download?fileId=non-existent-id" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected Response (404):
{
  "error": "File tidak ditemukan"
}
```

**Verification**:
- [ ] 404 returned for missing file
- [ ] Clear error message
- [ ] No crash or error logs

---

### Test 2.3: Download Without Authorization
```bash
# Download without JWT token
curl -X GET "http://localhost:5000/api/files/download?fileId=$UPLOADED_FILE_ID"

# Expected Response (401):
{
  "error": "Unauthorized"
}
```

**Verification**:
- [ ] 401 for missing token
- [ ] Auth check working
- [ ] No unauthorized access

---

## Phase 3: File Existence Check Tests

### Test 3.1: Existing File Check (with Cache)
```bash
# First upload a file
curl -s -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-upload-1mb.pdf" \
  -F "zona_id=$ZONA_ID" \
  -F "toko_id=$TOKO_ID" \
  -F "category=INVOICE" > /dev/null

# Check file existence (first time - cache miss)
time curl -X GET "http://localhost:5000/api/files/exists?remote_path=ARSIPINVOICE/2026/test.pdf" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected Response (200): Should take 5-10 seconds
{
  "exists": true,
  "path": "ARSIPINVOICE/2026/test.pdf",
  "size": 1048576
}

# Check file existence again (second time - cache hit)
time curl -X GET "http://localhost:5000/api/files/exists?remote_path=ARSIPINVOICE/2026/test.pdf" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected Response (200): Should take < 50ms (cache hit)
{
  "exists": true,
  "path": "ARSIPINVOICE/2026/test.pdf",
  "size": 1048576,
  "cached": true
}
```

**Performance Verification**:
- [ ] First check: 5-10 seconds (remote lookup)
- [ ] Second check: < 50ms (cache hit)
- [ ] Cache TTL: 5 minutes
- [ ] Cache providing 99%+ speedup

**Cache Criteria** (Phase 2 regression):
- [ ] Cache still working
- [ ] TTL still 5 minutes
- [ ] Hit rate > 50% on repeated checks
- [ ] No stale data issues

---

### Test 3.2: Non-Existent File Check
```bash
# Check non-existent file
curl -X GET "http://localhost:5000/api/files/exists?remote_path=NONEXISTENT/file.pdf" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected Response (200):
{
  "exists": false,
  "path": "NONEXISTENT/file.pdf"
}
```

**Verification**:
- [ ] Correctly reports non-existent
- [ ] No errors
- [ ] Cache also caches negative results

---

### Test 3.3: Cache Invalidation
```bash
# 1. Check file (will cache result)
curl -s -X GET "http://localhost:5000/api/files/exists?remote_path=ARSIPINVOICE/2026/test.pdf" \
  -H "Authorization: Bearer $JWT_TOKEN" > /dev/null

# 2. Get cache status
curl -X GET "http://localhost:5000/api/files/cache-status" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected Response:
{
  "cacheSize": 1,
  "entries": [
    {
      "path": "ARSIPINVOICE/2026/test.pdf",
      "cached": true,
      "age": "2 seconds"
    }
  ]
}

# 3. Invalidate cache
curl -X POST "http://localhost:5000/api/files/cache-invalidate" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"path": "ARSIPINVOICE/2026/test.pdf"}'

# Expected Response (200):
{
  "success": true,
  "message": "Cache invalidated for ARSIPINVOICE/2026/test.pdf"
}

# 4. Verify cache cleared
curl -X GET "http://localhost:5000/api/files/cache-status" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected: cacheSize = 0
```

**Verification**:
- [ ] Cache tracking working
- [ ] Cache size visible
- [ ] Can invalidate specific entries
- [ ] Cache clearing effective

---

## Phase 4: Parallelization Verification (Phase 1 Regression)

### Test 4.1: Parallel File Checks Still Active
```bash
# Measure performance of upload with file checks
# (should use parallelized Promise.allSettled())

time curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-upload-5mb.pdf" \
  -F "zona_id=$ZONA_ID" \
  -F "toko_id=$TOKO_ID" \
  -F "category=INVOICE"

# Expected timing: 8-15 seconds (not 20-30)
# This indicates parallelization is working
```

**Verification Criteria** (Phase 1 regression):
- [ ] Parallel checks still active
- [ ] No sequential bottlenecks introduced
- [ ] Performance degradation < 5%
- [ ] Promise.allSettled() still being used

**Check Code**:
```bash
grep -n "Promise.allSettled" backend/invoice-endpoints.js
# Expected: Multiple instances (upload-pdf, upload-document sections)
```

---

## Phase 5: Database Integrity Tests

### Test 5.1: File Metadata Stored Correctly
```bash
# Upload file
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-upload-1mb.pdf" \
  -F "zona_id=$ZONA_ID" \
  -F "toko_id=$TOKO_ID" \
  -F "category=INVOICE"

# Query database to verify entry
curl -X GET "http://localhost:5000/api/files?zona_id=$ZONA_ID" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected Response (200):
{
  "files": [
    {
      "id": "...",
      "fileName": "test-upload-1mb.pdf",
      "fileSize": 1048576,
      "zona_id": 1,
      "toko_id": 1,
      "category": "INVOICE",
      "uploadedAt": "2026-09-01T...",
      "uploadedBy": "...",
      "remoteDestination": "..."
    }
  ]
}
```

**Verification**:
- [ ] File entry in database
- [ ] All metadata correct
- [ ] No NULL values in required fields
- [ ] Timestamps valid

---

### Test 5.2: No Data Corruption
```bash
# Download file and verify checksum
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-upload-1mb.pdf" \
  -F "zona_id=$ZONA_ID" \
  -F "toko_id=$TOKO_ID" \
  -F "category=INVOICE" > upload-response.json

FILE_ID=$(grep -o '"fileId":"[^"]*' upload-response.json | cut -d'"' -f4)

# Calculate original checksum
md5sum test-upload-1mb.pdf > original-checksum.txt

# Download and verify
curl -X GET "http://localhost:5000/api/files/download?fileId=$FILE_ID" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -o downloaded-test.pdf

md5sum downloaded-test.pdf > downloaded-checksum.txt

# Compare
diff original-checksum.txt downloaded-checksum.txt
# Expected: No output (files identical)
```

**Verification**:
- [ ] Downloaded file matches original
- [ ] Checksums identical
- [ ] No data corruption
- [ ] File integrity maintained

---

## Phase 6: Concurrent Operation Tests

### Test 6.1: Multiple Concurrent Uploads
```bash
#!/bin/bash

# Upload 5 files concurrently
for i in {1..5}; do
  (
    curl -s -X POST http://localhost:5000/api/files/upload \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -F "file=@test-upload-1mb.pdf" \
      -F "zona_id=$ZONA_ID" \
      -F "toko_id=$TOKO_ID" \
      -F "category=INVOICE" > /dev/null
    echo "Upload $i completed"
  ) &
done

wait
echo "All concurrent uploads completed"

# Verify all files uploaded
curl -s -X GET "http://localhost:5000/api/files?zona_id=$ZONA_ID" \
  -H "Authorization: Bearer $JWT_TOKEN" | grep -c '"id"'
# Expected: 5 files
```

**Verification**:
- [ ] All 5 files upload successfully
- [ ] No conflicts or errors
- [ ] Database has 5 entries
- [ ] No race conditions

---

### Test 6.2: Concurrent Uploads + Downloads
```bash
#!/bin/bash

# 1. Upload 3 files first
FILE_IDS=()
for i in {1..3}; do
  ID=$(curl -s -X POST http://localhost:5000/api/files/upload \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -F "file=@test-upload-1mb.pdf" \
    -F "zona_id=$ZONA_ID" \
    -F "toko_id=$TOKO_ID" \
    -F "category=INVOICE" | grep -o '"fileId":"[^"]*' | cut -d'"' -f4)
  FILE_IDS+=($ID)
done

# 2. Download while uploading new files
(
  # Download in background
  for id in "${FILE_IDS[@]}"; do
    curl -s -X GET "http://localhost:5000/api/files/download?fileId=$id" \
      -H "Authorization: Bearer $JWT_TOKEN" > /dev/null &
  done
  
  # While downloading, upload new files
  for i in {4..6}; do
    curl -s -X POST http://localhost:5000/api/files/upload \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -F "file=@test-upload-1mb.pdf" \
      -F "zona_id=$ZONA_ID" \
      -F "toko_id=$TOKO_ID" \
      -F "category=INVOICE" > /dev/null &
  done
  
  wait
)

echo "Concurrent upload/download completed"
```

**Verification**:
- [ ] Downloads complete successfully
- [ ] Uploads complete successfully
- [ ] No conflicts
- [ ] No dropped connections
- [ ] Server remains responsive

---

## Phase 7: Error Handling & Edge Cases

### Test 7.1: Upload with Malformed Metadata
```bash
# Upload with invalid zona_id (string instead of number)
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-upload-1mb.pdf" \
  -F "zona_id=invalid" \
  -F "toko_id=$TOKO_ID" \
  -F "category=INVOICE"

# Expected Response: Should be rejected or coerced properly
# Expected (400): "zona_id must be a number"
```

**Verification**:
- [ ] Validation working
- [ ] Type checking working
- [ ] Error message clear

---

### Test 7.2: Upload with Missing JWT Token
```bash
# Upload without authorization header
curl -X POST http://localhost:5000/api/files/upload \
  -F "file=@test-upload-1mb.pdf" \
  -F "zona_id=$ZONA_ID" \
  -F "toko_id=$TOKO_ID" \
  -F "category=INVOICE"

# Expected Response (401):
{
  "error": "Unauthorized - missing or invalid token"
}
```

**Verification**:
- [ ] Auth check enforced
- [ ] 401 returned
- [ ] No unauthorized uploads

---

### Test 7.3: Network Interruption Simulation
```bash
# Test timeout handling
timeout 2 curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-upload-50mb.pdf" \
  -F "zona_id=$ZONA_ID" \
  -F "toko_id=$TOKO_ID" \
  -F "category=INVOICE"

# Expected: Connection closed/timeout
# Old system: Complete restart needed
# New system: If chunked enabled, can resume

# Check server still responsive
curl http://localhost:5000/api/health
# Expected: 200 OK (server not crashed)
```

**Verification**:
- [ ] Server handles timeout gracefully
- [ ] Server not crashed
- [ ] Clean error response

---

## Phase 8: Performance Regression Check

### Test 8.1: Baseline Performance Comparison

**Measurement Points**:
```
Single 1MB upload:
- Old system: 2-3 seconds
- Expected (no regression): 2-3 seconds
- Acceptable variance: ±20%

Single 10MB upload:
- Old system: 8-15 seconds
- Expected (no regression): 8-15 seconds
- Acceptable variance: ±20%

File existence check (cold):
- Expected: 5-10 seconds
- With cache (hit): < 50ms
- Cache performance maintained: 99%+ speedup

File existence check (cached):
- Expected: < 50ms
- Regression if: > 100ms
```

### Test 8.2: Measure End-to-End Upload Time
```bash
#!/bin/bash

echo "Performance Regression Check"
echo "============================"

# Test 1: 1MB file
echo -n "1MB upload: "
time curl -s -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-upload-1mb.pdf" \
  -F "zona_id=$ZONA_ID" \
  -F "toko_id=$TOKO_ID" \
  -F "category=INVOICE" > /dev/null

# Test 2: 10MB file
echo -n "10MB upload: "
time curl -s -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test-upload-10mb.pdf" \
  -F "zona_id=$ZONA_ID" \
  -F "toko_id=$TOKO_ID" \
  -F "category=INVOICE" > /dev/null

# Test 3: File check (first time)
echo -n "File check (cold): "
time curl -s -X GET "http://localhost:5000/api/files/exists?remote_path=ARSIPINVOICE/2026/test.pdf" \
  -H "Authorization: Bearer $JWT_TOKEN" > /dev/null

# Test 4: File check (cached)
echo -n "File check (cached): "
time curl -s -X GET "http://localhost:5000/api/files/exists?remote_path=ARSIPINVOICE/2026/test.pdf" \
  -H "Authorization: Bearer $JWT_TOKEN" > /dev/null
```

**Expected Results**:
```
1MB upload:      2-4 seconds (no change)
10MB upload:     8-20 seconds (no change)
File check cold: 5-10 seconds (no change)
File check hot:  < 50ms (cache working)
```

**Regression Criteria** (red flags):
- 1MB upload > 5 seconds
- 10MB upload > 25 seconds
- File check cold > 15 seconds
- File check hot > 200ms
- Variance > 30%

---

## Phase 9: Final Verification Checklist

### Code Verification
```bash
# 1. No new syntax errors
node -c backend/server.js
node -c backend/invoice-endpoints.js
node -c backend/rclone_wrapper.js
node -c backend/upload-session-manager.js
node -c backend/chunk-handler.js
node -c backend/file-assembler.js
node -c backend/chunked-upload-endpoints.js
# Expected: All pass

# 2. Module imports correct
grep "require.*chunk" backend/server.js
# Expected: Only loaded if ENABLE_CHUNKED_UPLOAD=true

# 3. No old endpoint modifications
git diff HEAD~1 backend/invoice-endpoints.js
# Expected: Only Phase 1 parallelization, nothing new

# 4. Feature flag in place
grep "ENABLE_CHUNKED_UPLOAD" backend/server.js
# Expected: 3+ occurrences (definition, condition, logging)
```

### Documentation Verification
```bash
# 1. All test documentation exists
ls -la TASK*.md
# Expected: TASK1-5 all present

# 2. API documentation complete
grep -c "POST /api/files" CHUNKED_UPLOAD_API_REFERENCE.md
# Expected: 5 endpoints documented

# 3. Rollback procedure ready
grep -c "git checkout" ROLLBACK_INSTRUCTIONS.md
# Expected: Procedure clear and documented
```

### Git Verification
```bash
# 1. All commits present
git log --oneline | head -10
# Expected: All Task 1-5 commits visible

# 2. Backup branch exists
git branch | grep backup
# Expected: backup/upload-system-snapshot-before-chunked

# 3. Feature branch clean
git status
# Expected: clean working directory
```

---

## Test Result Reporting

### Template for Results
```markdown
# Regression Testing Results

**Date**: [Date]
**Tester**: [Name]
**Duration**: [X] hours
**Server**: [Hostname/Port]

## Phase 1: Old Upload Endpoint
- [ ] Single 1MB upload: ✅ PASS (3 seconds)
- [ ] Medium 10MB upload: ✅ PASS (12 seconds)
- [ ] Large 50MB upload: ✅ PASS (45 seconds)
- [ ] Duplicate rejection: ✅ PASS (409 error)
- [ ] Invalid file type: ✅ PASS (400 error)
- [ ] Missing fields: ✅ PASS (400 error)

## Phase 2: Download
- [ ] Download existing file: ✅ PASS
- [ ] Download 50MB file: ✅ PASS
- [ ] Download non-existent: ✅ PASS (404 error)
- [ ] Auth validation: ✅ PASS (401 error)
- [ ] File checksum verified: ✅ PASS

## Phase 3: File Existence Check
- [ ] File check (cold): ✅ PASS (7 seconds)
- [ ] File check (cached): ✅ PASS (15ms)
- [ ] Cache speedup: ✅ PASS (99% improvement)
- [ ] Non-existent file: ✅ PASS

## Phase 4: Parallelization
- [ ] Upload latency: ✅ PASS (8-15s range)
- [ ] Parallel checks active: ✅ PASS
- [ ] No sequential bottleneck: ✅ PASS

## Phase 5: Database
- [ ] Metadata stored correctly: ✅ PASS
- [ ] No data corruption: ✅ PASS
- [ ] All fields present: ✅ PASS

## Phase 6: Concurrent Operations
- [ ] 5 concurrent uploads: ✅ PASS
- [ ] Concurrent upload + download: ✅ PASS
- [ ] No race conditions: ✅ PASS

## Phase 7: Error Handling
- [ ] Malformed metadata: ✅ PASS (validated)
- [ ] Missing auth: ✅ PASS (401 error)
- [ ] Network timeout: ✅ PASS (graceful)

## Phase 8: Performance
- [ ] 1MB upload: ✅ PASS (3 seconds)
- [ ] 10MB upload: ✅ PASS (12 seconds)
- [ ] No regression detected: ✅ PASS
- [ ] Variance < 20%: ✅ PASS

## Overall Status
- Total tests: 30
- Passed: 30
- Failed: 0
- Warnings: 0

## Conclusion
✅ **ZERO REGRESSION DETECTED**

All old functionality working perfectly.
No performance degradation.
System ready for Task 7 (monitoring).

**Sign-off**: [Tester] on [Date]
```

---

## Success Criteria

✅ **Task 6 COMPLETE** when:
- [ ] All Phase 1-8 tests pass (30 tests)
- [ ] Zero regressions detected
- [ ] Performance acceptable (variance < 20%)
- [ ] No data corruption
- [ ] Cache still working (99% speedup)
- [ ] Parallelization still active
- [ ] All error handling working
- [ ] Database integrity verified
- [ ] Results documented
- [ ] Ready for Task 7

---

## Rollback Plan (if issues found)

### If Regression Detected
```bash
# 1. Identify issue
# 2. Check logs for errors
tail -f logs/server.log

# 3. Disable feature flag (quick fix)
export ENABLE_CHUNKED_UPLOAD=false
npm restart

# 4. Test again
curl http://localhost:5000/api/files/upload

# 5. If issue persists, full rollback
git checkout backup/upload-system-snapshot-before-chunked
npm restart

# 6. Notify team
echo "Rollback complete - investigating issue"
```

---

## Timeline

| Phase | Tests | Duration | Status |
|-------|-------|----------|--------|
| 1 | 6 | 15 min | ⏳ Ready |
| 2 | 3 | 10 min | ⏳ Ready |
| 3 | 3 | 10 min | ⏳ Ready |
| 4 | 1 | 5 min | ⏳ Ready |
| 5 | 2 | 10 min | ⏳ Ready |
| 6 | 2 | 15 min | ⏳ Ready |
| 7 | 3 | 10 min | ⏳ Ready |
| 8 | 2 | 15 min | ⏳ Ready |
| 9 | 3 | 10 min | ⏳ Ready |
| **Total** | **30** | **2-3 hours** | ⏳ Ready |

---

**Status**: ✅ PLAN COMPLETE - READY FOR EXECUTION

Execute when ready. All test procedures documented and ready to run.
