---
title: Pusat Arsip Anka
emoji: 📂
colorFrom: indigo
colorTo: blue
sdk: docker
pinned: false
---

# Pusat Arsip Anka Multi-Zona

Sistem manajemen Pusat Arsip Anka dengan integrasi Terabox & WhatsApp Notification.

## Quick Start (Local Development)

### Start Server
```bash
# Windows (easiest)
double-click: start-server.bat

# Or PowerShell
.\start-server-with-restart.ps1

# Or Manual
cd backend
node server.js
```

### Access Web
```
http://localhost:5000
```

### Features
- ✅ Auto-restart on crash
- ✅ Automatic process cleanup
- ✅ Detailed logging
- ✅ Graceful shutdown (Ctrl+C)

For detailed guide, see: `QUICK_START.txt` or `SERVER_STARTUP_GUIDE.md`

---

## Deployment Notes
Aplikasi ini berjalan menggunakan Docker di Hugging Face Spaces.

### Required Secrets
Pastikan untuk menambahkan variabel berikut di **Settings > Variables and Secrets**:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `FONNTE_TOKEN`

### Port Configuration
- **Local Development:** Port 5000 (auto-restart wrapper handles conflicts)
- **Hugging Face Spaces:** Port 7860 (set via environment)
- **Cloud Run:** Port 8080 (set via environment)
