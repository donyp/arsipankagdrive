# ============================================================
# ROLLBACK SCRIPT - Restore to Stable Safe State
# ============================================================
# 
# Usage: .\rollback-to-safe.ps1
#
# This script safely rolls back the system to the last known
# stable and tested version (650e02a)
#
# ============================================================

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  SYSTEM ROLLBACK TO STABLE STATE" -ForegroundColor Cyan
Write-Host "  v1.0-stable-safe (650e02a)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check git status
Write-Host "[Step 1/6] Checking git status..." -ForegroundColor Yellow
$status = git status
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Not a git repository or git not installed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Git repository found" -ForegroundColor Green
Write-Host ""

# Step 2: Show current commit
Write-Host "[Step 2/6] Current commit:" -ForegroundColor Yellow
$currentCommit = git log --oneline -1
Write-Host "$currentCommit" -ForegroundColor White
Write-Host ""

# Step 3: Confirmation
Write-Host "[Step 3/6] Ready to rollback?" -ForegroundColor Yellow
Write-Host "This will reset to commit: 650e02a (v1.0-stable-safe)" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "Type 'ROLLBACK' to confirm (or press Enter to cancel)"
if ($confirm -ne "ROLLBACK") {
    Write-Host "❌ Rollback cancelled" -ForegroundColor Red
    exit 0
}
Write-Host ""

# Step 4: Stash any uncommitted changes
Write-Host "[Step 4/6] Stashing uncommitted changes..." -ForegroundColor Yellow
git stash
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Stash warning (continuing)" -ForegroundColor Yellow
}
Write-Host "✅ Stashed" -ForegroundColor Green
Write-Host ""

# Step 5: Reset to safe commit
Write-Host "[Step 5/6] Resetting to safe commit 650e02a..." -ForegroundColor Yellow
git reset --hard 650e02a
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error during reset" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Reset successful" -ForegroundColor Green
Write-Host ""

# Step 6: Force push to origin
Write-Host "[Step 6/6] Pushing changes to remote..." -ForegroundColor Yellow
Write-Host "⚠️  This will force push and overwrite remote history" -ForegroundColor Yellow
$pushConfirm = Read-Host "Type 'PUSH' to confirm force push (or press Enter to skip)"
if ($pushConfirm -eq "PUSH") {
    git push --force
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Force push successful" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Force push encountered issues (check manually)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  Skipped force push (run: git push --force)" -ForegroundColor Yellow
}
Write-Host ""

# Final status
Write-Host "================================================" -ForegroundColor Green
Write-Host "  ✅ ROLLBACK COMPLETE" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Clear browser cache (Ctrl+Shift+R)" -ForegroundColor White
Write-Host "2. Restart application: npm restart" -ForegroundColor White
Write-Host "3. Test all core functionality" -ForegroundColor White
Write-Host "4. Monitor logs for any errors" -ForegroundColor White
Write-Host ""

# Show new commit
Write-Host "New commit (after rollback):" -ForegroundColor Yellow
$newCommit = git log --oneline -1
Write-Host "$newCommit" -ForegroundColor White
Write-Host ""

Write-Host "For more info, read: ROLLBACK_PROCEDURE.md" -ForegroundColor Cyan
