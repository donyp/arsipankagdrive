# Chunked Upload Implementation - Testing Checklist

**Backup Point**: Commit `7a34c40` | Branch: `backup/upload-system-snapshot-before-chunked`  
**Feature Branch**: `feature/chunked-upload-optimization`  
**Rollback**: `git checkout backup/upload-system-snapshot-before-chunked`

---

## Pre-Implementation Baseline Testing

### Current System Performance (Before Optimization)

#### Test 1.1: Single PDF Upload (Small: 1MB)
- [ ] Upload initiates without error
- [ ] File appears in database (files table or invoice_file_list)
- [ ] File path correct in Google Drive
- [ ] Timestamp recorded correctly
- [ ] User attribution recorded
- [ ] Total latency: ___ seconds (expected: 30-60s)
- [ ] Memory usage: ___ MB
- [ ] CPU usage: ___ %
- **Expected result**: ✓ Upload succeeds

#### Test 1.2: Single PDF Upload (Medium: 10MB)
- [ ] Upload succeeds
- [ ] Database record created
- [ ] File on Google Drive with correct structure
- [ ] Total latency: ___ seconds (expected: 60-120s)
- [ ] Memory usage peak: ___ MB
- **Expected result**: ✓ Upload succeeds

#### Test 1.3: Single PDF Upload (Large: 50MB)
- [ ] Upload succeeds
- [ ] Database record created
- [ ] File on Google Drive
- [ ] Total latency: ___ seconds (expected: 120-180s)
- [ ] Memory usage peak: ___ MB
- **Expected result**: ✓ Upload succeeds

#### Test 1.4: Duplicate Detection (File Exists)
- [ ] Upload same file twice
- [ ] Second upload rejected with 409 Conflict
- [ ] Error message clear: "File sudah ada (Duplicate)"
- [ ] Database not duplicated
- [ ] Only one file on Google Drive
- **Expected result**: ✓ Duplicate rejected correctly

#### Test 1.5: Duplicate Detection (File Deleted from Google Drive)
- [ ] Upload file, verify on Google Drive
- [ ] Delete file from Google Drive manually
- [ ] Re-upload same file
- [ ] System detects deletion and allows re-upload
- [ ] New file appears on Google Drive
- [ ] Database updated with new path
- **Expected result**: ✓ Re-upload allowed after deletion

#### Test 1.6: Invalid Filename Format
- [ ] Upload file with invalid format
- [ ] System rejects with clear error
- [ ] No database record created
- [ ] No partial file on Google Drive
- **Expected result**: ✓ Rejected correctly

#### Test 1.7: Network Failure During Upload
- [ ] Start upload
- [ ] Simulate network failure (kill network/proxy)
- [ ] Upload fails with error
- [ ] Temp file cleaned up
- [ ] Database not updated
- [ ] User must retry manually
- **Expected result**: ⚠️ Current behavior: no retry, manual retry needed

---

### Download & File Check Operations

#### Test 2.1: Single File Download
- [ ] Download file that exists
- [ ] File content correct
- [ ] File downloaded to client successfully
- [ ] Temp file cleaned up after download
- [ ] Total latency: ___ seconds (expected: 30-60s)
- **Expected result**: ✓ Download succeeds

#### Test 2.2: Combine Multiple PDFs
- [ ] Upload 3 different PDFs
- [ ] Call combine endpoint
- [ ] Combined PDF generated
- [ ] All 3 files merged correctly
- [ ] Total latency: ___ seconds (expected: 90-180s)
- [ ] Temp files cleaned up
- **Expected result**: ✓ Combine succeeds

#### Test 2.3: Download Non-Existent File
- [ ] Try to download file that doesn't exist
- [ ] System returns 404 error
- [ ] No temp files created
- [ ] No crashes or errors
- **Expected result**: ✓ Error handled gracefully

#### Test 2.4: File Availability Check
- [ ] Check if file exists (checkFileExists)
- [ ] File that exists: returns true
- [ ] File that doesn't exist: returns false
- [ ] Latency per check: ___ seconds (expected: 5-10s)
- [ ] Called 5+ times per upload, total time: ___ seconds
- **Expected result**: ⚠️ Current: 15-30s wasted on checks

#### Test 2.5: Parallel File Checks
- [ ] Make 5 simultaneous checkFileExists calls
- [ ] All complete without error
- [ ] Results consistent
- [ ] Total latency: ___ seconds (expected: ~5-10s with parallelization)
- **Current**: Sequential, so ~25-50s
- **Expected result**: Shows parallelization benefit

---

### Database Integrity Tests

#### Test 3.1: Invoice Table Consistency
- [ ] Upload invoice PDF
- [ ] Query invoice_file_list
- [ ] Verify: faktur, invoice_pdf_path, invoice_uploaded_at, uploaded_by all present
- [ ] Verify: invoice_pdf_path matches actual file location on Google Drive
- [ ] Verify: uploaded_at timestamp accurate (within 1 minute)
- [ ] Verify: uploaded_by matches logged-in user
- **Expected result**: ✓ All fields correct

#### Test 3.2: Files Table Consistency
- [ ] Upload file via /api/files/upload
- [ ] Query files table
- [ ] Verify: id, nama_file, storage_path, ukuran_bytes, category, zona_id, toko_id all present
- [ ] Verify: storage_path matches actual file on Google Drive
- [ ] Verify: ukuran_bytes = actual file size
- [ ] Verify: No orphaned records
- **Expected result**: ✓ All fields correct

#### Test 3.3: No Orphaned Files
- [ ] Upload 10 files
- [ ] Count database records
- [ ] Count files on Google Drive
- [ ] Numbers should match
- [ ] No orphaned files or records
- **Expected result**: ✓ 1:1 correspondence

#### Test 3.4: Bulk Upload (Excel) Consistency
- [ ] Upload Excel with 100 invoices
- [ ] Verify all 100 records in invoice_file_list
- [ ] Verify batch record in excel_upload_batches
- [ ] Verify: processed_rows = 100, failed_rows = 0
- [ ] Verify: All zona_id, toko_id valid
- [ ] Verify: No partial data
- **Expected result**: ✓ All 100 records consistent

#### Test 3.5: No Duplicate Records on Retry
- [ ] Upload file, verify in database
- [ ] Upload same file again (rejected)
- [ ] Query database, verify only 1 record
- [ ] No duplicate entries created
- **Expected result**: ✓ No duplicates

---

### Concurrent Upload Tests

#### Test 4.1: 5 Concurrent Uploads (Small files)
- [ ] Start 5 uploads simultaneously
- [ ] All 5 complete successfully
- [ ] Database: 5 records created
- [ ] Google Drive: 5 files appear
- [ ] Total time: ___ seconds
- [ ] Memory peak: ___ MB
- [ ] No file corruption or merge
- **Expected result**: ✓ All succeed independently

#### Test 4.2: 10 Concurrent Uploads (Mixed sizes)
- [ ] Start 10 uploads (1MB + 10MB mixed)
- [ ] All 10 complete
- [ ] Database: 10 records, no duplicates
- [ ] Google Drive: 10 files, correct sizes
- [ ] Memory peak: ___ MB (should not exceed reasonable limit)
- [ ] No timeouts or failures
- **Expected result**: ✓ All succeed

#### Test 4.3: Memory Under Load
- [ ] Monitor memory usage baseline
- [ ] Start 10 concurrent 50MB uploads
- [ ] Peak memory: ___ MB (should not exceed 2GB)
- [ ] No out-of-memory crashes
- [ ] All uploads complete
- **Expected result**: ✓ Memory remains under control

---

### Error Scenario Tests

#### Test 5.1: Upload with Zona Not Found
- [ ] Try to upload file with invalid zona_id
- [ ] System should reject with error
- [ ] Database not updated
- [ ] Clear error message to user
- **Expected result**: ✓ Rejected with clear error

#### Test 5.2: Upload with Toko Not Found
- [ ] Try to upload file with invalid toko_id
- [ ] System should reject
- [ ] Database not updated
- **Expected result**: ✓ Rejected with clear error

#### Test 5.3: Permission Denied
- [ ] Non-authenticated user tries upload
- [ ] System rejects with 401 Unauthorized
- [ ] No file created
- **Expected result**: ✓ Rejected with 401

#### Test 5.4: Wrong File Type
- [ ] Try to upload non-PDF file to PDF endpoint
- [ ] System rejects with 400 Bad Request
- [ ] Database not updated
- **Expected result**: ✓ Rejected with clear error

#### Test 5.5: File Too Large (>100MB)
- [ ] Try to upload 101MB file
- [ ] System rejects with 413 Payload Too Large
- [ ] Multer limits enforcement
- [ ] No partial upload on disk
- **Expected result**: ✓ Rejected by multer

---

### Performance Metrics (Baseline)

#### Current System Metrics
| Metric | Value | Unit |
|--------|-------|------|
| Upload 1MB | ___ | sec |
| Upload 10MB | ___ | sec |
| Upload 50MB | ___ | sec |
| Download 10MB | ___ | sec |
| Single checkFileExists | ___ | sec |
| 5x checkFileExists (sequential) | ___ | sec |
| Combine 3 PDFs | ___ | sec |
| Concurrent 5 uploads (peak memory) | ___ | MB |
| Concurrent 10 uploads (peak memory) | ___ | MB |

---

## Post-Optimization Testing

### After Cache Implementation
- [ ] File check latency reduced (cache hits within 5ms)
- [ ] No false cache results
- [ ] Cache invalidation works correctly
- [ ] TTL expiry correct (5 minutes)

### After Parallelization
- [ ] 5x checkFileExists: Parallel time ≤ 10 seconds (vs 25-50 sequential)
- [ ] Upload latency reduced by 50-70%
- [ ] No race conditions

### After Chunked Upload
- [ ] Upload resumable from any chunk
- [ ] Network failure recovery works
- [ ] Progress tracking accurate
- [ ] All original features still work

---

## Regression Detection Criteria

❌ **STOP & ROLLBACK if**:
- [ ] Upload success rate < 99%
- [ ] Database inconsistency detected (orphaned files/records)
- [ ] Duplicate detection fails
- [ ] Download corrupted files
- [ ] Memory spike > 3GB for concurrent uploads
- [ ] Latency increase (optimization should reduce, not increase)
- [ ] File count mismatch: database ≠ Google Drive
- [ ] User attribution lost
- [ ] Timestamps incorrect
- [ ] Permission system broken
- [ ] Any data loss observed

✓ **GREEN to deploy if**:
- [ ] All baseline tests still pass
- [ ] Performance improved as expected
- [ ] No regression in error handling
- [ ] Database integrity maintained
- [ ] No memory leaks detected
- [ ] Concurrent uploads work reliably

---

## Test Execution Script (Optional)

```bash
#!/bin/bash
# Run all tests against staging environment

echo "=== BASELINE TESTING (Current System) ==="
npm test -- --testPathPattern="upload.test.js"

echo "=== DATABASE INTEGRITY ==="
npm test -- --testPathPattern="database.test.js"

echo "=== ERROR SCENARIOS ==="
npm test -- --testPathPattern="error.test.js"

echo "=== CONCURRENT OPERATIONS ==="
npm test -- --testPathPattern="concurrent.test.js"

echo "=== PERFORMANCE BASELINE ==="
npm test -- --testPathPattern="performance.test.js"

# Capture baseline metrics
npm run test:metrics > baseline-metrics.json

echo "✓ All baseline tests complete"
```

---

## Rollback Decision Matrix

| Symptom | Action | Command |
|---------|--------|---------|
| Upload fail rate > 1% | ROLLBACK | `git checkout backup/upload-system-snapshot-before-chunked` |
| Database orphaned files found | ROLLBACK | `git checkout backup/upload-system-snapshot-before-chunked` |
| Duplicate not detected | ROLLBACK | `git checkout backup/upload-system-snapshot-before-chunked` |
| Memory spike > 3GB | ROLLBACK | `git checkout backup/upload-system-snapshot-before-chunked` |
| Latency increased | ROLLBACK | `git checkout backup/upload-system-snapshot-before-chunked` |
| Data loss detected | ROLLBACK + RESTORE DB from backup | See backup procedure |
| All tests pass, metrics improve | DEPLOY | Merge to master |

---

## Sign-Off Checklist

- [ ] Backup branch created: `backup/upload-system-snapshot-before-chunked`
- [ ] Backup files copied to `backend/backups/`
- [ ] Feature branch created: `feature/chunked-upload-optimization`
- [ ] Baseline metrics recorded
- [ ] Rollback procedure documented
- [ ] Testing checklist reviewed
- [ ] Ready to proceed with optimization
