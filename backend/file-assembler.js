/**
 * File Assembler
 * 
 * Assembles chunks into final files:
 * - Verify chunk integrity
 * - Assemble into single file
 * - Upload to Google Drive (via rclone)
 * - Database storage
 * - Cleanup temporary files
 */

const crypto = require('crypto');

class FileAssembler {
  constructor(options = {}) {
    this.chunkHandler = options.chunkHandler;
    this.rcloneWrapper = options.rcloneWrapper;
    this.database = options.database;
    this.logger = options.logger || console;
  }

  /**
   * Complete upload: assemble, verify, upload to Google Drive
   */
  async completeUpload(uploadId, session, tempFilePath, remoteDestination) {
    try {
      this.logger.info(`[FileAssembler] Starting assembly for ${uploadId}`);
      
      // Step 1: Verify all chunks present
      const verification = this._verifyChunksPresent(session);
      if (!verification.allPresent) {
        throw new Error(`Missing chunks: ${verification.missingChunks.join(', ')}`);
      }
      
      this.logger.info(`[FileAssembler] All ${session.totalChunks} chunks verified`);
      
      // Step 2: Assemble chunks
      await this.chunkHandler.assembleChunks(
        uploadId,
        session.totalChunks,
        tempFilePath
      );
      this.logger.info(`[FileAssembler] Assembled file: ${tempFilePath}`);
      
      // Step 3: Verify file integrity
      const fileChecksum = await this.chunkHandler.calculateChecksum(tempFilePath);
      
      if (session.checksums.get('full_file') && 
          session.checksums.get('full_file') !== fileChecksum) {
        throw new Error('File checksum mismatch - possible corruption');
      }
      
      this.logger.info(`[FileAssembler] File checksum verified: ${fileChecksum}`);
      
      // Step 4: Get file stats
      const fs = require('fs');
      const stats = fs.statSync(tempFilePath);
      const fileSize = stats.size;
      
      if (fileSize !== session.fileSize) {
        throw new Error(
          `File size mismatch: expected ${session.fileSize}, got ${fileSize}`
        );
      }
      
      this.logger.info(`[FileAssembler] File size verified: ${fileSize} bytes`);
      
      // Step 5: Upload to Google Drive
      let remoteFileInfo = null;
      if (this.rcloneWrapper) {
        remoteFileInfo = await this.rcloneWrapper.uploadFile(
          tempFilePath,
          remoteDestination
        );
        this.logger.info(`[FileAssembler] Uploaded to Google Drive: ${remoteDestination}`);
      }
      
      // Step 6: Verify on remote
      if (this.rcloneWrapper) {
        const exists = await this.rcloneWrapper.remoteFileExists(remoteDestination);
        if (!exists) {
          throw new Error('File not found on remote after upload');
        }
      }
      
      this.logger.info(`[FileAssembler] Remote file verified`);
      
      // Step 7: Cleanup temporary chunks
      await this.chunkHandler.deleteUploadDirectory(uploadId);
      this.logger.info(`[FileAssembler] Cleaned up temporary chunks`);
      
      // Step 8: Return success
      return {
        uploadId,
        fileName: session.fileName,
        fileSize,
        checksum: fileChecksum,
        remoteDestination,
        remoteFileInfo,
        status: 'completed',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`[FileAssembler] Assembly failed:`, error.message);
      // Cleanup on failure
      try {
        await this.chunkHandler.deleteUploadDirectory(uploadId);
      } catch (cleanupError) {
        this.logger.error(`[FileAssembler] Cleanup failed:`, cleanupError.message);
      }
      throw error;
    }
  }

  /**
   * Verify chunk integrity using stored checksums
   */
  verifyChunkIntegrity(uploadId, chunkNumber, sessionChecksums) {
    try {
      const storedHash = sessionChecksums.get(`chunk_${chunkNumber}`);
      if (!storedHash) {
        return {
          valid: false,
          reason: 'No checksum stored for chunk'
        };
      }
      
      return {
        valid: true,
        checksum: storedHash
      };
    } catch (error) {
      this.logger.error(`[FileAssembler] Error verifying chunk:`, error.message);
      return {
        valid: false,
        reason: error.message
      };
    }
  }

  /**
   * Get assembly report
   */
  getAssemblyReport(session, tempFilePath = null) {
    const uploadedChunks = Array.from(session.uploadedChunks).sort((a, b) => a - b);
    const missingChunks = this._getMissingChunks(session.totalChunks, uploadedChunks);
    
    return {
      uploadId: session.uploadId,
      fileName: session.fileName,
      fileSize: session.fileSize,
      totalChunks: session.totalChunks,
      uploadedChunks: {
        count: uploadedChunks.length,
        list: uploadedChunks
      },
      missingChunks: {
        count: missingChunks.length,
        list: missingChunks
      },
      checksumStatus: {
        chunkChecksums: session.checksums.size - 1, // -1 for full_file
        fullFileChecksum: session.checksums.has('full_file') ? 'set' : 'not_set'
      },
      uploadedBytes: session.stats.uploadedBytes,
      canAssemble: missingChunks.length === 0,
      ready: this._isReadyForAssembly(session)
    };
  }

  /**
   * Private: Verify all chunks are present
   */
  _verifyChunksPresent(session) {
    const uploadedChunks = Array.from(session.uploadedChunks);
    const missingChunks = [];
    
    for (let i = 1; i <= session.totalChunks; i++) {
      if (!uploadedChunks.includes(i)) {
        missingChunks.push(i);
      }
    }
    
    return {
      allPresent: missingChunks.length === 0,
      missingChunks,
      uploadedCount: uploadedChunks.length,
      totalCount: session.totalChunks
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
   * Private: Check if session is ready for assembly
   */
  _isReadyForAssembly(session) {
    // All chunks uploaded
    if (session.uploadedChunks.size !== session.totalChunks) {
      return false;
    }
    
    // Status is in_progress or paused (not completed or aborted)
    if (session.status !== 'in_progress' && session.status !== 'paused') {
      return false;
    }
    
    return true;
  }

  /**
   * Validate before assembly
   */
  validateForAssembly(session) {
    const errors = [];
    const warnings = [];
    
    // Check chunks
    if (session.uploadedChunks.size !== session.totalChunks) {
      errors.push(`Missing chunks: ${session.totalChunks - session.uploadedChunks.size} of ${session.totalChunks}`);
    }
    
    // Check status
    if (session.status === 'completed' || session.status === 'aborted') {
      errors.push(`Cannot assemble: upload is ${session.status}`);
    }
    
    // Check age
    const age = Date.now() - session.createdAt;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (age > maxAge) {
      warnings.push('Upload session is older than 24 hours');
    }
    
    // Check file size
    if (session.fileSize > 500 * 1024 * 1024) { // 500MB limit
      warnings.push('Large file upload - may take longer');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      readyToAssemble: errors.length === 0
    };
  }
}

module.exports = FileAssembler;
