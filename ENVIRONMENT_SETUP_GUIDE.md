# 🔧 Environment Setup Guide - Pusat Arsip Anka

**Status**: Ready for Configuration  
**Date**: August 23, 2026  
**Version**: 2.0

---

## 📋 Overview

Panduan lengkap untuk setup semua environment variables dan credentials yang diperlukan untuk menjalankan Pusat Arsip Anka di local atau production.

### Current Status
✅ Supabase credentials sudah tersedia  
✅ JWT Secret sudah digenerate  
✅ Alist password sudah dikonfigurasi  
✅ Fonnte API token sudah disiapkan  

---

## 🎯 Environment Variables Checklist

### Tier 1: CRITICAL (Wajib untuk produksi)

| Variable | Status | Value | Source | Action |
|----------|--------|-------|--------|--------|
| `SUPABASE_URL` | ✅ | `https://ehdqcxzdmmcwbdwkinyr.supabase.co` | `.env.txt` | Verify masih valid |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | `eyJhbGc...` | `.env.txt` | Keep safe, tidak boleh share |
| `JWT_SECRET` | ✅ | `arsip-digital-...` | `.env.txt` | ⚠️ Ganti untuk produksi |
| `NODE_ENV` | ✅ | `production` | `.env.txt` | OK untuk Cloud Run |
| `PORT` | ✅ | `5000` | `.env.txt` | Ganti ke `7860` untuk HF, `8080` untuk Cloud Run |

### Tier 2: RECOMMENDED (Sangat disarankan)

| Variable | Status | Value | Source | Action |
|----------|--------|-------|--------|--------|
| `SESSION_SECRET` | ✅ | `nf/Fq4ml...` | `.env.txt` | Keep safe |
| `ALIST_ADMIN_PASSWORD` | ✅ | `admin123` | `.env.txt` | ⚠️ Ganti password yang kuat |
| `ALIST_PORT` | ❓ | `5244` | Hardcoded | Verify Alist service uses this |
| `ENABLE_ALIST` | ✅ | `true` | `.env.txt` | OK untuk enable |

### Tier 3: OPTIONAL (Fungsi tambahan)

| Variable | Status | Value | Source | Action |
|----------|--------|-------|--------|--------|
| `FONNTE_TOKEN` | ✅ | `t7YZdAN9...` | `.env.txt` | Untuk WhatsApp notifications |
| `LOG_LEVEL` | ❓ | `info` | Default | Cek di `.env.example` |
| `MAX_FILE_SIZE` | ❓ | `104857600` | Default | 100MB limit |

---

## 📁 Setup Steps

### Step 1: Create `.env` File for Backend

```bash
# Create .env in backend directory
cp .env.example backend/.env
```

**Then edit `backend/.env` with values from `.env.txt`:**

```env
# ============================================
# CRITICAL - From .env.txt
# ============================================
PORT=8080
NODE_ENV=production
SUPABASE_URL=https://ehdqcxzdmmcwbdwkinyr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHFjeHpkbW1jd2Jkd2tpbnlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjYyNDcxNiwiZXhwIjoyMDkyMjAwNzE2fQ.4c2_rOut7hQZJIbvLIBOKzTpo7kchbpU2Cj-dzCpmjw
JWT_SECRET=arsip-digital-super-secret-jwt-key-2026-change-me

# ============================================
# RECOMMENDED
# ============================================
SESSION_SECRET=nf/Fq4mlxNLqeICalePNYQMAl7a52b2pGVjeW/TfqtZfvF5H2ABAR6ZuJaDVD30n+Jca9O5UYwyXZLTfzy5Qsg==
ALIST_ADMIN_PASSWORD=admin123
ALIST_PORT=5244
ENABLE_ALIST=true

# ============================================
# OPTIONAL
# ============================================
FONNTE_TOKEN=t7YZdAN9Ec9EHE2WCJSx
LOG_LEVEL=info
MAX_FILE_SIZE=104857600
```

✅ **Important**: Jangan commit `backend/.env` ke git!

---

### Step 2: Verify Supabase Credentials

```bash
# Test connection ke Supabase
curl -X GET "https://ehdqcxzdmmcwbdwkinyr.supabase.co/rest/v1/" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY"
```

Expected: Response dengan API documentation (tidak 401 atau 403)

**Atau test dengan Node.js:**

```bash
cd backend
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ehdqcxzdmmcwbdwkinyr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoZHFjeHpkbW1jd2Jkd2tpbnlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjYyNDcxNiwiZXhwIjoyMDkyMjAwNzE2fQ.4c2_rOut7hQZJIbvLIBOKzTpo7kchbpU2Cj-dzCpmjw'
);
supabase.from('files').select('count').then(r => console.log('✅ Connected', r));
"
```

Expected: Output `✅ Connected` tanpa error

---

### Step 3: Generate Strong JWT Secret (untuk Produksi)

⚠️ **PENTING**: JWT_SECRET di `.env.txt` sudah ada, tapi sebaiknya generate yang baru untuk produksi:

```bash
# Generate JWT_SECRET baru (32 bytes = 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Output contoh:
```
a7f8c3e2d9b1f4e6a9c2d8f1b4e7a9c2d8f1b4e7a9c2d8f1b4e7a9c2d8f1b4
```

**Kemudian update di `backend/.env`:**

```env
JWT_SECRET=a7f8c3e2d9b1f4e6a9c2d8f1b4e7a9c2d8f1b4e7a9c2d8f1b4e7a9c2d8f1b4
```

---

### Step 4: Update Alist Password (untuk Produksi)

⚠️ **PENTING**: Password `admin123` terlalu lemah untuk produksi!

Generate password yang kuat:

```bash
# Option 1: Random string
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Option 2: Pilih sendiri (min 12 chars)
```

Contoh password kuat: `Arsip@2026!SecurePass123`

**Update di `backend/.env`:**

```env
ALIST_ADMIN_PASSWORD=Arsip@2026!SecurePass123
```

---

### Step 5: Setup untuk Berbagai Environment

#### For Local Development
```env
PORT=5000
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_ALIST=true
```

#### For Hugging Face Spaces
```env
PORT=7860
NODE_ENV=production
ENABLE_ALIST=true
# Set di HF Secrets:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - JWT_SECRET
```

#### For Google Cloud Run
```env
PORT=8080
NODE_ENV=production
GCP_PROJECT_ID=arsipanka
# Set di Google Secret Manager:
# - arsip-alist-password
```

---

## 🔐 Security Best Practices

### ✅ DO (Wajib)

- [ ] Keep `.env` file private (add to `.gitignore`)
- [ ] Use strong passwords (min 12 chars, mixed case, numbers, symbols)
- [ ] Rotate secrets regularly
- [ ] Use environment variables, jangan hardcode credentials
- [ ] Enable HTTPS in production
- [ ] Use Secret Manager untuk production (Google Secret Manager, AWS Secrets, etc)
- [ ] Restrict database access (IP whitelisting)
- [ ] Enable RLS (Row Level Security) di Supabase

### ❌ DON'T (Jangan)

- [ ] Jangan commit `.env` ke git
- [ ] Jangan share secrets melalui chat/email
- [ ] Jangan gunakan simple passwords seperti `admin123`
- [ ] Jangan expose `.env.txt` ke public
- [ ] Jangan hardcode credentials di code
- [ ] Jangan gunakan same password di multiple services

---

## 🧪 Testing Environment Setup

### Test 1: Load Env Variables

```bash
cd backend
node -e "
require('dotenv').config();
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];
required.forEach(key => {
  const status = process.env[key] ? '✅' : '❌';
  console.log(\`\${status} \${key}\`);
});
"
```

Expected: Semua ✅

### Test 2: Database Connection

```bash
cd backend
npm install  # Jika belum
npm test     # Run integration tests
```

Expected: Tests passing

### Test 3: JWT Token Generation

```bash
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign({ user_id: 1, role: 'admin' }, 'test-secret', { expiresIn: '24h' });
console.log('✅ JWT Token generated:', token.substring(0, 20) + '...');
"
```

Expected: Token generated successfully

### Test 4: Start Server

```bash
cd backend
PORT=5000 node server.js
```

Expected:
```
[BOOT] Pusat Arsip Anka - v2.1.0-fixed
[CONFIG] Reading environment variables...
✅ Backend listening on port 5000
```

Test `/api/heartbeat`:
```bash
curl http://localhost:5000/api/heartbeat
```

Expected:
```json
{"status":"alive","version":"2.0.1-fixed"}
```

---

## 📦 Environment Variables Reference

### Production (Cloud Run / HF Spaces)

```env
# Deployment
PORT=7860                    # For HF Spaces (or 8080 for Cloud Run)
NODE_ENV=production
LOG_LEVEL=info

# Database
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Authentication
JWT_SECRET=<strong-secret-min-32-chars>
JWT_EXPIRES_IN=24h
SESSION_SECRET=<random-session-secret>

# Storage
STORAGE_BACKEND=terabox
RCLONE_CONFIG_PATH=./rclone.conf
ALIST_ADMIN_PASSWORD=<strong-password>
ALIST_PORT=5244
ENABLE_ALIST=true

# Notifications (Optional)
FONNTE_TOKEN=<fonnte-api-token>

# File Upload
MAX_FILE_SIZE=104857600     # 100MB
UPLOAD_TEMP_PATH=/app/backend/tmp

# Logging
LOG_PATH=/app/data/log
```

### Development (Local)

```env
# Deployment
PORT=5000
NODE_ENV=development
LOG_LEVEL=debug

# Database
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Authentication
JWT_SECRET=dev-secret-key
JWT_EXPIRES_IN=24h
SESSION_SECRET=dev-session-secret

# Storage
STORAGE_BACKEND=terabox
ALIST_ADMIN_PASSWORD=admin123
ALIST_PORT=5244
ENABLE_ALIST=true

# Notifications
FONNTE_TOKEN=optional

# File Upload
MAX_FILE_SIZE=104857600
UPLOAD_TEMP_PATH=./backend/tmp
```

---

## 🚀 Deployment Environment Checklist

### Before Deploying to Hugging Face

- [ ] Copy `.env.txt` values ke `backend/.env`
- [ ] Update `JWT_SECRET` (generate baru)
- [ ] Update `ALIST_ADMIN_PASSWORD` (strong password)
- [ ] Change `PORT` to `7860`
- [ ] Set `NODE_ENV=production`
- [ ] Verify Supabase credentials valid
- [ ] Test locally dengan `npm start`
- [ ] Remove `backend/.env` dari commit (check `.gitignore`)

### Before Deploying to Cloud Run

- [ ] Create Google Cloud project
- [ ] Setup Supabase (or alternative DB)
- [ ] Create Secret Manager secrets:
  ```bash
  echo "password" | gcloud secrets create arsip-alist-password --data-file=-
  ```
- [ ] Set environment variables di Cloud Run
- [ ] Configure service account permissions
- [ ] Test with `gcloud run deploy` command
- [ ] Monitor logs dan verify healthy startup

### Before Production (Any Platform)

- [ ] Security audit semua credentials
- [ ] Enable HTTPS (automatic di HF/Cloud Run)
- [ ] Setup database backups
- [ ] Configure logging dan monitoring
- [ ] Document all environment variables
- [ ] Create runbook untuk troubleshooting
- [ ] Setup alerts untuk error rates
- [ ] Test disaster recovery

---

## 📞 Troubleshooting

### Issue: "SUPABASE_URL is not set"

**Solution**:
1. Check `backend/.env` exists
2. Verify tidak ada typo di variable name
3. Run test: `node -e "require('dotenv').config(); console.log(process.env.SUPABASE_URL)"`

### Issue: "JWT_SECRET too short"

**Solution**:
```bash
# Generate min 32 chars (64 hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Issue: "Connection to Supabase failed"

**Solution**:
1. Verify URL format: `https://xxxxx.supabase.co`
2. Verify token tidak expired
3. Check network connectivity
4. Verify Supabase project active

### Issue: "Alist not starting"

**Solution**:
1. Verify `ALIST_ADMIN_PASSWORD` tidak empty
2. Verify `ALIST_PORT` tidak in use
3. Check Docker/system resources
4. Review `start.sh` untuk errors

---

## 📋 Complete Environment Variables List

```
# Core
PORT                          # Application port
NODE_ENV                      # Environment (development/production)

# Database
SUPABASE_URL                  # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY    # Service role key (admin access)

# Authentication
JWT_SECRET                    # JWT signing key (min 32 chars)
JWT_EXPIRES_IN               # Token expiry time
SESSION_SECRET               # Session encryption key

# Storage
STORAGE_BACKEND              # Storage type (terabox)
RCLONE_CONFIG_PATH          # Path to rclone.conf
ALIST_ADMIN_PASSWORD        # Alist admin password
ALIST_PORT                  # Alist port (default 5244)
ALIST_DATA_PATH            # Alist data directory
ENABLE_ALIST               # Enable Alist (true/false)

# File Upload
MAX_FILE_SIZE              # Max file size in bytes
UPLOAD_TEMP_PATH          # Temporary upload directory

# Notifications
FONNTE_TOKEN              # WhatsApp API token (optional)

# Logging
LOG_LEVEL                 # Log verbosity (debug/info/warn/error)
LOG_PATH                  # Log file directory

# Cloud Run (if applicable)
GCP_PROJECT_ID           # Google Cloud project ID
```

---

## ✅ Final Checklist

- [ ] `.env` file created in `backend/` directory
- [ ] All CRITICAL variables filled
- [ ] RECOMMENDED variables configured
- [ ] JWT_SECRET updated (strong, 32+ chars)
- [ ] ALIST_ADMIN_PASSWORD changed (strong password)
- [ ] Supabase connection tested
- [ ] Server starts without errors
- [ ] `/api/heartbeat` endpoint responds
- [ ] `.env` added to `.gitignore`
- [ ] Document any custom variables
- [ ] Share checklist dengan team

---

## 🎯 Next Steps

After environment setup:

1. **Test Locally** → Run `npm start` di backend, verify no errors
2. **Run Tests** → Execute integration tests
3. **Debug Alist** → Fix Alist startup issue (see ALIST_STARTUP_FIX_IN_PROGRESS.md)
4. **Deploy to HF** → Follow DEPLOY_NOW.md guide
5. **Monitor** → Check logs dan verify healthy operation

---

**Status**: ✅ Environment Setup Guide Complete  
**Last Updated**: August 23, 2026  
**Version**: 2.0

