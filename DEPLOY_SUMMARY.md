# 📋 Deploy Summary - Indowebsite Hosting

**Tanggal**: September 2026  
**Status**: Ready to Deploy  
**Database**: Supabase (Cloud-based, terpisah)  
**Hosting**: Indowebsite (Linux)  

---

## 📦 File-File Yang Sudah Disiapkan

Semua file yang dibutuhkan untuk deploy sudah siap. Berikut daftarnya:

### 📘 Documentation
1. **`DEPLOY_KE_INDOWEBSITE.md`** ← **BACA INI DULU**
   - Panduan lengkap step-by-step
   - Penjelasan detail setiap langkah

2. **`QUICK_DEPLOY_INDOWEBSITE.txt`** ← Untuk referensi cepat
   - Checklist singkat
   - Command yang perlu dijalankan

3. **`TROUBLESHOOTING_INDOWEBSITE.md`** ← Jika ada masalah
   - 10 problem umum + solusi
   - Useful commands

### ⚙️ Configuration Files
1. **`ecosystem.config.js`** ← PM2 configuration (siap pakai)
   - Auto-restart aplikasi
   - Logging setup
   - Production ready

2. **`htaccess-template`** ← Template .htaccess
   - Reverse proxy setup
   - Force HTTPS
   - Compression

3. **`setup-hosting.sh`** ← Automatic setup script
   - Clone repository
   - Install dependencies
   - Generate secrets
   - Setup PM2

---

## 🚀 Quick Start (3 Langkah Utama)

### Langkah 1: Database Setup (10 menit)
```
1. Buka: https://app.supabase.com
2. Create New Project
3. Ambil: Project URL + Service Role Key
4. Simpan di file .env
```

### Langkah 2: Upload & Setup (15 menit)
```
1. SSH ke hosting
2. Clone aplikasi
3. npm install
4. Setup .env file
5. Test: npm start
```

### Langkah 3: Domain & PM2 (15 menit)
```
1. Setup domain di cPanel
2. Create .htaccess for reverse proxy
3. Setup PM2 (pm2 start ecosystem.config.js)
4. Verify: curl https://your-domain.com
```

---

## 📁 Project Structure

```
ARSIPHOST/
├── backend/
│   ├── server.js              ← Main aplikasi
│   ├── .env                   ← Environment variables (isi manual)
│   ├── .env.example           ← Template .env
│   └── node_modules/          ← Dependencies
├── js/                        ← Frontend JavaScript
├── css/                       ← Frontend Styles
├── ecosystem.config.js        ← PM2 configuration (NEW - copy ke root)
├── DEPLOY_KE_INDOWEBSITE.md   ← Panduan lengkap (NEW)
├── QUICK_DEPLOY_INDOWEBSITE.txt  ← Quick reference (NEW)
├── TROUBLESHOOTING_INDOWEBSITE.md ← Troubleshooting (NEW)
├── setup-hosting.sh           ← Setup script (NEW)
├── htaccess-template          ← .htaccess template (NEW)
├── package.json               ← Dependencies definition
└── ... files lainnya
```

---

## ⚠️ PENTING: Database Configuration

### Alasan Menggunakan Supabase (Cloud Database)

❌ **JANGAN** gunakan database lokal:
- Akan hilang saat server reboot
- Sulit di-backup
- Tidak scalable
- Risky untuk production

✅ **GUNAKAN** Supabase:
- Cloud-hosted, reliable
- Automatic backup
- Accessible dari mana saja
- Professional grade

### Database Setup

```env
# File: backend/.env

# Supabase credentials (dari app.supabase.com)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Production settings
NODE_ENV=production
PORT=8080

# Security
JWT_SECRET=<generated-value>
SESSION_SECRET=<generated-value>

# Domain allowed
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

---

## 🔑 Environment Variables Checklist

Sebelum deploy, pastikan ini sudah diisi di `.env`:

- [ ] `SUPABASE_URL` - URL dari Supabase project
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key dari Supabase
- [ ] `JWT_SECRET` - Generated secret (gunakan: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] `SESSION_SECRET` - Generated secret (gunakan: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)
- [ ] `PORT` - Set ke `8080`
- [ ] `NODE_ENV` - Set ke `production`
- [ ] `ALLOWED_ORIGINS` - Set ke domain Anda (contoh: `https://example.com,https://www.example.com`)

---

## 🎯 Deployment Timeline

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| 1 | Create Supabase project | 10 min | ⏳ TODO |
| 2 | Setup on hosting (SSH) | 15 min | ⏳ TODO |
| 3 | Configure environment | 5 min | ⏳ TODO |
| 4 | Install dependencies | 5 min | ⏳ TODO |
| 5 | Test locally | 5 min | ⏳ TODO |
| 6 | Setup PM2 | 5 min | ⏳ TODO |
| 7 | Setup domain & SSL | 10 min | ⏳ TODO |
| 8 | Verify deployment | 5 min | ⏳ TODO |
| **Total** | | **~60 min** | |

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────┐
│           Browser / Client                          │
└─────────────────────────────────────────────────────┘
                        │
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────┐
│   Indowebsite Hosting (Linux)                       │
│   ├── cPanel (Domain Management)                    │
│   ├── .htaccess (Reverse Proxy)                     │
│   └── Port 8080 (Node.js Application)               │
│       └── Express Server (server.js)                │
└─────────────────────────────────────────────────────┘
                        │
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────┐
│      Supabase Cloud Database (PostgreSQL)           │
│      ├── Database Tables                            │
│      ├── Auto Backup                                │
│      └── SSL Secure Connection                      │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Pre-Deployment Checklist

- [ ] Sudah punya hosting Indowebsite account
- [ ] Sudah punya domain (registered & pointing)
- [ ] Sudah punya Supabase account
- [ ] Node.js >= 18 tersedia di hosting
- [ ] SSH access working
- [ ] Git terinstall di hosting
- [ ] All files sudah di local machine
- [ ] `.env` template sudah ready
- [ ] PM2 configuration (`ecosystem.config.js`) sudah ready
- [ ] Supabase project sudah create

---

## 🔍 Quick Verification Commands

```bash
# SSH ke hosting
ssh username@your-hosting.com
cd ARSIPHOST

# 1. Check Node version
node -v                    # Should be >= 18

# 2. Check npm
npm -v

# 3. Check git
git --version

# 4. Check PM2
pm2 -v

# 5. Test port 8080 available
lsof -i :8080             # Should be empty

# 6. Check disk space
df -h                     # Need > 1GB free

# 7. Check memory
free -h                   # Check available memory
```

---

## 📞 Support Resources

### Indowebsite Support
- **Email**: support@indowebsite.com
- **Website**: https://indowebsite.com
- **cPanel Help**: Built-in in cPanel

### Supabase Support
- **Website**: https://app.supabase.com
- **Docs**: https://supabase.com/docs
- **Discord**: https://discord.supabase.com

### Application Logs
```bash
# View logs real-time
pm2 logs arsiphost

# View specific number of lines
pm2 logs arsiphost --lines 100

# Clear all logs
pm2 flush
```

---

## 🎓 Next Steps After Deploy

1. **Monitor Application**
   ```bash
   pm2 status
   pm2 monit
   pm2 logs arsiphost
   ```

2. **Daily Monitoring**
   - Check PM2 status
   - Monitor disk space
   - Check application logs

3. **Weekly Tasks**
   - Pull latest updates: `git pull origin main`
   - Update dependencies: `npm install`
   - Restart application: `pm2 restart arsiphost`

4. **Security**
   - Keep Node.js updated
   - Update npm packages regularly
   - Monitor Supabase security

---

## 📖 Documentation Files

| File | Purpose | Read When |
|------|---------|-----------|
| `DEPLOY_KE_INDOWEBSITE.md` | Complete guide | Planning deployment |
| `QUICK_DEPLOY_INDOWEBSITE.txt` | Quick reference | During deployment |
| `TROUBLESHOOTING_INDOWEBSITE.md` | Problem solving | Something goes wrong |
| `ecosystem.config.js` | PM2 config | Setting up PM2 |
| `htaccess-template` | .htaccess template | Setting up domain |
| `setup-hosting.sh` | Automatic setup | First time setup |

---

## 🎉 Success Indicators

Setelah deploy, Anda akan tahu sukses jika:

1. ✅ `pm2 status` shows: `arsiphost → online`
2. ✅ `curl https://your-domain.com` returns content (tidak error)
3. ✅ Browser: `https://your-domain.com` menampilkan aplikasi
4. ✅ `pm2 logs arsiphost` tidak ada critical errors
5. ✅ Login berfungsi (ada koneksi ke Supabase)
6. ✅ File upload berfungsi
7. ✅ API endpoints respond correctly

---

## 🆘 Jika Ada Masalah

1. **Baca**: `TROUBLESHOOTING_INDOWEBSITE.md`
2. **Check logs**: `pm2 logs arsiphost`
3. **Verify .env**: `cat backend/.env | grep -E "SUPABASE|JWT|PORT"`
4. **Test connectivity**: `curl -I https://your-domain.com`
5. **Contact support** (lihat bagian Support Resources di atas)

---

## 📝 Important Notes

- **Database**: Selalu gunakan Supabase, jangan DB lokal
- **Secrets**: Jangan commit `.env` file ke Git (sudah di `.gitignore`)
- **HTTPS**: Selalu pakai HTTPS di production
- **Backups**: Supabase otomatis backup daily
- **Monitoring**: Check logs secara regular
- **Updates**: Update npm packages secara berkala

---

## ✨ Semoga Sukses!

Panduan lengkap sudah disiapkan. Silakan ikuti langkah-langkah di **`DEPLOY_KE_INDOWEBSITE.md`** untuk memulai deployment.

Pertanyaan? Lihat `TROUBLESHOOTING_INDOWEBSITE.md` atau hubungi Indowebsite support.

**Happy Deploying! 🚀**

