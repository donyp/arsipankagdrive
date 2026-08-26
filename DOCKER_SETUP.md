# 🐳 Docker Setup untuk Pusat Arsip Anka

## Prerequisites

1. **Docker Desktop** - Install dari https://www.docker.com/products/docker-desktop
2. **Docker Compose** - Biasanya sudah included dengan Docker Desktop

## Setup Steps

### 1. Stop Node.js Server
```powershell
# Jika server Node.js masih jalan, stop dulu
# Atau bisa close terminal yang jalankan "node server.js"
```

### 2. Prepare Environment
```powershell
# Pastikan .env file di root folder sudah ada dengan konfigurasi benar:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - JWT_SECRET
# - ALIST_ADMIN_PASSWORD
# - dll
```

### 3. Copy rclone.conf
```powershell
# Pastikan rclone.conf sudah ada di root folder
# File ini akan di-mount ke Alist container
```

### 4. Start Docker Containers
```powershell
# Buka PowerShell di root folder dan jalankan:
docker-compose up -d

# Atau dengan rebuild jika ada perubahan code:
docker-compose up -d --build
```

### 5. Verify Services Running
```powershell
# Check status containers
docker-compose ps

# Output diharapkan:
# NAME                STATUS
# arsip-alist         Up
# arsip-backend       Up
```

### 6. Check Logs
```powershell
# Backend logs
docker-compose logs -f backend

# Alist logs
docker-compose logs -f alist

# Combined logs
docker-compose logs -f
```

### 7. Test Backend
```powershell
# Buka browser ke http://localhost:5000/api/heartbeat
# Seharusnya return: {"status":"alive","version":"2.0.1-fixed"}
```

### 8. Test Alist
```powershell
# Buka browser ke http://localhost:5244
# Seharusnya ada Alist web UI
# Login dengan: admin / admin123 (atau dari ALIST_ADMIN_PASSWORD)
```

## Stop Services
```powershell
docker-compose down
```

## Rebuild & Restart
```powershell
docker-compose down
docker-compose up -d --build
```

## View Logs Real-time
```powershell
# Backend
docker-compose logs -f backend

# Alist
docker-compose logs -f alist
```

## Troubleshooting

### Port Already in Use
```powershell
# Jika port 5000 atau 5244 sudah digunakan:
# Change ports di docker-compose.yml

# Atau terminate yang nggunakan port:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Container Won't Start
```powershell
# Check logs:
docker-compose logs backend

# Rebuild image:
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Permission Issues
```powershell
# Run PowerShell as Administrator
# Atau setup Docker Desktop untuk non-admin users
```

## Web Access

- **Frontend**: http://localhost (buka index.html dengan live server)
- **Backend API**: http://localhost:5000
- **Alist**: http://localhost:5244

## Environment Variables

File `.env.txt` di root folder harus memiliki:
```
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
SESSION_SECRET=...
ALIST_ADMIN_PASSWORD=admin123
FONNTE_TOKEN=...
ENABLE_ALIST=true
NODE_ENV=production
PORT=5000
```

## Production Deployment

Untuk production, gunakan docker-compose ini di server:
1. Ganti localhost dengan domain name
2. Setup SSL certificate
3. Setup environment variables yang aman
4. Monitor container health
5. Setup backup untuk database

## Next Steps

Setelah Docker running:
1. ✅ Backend API siap di port 5000
2. ✅ Alist siap di port 5244
3. ✅ File preview/download seharusnya work
4. ✅ Rclone bisa akses Terabox via Alist

Coba preview/download file sekarang! 👍
