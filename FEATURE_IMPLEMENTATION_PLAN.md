# 🚀 Feature Implementation Plan

## Status Overview
| # | Feature | Status | Priority | Est. Time |
|---|---------|--------|----------|-----------|
| 1 | Quick Date Filters | ✅ Done | High | 30 min |
| 2 | Activity Log Menu | 🔄 In Progress | High | 1 hour |
| 3 | File Sharing + Expiry Links | ⏳ Pending | High | 2 hours |
| 4 | Smart Notifications Upgrade | ⏳ Pending | Medium | 2 hours |
| 5 | WhatsApp Integration | ⏳ Design Only | Medium | 1 hour |
| 6 | Mobile-Friendly UI | ⏳ Pending | Low | 4-6 hours |

---

## ✅ TASK 1: Quick Date Filters (COMPLETED)

### Implementation
- Added 6 quick filter buttons in dashboard filter section:
  - ✅ Hari Ini
  - ✅ Kemarin
  - ✅ Minggu Ini
  - ✅ Minggu Lalu
  - ✅ Bulan Ini
  - ✅ Bulan Lalu

### Files Modified
- `dashboard.html` - Added quick filter buttons UI
- `js/dashboard.js` - Added `applyQuickFilter()` function with date calculation logic

### Features
- Auto-calculate date ranges based on filter type
- Visual feedback: Active button highlighted blue
- Reset clears active state
- Seamlessly integrates with existing date inputs

---

## 🔄 TASK 2: Activity Log & Audit Trail (IN PROGRESS)

### Requirements
- New dedicated menu for Activity Log
- Currently exists at bottom of User Management page
- Need separate standalone page with better UI/UX

### Implementation Plan
1. Create `activity-log.html` - New dedicated page
2. Add menu item to sidebar
3. Enhanced UI with:
   - **Filters**: User, Action Type, Date Range
   - **Search**: Search by username, action description
   - **Real-time updates**: Auto-refresh every 30s
   - **Export**: Download CSV/Excel
   - **Visual timeline**: Activity feed design
   - **Color coding**: 
     - 🟢 Create/Upload = Green
     - 🟡 Update/Edit = Yellow
     - 🔴 Delete = Red
     - 🔵 Download = Blue

### Database Schema (Already Exists)
```sql
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## ⏳ TASK 3: File Sharing with Expiry Links

### Requirements
- Generate shareable link from file detail page
- Link has expiration time
- Can share without login (public access with token)
- Track who accessed the link

### Implementation Plan
1. **Database Schema**:
```sql
CREATE TABLE file_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    share_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    access_count INTEGER DEFAULT 0,
    max_access_count INTEGER, -- NULL = unlimited
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE file_share_access_logs (
    id SERIAL PRIMARY KEY,
    share_id UUID REFERENCES file_shares(id),
    accessed_at TIMESTAMP DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);
```

2. **API Endpoints**:
   - `POST /api/files/:id/share` - Generate share link
   - `GET /api/share/:token` - Access file via share token
   - `DELETE /api/files/:id/share/:shareId` - Revoke share link
   - `GET /api/files/:id/shares` - List all shares for a file

3. **UI Features**:
   - Share button in file-detail.html
   - Modal to configure:
     - Expiry time (1 hour, 24 hours, 7 days, 30 days, custom)
     - Max access count (optional)
     - Copy link button
   - List of active shares with revoke option
   - Access statistics

---

## ⏳ TASK 4: Smart Notifications Upgrade

### Current System
- Update history notification (red badge)
- Basic notification checking

### Enhancement Plan
1. **Notification Types**:
   - 📋 System Updates (already exists)
   - 📁 New File Uploaded in your zona/toko
   - 💬 Comment/Mention on your files
   - ⚠️ Quota warning (storage almost full)
   - 🔧 Maintenance schedule
   - ✅ File approval status changed

2. **Database Schema**:
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type TEXT NOT NULL, -- 'update', 'file_upload', 'comment', 'quota', 'maintenance', 'approval'
    title TEXT NOT NULL,
    message TEXT,
    link TEXT, -- URL to related page
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    email_enabled BOOLEAN DEFAULT false,
    email_frequency TEXT DEFAULT 'instant', -- 'instant', 'daily', 'weekly'
    types_enabled JSONB DEFAULT '{"update":true,"file_upload":true,"comment":true,"quota":true,"maintenance":true,"approval":true}'::jsonb
);
```

3. **Features**:
   - Notification dropdown in topbar (already exists, needs upgrade)
   - Mark as read/unread
   - Mark all as read
   - Filter by type
   - Notification preferences page
   - Real-time notifications (WebSocket or polling)

---

## ⏳ TASK 5: WhatsApp Integration (DESIGN ONLY)

### Current Workflow
- Manual copy-paste from "Riwayat Batch"
- Time-consuming and error-prone

### Proposed System

#### Option A: WhatsApp Business API (Official, Paid)
**Pros**:
- Official, reliable
- Rich messaging (templates, buttons, media)
- Verified business account
- Higher rate limits

**Cons**:
- Expensive ($0.005-0.09 per message depending on country)
- Requires Meta Business verification
- Complex setup

**Use Case**: Production, high-volume notifications

#### Option B: Baileys/WhatsApp Web.js (Unofficial, Free)
**Pros**:
- Free to use
- No verification needed
- Quick setup

**Cons**:
- Against WhatsApp ToS (risk of ban)
- Requires QR code login
- Less reliable (can break with WhatsApp updates)
- Lower rate limits

**Use Case**: Internal testing, low-volume notifications

### Recommended Architecture

#### Phase 1: Manual Template Generation (Immediate - No Cost)
1. **Generate formatted message** in web UI
2. **One-click copy** to clipboard
3. **Manual paste** to WhatsApp Web/Desktop

**Implementation**:
- Add "Copy WhatsApp Message" button in batch upload success screen
- Pre-formatted template:
```
📋 *ARSIP ANKA - Update File*

✅ *{{count}} file baru berhasil diupload*

📍 *Zona*: {{zona_name}}
🏪 *Toko*: {{toko_name}}
📦 *Kategori*: {{category}}
📅 *Tanggal*: {{date}}

Detailnya:
{{#each files}}
• {{nama_file}}
{{/each}}

🔗 Lihat detail: {{dashboard_url}}

_Pesan otomatis dari Sistem Arsip Anka_
```

#### Phase 2: WhatsApp Integration Service (Future)
If volume increases, implement proper WhatsApp Business API:

1. **Infrastructure**:
   - Separate microservice for WhatsApp messaging
   - Queue system (Redis/RabbitMQ) for message scheduling
   - Retry logic for failed messages

2. **Features**:
   - Auto-send notification on file upload
   - Scheduled daily/weekly digest
   - Two-way communication (receive confirmation)
   - Template management UI
   - Send history & analytics

3. **Database Schema**:
```sql
CREATE TABLE whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_phone TEXT NOT NULL,
    message_text TEXT NOT NULL,
    template_id TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB, -- File IDs, user IDs, etc.
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    template_text TEXT NOT NULL,
    variables JSONB, -- List of {{variables}} in template
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Cost Estimation (WhatsApp Business API)
- Setup fee: ~$0 (Meta Business account free)
- Per message: $0.005 - $0.09 (depending on country, Indonesia ~$0.02-0.04)
- Monthly cost estimate:
  - 100 messages/day = ~$60-120/month
  - 500 messages/day = ~$300-600/month

---

## ⏳ TASK 6: Mobile-Friendly UI

### Current Issues
- Sidebar not optimized for mobile
- Touch targets too small
- Tables overflow on small screens
- Forms cramped

### Enhancement Plan
1. **Responsive Breakpoints**:
   - Mobile: < 640px
   - Tablet: 640px - 1024px
   - Desktop: > 1024px

2. **Mobile Optimizations**:
   - Collapsible sidebar (hamburger menu)
   - Bottom navigation bar (mobile-first)
   - Touch-friendly buttons (min 44x44px)
   - Swipe gestures (swipe to delete, swipe to share)
   - Optimized tables (card view on mobile)
   - Larger form inputs
   - Floating action button (FAB) for quick upload

3. **Progressive Web App (PWA)**:
   - Add manifest.json
   - Service worker for offline support
   - "Add to Home Screen" prompt
   - Offline indicator

4. **Camera Integration**:
   - Direct photo upload from mobile camera
   - Image compression before upload
   - Preview before upload

---

## Next Steps

1. ✅ Quick Filters - **DONE**
2. 🔄 Activity Log Menu - Start implementation
3. Continue with remaining tasks in priority order

## Estimated Total Time
- Quick wins (1-3): ~4 hours
- Medium tasks (4-5): ~3 hours (design only for #5)
- Large refactor (6): ~6 hours
- **Total**: ~13 hours of development time
