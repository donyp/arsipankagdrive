# Task 2: Parallelize File Checks - Implementation Guide

**Objective**: Replace sequential file checks with parallel checks using `Promise.all()`  
**Risk Level**: LOW (timing change only, no logic change)  
**Expected Benefit**: 50-70% latency reduction on file checks  
**Estimated Time**: 30 minutes  

---

## Current Implementation (Sequential)

### Pattern 1: Upload PDF Endpoint (lines 1254-1329)
```javascript
// ❌ CURRENT (Sequential - total ~10-20 seconds)
try {
    // Check 1: Verify existing path (lines 1260-1270)
    const fileExists = await RcloneStorage.checkFileExists(invoice.invoice_pdf_path);
    if (fileExists) {
        return res.status(409).json({ ... });
    }
} catch (verifyErr) { ... }

// Then later...
try {
    // Check 2: Verify new upload path (lines 1315-1329)  
    const fileExists = await RcloneStorage.checkFileExists(uploadPath);
    if (fileExists && !isReuploadWithNewPath) {
        return res.status(409).json({ ... });
    }
} catch (checkErr) { ... }
// Total sequential time: ~10-20 seconds (2 checks × 5-10 seconds each)
```

### Pattern 2: Upload Document Endpoint (lines 1469-1556)
Similar pattern with multiple sequential checks:
- Check 1: Verify existing faktur_pajak_path (lines 1471-1490)
- Check 2: Check for duplicate at new upload path (lines 1523-1539)

---

## Optimization Strategy

### Step 1: Consolidate Checks into Parallel Array

Instead of sequential `await`, collect all checks into array:

```javascript
// ✅ NEW (Parallel - total ~5-10 seconds)
const checkPromises = [];
const checkLabels = [];

// Prepare checks
if (invoice.invoice_pdf_path) {
    checkPromises.push(RcloneStorage.checkFileExists(invoice.invoice_pdf_path));
    checkLabels.push('existing');
}

checkPromises.push(RcloneStorage.checkFileExists(uploadPath));
checkLabels.push('new');

// Execute ALL checks in parallel
const results = await Promise.all(checkPromises);

// Process results
let existingFileExists = false;
let newFileExists = false;

for (let i = 0; i < results.length; i++) {
    if (checkLabels[i] === 'existing') {
        existingFileExists = results[i];
    } else if (checkLabels[i] === 'new') {
        newFileExists = results[i];
    }
}

// Apply logic
if (existingFileExists) {
    return res.status(409).json({ ... });
}
if (newFileExists && !isReuploadWithNewPath) {
    return res.status(409).json({ ... });
}
```

### Step 2: Handle Errors Gracefully

Wrap Promise.all with try-catch, but don't break on individual failures:

```javascript
// Better approach: Use Promise.allSettled() for individual error handling
const results = await Promise.allSettled(checkPromises);

let existingFileExists = false;
let newFileExists = false;

for (let i = 0; i < results.length; i++) {
    const result = results[i];
    
    if (result.status === 'fulfilled') {
        if (checkLabels[i] === 'existing') {
            existingFileExists = result.value;
        } else if (checkLabels[i] === 'new') {
            newFileExists = result.value;
        }
    } else {
        // Individual check failed
        console.warn(`[Invoice PDF] Check failed for ${checkLabels[i]}: ${result.reason.message}`);
        // Graceful fallback: assume file doesn't exist (allow upload)
    }
}
```

---

## Endpoints Affected

### Priority 1: High Impact (Multiple checks per upload)
1. **POST /api/invoice/upload-pdf** (lines 1215-1400)
   - 2 sequential checks → parallel
   - Expected latency reduction: 5-10 seconds per upload

2. **POST /api/invoice/upload-document** (lines 1404-1700+)
   - 3 sequential checks (existing + duplicate for each type) → parallel
   - Expected latency reduction: 10-15 seconds per upload

3. **POST /api/invoice/upload-faktur-pajak** (lines 1773-1900)
   - 2 sequential checks → parallel
   - Expected latency reduction: 5-10 seconds per upload

### Priority 2: Medium Impact
4. **POST /api/files/upload** (server.js, lines 1889-2000)
   - 2-3 checks typically → parallel
   - Expected latency reduction: 5-10 seconds per upload

### Priority 3: Low Impact
5. **POST /api/files/upload-piutang** (server.js, lines 2201-2300)
   - Occasional use, fewer checks
   - Expected latency reduction: 2-5 seconds per upload

---

## Implementation Checklist

- [ ] Backup current files (✅ Already done)
- [ ] Implement parallelization for upload-pdf endpoint
- [ ] Implement parallelization for upload-document endpoint
- [ ] Implement parallelization for upload-faktur-pajak endpoint
- [ ] Implement parallelization for /api/files/upload endpoint
- [ ] Implement parallelization for /api/files/upload-piutang endpoint
- [ ] Test each endpoint with small/medium/large files
- [ ] Verify no regression in duplicate detection
- [ ] Verify error handling still works
- [ ] Measure latency improvement
- [ ] Commit changes

---

## Code Changes Map

### File: backend/invoice-endpoints.js

#### Change 1: Lines 1254-1329 (upload-pdf endpoint)
```diff
- const fileExists = await RcloneStorage.checkFileExists(invoice.invoice_pdf_path);
+ // (moved to parallel section)
- const fileExists = await RcloneStorage.checkFileExists(uploadPath);
+ // (moved to parallel section)

+ // Parallel checks
+ const checkPromises = [];
+ const checkLabels = [];
+ if (invoice.invoice_pdf_path) {
+     checkPromises.push(RcloneStorage.checkFileExists(invoice.invoice_pdf_path));
+     checkLabels.push('existing');
+ }
+ checkPromises.push(RcloneStorage.checkFileExists(uploadPath));
+ checkLabels.push('duplicate');
+ 
+ const results = await Promise.allSettled(checkPromises);
```

#### Change 2: Lines 1469-1556 (upload-document endpoint)
Similar refactor for faktur pajak checks.

#### Change 3: Lines 1628-1695 (upload-document endpoint, bukti_bayar path)
Similar refactor for bukti bayar checks.

#### Change 4: Lines 1773-1900 (upload-faktur-pajak endpoint)
Similar refactor.

### File: backend/server.js

#### Change 5: Lines ~1889-2000 (/api/files/upload)
Parallelize duplicate detection checks.

#### Change 6: Lines ~2201-2300 (/api/files/upload-piutang)
Parallelize duplicate detection checks.

---

## Testing Strategy

### Test 1: Single Upload (Verify no regression)
```bash
# Upload same file, same parameters as before
curl -X POST -F "file=@test.pdf" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/files/upload

# Expected: Same result as before (file uploaded successfully)
# New expectation: Faster (5-10 seconds saved)
```

### Test 2: Duplicate Detection Still Works
```bash
# Upload file
curl -X POST -F "file=@test.pdf" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/files/upload

# Upload same file again
curl -X POST -F "file=@test.pdf" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/files/upload

# Expected: Second upload rejected with 409 Conflict
# Must still work after parallelization!
```

### Test 3: Multiple Files (Concurrent parallel requests)
```bash
# 5 concurrent uploads
for i in {1..5}; do
  curl -X POST -F "file=@test$i.pdf" \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3000/api/files/upload &
done
wait

# Expected: All succeed independently
# All internal checks parallelized
```

### Test 4: Latency Measurement
Before/After comparison:
```bash
# Before (sequential)
time curl -X POST -F "file=@test.pdf" \
  http://localhost:3000/api/files/upload
# Expected: ~30-60 seconds

# After (parallel checks)
time curl -X POST -F "file=@test.pdf" \
  http://localhost:3000/api/files/upload
# Expected: ~20-50 seconds (25% improvement from parallelization alone)
```

### Test 5: Error Scenarios
- Network timeout during check → Graceful fallback (allow upload)
- Mixed results (one check fails, one succeeds) → Handle correctly
- Database error + parallel checks → No cascading failures

---

## Performance Expectations

### Before Optimization (Sequential)
| Operation | Time |
|-----------|------|
| Existing path check | 5-10s |
| New path check | 5-10s |
| **Total check latency** | **10-20s** |
| Upload + directory creation | 20-40s |
| **Total upload latency** | **30-60s** |

### After Optimization (Parallel)
| Operation | Time |
|-----------|------|
| Both checks in parallel | 5-10s (not 10-20s) |
| Upload + directory creation | 20-40s |
| **Total upload latency** | **25-50s** |
| **Improvement** | **~20-25%** |

**Combined with cache (Task 1)**: 50-70% total improvement expected

---

## Error Handling Patterns

### Pattern 1: Graceful Fallback (Current)
```javascript
try {
    const fileExists = await RcloneStorage.checkFileExists(path);
    // ... use result
} catch (err) {
    console.warn('Check failed:', err.message);
    // Allow upload (graceful fallback)
}
```

### Pattern 2: Promise.allSettled() (Recommended)
```javascript
const results = await Promise.allSettled([
    RcloneStorage.checkFileExists(path1),
    RcloneStorage.checkFileExists(path2)
]);

const [result1, result2] = results;

const path1Exists = result1.status === 'fulfilled' ? result1.value : false;
const path2Exists = result2.status === 'fulfilled' ? result2.value : false;

// Individual failures don't block entire operation
```

**Advantage**: Better resilience - one check failure doesn't block others

---

## Rollback Plan

If parallelization causes issues:

```bash
# Option 1: Revert entire change
git checkout backup/upload-system-snapshot-before-chunked

# Option 2: Revert specific file
copy backend\backups\invoice-endpoints.BACKUP-7a34c40.js backend\invoice-endpoints.js

# Restart
npm restart
```

---

## Success Criteria

✅ All endpoints still upload successfully  
✅ Duplicate detection still works (critical!)  
✅ No false positives or negatives  
✅ Latency reduced by 20-25% from parallelization  
✅ Error handling graceful  
✅ Database records consistent  
✅ No orphaned files  

---

## Next Steps

1. Implement parallelization for top 3 endpoints
2. Test thoroughly
3. Measure latency improvements
4. Move to Task 1 (add cache layer)
5. Combined optimization = 50-70% total latency reduction
