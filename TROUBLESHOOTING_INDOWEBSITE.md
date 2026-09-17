# 🔧 Troubleshooting Guide - Deploy Indowebsite

---

## ❌ PROBLEM 1: "Application not starting" atau "Service Unavailable"

### Diagnosis

```bash
# SSH ke hosting
ssh username@your-hosting.com
cd ARSIPHOST

# Check PM2 status
pm2 status

# Check logs
pm2 logs arsiphost --lines 50
```

### Solusi

**Jika status = "stopped" atau "errored":**

1. **Check .env file**:
   ```bash
   cat backend/.env | grep -E "SUPABASE|JWT|PORT"
   ```
   Pastikan semua variable terisi, terutama:
   - `PORT=8080`
   - `NODE_ENV=production`
   - `SUPABASE_URL` (ada URL-nya)
   - `SUPABASE_SERVICE_ROLE_KEY` (ada key-nya)

2. **Restart aplikasi**:
   ```bash
   pm2 restart arsiphost
   pm2 logs arsiphost
   ```

3. **Jika masih error, lihat logs untuk detail**:
   ```bash
   pm2 logs arsiphost --lines 100
   ```

---

## ❌ PROBLEM 2: "Cannot connect to Supabase" / Database Error

### Error Messages
- "Cannot POST /api/users" 
- "connection refused"
- "ECONNREFUSED"

### Diagnosis

```bash
# Test Supabase connection
node << 'EOF'
const { createClient } = require('@supabase/supabase-js');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak diset');
  process.exit(1);
}

const supabase = createClient(url, key);
console.log('✅ Supabase client created');
console.log('URL:', url);

// Test query
supabase.from('users').select('count()', { count: 'exact', head: true })
  .then(r => console.log('✅ Connected to Supabase'))
  .catch(e => console.error('❌ Error:', e.message));
EOF
```

### Solusi

1. **Verify credentials di .env**:
   ```bash
   nano backend/.env
   ```
   
   Pastikan:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Get correct credentials dari Supabase**:
   - Buka: https://app.supabase.com
   - Projects → Your Project
   - Settings → API Keys
   - Copy: Project URL
   - Copy: Service Role Key (⚠️ jangan copy anon key)

3. **Verify database tables exist**:
   - Buka Supabase dashboard
   - SQL Editor
   - Run query:
     ```sql
     SELECT table_name FROM information_schema.tables 
     WHERE table_schema = 'public';
     ```
   
   Harus ada tables seperti: users, documents, invoices, dll

4. **Restart aplikasi**:
   ```bash
   pm2 restart arsiphost
   ```

---

## ❌ PROBLEM 3: "Domain not working" / Cannot access https://your-domain.com

### Symptoms
- Browser error: "cannot reach website"
- atau: "ERR_CONNECTION_REFUSED"
- atau: "This site can't be reached"

### Diagnosis

```bash
# 1. Check aplikasi Node berjalan
pm2 status

# 2. Check port 8080 listening
lsof -i :8080
netstat -tlnp | grep 8080

# 3. Test localhost
curl http://localhost:8080

# 4. Check .htaccess
cat /home/username/public_html/your-domain.com/.htaccess
```

### Solusi

1. **Pastikan Node aplikasi running**:
   ```bash
   pm2 status
   # Harus ada: arsiphost → online
   
   # Jika offline, restart:
   pm2 restart arsiphost
   pm2 logs arsiphost
   ```

2. **Verify .htaccess setup**:
   - SSH ke hosting atau buka File Manager di cPanel
   - Navigate ke: `/public_html/your-domain.com/`
   - Buat file `.htaccess` (dot-htaccess)
   
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule ^(.*)$ http://localhost:8080/$1 [P,L]
   </IfModule>
   ```

3. **Verify domain pointing to correct IP**:
   - cPanel → Addon Domains
   - Check: Domain `your-domain.com` pointing ke IP address yang benar
   - Check: A record di DNS:
     ```bash
     nslookup your-domain.com
     ```

4. **Verify SSL certificate**:
   - cPanel → AutoSSL atau Let's Encrypt
   - Pastikan SSL active untuk domain
   - Pastikan certificate tidak expired

5. **Test akses**:
   ```bash
   # SSH test
   curl -I https://your-domain.com
   
   # Harus return: HTTP/1.1 200 OK
   ```

---

## ❌ PROBLEM 4: "CORS Error" / "Access denied from origin"

### Error Messages
- "Access to XMLHttpRequest has been blocked by CORS policy"
- "Origin mismatch"

### Diagnosis

```bash
# Check ALLOWED_ORIGINS di .env
cat backend/.env | grep ALLOWED_ORIGINS
```

### Solusi

1. **Update ALLOWED_ORIGINS di .env**:
   ```bash
   nano backend/.env
   ```
   
   Ubah dari:
   ```env
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
   ```
   
   Menjadi:
   ```env
   ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
   ```

2. **Restart aplikasi**:
   ```bash
   pm2 restart arsiphost
   ```

3. **Clear browser cache**:
   - Browser → Settings → Clear browsing data
   - Refresh page

---

## ❌ PROBLEM 5: "Port already in use" / Address already in use

### Diagnosis

```bash
# Find process using port 8080
lsof -i :8080
netstat -tlnp | grep 8080
```

### Solusi

```bash
# Kill process yang pakai port 8080
kill -9 <PID>

# Atau gunakan PM2 untuk restart
pm2 restart arsiphost

# Verify port bebas
lsof -i :8080
```

---

## ❌ PROBLEM 6: "Application crash after reboot"

### Diagnosis

```bash
# Check PM2 startup
pm2 startup
pm2 status

# Check logs
pm2 logs arsiphost
```

### Solusi

```bash
# Setup PM2 startup on boot
pm2 startup

# Save PM2 state
pm2 save

# Verify
pm2 startup

# Reboot hosting (jika perlu)
sudo reboot

# Setelah reboot, check:
pm2 status
```

---

## ❌ PROBLEM 7: "High memory usage" / Server running slow

### Diagnosis

```bash
# Check memory usage
free -h
df -h

# Check PM2 memory
pm2 monit

# Check Node process
ps aux | grep node
```

### Solusi

1. **Set max memory restart**:
   
   Edit `ecosystem.config.js`:
   ```javascript
   max_memory_restart: '500M',
   ```

2. **Restart aplikasi**:
   ```bash
   pm2 restart arsiphost
   ```

3. **Clean cache/temp files**:
   ```bash
   # Clear temporary files
   rm -rf backend/preview_cache/*
   rm -rf backend/tmp/*
   
   # Restart
   pm2 restart arsiphost
   ```

---

## ❌ PROBLEM 8: "SSL Certificate error" / HTTPS not working

### Diagnosis

```bash
# Check SSL certificate
curl -I https://your-domain.com

# List certificates (cPanel)
ls -la /etc/ssl/certs/
```

### Solusi

1. **Setup/Renew SSL via cPanel**:
   - cPanel → AutoSSL atau Let's Encrypt
   - Select domain
   - Install/Renew certificate

2. **Verify HTTPS redirect**:
   
   Add ke `.htaccess`:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteCond %{HTTPS} off
     RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   </IfModule>
   ```

3. **Test**:
   ```bash
   curl -I https://your-domain.com
   ```

---

## ❌ PROBLEM 9: "npm install fails" / Dependencies not found

### Diagnosis

```bash
# Check npm version
npm -v

# Try install again
npm install

# Check error logs
npm install 2>&1 | tail -50
```

### Solusi

1. **Clear npm cache**:
   ```bash
   npm cache clean --force
   ```

2. **Remove node_modules dan package-lock**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Use production dependencies only**:
   ```bash
   npm install --production
   ```

---

## ❌ PROBLEM 10: "Cannot upload files" / File upload error

### Diagnosis

```bash
# Check disk space
df -h

# Check permissions
ls -la backend/local_files/
ls -la backend/preview_cache/
```

### Solusi

1. **Check disk space**:
   ```bash
   df -h
   # Harus ada minimal 1GB free space
   ```

2. **Fix permissions**:
   ```bash
   chmod -R 755 backend/local_files/
   chmod -R 755 backend/preview_cache/
   chmod -R 755 backend/tmp/
   ```

3. **Increase file upload limit** di .env:
   ```env
   MAX_FILE_SIZE=104857600  # 100MB
   ```

4. **Restart**:
   ```bash
   pm2 restart arsiphost
   ```

---

## 🔍 Useful Commands Reference

```bash
# Navigate
cd ~/ARSIPHOST

# View status
pm2 status
pm2 list
pm2 monit

# View logs
pm2 logs arsiphost
pm2 logs arsiphost --lines 100
pm2 flush              # Clear all logs

# Manage PM2
pm2 restart arsiphost
pm2 stop arsiphost
pm2 start ecosystem.config.js
pm2 delete arsiphost

# Environment
cat backend/.env
nano backend/.env      # Edit .env

# Testing
npm test
curl http://localhost:8080/api/status
curl -I https://your-domain.com

# System info
uname -a
node -v
npm -v
df -h              # Disk space
free -h            # Memory
top                # Running processes

# File management
ls -la backend/
find . -name "*.log" | head -10
du -sh ./*         # Size per folder
```

---

## 📞 When to Contact Support

Contact **Indowebsite Support** jika:

1. Tidak bisa SSH ke hosting
2. Error di level cPanel (domain pointing, SSL, dll)
3. Sistem hosting down/slow
4. Need help dengan HTTP/Reverse proxy

**Contact:**
- Email: support@indowebsite.com
- cPanel Support Chat
- Docs: https://indowebsite.com/kb

---

## 📝 Notes

- PM2 logs simpan di `logs/` folder
- Database backup otomatis di Supabase
- Jangan perubah database credentials di production tanpa planning
- Monitor aplikasi secara regular

---

Semoga membantu! 🚀

