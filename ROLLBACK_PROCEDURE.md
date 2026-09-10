# 🔄 SYSTEM ROLLBACK PROCEDURE

## 📋 Overview
Panduan lengkap untuk rollback sistem ke versi stabil terakhir jika ada bug dari update.

---

## ✅ Current STABLE Versions (Safe State)

### Latest Stable Commit
```
Commit: 650e02a
Tag: v1.0-stable-safe
Message: Feature: Add detailed progress messages with stages and percentages for file downloads
Date: 2026-09-09
```

### Features Included (SAFE & TESTED)
✅ File Upload System (Moderator & Admin Zona)  
✅ File Download System (with progress tracking)  
✅ File Checking System (Database-driven)  
✅ Admin Zona Dashboard (with proper UI)  
✅ Moderator Dashboard (full functionality)  
✅ Progress Messages (detailed 5-stage)  
✅ Error Handling (comprehensive)  

---

## 🔴 ROLLBACK STEPS

### Option 1: Rollback to Specific Commit

**Step 1: Check current commit**
```bash
git log --oneline -1
```

**Step 2: Reset to stable commit (650e02a)**
```bash
git reset --hard 650e02a
git push --force
```

⚠️ **WARNING**: This will discard all uncommitted changes and commits after 650e02a

### Option 2: Rollback to Tagged Version

**Step 1: List all tags**
```bash
git tag -l
```

**Step 2: Checkout to stable tag**
```bash
git reset --hard v1.0-stable-safe
git push --force
```

### Option 3: Revert Specific Commits (Safer)

If you want to keep commit history:

```bash
# Find the commit that caused the bug
git log --oneline -10

# Revert that specific commit
git revert <COMMIT_HASH>
git push
```

---

## 📋 AFTER ROLLBACK

### Immediate Actions
1. **Clear browser cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear LocalStorage: Open DevTools → Application → LocalStorage → Clear All

2. **Restart application**
   ```bash
   npm restart
   # or
   docker restart arsipankanew-replit-source
   ```

3. **Test core functionality**
   - ✅ Login to moderator dashboard
   - ✅ Upload file
   - ✅ Download file
   - ✅ Check file status
   - ✅ Login to admin zona dashboard
   - ✅ View invoice list
   - ✅ Check file buttons

---

## 🚀 AFTER ROLLBACK - FIX & RE-DEPLOY

### If bug is identified, follow this:

```
1. Identify root cause of bug
   ↓
2. Create new branch for fix
   $ git checkout -b bugfix/description
   ↓
3. Make minimal changes to fix bug
   ↓
4. Test thoroughly
   ↓
5. Create pull request (if using workflow)
   ↓
6. Merge to master after review
   $ git merge bugfix/description
   $ git push
```

---

## 📊 VERSION HISTORY

| Version | Commit | Status | Date | Features |
|---------|--------|--------|------|----------|
| v1.0-stable-safe | 650e02a | ✅ STABLE | 2026-09-09 | Upload, Download, File Check, Progress UI |
| v1.0 | 90a83bc | ✅ STABLE | 2026-09-09 | UI fixes, alignment |
| v0.9 | eb76bf9 | ✅ STABLE | 2026-09-09 | Database-driven file checking |

---

## ⚠️ CRITICAL NOTES

### Before Rollback
- ✅ Backup any uncommitted work (git stash)
- ✅ Note down recent changes you made
- ✅ Check if database migrations are needed (usually not)

### During Rollback
- 🔄 Force push will overwrite remote history
- 🔄 Team members must sync afterward
- 🔄 CI/CD pipelines will re-run automatically

### After Rollback
- ✅ Verify all systems working
- ✅ Check error logs
- ✅ Monitor for issues (first 30 mins critical)

---

## 🆘 EMERGENCY ROLLBACK

If system is completely broken:

```bash
# Nuclear option - reset to safe state
git fetch origin
git reset --hard origin/v1.0-stable-safe
git push --force

# Restart services
npm restart
# or
docker restart arsipankanew-replit-source
```

---

## 📞 QUICK REFERENCE

### Rollback Commands
```bash
# To stable tag
git reset --hard v1.0-stable-safe && git push --force

# To specific commit
git reset --hard 650e02a && git push --force

# View commit before rollback
git log --oneline -1

# Revert last commit (safer)
git revert HEAD && git push
```

### Check System Status After Rollback
```bash
# Check current commit
git log --oneline -1

# Check if there are uncommitted changes
git status

# View recent commits
git log --oneline -5
```

---

## ✅ CHECKLIST - DO THIS AFTER ROLLBACK

- [ ] Clear browser cache (Ctrl+Shift+R)
- [ ] Restart application (npm restart)
- [ ] Test login (moderator)
- [ ] Test upload
- [ ] Test download
- [ ] Test file check
- [ ] Login admin zona
- [ ] Check invoice list loads
- [ ] Check buttons appear
- [ ] Monitor logs for errors

---

**Last Updated:** 2026-09-09  
**Stable Version:** v1.0-stable-safe (650e02a)  
**Status:** ✅ SAFE & TESTED

For any issues, refer to git log and this document!
