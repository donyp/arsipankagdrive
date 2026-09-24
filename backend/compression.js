/**
 * Compression Utility Module - Masalah 4: Auto-Compression
 * 
 * Handles intelligent file compression/decompression with:
 * - Automatic format detection (gzip)
 * - Size-aware compression decisions
 * - Streaming support for large files
 * - Metadata tracking (original size, compression ratio)
 * - Transparent error handling (fallback to uncompressed)
 */

const zlib = require('zlib');
const { Transform, pipeline } = require('stream');
const crypto = require('crypto');

/**
 * Compression Configuration
 */
const COMPRESSION_CONFIG = {
    // When to compress (size threshold in bytes)
    threshold: 5 * 1024 * 1024,              // 5MB
    forceCompressionThreshold: 20 * 1024 * 1024, // 20MB
    
    // Compression level (1-9, default 6 = good balance)
    compressionLevel: 6,
    
    // File types: always/never/conditional compress
    alwaysCompress: [
        'application/pdf',
        'image/png',
        'text/plain',
        'application/json',
        'text/html',
        'text/css',
        'application/javascript',
        'application/xml'
    ],
    
    neverCompress: [
        'video/mp4', 'video/quicktime', 'video/x-msvideo',
        'video/mpeg', 'video/webm',
        'application/zip', 'application/x-rar-compressed',
        'application/x-7z-compressed',
        'image/webp'
    ],
    
    conditionalCompress: [
        'image/jpeg',
        'image/gif'
    ],
    
    // Streaming for large files (chunk by chunk)
    streamThreshold: 10 * 1024 * 1024,       // 10MB - use streaming
    
    // Metadata tracking
    addMetadata: true,                        // Store original size, compression ratio
    metadataPrefix: '.gz'                     // Extension added to compressed files
};

/**
 * Determine if a file should be compressed based on size and type
 * 
 * @param {number} fileSize - Size of file in bytes
 * @param {string} mimeType - MIME type of file (e.g., 'application/pdf')
 * @returns {object} - { shouldCompress: boolean, reason: string }
 */
function shouldCompress(fileSize, mimeType) {
    // Always compress if above force threshold
    if (fileSize >= COMPRESSION_CONFIG.forceCompressionThreshold) {
        return {
            shouldCompress: true,
            reason: 'SIZE_FORCED (> 20MB)',
            forceCompression: true
        };
    }
    
    // Never compress certain types
    if (COMPRESSION_CONFIG.neverCompress.includes(mimeType)) {
        return {
            shouldCompress: false,
            reason: `TYPE_EXEMPT (${mimeType})`
        };
    }
    
    // Always compress certain types if above minimum threshold
    if (COMPRESSION_CONFIG.alwaysCompress.includes(mimeType)) {
        if (fileSize >= 1 * 1024 * 1024) { // > 1MB
            return {
                shouldCompress: true,
                reason: `TYPE_ALWAYS (${mimeType})`
            };
        }
    }
    
    // Conditionally compress if above threshold
    if (COMPRESSION_CONFIG.conditionalCompress.includes(mimeType)) {
        if (fileSize >= COMPRESSION_CONFIG.threshold) {
            return {
                shouldCompress: true,
                reason: `TYPE_CONDITIONAL (${mimeType}, > ${(COMPRESSION_CONFIG.threshold / 1024 / 1024).toFixed(0)}MB)`
            };
        }
    }
    
    // Default: compress if above threshold
    if (fileSize >= COMPRESSION_CONFIG.threshold) {
        return {
            shouldCompress: true,
            reason: `SIZE_THRESHOLD (> ${(COMPRESSION_CONFIG.threshold / 1024 / 1024).toFixed(0)}MB)`
        };
    }
    
    return {
        shouldCompress: false,
        reason: 'SIZE_TOO_SMALL (< 5MB)'
    };
}

/**
 * Compress a file buffer using gzip
 * For small files (< 10MB): compress in memory
 * For large files (>= 10MB): use streaming
 * 
 * @param {Buffer} fileBuffer - File data to compress
 * @param {string} mimeType - MIME type of file
 * @param {string} filename - Original filename (for logging)
 * @returns {Promise<object>} - { compressed: Buffer, metadata: { ... } }
 */
async function compressFile(fileBuffer, mimeType = 'application/octet-stream', filename = 'file') {
    const originalSize = fileBuffer.length;
    const decision = shouldCompress(originalSize, mimeType);
    
    const metadata = {
        filename,
        originalSize,
        mimeType,
        compressionDecision: decision.reason,
        isCompressed: decision.shouldCompress,
        timestamp: new Date().toISOString()
    };
    
    // Don't compress if decision says no
    if (!decision.shouldCompress) {
        console.log(`[Compression] ⏭️  Skipping compression for ${filename}: ${decision.reason}`);
        return {
            compressed: fileBuffer,
            metadata,
            skipped: true
        };
    }
    
    try {
        console.log(`[Compression] 📦 Compressing ${filename} (${(originalSize / 1024 / 1024).toFixed(2)}MB)`);
        console.log(`[Compression] Reason: ${decision.reason}`);
        
        // Use streaming for large files
        if (originalSize >= COMPRESSION_CONFIG.streamThreshold) {
            return await compressFileStream(fileBuffer, metadata);
        } else {
            return await compressFileMemory(fileBuffer, metadata);
        }
    } catch (err) {
        console.error(`[Compression] ❌ Compression failed for ${filename}: ${err.message}`);
        console.log('[Compression] Falling back to uncompressed upload');
        
        // Fallback to uncompressed
        return {
            compressed: fileBuffer,
            metadata: {
                ...metadata,
                isCompressed: false,
                compressionError: err.message,
                fallbackToUncompressed: true
            },
            error: err.message
        };
    }
}

/**
 * Compress file buffer in memory (for small files < 10MB)
 * 
 * @private
 * @param {Buffer} fileBuffer - File data
 * @param {object} metadata - File metadata
 * @returns {Promise<object>} - Compressed buffer and stats
 */
async function compressFileMemory(fileBuffer, metadata) {
    return new Promise((resolve, reject) => {
        zlib.gzip(fileBuffer, { level: COMPRESSION_CONFIG.compressionLevel }, (err, compressed) => {
            if (err) {
                reject(err);
                return;
            }
            
            const compressionRatio = (compressed.length / fileBuffer.length) * 100;
            const savings = fileBuffer.length - compressed.length;
            
            metadata.compressedSize = compressed.length;
            metadata.compressionRatio = compressionRatio.toFixed(2);
            metadata.spaceSavings = savings;
            metadata.spaceSavingsPercent = ((savings / fileBuffer.length) * 100).toFixed(1);
            metadata.compressionMethod = 'gzip-memory';
            
            console.log(`[Compression] ✅ Compressed in memory`);
            console.log(`[Compression] Original: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB → Compressed: ${(compressed.length / 1024 / 1024).toFixed(2)}MB`);
            console.log(`[Compression] Ratio: ${compressionRatio.toFixed(1)}% | Savings: ${(savings / 1024 / 1024).toFixed(2)}MB (${metadata.spaceSavingsPercent}%)`);
            
            resolve({
                compressed,
                metadata,
                skipped: false
            });
        });
    });
}

/**
 * Compress file buffer using streams (for large files >= 10MB)
 * Better memory efficiency for large files
 * 
 * @private
 * @param {Buffer} fileBuffer - File data
 * @param {object} metadata - File metadata
 * @returns {Promise<object>} - Compressed buffer and stats
 */
async function compressFileStream(fileBuffer, metadata) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let totalCompressed = 0;
        
        const gzipStream = zlib.createGzip({ level: COMPRESSION_CONFIG.compressionLevel });
        
        gzipStream.on('data', (chunk) => {
            chunks.push(chunk);
            totalCompressed += chunk.length;
        });
        
        gzipStream.on('end', () => {
            const compressed = Buffer.concat(chunks);
            const compressionRatio = (compressed.length / fileBuffer.length) * 100;
            const savings = fileBuffer.length - compressed.length;
            
            metadata.compressedSize = compressed.length;
            metadata.compressionRatio = compressionRatio.toFixed(2);
            metadata.spaceSavings = savings;
            metadata.spaceSavingsPercent = ((savings / fileBuffer.length) * 100).toFixed(1);
            metadata.compressionMethod = 'gzip-stream';
            
            console.log(`[Compression] ✅ Compressed via streaming`);
            console.log(`[Compression] Original: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB → Compressed: ${(compressed.length / 1024 / 1024).toFixed(2)}MB`);
            console.log(`[Compression] Ratio: ${compressionRatio.toFixed(1)}% | Savings: ${(savings / 1024 / 1024).toFixed(2)}MB (${metadata.spaceSavingsPercent}%)`);
            
            resolve({
                compressed,
                metadata,
                skipped: false
            });
        });
        
        gzipStream.on('error', (err) => {
            reject(err);
        });
        
        // Write data to gzip stream
        gzipStream.write(fileBuffer);
        gzipStream.end();
    });
}

/**
 * Decompress a gzipped file buffer
 * 
 * @param {Buffer} compressedBuffer - Gzipped file data
 * @param {string} filename - Original filename (for logging)
 * @returns {Promise<object>} - { decompressed: Buffer, metadata: { ... } }
 */
async function decompressFile(compressedBuffer, filename = 'file') {
    try {
        console.log(`[Compression] 📂 Decompressing ${filename}`);
        
        return new Promise((resolve, reject) => {
            zlib.gunzip(compressedBuffer, (err, decompressed) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                console.log(`[Compression] ✅ Decompressed`);
                console.log(`[Compression] Size: ${(compressedBuffer.length / 1024 / 1024).toFixed(2)}MB → ${(decompressed.length / 1024 / 1024).toFixed(2)}MB`);
                
                resolve({
                    decompressed,
                    metadata: {
                        filename,
                        originalCompressedSize: compressedBuffer.length,
                        decompressedSize: decompressed.length,
                        timestamp: new Date().toISOString()
                    }
                });
            });
        });
    } catch (err) {
        console.error(`[Compression] ❌ Decompression failed for ${filename}: ${err.message}`);
        throw err;
    }
}

/**
 * Check if a buffer is gzipped (magic number check)
 * Gzip files start with magic bytes: 0x1f 0x8b
 * 
 * @param {Buffer} buffer - Buffer to check
 * @returns {boolean} - True if buffer appears to be gzipped
 */
function isGzipped(buffer) {
    if (!buffer || buffer.length < 2) {
        return false;
    }
    return buffer[0] === 0x1f && buffer[1] === 0x8b;
}

/**
 * Intelligently decompress if needed
 * Safe wrapper: only decompresses if buffer is actually gzipped
 * 
 * @param {Buffer} buffer - Buffer that may be gzipped
 * @param {string} filename - Original filename
 * @returns {Promise<object>} - { data: Buffer, wasCompressed: boolean, metadata: {...} }
 */
async function decompressIfNeeded(buffer, filename = 'file') {
    if (!isGzipped(buffer)) {
        console.log(`[Compression] ℹ️  Buffer not gzipped, returning as-is`);
        return {
            data: buffer,
            wasCompressed: false,
            metadata: {
                filename,
                skipped: true
            }
        };
    }
    
    try {
        const result = await decompressFile(buffer, filename);
        return {
            data: result.decompressed,
            wasCompressed: true,
            metadata: result.metadata
        };
    } catch (err) {
        console.error(`[Compression] ⚠️  Failed to decompress, returning original buffer`);
        return {
            data: buffer,
            wasCompressed: false,
            metadata: {
                filename,
                decompressionFailed: true,
                error: err.message
            }
        };
    }
}

/**
 * Get compression statistics
 * 
 * @returns {object} - Current compression configuration and stats
 */
function getCompressionStats() {
    return {
        config: {
            threshold: `${(COMPRESSION_CONFIG.threshold / 1024 / 1024).toFixed(0)}MB`,
            forceCompressionThreshold: `${(COMPRESSION_CONFIG.forceCompressionThreshold / 1024 / 1024).toFixed(0)}MB`,
            compressionLevel: COMPRESSION_CONFIG.compressionLevel,
            alwaysCompressTypes: COMPRESSION_CONFIG.alwaysCompress.length,
            neverCompressTypes: COMPRESSION_CONFIG.neverCompress.length,
            conditionalCompressTypes: COMPRESSION_CONFIG.conditionalCompress.length
        }
    };
}

/**
 * Export public API
 */
module.exports = {
    shouldCompress,
    compressFile,
    decompressFile,
    isGzipped,
    decompressIfNeeded,
    getCompressionStats,
    COMPRESSION_CONFIG
};
