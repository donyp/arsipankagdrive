/**
 * Chunk Handler
 * 
 * Handles chunk storage and retrieval:
 * - Save chunks to temporary storage
 * - Verify chunk integrity via checksums
 * - Track upload progress
 * - Manage manifest files
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

class ChunkHandler {
  constructor(options = {}) {
    this.tempDir = options.tempDir || path.join(__dirname, '../temp/uploads');
    this.logger = options.logger || console;
    this.maxChunkSize = options.maxChunkSize || 10 * 1024 * 1024; // 10MB
    
    this._ensureDir();
  }

  /**
   * Save chunk to disk
   */
  async saveChunk(uploadId, chunkNumber, buffer, checksum = null) {
    try {
      const uploadDir = path.join(this.tempDir, uploadId);
      await mkdir(uploadDir, { recursive: true });
      
      // Verify checksum if provided
      if (checksum) {
        const calculatedHash = crypto
          .createHash('sha256')
          .update(buffer)
          .digest('hex');
        
        if (calculatedHash !== checksum) {
          throw new Error(`Checksum mismatch. Expected: ${checksum}, Got: ${calculatedHash}`);
        }
      }
      
      // Check size
      if (buffer.length > this.maxChunkSize) {
        throw new Error(`Chunk size ${buffer.length} exceeds max ${this.maxChunkSize}`);
      }
      
      // Save chunk file
      const chunkPath = path.join(uploadDir, `chunk_${String(chunkNumber).padStart(6, '0')}`);
      await writeFile(chunkPath, buffer);
      
      // Calculate and return hash
      const hash = crypto
        .createHash('sha256')
        .update(buffer)
        .digest('hex');
      
      this.logger.info(`[ChunkHandler] Saved chunk ${chunkNumber} for ${uploadId} (${buffer.length} bytes)`);
      
      return {
        uploadId,
        chunkNumber,
        size: buffer.length,
        checksum: hash,
        path: chunkPath
      };
    } catch (error) {
      this.logger.error(`[ChunkHandler] Error saving chunk:`, error.message);
      throw error;
    }
  }

  /**
   * Get chunk from disk
   */
  async getChunk(uploadId, chunkNumber) {
    try {
      const chunkPath = path.join(
        this.tempDir,
        uploadId,
        `chunk_${String(chunkNumber).padStart(6, '0')}`
      );
      
      if (!fs.existsSync(chunkPath)) {
        throw new Error(`Chunk ${chunkNumber} not found for upload ${uploadId}`);
      }
      
      const buffer = await readFile(chunkPath);
      return buffer;
    } catch (error) {
      this.logger.error(`[ChunkHandler] Error reading chunk:`, error.message);
      throw error;
    }
  }

  /**
   * Delete chunk
   */
  async deleteChunk(uploadId, chunkNumber) {
    try {
      const chunkPath = path.join(
        this.tempDir,
        uploadId,
        `chunk_${String(chunkNumber).padStart(6, '0')}`
      );
      
      if (fs.existsSync(chunkPath)) {
        await unlink(chunkPath);
        this.logger.info(`[ChunkHandler] Deleted chunk ${chunkNumber} for ${uploadId}`);
      }
    } catch (error) {
      this.logger.error(`[ChunkHandler] Error deleting chunk:`, error.message);
      throw error;
    }
  }

  /**
   * Check if chunk exists
   */
  chunkExists(uploadId, chunkNumber) {
    const chunkPath = path.join(
      this.tempDir,
      uploadId,
      `chunk_${String(chunkNumber).padStart(6, '0')}`
    );
    return fs.existsSync(chunkPath);
  }

  /**
   * Get all chunks for upload
   */
  async listChunks(uploadId) {
    try {
      const uploadDir = path.join(this.tempDir, uploadId);
      
      if (!fs.existsSync(uploadDir)) {
        return [];
      }
      
      const files = fs.readdirSync(uploadDir);
      const chunks = files
        .filter(f => f.startsWith('chunk_'))
        .map(f => {
          const num = parseInt(f.replace('chunk_', ''));
          const filePath = path.join(uploadDir, f);
          const stats = fs.statSync(filePath);
          return {
            number: num,
            size: stats.size,
            path: filePath
          };
        })
        .sort((a, b) => a.number - b.number);
      
      return chunks;
    } catch (error) {
      this.logger.error(`[ChunkHandler] Error listing chunks:`, error.message);
      throw error;
    }
  }

  /**
   * Assemble chunks into single file
   */
  async assembleChunks(uploadId, totalChunks, outputPath) {
    try {
      const uploadDir = path.join(this.tempDir, uploadId);
      const writeStream = fs.createWriteStream(outputPath);
      
      return new Promise((resolve, reject) => {
        let chunkIndex = 1;
        
        const writeNextChunk = async () => {
          if (chunkIndex > totalChunks) {
            writeStream.end();
            resolve();
            return;
          }
          
          try {
            const chunkPath = path.join(
              uploadDir,
              `chunk_${String(chunkIndex).padStart(6, '0')}`
            );
            
            if (!fs.existsSync(chunkPath)) {
              reject(new Error(`Missing chunk ${chunkIndex}`));
              return;
            }
            
            const buffer = await readFile(chunkPath);
            
            if (!writeStream.write(buffer)) {
              writeStream.once('drain', () => {
                chunkIndex++;
                writeNextChunk();
              });
            } else {
              chunkIndex++;
              writeNextChunk();
            }
          } catch (error) {
            reject(error);
          }
        };
        
        writeStream.on('error', reject);
        writeNextChunk();
      });
    } catch (error) {
      this.logger.error(`[ChunkHandler] Error assembling chunks:`, error.message);
      throw error;
    }
  }

  /**
   * Calculate file checksum
   */
  async calculateChecksum(filePath) {
    try {
      return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
      });
    } catch (error) {
      this.logger.error(`[ChunkHandler] Error calculating checksum:`, error.message);
      throw error;
    }
  }

  /**
   * Get upload directory stats
   */
  getUploadStats(uploadId) {
    try {
      const uploadDir = path.join(this.tempDir, uploadId);
      
      if (!fs.existsSync(uploadDir)) {
        return null;
      }
      
      let totalSize = 0;
      const files = fs.readdirSync(uploadDir);
      
      for (const file of files) {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      }
      
      return {
        uploadId,
        directory: uploadDir,
        fileCount: files.length,
        totalSize,
        files
      };
    } catch (error) {
      this.logger.error(`[ChunkHandler] Error getting upload stats:`, error.message);
      return null;
    }
  }

  /**
   * Delete entire upload directory
   */
  async deleteUploadDirectory(uploadId) {
    try {
      const uploadDir = path.join(this.tempDir, uploadId);
      
      if (!fs.existsSync(uploadDir)) {
        return true;
      }
      
      // Delete all files in directory
      const files = fs.readdirSync(uploadDir);
      for (const file of files) {
        const filePath = path.join(uploadDir, file);
        await unlink(filePath);
      }
      
      // Delete directory
      fs.rmdirSync(uploadDir);
      
      this.logger.info(`[ChunkHandler] Deleted upload directory for ${uploadId}`);
      return true;
    } catch (error) {
      this.logger.error(`[ChunkHandler] Error deleting upload directory:`, error.message);
      throw error;
    }
  }

  /**
   * Cleanup old uploads (older than TTL)
   */
  async cleanupOldUploads(ttlMs) {
    try {
      const now = Date.now();
      let cleanedCount = 0;
      
      if (!fs.existsSync(this.tempDir)) {
        return cleanedCount;
      }
      
      const uploads = fs.readdirSync(this.tempDir);
      
      for (const uploadId of uploads) {
        const uploadPath = path.join(this.tempDir, uploadId);
        const stats = fs.statSync(uploadPath);
        const age = now - stats.mtimeMs;
        
        if (age > ttlMs) {
          try {
            await this.deleteUploadDirectory(uploadId);
            cleanedCount++;
          } catch (error) {
            this.logger.warn(`[ChunkHandler] Failed to cleanup ${uploadId}:`, error.message);
          }
        }
      }
      
      if (cleanedCount > 0) {
        this.logger.info(`[ChunkHandler] Cleaned up ${cleanedCount} old uploads`);
      }
      
      return cleanedCount;
    } catch (error) {
      this.logger.error(`[ChunkHandler] Error during cleanup:`, error.message);
      return 0;
    }
  }

  /**
   * Private: Ensure temp directory exists
   */
  _ensureDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }
}

module.exports = ChunkHandler;
