# 📦 Panduan Deploy ke Hosting Indowebsite + Domain Sendiri

**Status**: Aplikasi Node.js siap deploy  
**Hosting**: Indowebsite (Linux)  
**Database**: Supabase terpisah (jangan pakai DB lokal)  
**Tanggal**: September 2026

---

## 📋 Prasyarat Sebelum Deploy

✅ Sudah punya hosting Indowebsite  
✅ Sudah punya domain  
✅ Sudah punya Supabase account (database terpisah)  
✅ SSH access ke hosting  
✅ Git terinstall di hosting

---

## 🎯 Langkah-Langkah Deployment

### STEP 1: Setup Database di Supabase (Terpisah)

1. **Buka https://app.supabase.com**
2. **Create New Project**:
   - Project Name: `arsiphosting` atau `pusat-arsip-anka`
   - Region: Indonesia (Singapore terdekat)
   - Password: Buat yang kuat

3. **Tunggu project siap** (~2 menit)

4. **Ambil Credentials**:
   - Buka: Settings → API Keys
   - Copy: **Project URL** (SUPABASE_URL)
   - Copy: **Service Role Key** (SUPABASE_SERVICE_ROLE_KEY)
   - Simpan di tempat aman

5. **Create Database Tables**:
   - Buka: SQL Editor
   - Jalankan script dari `backend/schema.sql` (jika ada)
   - Atau import schema yang sudah ada

---

### STEP 2: Persiapan Aplikasi di Hosting

**SSH ke hosting Indowebsite:**

```bash
ssh username@your-hosting-domain.com
# atau gunakan File Manager di cPanel

# Masuk ke home directory
cd ~

# Clone repository
git clone https://github.com/username/ARSIPHOST.git
cd ARSIPHOST

# Atau jika sudah ada, update:
git pull origin main
```

---

### STEP 3: Setup Environment Variables

1. **Buat file `.env` di directory `/backend`**:

```bash
cd backend
cp .env.example .env
nano .env
# atau gunakan text editor lain
```

2. **Isi environment variables**:

```env
# PORT - Penting! Sesuaikan dengan port yang disediakan hosting
PORT=8080

# Node Environment
NODE_ENV=production

# ============ SUPABASE (Terpisah - Jangan DB Lokal) ============
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============ Security ============
JWT_SECRET=generate-dengan-command-di-bawah-ini
JWT_EXPIRES_IN=24h
SESSION_SECRET=generate-dengan-command-di-bawah-ini

# ============ CORS - Allowed Origins ============
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# ============ Optional - Jika perlu ============
FONNTE_TOKEN=token-whatsapp-jika-ada
ENABLE_ALIST=false
LOG_LEVEL=info
MAINTENANCE_MODE=false
```

3. **Generate JWT_SECRET dan SESSION_SECRET**:

```bash
# Di terminal/SSH host, jalankan:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output untuk JWT_SECRET

node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Copy output untuk SESSION_SECRET
```

---

### STEP 4: Install Dependencies

```bash
# Masih di directory ARSIPHOST
npm install

# Pastikan semua dependencies terinstall:
npm list | head -20
```

---

### STEP 5: Test Aplikasi Locally

```bash
# Test di hosting (sebelum deploy final)
npm start

# Output seharusnya:
# Server running on port 8080
# Connected to Supabase
# etc.

# Test akses:
curl http://localhost:8080/health
# atau
curl http://localhost:8080/api/status
```

**STOP server dulu dengan `Ctrl+C`**

---

### STEP 6: Setup PM2 untuk Auto-Restart

PM2 adalah process manager yang akan auto-start aplikasi jika crash atau reboot.

```bash
# Install PM2 globally
npm install -g pm2

# Buat ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'arsiphost',
    script: './backend/server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: '/home/username/ARSIPHOST/logs/error.log',
    out_file: '/home/username/ARSIPHOST/logs/out.log',
    log_file: '/home/username/ARSIPHOST/logs/combined.log',
    time_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Start dengan PM2
pm2 start ecosystem.config.js

# Setup auto-start on boot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs arsiphost
```

---

### STEP 7: Setup Domain & SSL di cPanel

1. **Buka cPanel**:
   - Hosting Dashboard → cPanel
   - Username: (diberikan hosting)
   - Password: (diberikan hosting)

2. **Add Domain**:
   - Addon Domains → Add Domain
   - Domain: `your-domain.com`
   - Document Root: `/public_html/your-domain.com`
   - Add Domain

3. **Point Domain ke Aplikasi Node**:
   - Pilih: Addon Domains → `your-domain.com`
   - Point ke aplikasi Node (biasanya via reverse proxy)

4. **Setup SSL Certificate**:
   - AutoSSL atau Let's Encrypt (biasanya gratis)
   - Pastikan: "https://your-domain.com" aktif

5. **Konfigurasi Reverse Proxy** (di .htaccess atau server config):

```apache
# File: /public_html/your-domain.com/.htaccess
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{REQUEST_URI} !^/public/
  RewriteRule ^(.*)$ http://localhost:8080/$1 [P,L]
</IfModule>
```

---

### STEP 8: Verifikasi Deployment

```bash
# 1. Check PM2 status
pm2 status

# 2. Check logs
pm2 logs arsiphost

# 3. Test API endpoint
curl https://your-domain.com/api/status

# 4. Test di browser
# Buka: https://your-domain.com
# Harus muncul interface aplikasi

# 5. Monitor real-time
pm2 monit
```

---

## ⚠️ PENTING: Database Terpisah (Jangan DB Lokal)

**Alasan menggunakan Supabase terpisah:**

❌ **JANGAN** gunakan database lokal:
- Database lokal akan hilang jika reboot
- Tidak scalable
- Sulit backup

✅ **GUNAKAN** Supabase terpisah:
- Cloud-hosted, reliable
- Backup otomatis
- Accessible dari mana saja
- Easy to manage

**Konfigurasi di `.env`:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NODE_ENV=production
```

---

## 🔧 Troubleshooting

### Error: "Port already in use"
```bash
# Find process using port 8080
lsof -i :8080
# Kill process
kill -9 <PID>
# Restart PM2
pm2 restart arsiphost
```

### Error: "Cannot connect to Supabase"
```bash
# Check SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env
cat backend/.env | grep SUPABASE

# Test koneksi Supabase
node -e "const { createClient } = require('@supabase/supabase-js'); const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); console.log('Connected');"
```

### Error: "CORS Error"
```bash
# Check ALLOWED_ORIGINS di .env
# Pastikan domain Anda termasuk di sana

ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### Aplikasi tidak restart setelah reboot
```bash
# Pastikan PM2 startup sudah setup
pm2 startup
pm2 save

# Check logs
pm2 logs arsiphost
```

---

## 📊 Monitoring & Maintenance

### Daily Monitoring
```bash
# Check status aplikasi
pm2 status

# View logs
pm2 logs arsiphost --lines 50

# Monitor real-time
pm2 monit
```

### Weekly Tasks
```bash
# Update aplikasi
cd ~/ARSIPHOST
git pull origin main
npm install
pm2 restart arsiphost

# Check disk usage
df -h

# Check memory usage
free -h
```

### Database Backup (Supabase)
- Supabase auto-backup setiap hari
- Manual backup: Buka Supabase dashboard → Backups
- Download backup: Projects → Backups → Download

---

## 🚀 Deployment Checklist

- [ ] Supabase project created & credentials saved
- [ ] `.env` file di `/backend` dengan semua variables
- [ ] JWT_SECRET & SESSION_SECRET generated & filled
- [ ] `npm install` successful
- [ ] Local testing OK (`npm start` → no errors)
- [ ] PM2 installed & configured
- [ ] Domain added di cPanel
- [ ] SSL certificate configured
- [ ] Reverse proxy setup di .htaccess
- [ ] PM2 startup configured
- [ ] API test successful (`curl https://your-domain.com/api/status`)
- [ ] Browser access OK
- [ ] Logs checked & no critical errors

---

## 📞 Support Hosting Indowebsite

- Email: support@indowebsite.com
- Chat: Via cPanel
- Docs: https://indowebsite.com/kb

---

## 📝 Quick Reference Commands

```bash
# SSH ke hosting
ssh username@your-hosting.com

# Navigate ke app
cd ~/ARSIPHOST

# Check PM2 status
pm2 status

# View logs
pm2 logs arsiphost

# Restart app
pm2 restart arsiphost

# Stop app
pm2 stop arsiphost

# Start app
pm2 start ecosystem.config.js

# Update aplikasi
git pull origin main && npm install && pm2 restart arsiphost
```

---

## ✨ Selesai!

Aplikasi Anda sekarang live di:
```
https://your-domain.com
```

Selamat! 🎉

