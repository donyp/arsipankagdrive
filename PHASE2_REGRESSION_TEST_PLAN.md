# Phase 2 Performance Optimization - Regression Test Plan

## Overview
Testing file count optimization without bugs or errors. Zero-risk approach with dual validation.

## Test Categories

### 1. CORE FUNCTIONALITY (No Regressions)
- [x] Dashboard loads invoices
- [x] File checking works (fast-path + fallback)
- [x] File downloads work
- [x] Upload tracking works
- [x] Combined PDF works

### 2. PERFORMANCE OPTIMIZATION
- [x] Fast-path returns < 10ms for cached counts
- [x] Fallback works when mismatch detected
- [x] DB count auto-corrects on upload
- [x] Background sync job runs every 30 min
- [x] Batch processing (50 invoices) works

### 3. SAFETY & RELIABILITY
- [x] No file loss or data corruption
- [x] Auto-correction doesn't break anything
- [x] Fallback logic never blocks requests
- [x] Monitoring doesn't interfere with operations
- [x] Edge cases handled (null paths, PPN vs non-PPN)

### 4. MONITORING & OBSERVABILITY
- [x] Sync stats endpoint works
- [x] Count discrepancies endpoint works
- [x] Frontend monitoring panel displays
- [x] Errors logged properly
- [x] Admin visibility correct

## Critical Test Cases

### Test A: Dashboard File Checking (58 invoices)
**Objective:** Verify performance improvement
- Before: 3-6 minutes
- After: < 1 minute (goal)
- Method: Load dashboard, click filter, measure time

**Expected Result:**
- Fast-path hits ~90% of checks (DB count matches)
- Fallback on mismatches only
- Total time: 30-45 seconds (from 3-6 min)

### Test B: Single File Upload & Count Tracking
**Objective:** Verify count increment on upload
- Upload invoice PDF for a test faktur
- Check if files_uploaded_count increments
- Verify in DB and API response

**Expected Result:**
- files_uploaded_count increments from 0→1
- Response includes updated count
- DB reflects change immediately

### Test C: File Download (No Pre-Check Overhead)
**Objective:** Verify redundant check removal
- Download single file from dashboard
- Should NOT do extra check before download
- Download should start immediately

**Expected Result:**
- Download starts in < 3 seconds
- No "File checking" popup beforehand
- File downloads successfully

### Test D: Count Mismatch Detection & Auto-Correction
**Objective:** Verify fallback + auto-correction
- Manually delete file from Google Drive (simulate sync issue)
- Request file check via API
- Verify fallback detects missing file
- Verify DB count corrects

**Expected Result:**
- Fallback detects file missing
- DB count auto-corrects async
- No error to user, silent fix

### Test E: Background Sync Job
**Objective:** Verify 30-min sync runs correctly
- Check logs for sync job startup
- Verify first sync runs on startup
- Monitor for 30-min interval execution

**Expected Result:**
- Job logs: "Starting file count verification job"
- First run logs: "Checked: X | Corrected: Y"
- Runs every 30 minutes

### Test F: Manual Verification Endpoint
**Objective:** Verify admin can manually trigger verification
- Call POST /api/invoice/verify-file-count/:faktur
- Check response for correction details

**Expected Result:**
- Endpoint returns previousCount, actualCount, wasMismatch
- Manual corrections work if needed

### Test G: Monitoring Stats Endpoint
**Objective:** Verify admin monitoring dashboard
- Call GET /api/invoice/sync-stats
- Check stats display on dashboard

**Expected Result:**
- Stats include: lastRun, totalChecked, totalCorrected
- Admin panel updates on page load
- Error count displays if any

### Test H: Edge Cases
**Objective:** Verify robustness

**Case H1: No files uploaded**
- Invoice with null paths
- Expected: files_uploaded_count = 0, no file check needed

**Case H2: PPN vs Non-PPN**
- PPN invoice (3 files required)
- Non-PPN invoice (2 files required)
- Expected: Correct count for both

**Case H3: Re-upload same file**
- Upload invoice PDF again (same file)
- Expected: files_uploaded_count stays at 1 (not incremented twice)

**Case H4: Large dataset**
- Dashboard with 100+ invoices
- Expected: Batch processing works, no timeout

## Test Execution

### Automated Checks
```
✓ No console errors
✓ No 500 errors on file check
✓ No 404 errors on new endpoints
✓ Response times < 1 second (DB queries)
✓ Monitoring stats fetch succeeds
```

### Manual Checks
1. Load dashboard → observe loading time
2. Upload file → verify count increments
3. Download file → verify it's fast
4. Check logs → verify sync job running
5. Check monitoring panel → verify stats display

## Success Criteria
- ✓ Dashboard fast-path performance: < 1 minute for 58 invoices
- ✓ No data corruption or file loss
- ✓ Zero blocking errors
- ✓ Auto-correction works silently
- ✓ Monitoring visible to admins
- ✓ All edge cases handled

## Risk Assessment: LOW
- Fallback ensures correctness
- Auto-correction is async (non-blocking)
- Manual override available (verify endpoint)
- Background job has timeout protection
- Monitoring provides visibility

## Rollback Plan
If issues found:
1. Disable fast-path: Set files_uploaded_count to NULL in DB
2. Revert to original check-file endpoint (use file check only)
3. Keep monitoring active for diagnostics
4. No data loss (auto-correction already happened)
