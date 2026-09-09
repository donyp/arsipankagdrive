# Phase 2 Deployment Checklist

## Pre-Deployment Verification
- [x] Code syntax validation passed
- [x] All functions present and integrated
- [x] No breaking changes to existing APIs
- [x] Backward compatible (old check-file endpoint still works)
- [x] Database schema not modified (only use existing columns)
- [x] Monitoring endpoints added (non-breaking)
- [x] Test plan executed and passed

## Deployment Steps

### Step 1: Push to GitHub
```bash
git log --oneline -7  # Show last 7 commits
git push origin master
```

**Expected:** All commits pushed, Railway auto-redeploy triggered

### Step 2: Monitor Railway Deployment
- Watch for auto-redeploy to complete
- Check server logs for: "Starting file count verification job"
- Verify first sync job runs: "Checked: X | Corrected: Y"

### Step 3: Verify Production Endpoints
1. Dashboard loads: `/dashboard.html`
2. File check endpoint: `GET /api/invoice/check-file/:faktur/:fileType`
   - Should return: `{exists, usedFastPath, usedFallback, dbCount}`
3. Monitoring endpoint: `GET /api/invoice/sync-stats` (admin only)
4. Count discrepancies: `GET /api/invoice/count-discrepancies` (admin only)

### Step 4: Monitor Server Logs

**Expected Log Patterns:**

```
[FileCountSync] Starting file count verification job (every 30 min)...
[FileCountSync] Starting background file count verification...
[FileCountSync] Checking 58 invoices...
[FileCountSync] Updated 58: DB=0, Actual=X
[Check File] Fast-path hit: faktur/invoice
[Check File] Count mismatch detected: doing file check
```

**Watch For Errors:**
- ❌ `[FileCountSync] Fatal error`
- ❌ `[Check File] Fallback error`
- ❌ `ReferenceError: updateFilesUploadedCount is not defined`

### Step 5: Manual Testing (First Hour)

#### Test 5A: Dashboard Loading
1. Login to dashboard
2. Apply filter (e.g., date range)
3. Measure load time
4. Expected: < 1 minute (from 3-6 min before)
5. Check for monitoring panel at top

#### Test 5B: File Upload
1. Upload test invoice PDF
2. Verify response has `filesUploadedCount`
3. Check dashboard - status should update
4. Expected: files_uploaded_count increments

#### Test 5C: File Download
1. Click download button
2. Should NOT show "checking file" message
3. File should download in < 3 seconds
4. Expected: Direct download, no pre-check

#### Test 5D: Monitoring Panel
1. Reload dashboard (as admin/moderator)
2. Look for "📊 Sync Status" panel at top
3. Should show: Last run, Checked count, Fixed count
4. Expected: Panel visible if there are corrections

### Step 6: Error Monitoring (First 24 Hours)

**Watch Metrics:**
- File check response time: Should see 90% < 10ms (fast-path)
- Upload count increments: All uploads should update count
- Background sync: Should see sync every 30 minutes
- Error rate: Should be 0%

**Rollback Conditions:**
- If data corruption detected → Rollback immediately
- If all requests failing → Rollback immediately
- If fast-path breaking downloads → Rollback immediately
- If monitoring breaks dashboard → Rollback immediately

**Non-Rollback Issues:**
- Slow rclone commands (expected, will improve with sync)
- Occasional fallback (expected, auto-corrects)
- Missing monitoring panel (acceptable, non-critical)

## Performance Expectations

### Dashboard File Checking
| Dataset | Before | After | Improvement |
|---------|--------|-------|-------------|
| 58 invoices | 3-6 min | 30-45 sec | 80-90% faster |
| 100 invoices | 5-10 min | 1-2 min | 80-90% faster |
| 500 invoices | 25-50 min | 2-5 min | 80-90% faster |

### File Download
| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Single download | 6-12 sec | 3-5 sec | 50% faster |
| Combined PDF | 15-30 sec | 5-10 sec | 65% faster |

### API Response Times
| Endpoint | Expected |
|----------|----------|
| /api/invoice/check-file (fast-path) | < 10ms |
| /api/invoice/check-file (fallback) | 3-6 sec |
| /api/invoice/sync-stats | < 50ms |
| /api/invoice/count-discrepancies | < 100ms |

## Monitoring Dashboard

**Admin can check health at:**
- GET `/api/invoice/sync-stats` - Job statistics
- GET `/api/invoice/count-discrepancies` - Mismatch list
- Dashboard monitoring panel - Visual display

**Key Metrics to Track:**
- `totalChecked`: Should increase by ~60 every 30 min
- `totalCorrected`: Should be 0-5 (indicates mismatches)
- `errorCount`: Should be 0
- `lastRun`: Should update every 30 min

## Success Criteria

✅ Phase 2 Deployment is successful if:
1. Dashboard loads in < 1 minute (from 3-6 min)
2. Zero data corruption or file loss
3. All endpoints returning correct responses
4. Monitoring panel displays correctly
5. Background sync job runs every 30 minutes
6. Auto-correction working silently
7. No critical errors in logs

## Deployment Timeline

| Time | Action | Status |
|------|--------|--------|
| 0:00 | Push to GitHub | ⏳ |
| 0:05 | Railway auto-deploy starts | ⏳ |
| 0:10 | Server restart completes | ⏳ |
| 0:15 | First sync job runs | ⏳ |
| 1:00 | Manual testing completed | ⏳ |
| 24:00 | 24-hour monitoring complete | ⏳ |

## Rollback Plan

If critical issue found within 24 hours:

```bash
# Option 1: Revert last 6 commits (Phase 2)
git revert HEAD~5..HEAD
git push origin master

# Option 2: Disable fast-path in database
UPDATE invoice_file_list SET files_uploaded_count = NULL;

# Option 3: Restart server without sync job
# Stop and redeploy without file-count-sync-job
```

**Data Safety:** No data loss in any rollback scenario
- Auto-corrections already applied (kept)
- Old API still works (fallback mode)
- Monitoring stays active for diagnostics

---

**Deployment Date:** [To be filled]
**Deployed By:** [To be filled]
**Status:** [To be filled]
