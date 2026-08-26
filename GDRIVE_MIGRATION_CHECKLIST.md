# Google Drive Migration - Checklist

**Migrasi dari**: Terabox + Alist WebDAV  
**Ke**: Google Drive + Rclone (Native)  
**Status**: ✅ Configuration Complete  

---

## ✅ Completed Tasks

### Configuration Files
- [x] `rclone.conf` - Removed Terabox, kept Google Drive primary
- [x] `backend/.env` - Updated STORAGE_BACKEND to gdrive
- [x] `backend/.env` - Disabled ALIST services
- [x] Verified rclone OAuth token is present in `[gdrive]` section

### Backend Code
- [x] `rclone_wrapper.js` - Updated PRIMARY_REMOTE from 'terabox' to 'gdrive'
- [x] `rclone_wrapper.js` - Removed Alist API calls from getStream()
- [x] `rclone_wrapper.js` - Removed Alist API calls from uploadDirect()
- [x] `rclone_wrapper.js` - Removed Alist API calls from uploadMedia()
- [x] `rclone_wrapper.js` - Updated remoteFileExists() to use rclone ls
- [x] `rclone_wrapper.js` - Updated comments (Terabox → Google Drive)
- [x] `server.js` - Updated error messages (Alist → Storage)

### Documentation
- [x] Created `GDRIVE_MIGRATION_COMPLETE.md`
- [x] Architecture diagrams updated
- [x] Testing checklist provided
- [x] Troubleshooting guide created
- [x] Rollback plan documented

---

## ⏳ Next Steps (Testing & Validation)

### 1. **Local Testing** (Your Machine)
- [ ] Start backend: `node backend/server.js`
- [ ] Check health endpoint: `curl http://localhost:5000/api/health/storage`
- [ ] Verify Google Drive connection is working
- [ ] Test file upload via API
- [ ] Test file download/preview
- [ ] Check sync queue is processing

### 2. **Functional Testing**
- [ ] Upload a test PDF file
- [ ] Verify file appears in Google Drive
- [ ] Download/preview the file
- [ ] Delete the file (check removal from storage)
- [ ] Test directory listing
- [ ] Test with different file types (PDF, images, docs)

### 3. **Error Handling Testing**
- [ ] Simulate network timeout
- [ ] Test with invalid OAuth token
- [ ] Test with insufficient storage space
- [ ] Check graceful fallback to local storage

### 4. **Performance Testing**
- [ ] Upload large file (>100MB)
- [ ] Check sync queue background processing
- [ ] Monitor memory usage
- [ ] Check database query performance

### 5. **Integration Testing**
- [ ] Test with actual user workflow
- [ ] Verify search functionality still works
- [ ] Check permission-based file listing
- [ ] Test concurrent uploads

---

## 📋 Configuration Verification

### Before Starting Server

```bash
# 1. Verify rclone is installed
which rclone
# Should output: /path/to/rclone

# 2. Test rclone config
rclone config show
# Should show [gdrive] section with valid token

# 3. List files in Google Drive to verify connection
rclone lsd gdrive:/
# Should list files/folders on your Google Drive

# 4. Check env variables
cat backend/.env | grep -i "storage\|gdrive\|rclone"
# Should show STORAGE_BACKEND=gdrive
```

### Environment Setup
```bash
# Ensure these are set correctly in backend/.env:
STORAGE_BACKEND=gdrive
RCLONE_REMOTE=gdrive
RCLONE_CONFIG_PATH=./rclone.conf
ENABLE_ALIST=false
```

---

## ⚠️ Important Notes

### OAuth Token Expiry
- Current token expiry: **2026-08-25T16:53:41.1297796+07:00**
- Refresh token is available for renewal
- When token expires, refresh using:
  ```bash
  rclone authorize drive gdrive
  ```

### Storage Quota
- Google Drive free tier: 15GB
- Monitor usage in dashboard or via:
  ```bash
  rclone about gdrive:
  ```

### Backup Consideration
- Current setup uses Google Drive as PRIMARY
- Optional: Configure Backblaze B2 as backup (config ready in rclone.conf)
- Optional: Configure Storj as secondary backup

---

## 🔄 Rollback Instructions

If you need to revert to Terabox:

```bash
# 1. Checkout old versions from git
git checkout HEAD -- backend/rclone_wrapper.js backend/.env rclone.conf

# 2. Restore old rclone.conf.txt if exists
cp rclone.conf.txt rclone.conf

# 3. Update .env back to terabox
sed -i 's/STORAGE_BACKEND=gdrive/STORAGE_BACKEND=terabox/' backend/.env

# 4. Start services
node backend/server.js
```

---

## 📞 Support & Troubleshooting

### Common Issues During Testing

#### Issue 1: "rclone: command not found"
```bash
# Solution: Install rclone
# On macOS: brew install rclone
# On Linux: curl https://rclone.org/install.sh | bash
# On Windows: Download from https://rclone.org/downloads/
```

#### Issue 2: "Google Drive token expired"
```bash
# Solution: Refresh the token
rclone authorize drive gdrive
# Copy the new token value to [gdrive] token field in rclone.conf
```

#### Issue 3: "File upload slow"
```bash
# Check network:
curl -w "@curl-format.txt" -o /dev/null -s https://google.com

# Optimize rclone settings in rclone.conf:
# - Increase chunk_size: 5M → 10M or 20M
# - Enable parallel uploads: --transfers 4
```

#### Issue 4: "Storage permission denied"
```bash
# Solution: Check Google Drive OAuth app permissions
# 1. Go to https://myaccount.google.com/permissions
# 2. Find "Arsip Anka" app
# 3. Verify it has Drive access
# 4. If not, delete and re-authenticate:
rclone authorize drive gdrive
```

---

## 📊 Migration Statistics

| Metric | Before | After |
|--------|--------|-------|
| **Primary Storage** | Terabox + Alist | Google Drive |
| **Connection Type** | WebDAV via Alist | Native Rclone |
| **Services Required** | 3 (Alist, Rclone, Node) | 2 (Rclone, Node) |
| **Local Server Dependency** | Yes (Alist on :5244) | No |
| **OAuth Complexity** | Terabox creds + Alist | Google OAuth2 only |
| **Free Storage** | Unlimited* | 15GB free, then paid |
| **Expected Uptime** | ~95% | ~99% (Google SLA) |

*Terabox free tier has usage limits

---

## ✨ Benefits of Migration

✅ **Simpler Architecture**: No Alist server needed  
✅ **Better Cloud Support**: Native support on Cloud Run, HF Spaces  
✅ **Native OAuth**: Direct Google authentication  
✅ **Lower Latency**: Direct connection to Google Drive  
✅ **Easier Deployment**: Fewer services to manage  
✅ **Better Backup Options**: Rclone supports 40+ backends  
✅ **Team Sharing**: Google Workspace integration ready  
✅ **Audit Trail**: Google Drive audit logs for compliance  

---

## 📝 Next Document

After testing is complete:
1. Update deployment documentation
2. Migrate existing files from Terabox to Google Drive (if needed)
3. Archive Terabox account for historical records
4. Configure backup strategy (B2, Storj, or Google Workspace)

---

**Last Updated**: August 25, 2026  
**Migrated By**: Kiro Agent  
**Status**: ✅ Ready for Testing
