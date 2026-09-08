/**
 * Upload Session Manager
 * 
 * Manages resumable upload sessions with:
 * - In-memory session store
 * - Persistent JSON backup
 * - 24-hour TTL with auto-cleanup
 * - Session tracking and monitoring
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class UploadSessionManager {
  constructor(options = {}) {
    this.sessions = new Map(); // uploadId → session object
    this.sessionDir = options.sessionDir || path.join(__dirname, '../data/upload-sessions');
    this.sessionFile = path.join(this.sessionDir, 'sessions.json');
    this.sessionTTL = options.sessionTTL || 24 * 60 * 60 * 1000; // 24 hours
    this.cleanupInterval = options.cleanupInterval || 60 * 60 * 1000; // 1 hour
    
    this.logger = options.logger || console;
    this.metrics = {
      totalCreated: 0,
      totalCompleted: 0,
      totalAborted: 0,
      totalExpired: 0,
      activeCount: 0
    };
    
    // Initialize
    this._ensureDir();
    this._loadSessions();
    this._startCleanupJob();
  }

  /**
   * Create new upload session
   */
  createSession(metadata) {
    const uploadId = crypto.randomUUID();
    const now = Date.now();
    
    const session = {
      uploadId,
      fileName: metadata.fileName,
      fileSize: metadata.fileSize,
      fileType: metadata.fileType || 'application/octet-stream',
      chunkSize: metadata.chunkSize || 5 * 1024 * 1024, // 5MB default
      totalChunks: Math.ceil(metadata.fileSize / (metadata.chunkSize || 5 * 1024 * 1024)),
      
      // Upload state
      uploadedChunks: new Set(),
      chunksMetadata: new Map(), // chunkNumber → {size, checksum, timestamp}
      
      // Metadata
      metadata: metadata.metadata || {},
      
      // Timing
      createdAt: now,
      lastUpdate: now,
      expiresAt: now + this.sessionTTL,
      
      // Checksums
      checksums: new Map(), // "chunk_N" → hash, "full_file" → hash
      
      // Status
      status: 'initialized', // initialized, in_progress, paused, completed, aborted, expired
      error: null,
      
      // Statistics
      stats: {
        uploadedBytes: 0,
        startTime: now,
        endTime: null,
        duration: null
      }
    };
    
    this.sessions.set(uploadId, session);
    this.metrics.totalCreated++;
    this.metrics.activeCount++;
    
    this.logger.info(`[UploadSession] Created session ${uploadId} for ${metadata.fileName}`);
    this._saveSessions();
    
    return this._sessionToResponse(session);
  }

  /**
   * Get session by ID
   */
  getSession(uploadId) {
    const session = this.sessions.get(uploadId);
    if (!session) return null;
    
    // Check if expired
    if (Date.now() > session.expiresAt) {
      this._expireSession(uploadId);
      return null;
    }
    
    return session;
  }

  /**
   * Update session with new chunk info
   */
  updateSessionChunk(uploadId, chunkNumber, chunkSize, checksum) {
    const session = this.getSession(uploadId);
    if (!session) throw new Error('Session not found');
    
    // Add to uploaded chunks
    session.uploadedChunks.add(chunkNumber);
    
    // Store chunk metadata
    session.chunksMetadata.set(chunkNumber, {
      size: chunkSize,
      checksum,
      timestamp: Date.now()
    });
    
    // Update checksums
    session.checksums.set(`chunk_${chunkNumber}`, checksum);
    
    // Update statistics
    session.stats.uploadedBytes += chunkSize;
    session.lastUpdate = Date.now();
    session.status = 'in_progress';
    
    this._saveSessions();
    
    return {
      uploadedChunks: Array.from(session.uploadedChunks).sort((a, b) => a - b),
      uploadedBytes: session.stats.uploadedBytes,
      totalBytes: session.fileSize,
      progress: Math.round((session.stats.uploadedBytes / session.fileSize) * 100),
      eta: this._estimateTimeRemaining(session)
    };
  }

  /**
   * Mark session as completed
   */
  completeSession(uploadId, fullFileChecksum) {
    const session = this.getSession(uploadId);
    if (!session) throw new Error('Session not found');
    
    session.status = 'completed';
    session.checksums.set('full_file', fullFileChecksum);
    session.stats.endTime = Date.now();
    session.stats.duration = session.stats.endTime - session.stats.startTime;
    
    this.metrics.totalCompleted++;
    this.metrics.activeCount--;
    
    this.logger.info(`[UploadSession] Completed session ${uploadId} (${session.stats.duration}ms)`);
    this._saveSessions();
    
    return this._sessionToResponse(session);
  }

  /**
   * Mark session as aborted
   */
  abortSession(uploadId, reason = 'user_cancelled') {
    const session = this.getSession(uploadId);
    if (!session) throw new Error('Session not found');
    
    session.status = 'aborted';
    session.error = reason;
    session.stats.endTime = Date.now();
    session.stats.duration = session.stats.endTime - session.stats.startTime;
    
    this.metrics.totalAborted++;
    this.metrics.activeCount--;
    
    this.logger.info(`[UploadSession] Aborted session ${uploadId} (reason: ${reason})`);
    this._saveSessions();
    
    return this._sessionToResponse(session);
  }

  /**
   * Get session status
   */
  getStatus(uploadId) {
    const session = this.getSession(uploadId);
    if (!session) return null;
    
    const uploadedChunks = Array.from(session.uploadedChunks).sort((a, b) => a - b);
    const missingChunks = this._getMissingChunks(session.totalChunks, uploadedChunks);
    
    return {
      uploadId,
      fileName: session.fileName,
      status: session.status,
      uploadedChunks,
      missingChunks,
      uploadedBytes: session.stats.uploadedBytes,
      totalBytes: session.fileSize,
      progress: Math.round((session.stats.uploadedBytes / session.fileSize) * 100),
      eta: this._estimateTimeRemaining(session),
      lastUpdate: new Date(session.lastUpdate).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString()
    };
  }

  /**
   * Verify all chunks uploaded
   */
  verifyAllChunksUploaded(uploadId) {
    const session = this.getSession(uploadId);
    if (!session) throw new Error('Session not found');
    
    const expectedChunks = new Set();
    for (let i = 1; i <= session.totalChunks; i++) {
      expectedChunks.add(i);
    }
    
    const uploaded = session.uploadedChunks;
    const missing = Array.from(expectedChunks)
      .filter(n => !uploaded.has(n))
      .sort((a, b) => a - b);
    
    return {
      allUploaded: missing.length === 0,
      uploadedCount: uploaded.size,
      totalCount: session.totalChunks,
      missingChunks: missing
    };
  }

  /**
   * Get chunk checksum
   */
  getChunkChecksum(uploadId, chunkNumber) {
    const session = this.getSession(uploadId);
    if (!session) return null;
    
    return session.checksums.get(`chunk_${chunkNumber}`) || null;
  }

  /**
   * Set full file checksum and verify
   */
  setFullFileChecksum(uploadId, checksum) {
    const session = this.getSession(uploadId);
    if (!session) throw new Error('Session not found');
    
    session.checksums.set('full_file', checksum);
    this._saveSessions();
    
    return true;
  }

  /**
   * Get all checksums
   */
  getAllChecksums(uploadId) {
    const session = this.getSession(uploadId);
    if (!session) return null;
    
    return Object.fromEntries(session.checksums);
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeSessions: this.sessions.size,
      uptime: Date.now()
    };
  }

  /**
   * List all active sessions
   */
  listActiveSessions() {
    const active = [];
    for (const [uploadId, session] of this.sessions) {
      if (Date.now() <= session.expiresAt && session.status === 'in_progress') {
        active.push(this.getStatus(uploadId));
      }
    }
    return active;
  }

  /**
   * Cleanup expired sessions
   */
  _expireSession(uploadId) {
    const session = this.sessions.get(uploadId);
    if (session) {
      session.status = 'expired';
      this.metrics.totalExpired++;
      if (this.metrics.activeCount > 0) {
        this.metrics.activeCount--;
      }
      this.logger.warn(`[UploadSession] Expired session ${uploadId}`);
      this._saveSessions();
    }
  }

  /**
   * Cleanup job - runs periodically
   */
  _startCleanupJob() {
    this.cleanupTimer = setInterval(() => {
      let expiredCount = 0;
      const now = Date.now();
      
      for (const [uploadId, session] of this.sessions) {
        if (now > session.expiresAt) {
          this._expireSession(uploadId);
          expiredCount++;
        }
      }
      
      if (expiredCount > 0) {
        this.logger.info(`[UploadSession] Cleanup: expired ${expiredCount} sessions`);
      }
    }, this.cleanupInterval);
  }

  /**
   * Stop cleanup job
   */
  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this._saveSessions();
  }

  /**
   * Private: Ensure data directory exists
   */
  _ensureDir() {
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  /**
   * Private: Load sessions from disk
   */
  _loadSessions() {
    try {
      if (!fs.existsSync(this.sessionFile)) {
        return;
      }
      
      const data = fs.readFileSync(this.sessionFile, 'utf-8');
      const sessions = JSON.parse(data);
      
      for (const session of sessions) {
        // Convert Sets and Maps back
        session.uploadedChunks = new Set(session.uploadedChunks || []);
        session.chunksMetadata = new Map(session.chunksMetadata || []);
        session.checksums = new Map(session.checksums || []);
        
        // Skip expired sessions
        if (Date.now() > session.expiresAt) {
          session.status = 'expired';
          this.metrics.totalExpired++;
        }
        
        this.sessions.set(session.uploadId, session);
      }
      
      this.logger.info(`[UploadSession] Loaded ${this.sessions.size} sessions from disk`);
    } catch (error) {
      this.logger.error('[UploadSession] Failed to load sessions:', error.message);
    }
  }

  /**
   * Private: Save sessions to disk
   */
  _saveSessions() {
    try {
      const sessions = Array.from(this.sessions.values()).map(session => ({
        ...session,
        uploadedChunks: Array.from(session.uploadedChunks),
        chunksMetadata: Array.from(session.chunksMetadata),
        checksums: Array.from(session.checksums)
      }));
      
      fs.writeFileSync(
        this.sessionFile,
        JSON.stringify(sessions, null, 2),
        'utf-8'
      );
    } catch (error) {
      this.logger.error('[UploadSession] Failed to save sessions:', error.message);
    }
  }

  /**
   * Private: Convert session to response format
   */
  _sessionToResponse(session) {
    return {
      uploadId: session.uploadId,
      fileName: session.fileName,
      fileSize: session.fileSize,
      chunkSize: session.chunkSize,
      totalChunks: session.totalChunks,
      status: session.status,
      createdAt: new Date(session.createdAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString()
    };
  }

  /**
   * Private: Get missing chunks
   */
  _getMissingChunks(totalChunks, uploadedChunks) {
    const missing = [];
    for (let i = 1; i <= totalChunks; i++) {
      if (!uploadedChunks.includes(i)) {
        missing.push(i);
      }
    }
    return missing;
  }

  /**
   * Private: Estimate time remaining
   */
  _estimateTimeRemaining(session) {
    if (session.stats.uploadedBytes === 0) return 'calculating...';
    
    const elapsed = Date.now() - session.stats.startTime;
    const bytesPerMs = session.stats.uploadedBytes / elapsed;
    const remainingBytes = session.fileSize - session.stats.uploadedBytes;
    const remainingMs = remainingBytes / bytesPerMs;
    
    if (remainingMs < 60000) {
      return Math.round(remainingMs / 1000) + 's';
    } else if (remainingMs < 3600000) {
      return Math.round(remainingMs / 60000) + 'min';
    } else {
      return Math.round(remainingMs / 3600000) + 'h';
    }
  }
}

module.exports = UploadSessionManager;
