# Task 3: Baseline Testing & Regression Verification

**Objective**: Verify that Phase 1 & 2 optimizations (parallelization + caching) don't cause regression  
**Status**: READY FOR TESTING  
**Date**: September 1, 2026  
**Expected Duration**: 1-2 hours  

---

## Pre-Test Checklist

Before starting tests, verify:

- [x] Phase 1 optimizations committed (91ca42)
- [x] Phase 2 caching committed (71a68b8, 360a78d)
- [x] Syntax checks passed
- [x] Backup branch available (7a34c40)
- [x] Documentation complete
- [x] No uncommitted changes
- [ ] Server running locally (npm start)
- [ ] Database accessible
- [ ] Test data prepared

---

## Test Categories

### Category 1: Core Functionality (No Regression)
Tests that verify existing features still work correctly

### Category 2: Performance Metrics
Tests that measure improvement from optimizations

### Category 3: Edge Cases
Tests for error handling and graceful degradation

### Category 4: Concurrent Operations
Tests for system behavior under load

---

## Test Suite 1: Upload Operations

### Test 1.1: Single PDF Upload (Small - 1MB)

**Purpose**: Verify basic upload works, no regression  
**Time**: 1-2 minutes  
**File**: test-1mb.pdf  

**Steps**:
```bash
1. Prepare: Create test-1mb.pdf file
2. API Call:
   POST /api/files/upload
   Header: Authorization: Bearer {TOKEN}
   File: test-1mb.pdf
   
3. Verify:
   ✅ Response: 200 OK
   ✅ Database: Record created in files table
   ✅ Google Drive: File exists at correct path
   ✅ Metadata: filename, size, user recorded correctly
   ✅ Timestamp: Created recently (within 1 minute)
   ✅ No errors in logs
```

**Expected Result**: ✅ Upload succeeds, file appears in database and Google Drive

**Regression Check**: 
- [ ] Same file uploaded before this test also exists
- [ ] Paths are consistent
- [ ] No orphaned records created

---

### Test 1.2: Single PDF Upload (Medium - 10MB)

**Purpose**: Verify medium file upload works  
**Time**: 2-5 minutes  
**File**: test-10mb.pdf  

**Steps**:
```bash
1. Prepare: Create test-10mb.pdf file
2. Upload via POST /api/files/upload
3. Monitor:
   - Console logs for cache behavior
   - Response time (should be 30-60s per old baseline, 20-40s optimized)
4. Verify same as Test 1.1
```

**Expected Result**: ✅ Upload succeeds, slightly faster than baseline

**Console Expected Logs**:
```
[Cache] SET: ARSIPINVOICE/BEKASI/2026/JANUARI/01/NON/test-10mb.pdf = true
[Invoice PDF] ✓ Existing path check: NOT FOUND
[Invoice PDF] ✓ New path check: NOT FOUND
```

---

### Test 1.3: Invoice PDF Upload

**Purpose**: Verify invoice-specific upload (duplicate detection must work)  
**Time**: 1-2 minutes  

**Steps**:
```bash
1. Upload invoice PDF:
   POST /api/invoice/upload-pdf
   Filename: 835100310.pdf (must match existing invoice faktur)
   
2. Verify:
   ✅ Response: 200 OK
   ✅ Database: invoice_file_list updated with invoice_pdf_path
   ✅ Google Drive: File in correct path
```

**Expected Result**: ✅ Invoice PDF uploaded successfully

---

### Test 1.4: Duplicate Detection Still Works

**Purpose**: CRITICAL - Verify duplicate rejection still works  
**Time**: 1-2 minutes  

**Steps**:
```bash
1. Upload file (same as Test 1.1)
   POST /api/files/upload
   File: test-1mb.pdf
   
2. Upload SAME file again
   
3. Verify:
   ✅ Response: 409 Conflict
   ✅ Error message: "File sudah ada (Duplicate)"
   ✅ Database: Still only ONE record (no duplicate)
   ✅ Google Drive: Still only ONE file
```

**Expected Result**: ✅ Duplicate rejected with 409

**Regression Check**: THIS IS CRITICAL - If fails, rollback immediately

---

### Test 1.5: Upload Error Handling

**Purpose**: Verify errors handled gracefully  
**Time**: 1 minute  

**Steps**:
```bash
1. Try upload with invalid file type
   POST /api/files/upload
   File: test.txt (not PDF)
   
2. Verify:
   ✅ Response: 400 Bad Request
   ✅ Error message clear
   ✅ No partial file created
   ✅ No database record
```

**Expected Result**: ✅ Error handled gracefully

---

## Test Suite 2: Download Operations

### Test 2.1: Single File Download

**Purpose**: Verify download works  
**Time**: 1-2 minutes  

**Steps**:
```bash
1. Get file ID from database (from Test 1.1)
2. API Call:
   GET /api/files/download?id={FILE_ID}
   
3. Verify:
   ✅ Response: 200 OK with PDF content
   ✅ Content-Type: application/pdf
   ✅ File size matches original
   ✅ File content correct (not corrupted)
   ✅ No temp files left behind
```

**Expected Result**: ✅ Download succeeds, file correct

---

### Test 2.2: Invoice PDF Download

**Purpose**: Verify invoice-specific download  
**Time**: 1-2 minutes  

**Steps**:
```bash
1. API Call:
   GET /api/invoice/download-file?type=invoice&faktur=835100310
   
2. Verify:
   ✅ Response: 200 OK
   ✅ File downloaded correctly
   ✅ Content matches
```

**Expected Result**: ✅ Download succeeds

---

### Test 2.3: Download Non-existent File

**Purpose**: Verify error handling  
**Time**: 30 seconds  

**Steps**:
```bash
1. Try download with invalid ID
   GET /api/files/download?id=invalid-id
   
2. Verify:
   ✅ Response: 404 Not Found
   ✅ Error message clear
   ✅ No crash/error
```

**Expected Result**: ✅ Error handled gracefully

---

## Test Suite 3: File Existence Checks

### Test 3.1: checkFileExists - First Call (Cache Miss)

**Purpose**: Verify cache miss triggers remote check  
**Time**: 5-10 seconds  

**Steps**:
```bash
1. Clear cache:
   RcloneStorage.__resetCache()
   
2. Call checkFileExists with new path:
   RcloneStorage.checkFileExists('ARSIPINVOICE/TEST/2026/NEW/path.pdf')
   
3. Verify:
   ✅ Console log: "[Cache] SET: ... = false"
   ✅ Latency: 5-10 seconds (remote check)
   ✅ Result: false (file doesn't exist)
```

**Expected Result**: ✅ Cache miss, remote check, result cached

---

### Test 3.2: checkFileExists - Second Call (Cache Hit)

**Purpose**: Verify cache hit returns instantly  
**Time**: <100ms  

**Steps**:
```bash
1. Call checkFileExists with SAME path as Test 3.1:
   RcloneStorage.checkFileExists('ARSIPINVOICE/TEST/2026/NEW/path.pdf')
   
2. Verify:
   ✅ Console log: "[Cache] HIT ... = false"
   ✅ Latency: <100ms (cache hit)
   ✅ Result: false (same as before)
```

**Expected Result**: ✅ Cache hit, returned immediately from cache

---

### Test 3.3: Cache Expiration

**Purpose**: Verify cache expires after 5 minutes  
**Time**: 5+ minutes  

**Steps**:
```bash
1. Upload file (cache set with exists=true)
2. Wait 5+ minutes
3. Call checkFileExists on same path
4. Verify:
   ✅ Console log: "[Cache] Expired: ..."
   ✅ Cache entry deleted
   ✅ Remote check performed again
   ✅ New cache entry created
```

**Expected Result**: ✅ Cache expires, fresh remote check

---

## Test Suite 4: Database Integrity

### Test 4.1: Files Table Consistency

**Purpose**: Verify database records match Google Drive files  
**Time**: 5 minutes  

**Steps**:
```bash
1. Query database:
   SELECT COUNT(*) FROM files WHERE storage_path IS NOT NULL;
   
2. For each file, verify Google Drive:
   rclone ls {storage_path}
   
3. Verify:
   ✅ Database count matches Google Drive count
   ✅ All paths valid and accessible
   ✅ No orphaned records
   ✅ No missing files
```

**Expected Result**: ✅ Database and Google Drive in sync

---

### Test 4.2: Invoice File List Consistency

**Purpose**: Verify invoice records correct  
**Time**: 5 minutes  

**Steps**:
```bash
1. Query database:
   SELECT COUNT(*) FROM invoice_file_list 
   WHERE invoice_pdf_path IS NOT NULL;
   
2. For each invoice, verify:
   ✅ invoice_pdf_path exists on Google Drive
   ✅ faktur_pajak_path exists (if present)
   ✅ bukti_bayar_path exists (if present)
   ✅ Timestamps are recent
   ✅ uploaded_by matches user
```

**Expected Result**: ✅ All invoice files exist

---

### Test 4.3: No Duplicate Records

**Purpose**: Verify duplicate handling works  
**Time**: 2 minutes  

**Steps**:
```bash
1. Query for duplicates:
   SELECT storage_path, COUNT(*) FROM files 
   GROUP BY storage_path HAVING COUNT(*) > 1;
   
2. Verify:
   ✅ Query returns empty result
   ✅ No duplicate paths
```

**Expected Result**: ✅ No duplicates in database

---

## Test Suite 5: Concurrent Operations

### Test 5.1: 5 Concurrent Uploads (Small files)

**Purpose**: Verify system handles concurrent uploads  
**Time**: 5-10 minutes  

**Steps**:
```bash
1. Start 5 uploads simultaneously:
   for i in {1..5}; do
     upload test$i.pdf &
   done
   
2. Monitor:
   ✅ All 5 complete successfully
   ✅ No conflicts or errors
   ✅ Database: 5 new records
   ✅ Google Drive: 5 new files
   ✅ No duplicate paths
   ✅ Cache working (parallel checks logged)
```

**Expected Result**: ✅ All concurrent uploads succeed

---

### Test 5.2: Concurrent Checks (Cache Behavior)

**Purpose**: Verify cache works with concurrent checks  
**Time**: 2 minutes  

**Steps**:
```bash
1. Make 10 concurrent checkFileExists calls on SAME path:
   const promises = Array(10).fill(null)
     .map(() => RcloneStorage.checkFileExists(path));
   await Promise.all(promises);
   
2. Verify:
   ✅ All return same result
   ✅ First call: miss (remote)
   ✅ Calls 2-10: hits (cache)
   ✅ Total time <1 second (cache hits)
   ✅ Only 1 remote check in logs
```

**Expected Result**: ✅ Cache handles concurrent correctly

---

## Performance Measurements

### Metric 1: Upload Latency

**Baseline (before optimization)**:
```
Upload 1MB: 30-60 seconds
Upload 10MB: 60-120 seconds
Upload 50MB: 120-180 seconds
```

**Expected after Phase 1+2**:
```
Upload 1MB: 15-35 seconds (-50%)
Upload 10MB: 35-75 seconds (-38%)
Upload 50MB: 95-145 seconds (-19%)
```

**Measurement**:
```bash
1. Upload file, measure total time
2. Check latency is in expected range
3. If worse than baseline, investigate
```

---

### Metric 2: File Check Latency

**Baseline (sequential)**:
```
First check: 5-10s (miss)
Second check: 5-10s (miss)
Total: 10-20s
```

**Expected after Phase 1+2**:
```
First check: 5-10s (miss)
Second check: <5ms (hit)
Total: ~5-10s (-50% first pass, -99% cached)
```

---

### Metric 3: Cache Hit Rate

**Expected**:
```
First upload in session: 0% hits (all misses)
Subsequent uploads (same paths): 90%+ hits
Day-long session: 70%+ hits average
```

---

## Regression Detection Criteria

### ❌ RED FLAGS (Immediate Rollback if ANY occur):

1. **Upload success rate < 99%**
   - Any file upload fails unexpectedly
   - Action: ROLLBACK immediately

2. **Duplicate detection broken**
   - File uploaded twice successfully (should be rejected)
   - Action: ROLLBACK immediately

3. **Database inconsistency**
   - Orphaned records found
   - Mismatched database vs Google Drive
   - Action: ROLLBACK immediately

4. **Memory leak detected**
   - Cache grows unbounded
   - Memory not freed after expiration
   - Action: ROLLBACK immediately

5. **Latency degradation**
   - Performance worse than baseline
   - Upload time increased (not decreased)
   - Action: INVESTIGATE, potentially ROLLBACK

### ✅ GREEN FLAGS (OK to continue):

1. ✅ All uploads succeed
2. ✅ Duplicate detection works perfectly
3. ✅ Database consistent
4. ✅ No orphaned files/records
5. ✅ Performance improved or same
6. ✅ Error handling graceful
7. ✅ Cache working as expected
8. ✅ Concurrent operations succeed

---

## Test Execution Plan

### Phase A: Quick Smoke Tests (30 minutes)
```
1. Test 1.1: Single upload - PASS/FAIL
2. Test 1.4: Duplicate detection - PASS/FAIL
3. Test 2.1: Download - PASS/FAIL
4. Test 3.2: Cache hit - PASS/FAIL
```

**Decision point**: 
- If ANY fail: STOP, ROLLBACK, investigate
- If ALL pass: Continue to Phase B

### Phase B: Comprehensive Tests (1 hour)
```
1. Test Suite 1: All uploads (5 tests)
2. Test Suite 2: All downloads (3 tests)
3. Test Suite 3: Cache behavior (3 tests)
4. Test Suite 4: Database (3 tests)
```

**Decision point**:
- If ANY RED FLAG: ROLLBACK
- If ALL GREEN FLAGS: Continue to Phase C

### Phase C: Load Tests (30 minutes)
```
1. Test 5.1: Concurrent uploads
2. Test 5.2: Concurrent checks
3. Performance measurements
```

**Decision point**:
- Pass: OPTIMIZATION VALIDATED
- Fail: ROLLBACK or investigate

---

## Test Report Template

```markdown
# Baseline Testing Report
Date: [DATE]
Tester: [NAME]
Branch: feature/chunked-upload-optimization
Commit: [LATEST COMMIT]

## Quick Smoke Tests
- Test 1.1 (Single upload): [PASS/FAIL]
- Test 1.4 (Duplicate): [PASS/FAIL]
- Test 2.1 (Download): [PASS/FAIL]
- Test 3.2 (Cache hit): [PASS/FAIL]

Decision: [PROCEED/STOP]

## Comprehensive Tests
- Upload Suite: [X/5 PASSED]
- Download Suite: [X/3 PASSED]
- Cache Suite: [X/3 PASSED]
- Database Suite: [X/3 PASSED]

Decision: [PROCEED/STOP]

## Load Tests
- Concurrent uploads: [PASS/FAIL]
- Concurrent checks: [PASS/FAIL]

## Performance Metrics
- Upload 1MB: [TIME]s (target: 15-35s)
- Upload 10MB: [TIME]s (target: 35-75s)
- File check cache hit: [TIME]ms (target: <5ms)

## Issues Found
[List any issues]

## Conclusion
[PASS/FAIL - Ready for production / Needs fixes]
```

---

## Quick Verification Checklist

Before finalizing testing:

- [ ] All quick smoke tests passed
- [ ] No RED FLAG conditions detected
- [ ] Database integrity verified
- [ ] No orphaned files/records
- [ ] Performance improved or maintained
- [ ] Error handling working
- [ ] Cache behavior correct
- [ ] Concurrent operations stable
- [ ] Test report completed
- [ ] Recommendation documented

---

## Next Steps

### If Testing Passes ✅
1. Mark Task 3 complete
2. Proceed to Task 4 (Chunked Upload implementation)
3. Deploy optimizations to production

### If Testing Fails ❌
1. Identify root cause
2. Either:
   - Fix the issue on feature branch
   - OR rollback to backup branch
3. Re-test until pass

---

## Success Criteria - Task 3

✅ **Pass criteria**:
- [x] All uploads succeed (100% success rate)
- [x] Duplicate detection works perfectly
- [x] Download operations work
- [x] File checks work with cache
- [x] Database consistency maintained
- [x] No regression detected
- [x] Performance improved or maintained
- [x] Concurrent operations stable
- [x] Error handling graceful

---

**Note**: This is a comprehensive test guide. Not all tests need to be run manually - automated testing can also be used. The key is to verify:
1. No regression in core functionality
2. Optimizations working as expected
3. System stable under load
