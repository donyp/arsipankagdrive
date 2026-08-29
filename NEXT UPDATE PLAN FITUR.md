# Next Phase Implementation Plan - Arsip ANKA

**Document Created**: 2026-08-28  
**Status**: Ready for Implementation  
**Priority**: High  
**Estimated Timeline**: 6 weeks (30 days)  
**Team Size**: 1-2 developers

---

## 📋 Executive Summary

8 fitur strategis untuk peningkatan sistem Arsip ANKA:
1. Anomaly Detection Report
2. CDN Integration untuk Faster Downloads
3. Progressive Upload (Upload besar tidak timeout)
4. Comments & Annotations pada File
5. System Health & Monitoring
6. Data Quality Assurance
7. In-app Help Tooltips (untuk admin zona)
8. FAQ Knowledge Base (untuk admin zona)

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1-2) - 10 days
- System Health & Monitoring
- Data Quality Assurance
- In-app help tooltips

### Phase 2: Core Features (Week 3-4) - 12 days
- Anomaly detection report
- Comments & annotations
- Progressive upload

### Phase 3: Enhancement (Week 5-6) - 8 days
- CDN integration
- FAQ knowledge base

---

## 1️⃣ ANOMALY DETECTION REPORT

**Complexity**: Medium (3-4 hari)  
**Priority**: High  

### Fitur yang akan dideteksi:
```
- Duplicate invoices (same toko + same nominal dalam 24 jam)
- Suspicious nominal (terlalu besar/kecil dari avg)
- Unusual time uploads (middle of night)
- Duplicate filenames (exact match)
- Orphaned files (no toko assigned)
```

### Backend Implementation:
- New endpoint: `GET /api/reports/anomalies`
- New table: `anomaly_flags`
- Cron job: Run detection setiap jam

### Frontend:
- New page: `/reports.html` (admin/moderator only)
- Interactive table dengan filter & export
- Action: Mark as reviewed, delete, atau approve

### Database Schema:
```sql
CREATE TABLE anomaly_flags (
    id UUID PRIMARY KEY,
    file_id UUID REFERENCES files(id),
    anomaly_type VARCHAR(50),
    severity ENUM('low', 'medium', 'high'),
    description TEXT,
    created_at TIMESTAMP,
    reviewed_by UUID,
    reviewed_at TIMESTAMP,
    status ENUM('pending', 'reviewed', 'approved', 'rejected')
);
```

### Detection Logic:
```javascript
// Duplicate detection
const duplicates = await db
    .select('*')
    .from('files')
    .where('toko_id', tokoId)
    .where('total_jual', nominal)
    .where('created_at', '>=', 24h_ago);

// Suspicious nominal
const avgNominal = await db.raw('SELECT AVG(total_jual) FROM files');
if (nominal > avgNominal * 2 || nominal < avgNominal / 2) {
    flag('suspicious_nominal');
}

// Orphaned files
const orphaned = await db
    .select('*')
    .from('files')
    .where('toko_id', null);
```

---

## 2️⃣ CDN INTEGRATION UNTUK FASTER DOWNLOADS

**Complexity**: Medium (4-5 hari)  
**Priority**: Medium  

### Strategy:
- Cache PDF files selama 24 jam
- Smart cache invalidation saat file deleted
- Reduce server load

### Options:
- **Option A**: Cloudflare Workers (simple, $20/bulan) ✅ RECOMMENDED
- **Option B**: AWS CloudFront (kompleks, tapi scalable)
- **Option C**: Local caching dengan Redis (fast tapi kurang scalable)

### Implementation:

**Backend (.env):**
```
USE_CDN=true
CDN_URL=https://cdn.arsipanka.com
CLOUDFLARE_ZONE_ID=xxxxx
CLOUDFLARE_API_KEY=xxxxx
```

**rclone_wrapper.js:**
```javascript
const getCDNUrl = (filename) => {
    if (process.env.USE_CDN === 'true') {
        return `${process.env.CDN_URL}/files/${filename}`;
    }
    return `/api/files/${filename}/download`;
};
```

**Backend Endpoints:**
```
POST /api/cdn/purge-cache/:fileId
GET /api/cdn/stats
```

**Frontend:**
- Use CDN URLs untuk downloads
- Show "Downloading from cache" indicator
- Fallback ke direct download jika CDN error

### Cache Headers:
```javascript
res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
res.set('CDN-Cache-Control', 'max-age=86400');
```

---

## 3️⃣ PROGRESSIVE UPLOAD (Upload besar tidak timeout)

**Complexity**: Hard (5-6 hari)  
**Priority**: High  

### Challenges:
- Handle large file uploads (100MB+)
- Resume interrupted uploads
- Show accurate progress

### Architecture:

**Frontend Upload Strategy:**
```javascript
// Split file jadi chunks (5MB per chunk)
// Upload parallel (max 3 concurrent)
// Show progress per chunk
// Auto-resume jika interrupted
// Store upload state di localStorage

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

async function uploadChunked(file) {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const sessionId = generateId();
    
    for (let i = 0; i < totalChunks; i++) {
        const chunk = file.slice(
            i * CHUNK_SIZE,
            (i + 1) * CHUNK_SIZE
        );
        
        await uploadChunk(sessionId, i, chunk);
        updateProgress((i + 1) / totalChunks * 100);
        
        // Save state every chunk
        saveUploadState({
            fileId: sessionId,
            completedChunks: i + 1,
            totalChunks
        });
    }
    
    // Finalize upload
    await finalizeUpload(sessionId);
}
```

**Backend Endpoints:**
```
POST /api/files/upload-chunked/init
    -> Return: sessionId, chunkSize, totalChunks

POST /api/files/upload-chunked/:sessionId/chunk/:chunkNumber
    -> Upload chunk, return: progress

POST /api/files/upload-chunked/:sessionId/finalize
    -> Combine chunks, validate, return: file

GET /api/files/upload-chunked/:sessionId/status
    -> Check upload status, return resumable chunks
```

### Database Schema:
```sql
CREATE TABLE upload_sessions (
    id UUID PRIMARY KEY,
    file_name VARCHAR(255),
    total_size BIGINT,
    chunk_size INT,
    total_chunks INT,
    completed_chunks INT[],
    created_at TIMESTAMP,
    expires_at TIMESTAMP,
    user_id UUID REFERENCES users(id)
);

CREATE TABLE upload_chunks (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES upload_sessions(id),
    chunk_number INT,
    chunk_data BYTEA,
    received_at TIMESTAMP
);
```

### Features:
- Auto-resume jika browser close
- Progress indicator per chunk
- Cancel upload option
- Retry failed chunks
- Timeout per chunk (30s), bukan entire upload

---

## 4️⃣ COMMENTS & ANNOTATIONS PADA FILE

**Complexity**: Medium (3-4 hari)  
**Priority**: Medium  

### Features:
- Add comment on file
- @mention users
- Resolve comments (mark as done)
- Comment history
- Real-time updates

### Database Schema:
```sql
CREATE TABLE file_comments (
    id UUID PRIMARY KEY,
    file_id UUID REFERENCES files(id),
    user_id UUID REFERENCES users(id),
    comment TEXT,
    mentions TEXT[], -- Array of user IDs
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    resolved_at TIMESTAMP
);
```

### Backend Endpoints:
```
POST /api/files/:fileId/comments
    -> Create comment with mentions
    
GET /api/files/:fileId/comments
    -> Get all comments for file
    
PATCH /api/files/:fileId/comments/:commentId
    -> Edit comment
    
DELETE /api/files/:fileId/comments/:commentId
    -> Delete comment
    
POST /api/files/:fileId/comments/:commentId/resolve
    -> Mark as resolved
```

### Frontend:
- Add comments panel di file detail view
- Show comment count badge
- Real-time updates dengan WebSocket atau polling
- @mention autocomplete
- Markdown support dalam comments
- Show who resolved the comment

### Mention System:
```javascript
const mentions = extractMentions(commentText); // @username
await notifyUsers(mentions, {
    type: 'file_comment',
    fileId,
    message: `${user.name} mentioned you on file comment`
});
```

---

## 5️⃣ SYSTEM HEALTH & MONITORING

**Complexity**: Medium (4-5 hari)  
**Priority**: Critical  

### Metrics to track:
```javascript
{
    "database": {
        "status": "connected",
        "responseTime": "45ms",
        "errorRate": "0.1%",
        "connectionPoolUsage": "65%"
    },
    "storage": {
        "googleDrive": {
            "status": "connected",
            "usedSpace": "450GB",
            "quotaUsed": "75%",
            "lastSync": "2 min ago"
        },
        "localStorage": {
            "status": "ok",
            "usedSpace": "50GB"
        }
    },
    "api": {
        "uptime": "99.95%",
        "avgResponseTime": "120ms",
        "requestsPerMinute": 450,
        "errorRate": "0.05%",
        "activeConnections": 127
    },
    "sync": {
        "lastSync": "2 minutes ago",
        "failedSyncs": 0,
        "pendingFiles": 12,
        "syncDuration": "45s"
    }
}
```

### Backend:
- New endpoint: `GET /api/system/health`
- Track metrics di time-series database
- Alert threshold logic
- Automated recovery attempts

### Frontend Page: `/admin/system-health.html`
- Real-time gauges & charts
- Alert notifications (email + in-app)
- Incident history
- Manual system actions (restart sync, clear cache)

### Database Schema:
```sql
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY,
    metric_name VARCHAR(100),
    metric_value FLOAT,
    tags JSONB, -- {component: 'db', subsystem: 'pool'}
    recorded_at TIMESTAMP
);

CREATE TABLE system_alerts (
    id UUID PRIMARY KEY,
    alert_type VARCHAR(50),
    message TEXT,
    severity ENUM('info', 'warning', 'critical'),
    created_at TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_notes TEXT
);

-- For metric persistence (daily aggregates)
CREATE TABLE system_metrics_daily (
    id UUID PRIMARY KEY,
    date DATE,
    metric_name VARCHAR(100),
    min_value FLOAT,
    max_value FLOAT,
    avg_value FLOAT,
    error_count INT
);
```

### Health Check Endpoints:
```javascript
app.get('/api/system/health', async (req, res) => {
    const health = {
        database: await checkDatabase(),
        storage: await checkStorage(),
        api: await checkAPI(),
        sync: await checkSync()
    };
    
    // Determine overall status
    health.status = Object.values(health)
        .some(s => s.status === 'error') ? 'error' : 'ok';
    
    return res.json(health);
});
```

### Alert Thresholds:
```javascript
const thresholds = {
    'db.responseTime': { warning: 100, critical: 500 },
    'storage.quotaUsed': { warning: 80, critical: 95 },
    'api.errorRate': { warning: 1, critical: 5 },
    'api.avgResponseTime': { warning: 200, critical: 500 },
    'sync.failedSyncs': { warning: 1, critical: 5 }
};
```

---

## 6️⃣ DATA QUALITY ASSURANCE

**Complexity**: Medium (4 hari)  
**Priority**: High  

### Validation Rules:
```javascript
const validationRules = {
    "filename_format": {
        pattern: /^(PPN|NON)?\s+.+\d+\.pdf$/i,
        message: "Filename harus format: [PPN/NON] nama nominal.pdf"
    },
    "tanggal_dokumen": {
        validator: (date) => date <= today(),
        message: "Tanggal tidak boleh masa depan"
    },
    "nominal": {
        validator: (val) => val > 0,
        message: "Nominal harus > 0"
    },
    "toko_id": {
        validator: (id) => db.toko.find(id),
        message: "Toko tidak ditemukan dalam database"
    },
    "zona_id": {
        validator: (id, tokoId) => toko.zona_id === id,
        message: "Zona harus sesuai dengan zona toko"
    },
    "file_size": {
        validator: (size) => size < 50 * 1024 * 1024,
        message: "Ukuran file maksimal 50MB"
    },
    "file_type": {
        pattern: /\.(pdf|jpg|jpeg|png)$/i,
        message: "Tipe file hanya PDF, JPG, atau PNG"
    }
};
```

### Backend Endpoint:
```javascript
POST /api/validation/check-file
    Body: { filename, nominal, tanggalDokumen, tokoId }
    Response: {
        valid: boolean,
        errors: [],
        warnings: [],
        suggestions: []
    }
```

### Frontend:
- Show validation errors sebelum upload
- Warn user tentang data quality issues
- Suggest corrections
- Allow override dengan confirmation

### Automated Fixes:
```javascript
const autoFix = {
    // Auto-lowercase filenames
    filename: (f) => f.toLowerCase(),
    
    // Auto-correct tanggal (if invalid format)
    tanggal: (d) => {
        if (!isValidDate(d)) {
            return extractDateFromFilename(filename);
        }
    },
    
    // Auto-detect nominal dari filename
    nominal: (f) => {
        const match = f.match(/(\d[\d\.]*)/);
        return match ? parseNominal(match[1]) : null;
    }
};
```

### Database:
```sql
CREATE TABLE validation_rules (
    id UUID PRIMARY KEY,
    rule_name VARCHAR(100),
    rule_type ENUM('format', 'range', 'reference'),
    rule_config JSONB,
    severity ENUM('error', 'warning'),
    created_at TIMESTAMP
);

CREATE TABLE data_quality_issues (
    id UUID PRIMARY KEY,
    file_id UUID REFERENCES files(id),
    issue_type VARCHAR(50),
    issue_description TEXT,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP
);
```

---

## 7️⃣ IN-APP HELP TOOLTIPS (untuk admin zona)

**Complexity**: Easy (2-3 hari)  
**Priority**: Medium  

### Implementation:

**HTML Structure:**
```html
<div class="form-group">
    <label>
        Zona
        <span class="help-icon" 
              data-tooltip="Select zona berdasarkan lokasi file berasal"
              data-placement="top">
            ?
        </span>
    </label>
    <select>...</select>
</div>
```

### Tooltips Content Map:
```javascript
const tooltips = {
    // Upload Form
    "zona": "Pilih zona berdasarkan lokasi file berasal (zona-1, zona-2, dst)",
    "toko": "Pilih toko penerbit invoice (Balaraja, Cianjur, dst)",
    "nominal": "Nominal invoice dalam format angka (cth: 1500000 untuk Rp 1.5 juta)",
    "tanggal_dokumen": "Tanggal invoice (tidak boleh tanggal masa depan)",
    "category": "PPN untuk invoice yang kena pajak, NON untuk tanpa pajak",
    "upload_file": "Drag & drop file atau klik untuk pilih file dari komputer",
    
    // Dashboard
    "filter_zona": "Filter file berdasarkan zona tertentu",
    "filter_category": "Filter file berdasarkan kategori (INVOICE/PPN/NON/PIUTANG)",
    "filter_date": "Filter file berdasarkan range tanggal upload",
    
    // Admin Zona
    "approve_files": "Tinjau dan approve file sebelum masuk ke archive",
    "flag_anomaly": "Tandai file yang mencurigakan untuk review lebih lanjut",
    "file_comments": "Tambahkan catatan atau komentar untuk file ini"
};
```

### Frontend Library:
- Use: **Popper.js** atau **Bootstrap Tooltip**
- Trigger: Hover atau click
- Style: Match design system (position: top/bottom/left/right)

### CSS Classes:
```css
.help-icon {
    cursor: help;
    color: #666;
    font-weight: bold;
    margin-left: 4px;
    font-size: 14px;
}

.help-icon:hover {
    color: #0066cc;
}

.tooltip {
    background: #333;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;
    max-width: 250px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
```

### Features:
- Context-sensitive tooltips
- Keyboard accessible (Tab + Enter)
- Not intrusive (only show on hover/focus)
- Mobile friendly (tap to show)

---

## 8️⃣ FAQ KNOWLEDGE BASE (untuk admin zona)

**Complexity**: Easy (2-3 hari)  
**Priority**: Medium  

### Database Schema:
```sql
CREATE TABLE faq_categories (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    icon VARCHAR(50),
    order_number INT,
    created_at TIMESTAMP
);

CREATE TABLE faq_articles (
    id UUID PRIMARY KEY,
    category_id UUID REFERENCES faq_categories(id),
    question TEXT,
    answer TEXT,
    tags TEXT[],
    order_number INT,
    views INT DEFAULT 0,
    helpful_count INT DEFAULT 0,
    not_helpful_count INT DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Frontend Page: `/faq.html`

**Categories:**
1. **Uploading Files**
   - How to upload files
   - Supported file types
   - File size limits
   - Upload troubleshooting

2. **File Management**
   - How to move files
   - How to delete files
   - How to download files
   - Bulk operations

3. **Searching & Filtering**
   - How to search files
   - How to filter by date
   - How to filter by toko
   - How to use advanced filters

4. **Reports & Analytics**
   - How to view reports
   - How to export reports
   - Understanding metrics
   - Anomaly reports

5. **Troubleshooting**
   - Upload failed
   - Can't find file
   - Slow downloads
   - Permission issues

6. **Account & Security**
   - How to change password
   - How to manage API tokens
   - Security best practices

### Sample FAQs:

**Q: Kenapa upload timeout?**
```
A: Untuk file besar (> 50MB), gunakan progressive upload:
1. Go to Upload page
2. Enable "Large File Upload" checkbox
3. Upload akan dilakukan per-chunk
4. Jika terputus, resume otomatis saat reconnect

Alternatif: Kompres file dahulu, kemudian upload
```

**Q: Bagaimana cara filter file by date?**
```
A: Gunakan Date Range Filter:
1. Klik "Filter" button di file list
2. Pilih "Date Range"
3. Tentukan tanggal mulai dan selesai
4. Klik "Apply"

Atau gunakan Quick Filter:
1. Klik "Today", "This Week", "This Month"
```

**Q: Nominal tidak terdeteksi otomatis?**
```
A: Pastikan nominal berada di awal filename dan berformat dengan titik:
❌ Salah: invoice-balaraja-1500000.pdf
✅ Benar: PPN 1.500.000 - Balaraja.pdf
✅ Benar: 1.500.000 Balaraja Invoice.pdf

Tips:
- Gunakan titik sebagai separator (1.500.000, bukan 1500000)
- Nominal sebaiknya di awal atau akhir filename
- Hindari nominal dalam kurung atau dengan simbol rupiah
```

**Q: File upload berhasil tapi tidak muncul di dashboard?**
```
A: File mungkin masih dalam proses sync:
1. Tunggu 5-10 detik, kemudian refresh halaman
2. Jika masih tidak muncul, check System Health
3. Jika ada error sync, contact administrator

Atau file mungkin ter-filter:
1. Check kategori filter (INVOICE vs PPN vs NON)
2. Check zona filter
3. Clear semua filter dan coba lagi
```

### Features:
- Search by keyword (real-time)
- Filter by category
- Collapse/expand answers
- Print friendly
- Rate helpful/not helpful
- Link to video tutorial (YouTube embed)
- Related articles suggestion

### Frontend Components:
```html
<div class="faq-container">
    <div class="search-box">
        <input type="search" placeholder="Cari pertanyaan...">
    </div>
    
    <div class="category-tabs">
        <!-- Category buttons -->
    </div>
    
    <div class="faq-items">
        <div class="faq-item">
            <div class="question">Q: ...</div>
            <div class="answer">A: ...</div>
            <div class="feedback">
                <button>👍 Membantu</button>
                <button>👎 Tidak membantu</button>
            </div>
        </div>
    </div>
</div>
```

---

## 📊 Timeline & Resources

### Phase 1: Foundation (Days 1-10)
- **System Health & Monitoring**: 4 days
- **Data Quality Assurance**: 3 days
- **In-app help tooltips**: 2 days
- **Testing & Integration**: 1 day
- **Resource**: 1 developer (backend + frontend)

### Phase 2: Core Features (Days 11-22)
- **Anomaly detection**: 4 days
- **Comments & annotations**: 3 days
- **Progressive upload**: 5 days
- **Testing & Integration**: 1 day
- **Resource**: 2 developers (dapat paralel)

### Phase 3: Enhancement (Days 23-30)
- **CDN integration**: 4 days
- **FAQ knowledge base**: 2 days
- **Deployment & Optimization**: 2 days
- **Resource**: 1 developer

---

## ✅ Priority Order

**Recommend memulai dengan urutan ini:**

1. ✅ **System Health & Monitoring** (paling penting untuk production stability)
2. ✅ **Data Quality Assurance** (prevent bad data masuk sistem)
3. ✅ **In-app help tooltips** (improve user experience)
4. ✅ **Anomaly detection** (detect fraud + duplicate)
5. ✅ **Comments & annotations** (enable collaboration)
6. ✅ **Progressive upload** (solve timeout issues)
7. ✅ **FAQ knowledge base** (reduce support tickets)
8. ✅ **CDN integration** (optimize performance)

---

## 💡 Implementation Notes

### Dependencies:
- Phase 1 bisa start immediately (no dependencies)
- Phase 2 bisa parallel dengan Phase 1
- Phase 3 depends on Phase 1 & 2

### Technology Stack:
- **Backend**: Express.js, PostgreSQL (Supabase)
- **Frontend**: Vanilla JS, Popper.js (tooltips)
- **CDN**: Cloudflare Workers (recommended)
- **Real-time**: WebSocket atau polling

### Testing Strategy:
- Unit tests untuk validation logic
- Integration tests untuk API endpoints
- E2E tests untuk user workflows
- Load testing untuk progressive upload

### Deployment:
- Feature flags untuk new features
- Gradual rollout (10% → 50% → 100%)
- Monitoring dashboard untuk incident response

---

## 📞 Questions & Next Steps

**Before starting, clarify:**
1. Budget untuk CDN? (Cloudflare $20/bulan vs AWS CloudFront)
2. Hosting infrastructure? (current location sudah optimal?)
3. Team size & expertise?
4. Deadline untuk tiap phase?
5. Users untuk beta testing?

**Ready to implement?** Let's start dengan Phase 1!

---

**Document Version**: 1.0  
**Last Updated**: 2026-08-28  
**Status**: Ready for Implementation
