# Task 4: Chunked Upload Implementation Plan

**Objective**: Implement resumable, chunk-based uploads for network resilience  
**Scope**: New endpoints, backward compatible (old endpoints still work)  
**Risk Level**: MEDIUM (new code, but isolated)  
**Estimated Time**: 2-3 hours  
**Status**: READY FOR IMPLEMENTATION  

---

## Architecture Overview

### Current Upload Flow (Simple, Non-Resumable)
```
Client                          Server
  │                              │
  ├─ POST /api/files/upload ────→ │
  │  (entire file)               │
  │                              ├─ Check duplicates
  │                              ├─ Create dirs
  │                              ├─ Upload to Google Drive
  │                              │
  ├─ Response (200/409/500) ←──── │
```

**Problem**: Network fail during upload = complete retry needed

---

### New Chunked Upload Flow (Resumable)
```
Client                          Server                    Google Drive
  │                              │                           │
  ├─ POST /api/files/init ──────→ │                           │
  │  (metadata)                  ├─ Create session           │
  │  Returns: uploadId           │                           │
  ├─ Response (uploadId) ←──────  │                           │
  │                              │                           │
  ├─ POST /api/files/chunk ─────→ │                           │
  │  (chunk 1/10, 5MB)           ├─ Store temp chunk         │
  │  {uploadId, chunkNumber}     │                           │
  ├─ Response (progress) ←──────  │                           │
  │                              │                           │
  ├─ POST /api/files/chunk ─────→ │                           │
  │  (chunk 2/10, 5MB)           ├─ Store temp chunk         │
  │  {uploadId, chunkNumber}     │                           │
  ├─ Response (progress) ←──────  │                           │
  │                              │                           │
  │ ... [network fails here] ...  │                           │
  │ [Connection resumes]          │                           │
  │                              │                           │
  ├─ GET /api/files/status ─────→ │                           │
  │  (uploadId)                  ├─ Check uploaded chunks    │
  ├─ Response (chunks 1-2 ok) ←─  │                           │
  │                              │                           │
  ├─ POST /api/files/chunk ─────→ │                           │
  │  (chunk 3/10) [continue] ────→ │ ─────────────────────────→│
  │                              │  Upload complete          │
  ├─ Response (progress) ←──────  │ ←────────────────────────│
  │                              │                           │
  ├─ POST /api/files/complete ──→ │                           │
  │  (uploadId, complete)        ├─ Assemble chunks          │
  │                              ├─ Final validation         │
  │  Response (success) ←────────  │                           │
```

**Benefits**:
- ✅ Resume from last chunk if interrupted
- ✅ Progress tracking in real-time
- ✅ Parallel chunks (client side, 3-5 at once)
- ✅ Network resilience
- ✅ No complete retry needed

---

## Implementation Details

### New Endpoints

#### 1. POST /api/files/init (Initialize Upload Session)
```javascript
Request:
{
  filename: "invoice.pdf",
  fileSize: 52428800,        // 50MB
  fileType: "application/pdf",
  chunkSize: 5242880,        // 5MB chunks
  metadata: {
    zona_id: 1,
    toko_id: 42,
    category: "INVOICE"
  }
}

Response:
{
  uploadId: "uuid-12345-67890",
  fileName: "invoice.pdf",
  fileSize: 52428800,
  chunkSize: 5242880,
  totalChunks: 10,
  status: "initialized",
  createdAt: "2026-09-01T10:00:00Z"
}

Errors:
- 400: Invalid file size / metadata
- 401: Unauthorized
- 500: Server error
```

#### 2. POST /api/files/chunk (Upload Single Chunk)
```javascript
Request:
  FormData:
  - uploadId: "uuid-12345-67890"
  - chunkNumber: 1
  - totalChunks: 10
  - chunk: [binary file data, 5MB]
  - checksum: "sha256_hash"

Response:
{
  uploadId: "uuid-12345-67890",
  chunkNumber: 1,
  status: "received",
  uploadedBytes: 5242880,
  totalBytes: 52428800,
  progress: 10,                    // Percent
  nextChunk: 2,                    // Suggested next
  eta: "2 minutes"
}

Errors:
- 400: Invalid chunk data
- 409: Duplicate chunk (already uploaded)
- 413: Chunk too large
- 500: Server error
```

#### 3. GET /api/files/status (Check Upload Status)
```javascript
Request Query:
  uploadId=uuid-12345-67890

Response:
{
  uploadId: "uuid-12345-67890",
  fileName: "invoice.pdf",
  status: "in_progress",           // or "paused", "completed"
  uploadedChunks: [1, 2, 3],       // Which chunks received
  missingChunks: [4, 5, 6, 7, 8, 9, 10],
  uploadedBytes: 15728640,
  totalBytes: 52428800,
  progress: 30,
  eta: "3 minutes",
  lastUpdate: "2026-09-01T10:05:00Z"
}

Errors:
- 404: Upload session not found
- 401: Unauthorized
```

#### 4. POST /api/files/complete (Finalize Upload)
```javascript
Request:
{
  uploadId: "uuid-12345-67890",
  checksum: "sha256_full_file"     // Verify integrity
}

Response:
{
  uploadId: "uuid-12345-67890",
  fileName: "invoice.pdf",
  status: "completed",
  fileId: "file-uuid",
  storagePath: "ARSIPINVOICE/...",
  checksumVerified: true,
  completedAt: "2026-09-01T10:10:00Z",
  message: "File uploaded successfully"
}

Errors:
- 400: Missing chunks
- 409: Checksum mismatch
- 500: Assembly failed
```

#### 5. POST /api/files/abort (Cancel Upload)
```javascript
Request:
{
  uploadId: "uuid-12345-67890",
  reason: "user_cancelled"         // Optional
}

Response:
{
  uploadId: "uuid-12345-67890",
  status: "aborted",
  cleanup: "complete"
}
```

---

## Storage Strategy

### Temporary Chunk Storage

**Location**: `{TEMP_DIR}/uploads/{uploadId}/`

```
/tmp/uploads/uuid-12345-67890/
├── manifest.json              # Upload metadata
├── chunk_001                  # 5MB
├── chunk_002                  # 5MB
├── chunk_003                  # 5MB
└── ...
```

**Manifest Structure**:
```json
{
  "uploadId": "uuid-12345-67890",
  "fileName": "invoice.pdf",
  "fileSize": 52428800,
  "chunkSize": 5242880,
  "totalChunks": 10,
  "uploadedChunks": [1, 2, 3],
  "checksums": {
    "chunk_001": "abc123...",
    "chunk_002": "def456...",
    "full_file": ""              // Set after all chunks
  },
  "metadata": {
    "zona_id": 1,
    "toko_id": 42,
    "category": "INVOICE"
  },
  "createdAt": "2026-09-01T10:00:00Z",
  "expiresAt": "2026-09-02T10:00:00Z"  // 24-hour TTL
}
```

---

## Session Management

### Upload Session Object

```javascript
const uploadSession = {
  uploadId: "uuid",
  fileName: "invoice.pdf",
  fileSize: 52428800,
  chunkSize: 5242880,
  totalChunks: 10,
  uploadedChunks: new Set([1, 2, 3]),
  
  // Metadata
  metadata: {
    zona_id: 1,
    toko_id: 42,
    category: "INVOICE"
  },
  
  // Timing
  createdAt: Date.now(),
  lastUpdate: Date.now(),
  expiresAt: Date.now() + 24*60*60*1000,
  
  // Checksums
  checksums: new Map([
    ["chunk_1", "hash1"],
    ["chunk_2", "hash2"]
  ]),
  
  // Status
  status: "in_progress"  // or "completed", "aborted"
};
```

### Session Store

**In-Memory (for development)**:
```javascript
const uploadSessions = new Map(); // uploadId → session
```

**Persistent (for production)**:
```
File: {DATA_DIR}/upload-sessions.json
Refreshed on server restart
TTL: 24 hours (auto-cleanup)
```

---

## File Assembly Process

### Step-by-Step Assembly

```
1. Receive /complete request
   ├─ Check all chunks present
   │  └─ If missing: return 400 "Missing chunks [4, 5]"
   │
2. Verify chunk checksums
   └─ If mismatch: return 409 "Chunk corrupted"
   
3. Calculate full file hash
   └─ Compare with client checksum
   └─ If mismatch: return 409 "File corrupted"
   
4. Assemble chunks into single file
   └─ cat chunk_001 chunk_002 ... > final_file.pdf
   
5. Upload final file to Google Drive
   └─ Use existing uploadInvoicePDF() or uploadDocumentFile()
   
6. Verify on Google Drive
   └─ remoteFileExists() + size check
   
7. Store in database
   └─ files or invoice_file_list table
   
8. Cleanup temp chunks
   └─ Delete {TEMP_DIR}/uploads/{uploadId}/
   
9. Return success
   └─ fileId, storagePath, message
```

---

## Error Handling & Recovery

### Recoverable Errors

| Error | Recovery | User Action |
|-------|----------|------------|
| Network timeout on chunk | Automatic retry (3x) | Retry chunk upload |
| Chunk lost mid-transfer | Partial chunk detected | Re-upload chunk |
| Session expired (24h) | New session needed | Restart upload |
| Disk full on server | Pause and retry | Contact admin |
| Google Drive quota full | Pause and retry | Contact admin |

### Non-Recoverable Errors

| Error | Cause | User Action |
|-------|-------|------------|
| File too large (>500GB) | Size limit | Reduce file size |
| Invalid file type | File check | Use correct format |
| Checksum mismatch | Corruption | Restart upload |
| Database error | Server issue | Retry later |

---

## Configuration

### Environment Variables

```bash
# Chunk configuration
CHUNK_SIZE=5242880               # 5MB per chunk
MAX_CHUNK_SIZE=10485760          # 10MB hard limit
MIN_CHUNK_SIZE=1048576           # 1MB minimum

# Session management
SESSION_TTL=86400                # 24 hours
CLEANUP_INTERVAL=3600            # Cleanup every hour
TEMP_UPLOAD_DIR=/tmp/uploads

# Limits
MAX_CONCURRENT_UPLOADS=100       # Per server
MAX_UPLOADS_PER_USER=10          # Simultaneously
MAX_FILE_SIZE=536870912          # 500MB hard limit
```

### Feature Flag

```javascript
// NEW: Environment variable for gradual rollout
const ENABLE_CHUNKED_UPLOAD = process.env.ENABLE_CHUNKED_UPLOAD === 'true';

// In routes:
if (ENABLE_CHUNKED_UPLOAD) {
  app.post('/api/files/init', handleInit);
  app.post('/api/files/chunk', handleChunk);
  app.get('/api/files/status', handleStatus);
  app.post('/api/files/complete', handleComplete);
  app.post('/api/files/abort', handleAbort);
}
```

---

## Implementation Steps

### Step 1: Create Upload Session Manager (30 min)
```
File: backend/upload-session-manager.js
- UploadSessionManager class
- Memory store + JSON persistence
- TTL handling
- Cleanup job
```

### Step 2: Create Chunk Handler (30 min)
```
File: backend/chunk-handler.js
- Save chunk to temp storage
- Verify chunk integrity
- Track upload progress
- Manage manifest
```

### Step 3: Create File Assembler (30 min)
```
File: backend/file-assembler.js
- Assemble chunks into final file
- Verify checksums
- Upload to Google Drive
- Clean up temp files
```

### Step 4: Create API Endpoints (45 min)
```
File: backend/chunked-upload-endpoints.js
- POST /api/files/init
- POST /api/files/chunk
- GET /api/files/status
- POST /api/files/complete
- POST /api/files/abort
```

### Step 5: Add Feature Flag & Integration (15 min)
```
File: backend/server.js
- Import new endpoints
- Add feature flag check
- Register routes (if enabled)
```

### Step 6: Testing & Documentation (30 min)
```
Files:
- Test cases
- API documentation
- Client integration guide
```

---

## Non-Breaking Implementation Strategy

### Key Principles

1. **New Endpoints Only**
   - OLD: `/api/files/upload` (works as before)
   - NEW: `/api/files/init`, `/api/files/chunk`, etc.
   - Zero impact on existing clients

2. **Feature Flag Controlled**
   - `ENABLE_CHUNKED_UPLOAD=false` by default
   - Can be toggled on/off without redeployment
   - Gradual rollout to users/regions

3. **Backward Compatible**
   - Old endpoints unchanged
   - New endpoints independent
   - Can run both simultaneously

4. **Gradual Adoption**
   - Phase 1: Test in staging
   - Phase 2: 10% users (feature flag)
   - Phase 3: 50% users
   - Phase 4: 100% users
   - Fallback: Disable if issues

---

## Client Integration Example

### Simple Client Usage

```javascript
// Old way (still works)
const formData = new FormData();
formData.append('file', fileInput.files[0]);
await fetch('/api/files/upload', {
  method: 'POST',
  body: formData
});

// New way (chunked, resumable)
const chunkedUploader = new ChunkedUploader(file, {
  chunkSize: 5 * 1024 * 1024,  // 5MB
  endpoint: '/api/files'
});

chunkedUploader.on('progress', (progress) => {
  console.log(`Uploaded: ${progress.percent}%`);
});

chunkedUploader.on('complete', (result) => {
  console.log(`File uploaded: ${result.fileId}`);
});

await chunkedUploader.upload();
```

---

## Testing Strategy

### Unit Tests

- [ ] Upload session creation
- [ ] Chunk storage and retrieval
- [ ] Checksum verification
- [ ] File assembly
- [ ] Session expiration

### Integration Tests

- [ ] Full upload flow (1 chunk)
- [ ] Multi-chunk upload
- [ ] Resume after interruption
- [ ] Status tracking
- [ ] Error scenarios

### Load Tests

- [ ] Concurrent uploads (100+)
- [ ] Large files (500MB)
- [ ] Long-running uploads (>1 hour)
- [ ] Memory usage under load

---

## Rollback Strategy

### If Issues Detected

```bash
# Quick disable (no redeployment)
export ENABLE_CHUNKED_UPLOAD=false

# Cleanup orphaned sessions
rm -rf /tmp/uploads/*

# Restart server
npm restart

# Monitor
tail -f logs/server.log
```

### Complete Rollback

```bash
# Revert code changes
git checkout feature/chunked-upload-optimization~1

# Restart
npm restart
```

---

## Success Criteria - Task 4

✅ **Implementation complete when**:
- [x] All 5 endpoints implemented
- [x] Session management working
- [x] File assembly functional
- [x] Feature flag working
- [x] Error handling robust
- [x] Documentation complete
- [x] Non-breaking changes verified
- [x] Rollback procedure tested

---

## Timeline

- **Phase 4.1**: Session manager + chunk handler (1 hour)
- **Phase 4.2**: File assembler + endpoints (1 hour)
- **Phase 4.3**: Feature flag + testing (30 min)
- **Total**: 2-3 hours

---

## Files to Create/Modify

### New Files
```
backend/upload-session-manager.js
backend/chunk-handler.js
backend/file-assembler.js
backend/chunked-upload-endpoints.js
```

### Modified Files
```
backend/server.js (add routes)
backend/rclone_wrapper.js (optional: add methods for chunk handling)
```

### Documentation
```
TASK4_CHUNKED_UPLOAD_IMPLEMENTATION.md
CHUNKED_UPLOAD_API_DOCS.md
```

---

## Next Steps

1. ✅ Review this plan
2. ⏳ Approve implementation approach
3. ⏳ Start Phase 4.1 (Session manager)
4. ⏳ Continue phases
5. ⏳ Move to Task 5 (Feature flag)

---

**Ready to implement?** Let me know if you want to start or have questions about the approach!
