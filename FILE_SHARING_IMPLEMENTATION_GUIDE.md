# 🔗 File Sharing with Expiry Links - Implementation Guide

## Status: DESIGN READY - Awaiting Implementation

This document provides complete implementation guide for the file sharing feature with expiry links.

---

## 📋 Overview

**Goal**: Allow users to generate shareable links for files with:
- ⏰ Customizable expiration time
- 🔢 Optional access count limits
- 📊 Access tracking and analytics
- 🔐 Secure token-based access (no login required)
- ✅ Revoke capability

---

## 🗄️ Database Schema

**Already created**: `sql/file_sharing_system.sql`

### Tables

#### 1. `file_shares`
Stores shareable link configurations.

```sql
CREATE TABLE file_shares (
    id UUID PRIMARY KEY,
    file_id UUID NOT NULL,              -- Which file is being shared
    created_by UUID NOT NULL,           -- Who created the share
    share_token TEXT UNIQUE NOT NULL,   -- Public token (32 char random)
    expires_at TIMESTAMP NOT NULL,      -- When link expires
    access_count INTEGER DEFAULT 0,     -- How many times accessed
    max_access_count INTEGER,           -- Max accesses (NULL = unlimited)
    is_active BOOLEAN DEFAULT true,     -- Can be manually revoked
    notes TEXT,                         -- Optional note about share
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. `file_share_access_logs`
Tracks every access for analytics and security.

```sql
CREATE TABLE file_share_access_logs (
    id SERIAL PRIMARY KEY,
    share_id UUID NOT NULL,             -- Which share link
    accessed_at TIMESTAMP DEFAULT NOW(),
    ip_address TEXT,                    -- Who accessed
    user_agent TEXT,                    -- What browser/device
    referrer TEXT                       -- Where they came from
);
```

---

## 🔌 Backend API Endpoints

### 1. **Generate Share Link**

**Endpoint**: `POST /api/files/:id/share`

**Auth**: Required (super_admin, moderator only - not admin_zona)

**Request Body**:
```json
{
  "expiresIn": "24h",           // "1h", "24h", "7d", "30d", "custom"
  "customExpiry": "2026-09-15", // Only if expiresIn = "custom"
  "maxAccess": 10,              // Optional, NULL = unlimited
  "notes": "For client review"  // Optional
}
```

**Response**:
```json
{
  "success": true,
  "share": {
    "id": "uuid-here",
    "share_token": "32-char-random-token",
    "share_url": "https://domain.com/share/32-char-random-token",
    "expires_at": "2026-09-01T10:00:00Z",
    "max_access_count": 10,
    "created_at": "2026-08-29T10:00:00Z"
  }
}
```

**Implementation**:
```javascript
app.post('/api/files/:id/share', authenticateToken, async (req, res) => {
    try {
        // Permission check
        if (req.user.role === 'admin_zona') {
            return res.status(403).json({ error: 'Admin Zona tidak dapat membuat share link' });
        }

        // Get file
        const { data: file } = await supabase
            .from('files')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (!file) {
            return res.status(404).json({ error: 'File tidak ditemukan' });
        }

        // Calculate expiry
        const { expiresIn, customExpiry, maxAccess, notes } = req.body;
        let expiresAt;

        if (expiresIn === 'custom' && customExpiry) {
            expiresAt = new Date(customExpiry);
        } else {
            const durations = {
                '1h': 1 * 60 * 60 * 1000,
                '24h': 24 * 60 * 60 * 1000,
                '7d': 7 * 24 * 60 * 60 * 1000,
                '30d': 30 * 24 * 60 * 60 * 1000
            };
            expiresAt = new Date(Date.now() + (durations[expiresIn] || durations['24h']));
        }

        // Generate random token
        const shareToken = crypto.randomBytes(16).toString('hex');

        // Insert share record
        const { data: share, error } = await supabase
            .from('file_shares')
            .insert({
                file_id: req.params.id,
                created_by: req.user.userId,
                share_token: shareToken,
                expires_at: expiresAt.toISOString(),
                max_access_count: maxAccess || null,
                notes: notes || null
            })
            .select()
            .single();

        if (error) throw error;

        // Build share URL
        const shareUrl = `${req.protocol}://${req.get('host')}/share/${shareToken}`;

        res.json({
            success: true,
            share: {
                ...share,
                share_url: shareUrl
            }
        });

    } catch (err) {
        console.error('Create share error:', err);
        res.status(500).json({ error: 'Gagal membuat share link' });
    }
});
```

---

### 2. **Access Shared File**

**Endpoint**: `GET /share/:token`

**Auth**: NOT REQUIRED (public access)

**Response**: Renders HTML page with file preview or redirect to file

**Implementation**:
```javascript
app.get('/share/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // Get share record
        const { data: share, error } = await supabase
            .from('file_shares')
            .select(`
                *,
                files (
                    id,
                    nama_file,
                    storage_path,
                    category,
                    file_size
                )
            `)
            .eq('share_token', token)
            .eq('is_active', true)
            .single();

        if (error || !share) {
            return res.status(404).send('Link tidak valid atau sudah kadaluarsa');
        }

        // Check expiration
        if (new Date(share.expires_at) < new Date()) {
            // Auto-deactivate
            await supabase
                .from('file_shares')
                .update({ is_active: false })
                .eq('id', share.id);
            
            return res.status(410).send('Link sudah kadaluarsa');
        }

        // Check access limit
        if (share.max_access_count && share.access_count >= share.max_access_count) {
            return res.status(429).send('Link sudah mencapai batas akses maksimum');
        }

        // Log access
        await supabase.from('file_share_access_logs').insert({
            share_id: share.id,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent'),
            referrer: req.get('referrer')
        });

        // Increment access count
        await supabase
            .from('file_shares')
            .update({ access_count: share.access_count + 1 })
            .eq('id', share.id);

        // Stream file
        const fileStream = await RcloneStorage.getStream(share.files.storage_path);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${share.files.nama_file}"`);
        fileStream.pipe(res);

    } catch (err) {
        console.error('Share access error:', err);
        res.status(500).send('Terjadi kesalahan');
    }
});
```

---

### 3. **List Shares for File**

**Endpoint**: `GET /api/files/:id/shares`

**Auth**: Required

**Response**:
```json
{
  "shares": [
    {
      "id": "uuid",
      "share_token": "token",
      "share_url": "https://...",
      "expires_at": "2026-09-01",
      "access_count": 5,
      "max_access_count": 10,
      "is_active": true,
      "notes": "For client",
      "created_at": "2026-08-29",
      "recent_accesses": [
        {
          "accessed_at": "2026-08-29T15:00:00Z",
          "ip_address": "1.2.3.4"
        }
      ]
    }
  ]
}
```

---

### 4. **Revoke Share Link**

**Endpoint**: `DELETE /api/files/:fileId/shares/:shareId`

**Auth**: Required (owner or admin)

**Response**:
```json
{
  "success": true,
  "message": "Share link revoked"
}
```

**Implementation**:
```javascript
app.delete('/api/files/:fileId/shares/:shareId', authenticateToken, async (req, res) => {
    try {
        const { shareId } = req.params;

        // Check ownership
        const { data: share } = await supabase
            .from('file_shares')
            .select('created_by')
            .eq('id', shareId)
            .single();

        if (!share) {
            return res.status(404).json({ error: 'Share tidak ditemukan' });
        }

        // Only creator or admin can revoke
        if (share.created_by !== req.user.userId && 
            !['super_admin', 'moderator'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Tidak ada akses' });
        }

        // Deactivate
        await supabase
            .from('file_shares')
            .update({ is_active: false })
            .eq('id', shareId);

        res.json({ success: true, message: 'Share link berhasil dicabut' });

    } catch (err) {
        console.error('Revoke share error:', err);
        res.status(500).json({ error: 'Gagal mencabut share link' });
    }
});
```

---

## 🎨 Frontend UI

### 1. **Share Button in File Detail**

Add button in `file-detail.html`:

```html
<button onclick="openShareModal()" class="btn-share">
    🔗 Share File
</button>
```

### 2. **Share Modal**

```html
<div id="share-modal" class="modal">
    <div class="modal-content">
        <h3>Share File</h3>
        
        <!-- Expiry Selection -->
        <div>
            <label>Link expires in:</label>
            <select id="share-expiry">
                <option value="1h">1 Hour</option>
                <option value="24h" selected>24 Hours</option>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
                <option value="custom">Custom...</option>
            </select>
        </div>
        
        <!-- Custom Date (if custom selected) -->
        <div id="custom-expiry-section" class="hidden">
            <label>Expiry Date:</label>
            <input type="datetime-local" id="custom-expiry-date">
        </div>
        
        <!-- Access Limit -->
        <div>
            <label>
                <input type="checkbox" id="enable-access-limit">
                Limit access count
            </label>
            <input type="number" id="max-access" placeholder="Max accesses" class="hidden">
        </div>
        
        <!-- Notes -->
        <div>
            <label>Notes (optional):</label>
            <input type="text" id="share-notes" placeholder="e.g., For client review">
        </div>
        
        <!-- Generate Button -->
        <button onclick="generateShareLink()">
            Generate Link
        </button>
        
        <!-- Generated Link Display -->
        <div id="generated-link-section" class="hidden">
            <label>Share Link:</label>
            <div class="link-display">
                <input type="text" id="share-url" readonly>
                <button onclick="copyShareLink()">📋 Copy</button>
            </div>
            <p class="expires-info">Expires: <span id="expires-at"></span></p>
        </div>
        
        <!-- Active Shares List -->
        <div id="active-shares">
            <h4>Active Shares</h4>
            <div id="shares-list">
                <!-- Rendered by JS -->
            </div>
        </div>
    </div>
</div>
```

### 3. **JavaScript Functions**

```javascript
async function generateShareLink() {
    const expiresIn = document.getElementById('share-expiry').value;
    const customExpiry = document.getElementById('custom-expiry-date').value;
    const enableLimit = document.getElementById('enable-access-limit').checked;
    const maxAccess = enableLimit ? document.getElementById('max-access').value : null;
    const notes = document.getElementById('share-notes').value;
    
    const payload = {
        expiresIn,
        customExpiry: expiresIn === 'custom' ? customExpiry : null,
        maxAccess: maxAccess ? parseInt(maxAccess) : null,
        notes
    };
    
    try {
        const response = await API.post(`/api/files/${currentFileId}/share`, payload);
        
        if (response.success) {
            // Display generated link
            document.getElementById('share-url').value = response.share.share_url;
            document.getElementById('expires-at').textContent = new Date(response.share.expires_at).toLocaleString();
            document.getElementById('generated-link-section').classList.remove('hidden');
            
            // Refresh active shares list
            await loadActiveShares();
            
            Swal.fire('Success', 'Share link generated!', 'success');
        }
    } catch (err) {
        Swal.fire('Error', 'Failed to generate share link', 'error');
    }
}

function copyShareLink() {
    const input = document.getElementById('share-url');
    input.select();
    document.execCommand('copy');
    
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Link copied to clipboard!',
        showConfirmButton: false,
        timer: 2000
    });
}

async function loadActiveShares() {
    const response = await API.get(`/api/files/${currentFileId}/shares`);
    const sharesList = document.getElementById('shares-list');
    
    if (response.shares.length === 0) {
        sharesList.innerHTML = '<p class="empty">No active shares</p>';
        return;
    }
    
    sharesList.innerHTML = response.shares.map(share => `
        <div class="share-item">
            <div class="share-info">
                <p class="share-url">${share.share_url}</p>
                <p class="share-stats">
                    Accessed: ${share.access_count}${share.max_access_count ? `/${share.max_access_count}` : ''} times
                    | Expires: ${new Date(share.expires_at).toLocaleString()}
                </p>
                ${share.notes ? `<p class="share-notes">${share.notes}</p>` : ''}
            </div>
            <button onclick="revokeShare('${share.id}')" class="btn-revoke">
                🗑️ Revoke
            </button>
        </div>
    `).join('');
}

async function revokeShare(shareId) {
    const confirm = await Swal.fire({
        title: 'Revoke share link?',
        text: 'This link will stop working immediately',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, revoke it'
    });
    
    if (!confirm.isConfirmed) return;
    
    try {
        await API.delete(`/api/files/${currentFileId}/shares/${shareId}`);
        await loadActiveShares();
        Swal.fire('Revoked!', 'Share link has been revoked', 'success');
    } catch (err) {
        Swal.fire('Error', 'Failed to revoke share link', 'error');
    }
}
```

---

## 🔐 Security Considerations

1. **Rate Limiting**: Add rate limiting to `/share/:token` endpoint to prevent abuse
2. **IP Tracking**: Log IP addresses for security auditing
3. **Auto-Cleanup**: Run cron job to deactivate expired shares
4. **Token Strength**: Use 32+ character random tokens (crypto.randomBytes)
5. **HTTPS Only**: Share links should only work over HTTPS in production

---

## 📊 Analytics Dashboard (Optional Enhancement)

Create `/admin/share-analytics.html` to show:
- Most shared files
- Average access count per share
- Geographic distribution of accesses (if IP geolocation added)
- Time-based access patterns

---

## ✅ Testing Checklist

- [ ] Generate share link with 1h expiry
- [ ] Generate share link with custom expiry
- [ ] Access share link (increment count)
- [ ] Access expired link (should fail)
- [ ] Access revoked link (should fail)
- [ ] Access limit reached (should fail)
- [ ] Copy link to clipboard works
- [ ] List active shares shows correct data
- [ ] Revoke share works
- [ ] Access logs are recorded
- [ ] Admin_zona cannot create shares

---

## 🚀 Deployment Steps

1. Run migration: `psql -f sql/file_sharing_system.sql`
2. Add API endpoints to `backend/server.js`
3. Add share button to `file-detail.html`
4. Add share modal UI
5. Add JavaScript functions
6. Test all workflows
7. Deploy to Railway
8. Test in production

---

## 📝 Future Enhancements

- **Password Protection**: Optional password for share links
- **Email Notifications**: Notify when link is accessed
- **QR Code**: Generate QR code for easy mobile sharing
- **Watermark**: Add watermark to shared PDFs
- **Download Limit**: Separate from view limit
- **Custom Branding**: Branded share page with company logo

---

## Time Estimate

- Database migration: 10 minutes
- Backend API: 2 hours
- Frontend UI: 2 hours
- Testing: 1 hour
- **Total**: ~5 hours

This is a comprehensive system that can be implemented in phases if needed.
