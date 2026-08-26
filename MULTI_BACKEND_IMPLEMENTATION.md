# Multi-Backend Storage Implementation Guide

**Date**: August 24, 2026  
**Purpose**: Step-by-step guide untuk setup multi-backend storage dengan Rclone  
**Status**: Ready to implement

---

## 🎯 Quick Start - Implementasi Rekomendasi

### Skenario: Terabox + Google Drive + Backblaze B2

```
┌────────────────────────────────────────────────────────┐
│         OPTIMAL MULTI-BACKEND SETUP                   │
├────────────────────────────────────────────────────────┤
│ HOT:   Terabox (Existing)     [Fast, Primary]         │
│ WARM:  Google Drive           [Backup, Sync]          │
│ COLD:  Backblaze B2           [Archive, Budget]       │
└────────────────────────────────────────────────────────┘
```

---

## 📝 Step 1: Setup Google Drive Backend

### 1.1 Get Google Drive Credentials

1. Go to: https://console.cloud.google.com/
2. Create new project: "Pusat Arsip Anka"
3. Enable "Google Drive API"
4. Create OAuth 2.0 credentials (Desktop app)
5. Save: Client ID & Client Secret

### 1.2 Add to rclone.conf

```ini
[gdrive]
type = drive
client_id = YOUR_CLIENT_ID_HERE
client_secret = YOUR_CLIENT_SECRET_HERE
scope = drive
token = {}  # Will be auto-filled after auth
```

### 1.3 Authorize with Google

```bash
rclone authorize drive gdrive
```

After authorization, token will auto-populate in rclone.conf.

---

## 📝 Step 2: Setup Backblaze B2 Backend

### 2.1 Get Backblaze B2 Credentials

1. Go to: https://www.backblaze.com/b2/
2. Create account or login
3. Create bucket: "arsip-anka-archive"
4. Get: Application Key ID & Application Key

### 2.2 Add to rclone.conf

```ini
[b2]
type = b2
account_id = YOUR_ACCOUNT_ID
app_key = YOUR_APP_KEY
```

---

## 📝 Step 3: Updated rclone.conf

```ini
# ════════════════════════════════════════
# TERABOX - Primary Storage (Existing)
# ════════════════════════════════════════
[terabox]
type = webdav
url = http://localhost:5244/dav/terabox
vendor = other
user = admin
pass = nOBxHSEklm1M-QWIKlzw_93rRHRwZ16b

# ════════════════════════════════════════
# GOOGLE DRIVE - Backup Storage
# ════════════════════════════════════════
[gdrive]
type = drive
client_id = YOUR_CLIENT_ID
client_secret = YOUR_CLIENT_SECRET
scope = drive
token = {"access_token":"...","token_type":"Bearer"}

# ════════════════════════════════════════
# BACKBLAZE B2 - Archive Storage
# ════════════════════════════════════════
[b2]
type = b2
account_id = YOUR_ACCOUNT_ID
app_key = YOUR_APP_KEY

# ════════════════════════════════════════
# OPTIONAL: AWS S3 - Performance
# ════════════════════════════════════════
# [s3-aws]
# type = s3
# provider = AWS
# env_auth = true
# region = ap-southeast-1
```

---

## 🔄 Step 4: Sync Scripts

### 4.1 Real-Time Backup Script (PowerShell)

**File**: `sync-backup.ps1`

```powershell
# Real-time backup: Terabox → Google Drive
# Run every hour

$logFile = "C:\logs\backup-$(Get-Date -Format 'yyyy-MM-dd').log"

Write-Output "$(Get-Date) - Starting backup sync" | Tee-Object -FilePath $logFile -Append

# Sync Terabox to Google Drive
rclone sync terabox:/ gdrive:Backups/arsip-anka/ `
  --log-level INFO `
  --log-file $logFile `
  --stats-one-line-date `
  --progress `
  2>&1 | Tee-Object -FilePath $logFile -Append

Write-Output "$(Get-Date) - Backup sync completed" | Tee-Object -FilePath $logFile -Append
```

### 4.2 Archive Script (Monthly)

**File**: `archive-old-files.ps1`

```powershell
# Move files older than 90 days to B2
# Run monthly (e.g., 1st of each month)

$logFile = "C:\logs\archive-$(Get-Date -Format 'yyyy-MM-dd').log"

Write-Output "$(Get-Date) - Starting archive sync" | Tee-Object -FilePath $logFile -Append

# Move files older than 90 days to B2
rclone sync terabox:/ b2:arsip-anka-archive/ `
  --min-age 90d `
  --log-level INFO `
  --log-file $logFile `
  --stats-one-line-date `
  2>&1 | Tee-Object -FilePath $logFile -Append

Write-Output "$(Get-Date) - Archive sync completed" | Tee-Object -FilePath $logFile -Append
```

### 4.3 Health Check Script

**File**: `health-check.ps1`

```powershell
# Check connectivity to all backends
# Run every 30 minutes

$backends = @(
    @{ name = "terabox"; path = "terabox:/" }
    @{ name = "gdrive"; path = "gdrive:/" }
    @{ name = "b2"; path = "b2:arsip-anka-archive/" }
)

$logFile = "C:\logs\health-check-$(Get-Date -Format 'yyyy-MM-dd').log"

Write-Output "$(Get-Date) - Health check started" | Tee-Object -FilePath $logFile -Append

foreach ($backend in $backends) {
    Write-Output "Checking $($backend.name)..." | Tee-Object -FilePath $logFile -Append
    
    $result = rclone lsd $backend.path 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Output "✅ $($backend.name) - OK" | Tee-Object -FilePath $logFile -Append
    } else {
        Write-Output "❌ $($backend.name) - FAILED" | Tee-Object -FilePath $logFile -Append
        # Send alert
        Send-Alert "Storage backend $($backend.name) is unreachable"
    }
}

Write-Output "$(Get-Date) - Health check completed" | Tee-Object -FilePath $logFile -Append
```

---

## ⏰ Step 5: Schedule Scripts

### Using Task Scheduler (Windows)

#### Task 1: Hourly Backup

```
Name: Arsip-Anka-Backup-Sync
Trigger: Daily at specific times (every 4 hours)
Action: Run PowerShell -NoProfile -ExecutionPolicy Bypass -File C:\scripts\sync-backup.ps1
Conditions: Only run if connected to network
Settings: Stop if running longer than 30 minutes
```

#### Task 2: Monthly Archive

```
Name: Arsip-Anka-Archive
Trigger: On 1st of each month at 2:00 AM
Action: Run PowerShell -NoProfile -ExecutionPolicy Bypass -File C:\scripts\archive-old-files.ps1
Settings: Stop if running longer than 2 hours
```

#### Task 3: 30-Minute Health Check

```
Name: Arsip-Anka-Health-Check
Trigger: Every 30 minutes
Action: Run PowerShell -NoProfile -ExecutionPolicy Bypass -File C:\scripts\health-check.ps1
Settings: Stop if running longer than 5 minutes
```

---

## 🔧 Step 6: Node.js Backend Integration

### 6.1 Add Multi-Backend Wrapper

**File**: `backend/multi-storage.js`

```javascript
const { execFile } = require('child_process');
const path = require('path');

class MultiBackendStorage {
  constructor() {
    this.rclone = process.env.RCLONE_BIN || 'rclone';
    this.config = process.env.RCLONE_CONFIG_PATH || './rclone.conf';
    this.backends = {
      primary: 'terabox',
      backup: 'gdrive',
      archive: 'b2'
    };
  }

  /**
   * Write to primary backend only
   * (Backup happens via scheduled sync)
   */
  async write(filePath, content) {
    return new Promise((resolve, reject) => {
      const file = this.createTempFile(content);
      
      execFile(this.rclone, [
        '--config', this.config,
        'copy', file,
        `${this.backends.primary}:${filePath}`
      ], (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      });
    });
  }

  /**
   * Read from fastest available backend
   */
  async read(filePath) {
    const backends = [
      this.backends.primary,
      this.backends.backup,
      this.backends.archive
    ];

    for (const backend of backends) {
      try {
        return await this.readFromBackend(backend, filePath);
      } catch (e) {
        console.log(`Backend ${backend} unavailable, trying next...`);
        continue;
      }
    }

    throw new Error(`File ${filePath} not found in any backend`);
  }

  /**
   * Sync statistics from all backends
   */
  async getSyncStatus() {
    const status = {};

    for (const [name, backend] of Object.entries(this.backends)) {
      try {
        const result = await this.executeRclone([
          'size',
          `${backend}:/`,
          '--json'
        ]);
        status[name] = JSON.parse(result);
        status[name].status = 'healthy';
      } catch (e) {
        status[name] = {
          status: 'unhealthy',
          error: e.message
        };
      }
    }

    return status;
  }

  // Helper methods
  async readFromBackend(backend, filePath) {
    return new Promise((resolve, reject) => {
      execFile(this.rclone, [
        '--config', this.config,
        'cat',
        `${backend}:${filePath}`
      ], (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      });
    });
  }

  async executeRclone(args) {
    return new Promise((resolve, reject) => {
      execFile(this.rclone, [
        '--config', this.config,
        ...args
      ], (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      });
    });
  }

  createTempFile(content) {
    const fs = require('fs');
    const tmpFile = path.join(process.env.UPLOAD_TEMP_PATH || './tmp', 
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    fs.writeFileSync(tmpFile, content);
    return tmpFile;
  }
}

module.exports = MultiBackendStorage;
```

### 6.2 Add API Endpoint for Sync Status

**File**: `backend/server.js` (Add new endpoint)

```javascript
// GET /api/storage/sync-status
app.get('/api/storage/sync-status', authenticateToken, async (req, res) => {
  try {
    const multiStorage = new MultiBackendStorage();
    const status = await multiStorage.getSyncStatus();
    
    res.json({
      timestamp: new Date().toISOString(),
      backends: status,
      recommendation: getRecommendation(status)
    });
  } catch (err) {
    console.error('[SYNC-STATUS] Error:', err);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

function getRecommendation(status) {
  if (!status.primary?.status === 'healthy') {
    return 'WARNING: Primary backend unavailable, using backup';
  }
  if (!status.backup?.status === 'healthy') {
    return 'WARNING: Backup not synced, check backup job';
  }
  return 'All backends healthy';
}
```

---

## 💰 Cost Estimation (Monthly)

### Setup: Terabox + Google Drive + Backblaze B2

```
HOT STORAGE (Terabox)
├─ 1TB/month: $0 (already subscribed)
└─ Included with Terabox plan

WARM STORAGE (Google Drive)
├─ 15GB: $0 (free)
├─ If upgrade to 2TB: $9.99/month
└─ Backup only, minimal cost

COLD STORAGE (Backblaze B2)
├─ 500GB archive: $3/month ($0.006/GB)
├─ Transfer out: $0.01/GB (if needed)
└─ Very affordable for archives

TOTAL MINIMUM: $0/month (all free tiers)
TOTAL WITH 2TB GDRIVE: $9.99/month
TOTAL FULL SETUP: ~$15/month
```

---

## ✅ Verification Checklist

### Before Implementation
- [ ] Read STORAGE_OPTIONS_GUIDE.md
- [ ] Choose backends (recommend: Terabox + Google Drive + B2)
- [ ] Get API credentials
- [ ] Test rclone locally

### Implementation
- [ ] Update rclone.conf
- [ ] Create sync scripts
- [ ] Schedule tasks
- [ ] Test each backend
- [ ] Verify sync is working

### Monitoring
- [ ] Check health daily
- [ ] Monitor costs
- [ ] Verify backups exist
- [ ] Test restore from backup
- [ ] Document procedures

---

## 🚀 Benefits of Multi-Backend

### ✅ High Availability
- If primary fails, read from backup
- Automatic failover capability
- No data loss

### ✅ Cost Optimization
- Hot tier: Fast access (Terabox)
- Warm tier: Regular backup (Google Drive)
- Cold tier: Budget archive (B2)

### ✅ Compliance & Security
- Geo-redundancy
- Multiple copies
- Disaster recovery
- Audit trail

### ✅ Performance
- Primary optimized for speed
- Backups scheduled off-peak
- Archive doesn't affect performance

---

## 📞 Troubleshooting

### Sync not running
1. Check Task Scheduler logs
2. Verify rclone.conf paths
3. Test manually: `rclone sync terabox: gdrive:`

### Backend unreachable
1. Check internet connection
2. Verify credentials
3. Test: `rclone lsd gdrive:`

### High costs
1. Check transfer amounts
2. Reduce sync frequency
3. Consider archive threshold

### Sync taking too long
1. Run during off-peak
2. Use `--transfers=4` for parallel
3. Consider incremental backups

---

## 📋 Implementation Phases

### Phase 1: Immediate (This Week)
- [ ] Add Google Drive as backup
- [ ] Setup hourly sync script
- [ ] Monitor for 7 days

### Phase 2: Short-term (Next Week)
- [ ] Add Backblaze B2
- [ ] Setup monthly archive
- [ ] Integrate with backend

### Phase 3: Medium-term (Next Month)
- [ ] Optimize based on usage
- [ ] Add monitoring dashboards
- [ ] Document procedures

### Phase 4: Long-term (This Quarter)
- [ ] Consider AWS S3 for performance
- [ ] Evaluate cost vs benefit
- [ ] Plan future scaling

---

## 📚 Reference Commands

```bash
# List backends
rclone listremotes

# Test backend
rclone lsd terabox:/
rclone lsd gdrive:/
rclone lsd b2:

# Manual sync
rclone sync terabox:/ gdrive:backup/
rclone sync terabox:/ b2:archive/

# Monitor sync
rclone sync terabox:/ gdrive:backup/ --progress

# Check size
rclone size terabox:/
rclone size gdrive:/
rclone size b2:

# Dry run (test without changes)
rclone sync terabox:/ gdrive:backup/ --dry-run
```

---

**Document Created**: August 24, 2026  
**Status**: Ready to implement  
**Recommendation**: Start with Phase 1 this week

