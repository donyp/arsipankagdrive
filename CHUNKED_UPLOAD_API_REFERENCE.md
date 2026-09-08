# Chunked Upload API Reference

**Base URL**: `http://localhost:5000/api/files`  
**Feature Flag**: `ENABLE_CHUNKED_UPLOAD=true`  
**Auth**: JWT token in `Authorization: Bearer {token}` (if authentication required)

---

## Quick Start Example

### JavaScript (Browser)
```javascript
// 1. Initialize upload
const initRes = await fetch('/api/files/init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'document.pdf',
    fileSize: file.size,
    fileType: 'application/pdf',
    chunkSize: 5 * 1024 * 1024,  // 5MB
    metadata: {
      zona_id: 1,
      toko_id: 42,
      category: 'INVOICE'
    }
  })
});

const { uploadId, totalChunks } = await initRes.json();
console.log(`Upload ID: ${uploadId}, Total chunks: ${totalChunks}`);

// 2. Upload chunks (parallel)
const chunkSize = 5 * 1024 * 1024;
const uploadPromises = [];

for (let i = 0; i < totalChunks; i++) {
  const start = i * chunkSize;
  const end = Math.min(start + chunkSize, file.size);
  const chunk = file.slice(start, end);
  
  const formData = new FormData();
  formData.append('chunk', chunk);
  formData.append('uploadId', uploadId);
  formData.append('chunkNumber', i + 1);
  formData.append('totalChunks', totalChunks);
  
  uploadPromises.push(
    fetch('/api/files/chunk', {
      method: 'POST',
      body: formData
    }).then(res => res.json())
  );
}

const results = await Promise.all(uploadPromises);
console.log('All chunks uploaded:', results);

// 3. Check status
const statusRes = await fetch(`/api/files/status?uploadId=${uploadId}`);
const status = await statusRes.json();
console.log('Upload status:', status);

// 4. Complete upload
const completeRes = await fetch('/api/files/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    uploadId,
    checksum: 'sha256_hash_of_full_file',  // Calculate on client
    remoteDestination: 'ARSIPINVOICE/2026/document.pdf'
  })
});

const result = await completeRes.json();
console.log('Upload complete:', result);
```

---

## Endpoints

### 1. POST /api/files/init

**Initialize upload session**

#### Request
```http
POST /api/files/init
Content-Type: application/json

{
  "fileName": "document.pdf",
  "fileSize": 52428800,
  "fileType": "application/pdf",
  "chunkSize": 5242880,
  "metadata": {
    "zona_id": 1,
    "toko_id": 42,
    "category": "INVOICE"
  }
}
```

#### Response (200 OK)
```json
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "fileName": "document.pdf",
  "fileSize": 52428800,
  "chunkSize": 5242880,
  "totalChunks": 10,
  "status": "initialized",
  "createdAt": "2026-09-01T10:00:00.000Z",
  "expiresAt": "2026-09-02T10:00:00.000Z"
}
```

#### Response Errors
```json
// 400 Bad Request
{
  "error": "Missing required fields: fileName, fileSize"
}

// 413 Payload Too Large
{
  "error": "File too large. Maximum size: 500MB"
}

// 500 Internal Server Error
{
  "error": "Failed to initialize upload",
  "message": "Error details..."
}
```

#### cURL Example
```bash
curl -X POST http://localhost:5000/api/files/init \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "document.pdf",
    "fileSize": 52428800,
    "fileType": "application/pdf",
    "chunkSize": 5242880,
    "metadata": {"zona_id": 1, "toko_id": 42, "category": "INVOICE"}
  }'
```

---

### 2. POST /api/files/chunk

**Upload single chunk**

#### Request
```http
POST /api/files/chunk
Content-Type: multipart/form-data

uploadId: 550e8400-e29b-41d4-a716-446655440000
chunkNumber: 1
totalChunks: 10
chunk: [binary file data, max 10MB]
checksum: sha256hash (optional)
```

#### Response (200 OK)
```json
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "chunkNumber": 1,
  "status": "received",
  "uploadedBytes": 5242880,
  "totalBytes": 52428800,
  "progress": 10,
  "nextChunk": 2,
  "eta": "2 minutes"
}
```

#### Response Errors
```json
// 400 Bad Request
{
  "error": "No chunk data provided"
}

// 404 Not Found
{
  "error": "Upload session not found or expired"
}

// 409 Conflict
{
  "error": "Chunk 1 already uploaded",
  "uploadedChunks": [1]
}

// 413 Payload Too Large
{
  "error": "Chunk size 12000000 exceeds max 10485760"
}
```

#### cURL Example
```bash
curl -X POST http://localhost:5000/api/files/chunk \
  -F "uploadId=550e8400-e29b-41d4-a716-446655440000" \
  -F "chunkNumber=1" \
  -F "totalChunks=10" \
  -F "chunk=@chunk1.bin"
```

#### JavaScript Example with Progress
```javascript
async function uploadChunk(file, uploadId, chunkNumber, totalChunks) {
  const chunkSize = 5 * 1024 * 1024;
  const start = (chunkNumber - 1) * chunkSize;
  const end = Math.min(start + chunkSize, file.size);
  const chunk = file.slice(start, end);
  
  const formData = new FormData();
  formData.append('uploadId', uploadId);
  formData.append('chunkNumber', chunkNumber);
  formData.append('totalChunks', totalChunks);
  formData.append('chunk', chunk);
  
  return fetch('/api/files/chunk', {
    method: 'POST',
    body: formData
  }).then(res => {
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
  });
}
```

---

### 3. GET /api/files/status

**Check upload progress**

#### Request
```http
GET /api/files/status?uploadId=550e8400-e29b-41d4-a716-446655440000
```

#### Response (200 OK)
```json
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "fileName": "document.pdf",
  "status": "in_progress",
  "uploadedChunks": [1, 2, 3],
  "missingChunks": [4, 5, 6, 7, 8, 9, 10],
  "uploadedBytes": 15728640,
  "totalBytes": 52428800,
  "progress": 30,
  "eta": "3 minutes",
  "lastUpdate": "2026-09-01T10:05:00.000Z",
  "expiresAt": "2026-09-02T10:00:00.000Z"
}
```

#### Response Errors
```json
// 400 Bad Request
{
  "error": "Missing required query parameter: uploadId"
}

// 404 Not Found
{
  "error": "Upload session not found or expired"
}
```

#### cURL Example
```bash
curl http://localhost:5000/api/files/status?uploadId=550e8400-e29b-41d4-a716-446655440000
```

#### JavaScript Example with Polling
```javascript
async function checkUploadStatus(uploadId) {
  return fetch(`/api/files/status?uploadId=${uploadId}`)
    .then(res => res.json());
}

// Poll every 5 seconds
const statusInterval = setInterval(async () => {
  const status = await checkUploadStatus(uploadId);
  console.log(`${status.progress}% complete (${status.eta} remaining)`);
  
  if (status.missingChunks.length === 0) {
    clearInterval(statusInterval);
    console.log('All chunks uploaded, ready to complete');
  }
}, 5000);
```

---

### 4. POST /api/files/complete

**Finalize upload - assemble and upload to Google Drive**

#### Request
```http
POST /api/files/complete
Content-Type: application/json

{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "checksum": "abc123def456...",
  "remoteDestination": "ARSIPINVOICE/2026/document.pdf"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "fileName": "document.pdf",
  "fileSize": 52428800,
  "checksum": "abc123def456...",
  "remoteDestination": "ARSIPINVOICE/2026/document.pdf",
  "status": "completed",
  "completedAt": "2026-09-01T10:10:00.000Z"
}
```

#### Response Errors
```json
// 400 Bad Request
{
  "error": "Not all chunks uploaded",
  "uploadedCount": 8,
  "totalCount": 10,
  "missingChunks": [9, 10]
}

// 404 Not Found
{
  "error": "Upload session not found or expired"
}

// 500 Internal Server Error
{
  "error": "Failed to complete upload",
  "message": "Assembly failed: Missing chunk 5"
}
```

#### cURL Example
```bash
curl -X POST http://localhost:5000/api/files/complete \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "550e8400-e29b-41d4-a716-446655440000",
    "checksum": "abc123def456...",
    "remoteDestination": "ARSIPINVOICE/2026/document.pdf"
  }'
```

---

### 5. POST /api/files/abort

**Cancel upload and cleanup**

#### Request
```http
POST /api/files/abort
Content-Type: application/json

{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "user_cancelled"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "aborted",
  "message": "Upload cancelled and temporary files cleaned up"
}
```

#### Response Errors
```json
// 400 Bad Request
{
  "error": "Missing required field: uploadId"
}

// 404 Not Found
{
  "error": "Upload session not found"
}
```

#### cURL Example
```bash
curl -X POST http://localhost:5000/api/files/abort \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "550e8400-e29b-41d4-a716-446655440000",
    "reason": "user_cancelled"
  }'
```

---

## Utility Endpoints

### GET /api/files/metrics

**Admin metrics - active sessions and statistics**

#### Request
```http
GET /api/files/metrics
```

#### Response (200 OK)
```json
{
  "totalCreated": 42,
  "totalCompleted": 35,
  "totalAborted": 5,
  "totalExpired": 2,
  "activeCount": 0,
  "activeSessions": 0,
  "uptime": 3600000
}
```

---

### GET /api/files/active-sessions

**Admin only - list active uploads**

#### Request
```http
GET /api/files/active-sessions
```

#### Response (200 OK)
```json
{
  "count": 2,
  "sessions": [
    {
      "uploadId": "550e8400-e29b-41d4-a716-446655440000",
      "fileName": "document1.pdf",
      "status": "in_progress",
      "uploadedChunks": [1, 2],
      "missingChunks": [3, 4, 5],
      "uploadedBytes": 10485760,
      "totalBytes": 26214400,
      "progress": 40,
      "eta": "2 minutes",
      "lastUpdate": "2026-09-01T10:05:00.000Z",
      "expiresAt": "2026-09-02T10:00:00.000Z"
    },
    {
      "uploadId": "660e8400-e29b-41d4-a716-446655440001",
      "fileName": "document2.pdf",
      "status": "in_progress",
      "uploadedChunks": [1],
      "missingChunks": [2, 3, 4, 5, 6],
      "uploadedBytes": 5242880,
      "totalBytes": 31457280,
      "progress": 17,
      "eta": "4 minutes",
      "lastUpdate": "2026-09-01T10:03:30.000Z",
      "expiresAt": "2026-09-02T10:00:00.000Z"
    }
  ]
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200  | Success | Upload chunk/status OK |
| 400  | Bad Request | Fix request format/data |
| 404  | Not Found | Session expired - restart upload |
| 409  | Conflict | Chunk duplicate - skip and continue |
| 413  | Payload Too Large | Chunk exceeds size limit |
| 500  | Server Error | Retry with backoff |

### Common Error Scenarios

#### Session Expired
```json
{
  "error": "Upload session not found or expired"
}
// Solution: Call POST /init again to start fresh upload
```

#### Missing Chunks Before Complete
```json
{
  "error": "Not all chunks uploaded",
  "uploadedCount": 8,
  "totalCount": 10,
  "missingChunks": [9, 10]
}
// Solution: Upload missing chunks, then call /complete again
```

#### Duplicate Chunk
```json
{
  "error": "Chunk 1 already uploaded",
  "uploadedChunks": [1]
}
// Solution: Skip this chunk, continue with next
```

#### Network Timeout
```
Connection timeout / Network error
// Solution: Retry chunk upload (it's idempotent via chunk number)
```

---

## Client Best Practices

### 1. Calculate Checksums
```javascript
async function calculateFileChecksum(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const fullChecksum = await calculateFileChecksum(file);
```

### 2. Parallel Uploads
```javascript
// Upload up to 3 chunks concurrently
const uploadConcurrency = 3;
for (let i = 0; i < totalChunks; i += uploadConcurrency) {
  const batchSize = Math.min(uploadConcurrency, totalChunks - i);
  const batch = [];
  
  for (let j = 0; j < batchSize; j++) {
    batch.push(uploadChunk(file, uploadId, i + j + 1, totalChunks));
  }
  
  await Promise.all(batch);
}
```

### 3. Retry Logic
```javascript
async function uploadChunkWithRetry(file, uploadId, chunkNumber, totalChunks, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadChunk(file, uploadId, chunkNumber, totalChunks);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### 4. Progress Tracking
```javascript
let totalUploaded = 0;
uploadProgressCallback = (chunkSize) => {
  totalUploaded += chunkSize;
  const progress = Math.round((totalUploaded / fileSize) * 100);
  updateProgressBar(progress);
};
```

---

## Configuration

### Enable Feature
```bash
# Add to .env or set environment variable
ENABLE_CHUNKED_UPLOAD=true

# Or via Docker
docker run -e ENABLE_CHUNKED_UPLOAD=true ...

# Or via Railway
Set ENABLE_CHUNKED_UPLOAD = true in secrets
```

### Adjust Limits (if needed)
```bash
# In server.js or as env vars
CHUNK_SIZE=5242880            # 5MB
MAX_CHUNK_SIZE=10485760       # 10MB per chunk
MAX_FILE_SIZE=536870912       # 500MB
SESSION_TTL=86400000          # 24 hours
```

---

## Troubleshooting

### Sessions Expiring Too Quickly
- Check `SESSION_TTL` environment variable
- Default is 24 hours
- Increase if uploads take longer

### Out of Disk Space
- Check `/temp/uploads` directory size
- Run cleanup: `rm -rf /temp/uploads/*`
- Verify cleanup job runs hourly

### Checksum Mismatch
- Recalculate on client: `calculateFileChecksum(file)`
- Verify network didn't corrupt chunk
- Retry upload with new chunks

### Chunks Stuck "Uploading"
- Check network connectivity
- Check server logs for errors
- Abort upload and restart: `POST /api/files/abort`

---

## Support

For issues or questions:
1. Check server logs: `tail -f logs/server.log`
2. Check if feature is enabled: `ENABLE_CHUNKED_UPLOAD=true`
3. Verify network connectivity
4. Check disk space availability
5. Review error messages in response JSON
