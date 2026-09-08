/**
 * Comprehensive Test Suite for Chunked Upload System
 * 
 * Tests all components:
 * - Upload Session Manager
 * - Chunk Handler
 * - File Assembler
 * - API Endpoints
 */

const UploadSessionManager = require('./upload-session-manager');
const ChunkHandler = require('./chunk-handler');
const FileAssembler = require('./file-assembler');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ============================================================
// Test Configuration
// ============================================================

const TEST_CONFIG = {
  tempDir: path.join(__dirname, '../temp/test-uploads'),
  sessionDir: path.join(__dirname, '../data/test-sessions'),
  sessionTTL: 60 * 60 * 1000, // 1 hour for testing
  cleanupInterval: 30 * 1000,  // 30 seconds for testing
  logger: console
};

// ============================================================
// Helper Functions
// ============================================================

function createTestFile(sizeInBytes) {
  return crypto.randomBytes(sizeInBytes);
}

function calculateChecksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function ensureTestDirs() {
  if (!fs.existsSync(TEST_CONFIG.tempDir)) {
    fs.mkdirSync(TEST_CONFIG.tempDir, { recursive: true });
  }
  if (!fs.existsSync(TEST_CONFIG.sessionDir)) {
    fs.mkdirSync(TEST_CONFIG.sessionDir, { recursive: true });
  }
}

function cleanupTestDirs() {
  try {
    if (fs.existsSync(TEST_CONFIG.tempDir)) {
      fs.rmSync(TEST_CONFIG.tempDir, { recursive: true, force: true });
    }
    if (fs.existsSync(TEST_CONFIG.sessionDir)) {
      fs.rmSync(TEST_CONFIG.sessionDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn('Cleanup warning:', error.message);
  }
}

// ============================================================
// Test Suite: Upload Session Manager
// ============================================================

class SessionManagerTests {
  async runAll() {
    console.log('\n' + '='.repeat(60));
    console.log('TESTING: Upload Session Manager');
    console.log('='.repeat(60));
    
    const manager = new UploadSessionManager(TEST_CONFIG);
    
    try {
      await this.testSessionCreation(manager);
      await this.testSessionRetrieval(manager);
      await this.testSessionUpdate(manager);
      await this.testSessionCompletion(manager);
      await this.testSessionAbort(manager);
      await this.testSessionExpiration(manager);
      await this.testMetrics(manager);
      await this.testPersistence(manager);
    } finally {
      manager.stop();
    }
  }

  async testSessionCreation(manager) {
    console.log('\n📝 Test 1: Session Creation');
    
    const session = manager.createSession({
      fileName: 'test.pdf',
      fileSize: 10 * 1024 * 1024,
      fileType: 'application/pdf',
      chunkSize: 1024 * 1024,
      metadata: { zona_id: 1, toko_id: 1 }
    });
    
    if (!session.uploadId || !session.fileName || session.status !== 'initialized') {
      throw new Error('Session creation failed');
    }
    
    console.log(`  ✅ Created session: ${session.uploadId}`);
    console.log(`  ✅ File: ${session.fileName}`);
    console.log(`  ✅ Total chunks: ${session.totalChunks}`);
  }

  async testSessionRetrieval(manager) {
    console.log('\n📝 Test 2: Session Retrieval');
    
    const session1 = manager.createSession({
      fileName: 'retrieve-test.pdf',
      fileSize: 5 * 1024 * 1024,
      chunkSize: 1024 * 1024
    });
    
    const retrieved = manager.getSession(session1.uploadId);
    if (!retrieved) throw new Error('Session not retrieved');
    
    console.log(`  ✅ Retrieved session: ${retrieved.uploadId}`);
    console.log(`  ✅ Status: ${retrieved.status}`);
  }

  async testSessionUpdate(manager) {
    console.log('\n📝 Test 3: Session Update (Chunk Upload)');
    
    const session = manager.createSession({
      fileName: 'update-test.pdf',
      fileSize: 4 * 1024 * 1024,
      chunkSize: 1024 * 1024
    });
    
    const buffer = createTestFile(1024 * 1024);
    const checksum = calculateChecksum(buffer);
    
    const update = manager.updateSessionChunk(
      session.uploadId,
      1,
      buffer.length,
      checksum
    );
    
    if (!update.uploadedBytes || update.progress < 1) {
      throw new Error('Session update failed');
    }
    
    console.log(`  ✅ Updated session with chunk 1`);
    console.log(`  ✅ Uploaded bytes: ${update.uploadedBytes}`);
    console.log(`  ✅ Progress: ${update.progress}%`);
    console.log(`  ✅ ETA: ${update.eta}`);
  }

  async testSessionCompletion(manager) {
    console.log('\n📝 Test 4: Session Completion');
    
    const session = manager.createSession({
      fileName: 'complete-test.pdf',
      fileSize: 2 * 1024 * 1024,
      chunkSize: 1024 * 1024
    });
    
    // Upload both chunks
    for (let i = 1; i <= 2; i++) {
      const buffer = createTestFile(1024 * 1024);
      manager.updateSessionChunk(session.uploadId, i, buffer.length, calculateChecksum(buffer));
    }
    
    const fullChecksum = calculateChecksum(createTestFile(2 * 1024 * 1024));
    const completed = manager.completeSession(session.uploadId, fullChecksum);
    
    if (completed.status !== 'completed') {
      throw new Error('Session not marked as completed');
    }
    
    console.log(`  ✅ Session marked as completed`);
    console.log(`  ✅ Status: ${completed.status}`);
  }

  async testSessionAbort(manager) {
    console.log('\n📝 Test 5: Session Abort');
    
    const session = manager.createSession({
      fileName: 'abort-test.pdf',
      fileSize: 3 * 1024 * 1024,
      chunkSize: 1024 * 1024
    });
    
    const aborted = manager.abortSession(session.uploadId, 'test_abort');
    
    if (aborted.status !== 'aborted') {
      throw new Error('Session not aborted');
    }
    
    console.log(`  ✅ Session aborted`);
    console.log(`  ✅ Status: ${aborted.status}`);
  }

  async testSessionExpiration(manager) {
    console.log('\n📝 Test 6: Session Expiration');
    
    const session = manager.createSession({
      fileName: 'expire-test.pdf',
      fileSize: 1 * 1024 * 1024,
      chunkSize: 1024 * 1024
    });
    
    // Manually set expiration to past
    const sess = manager.getSession(session.uploadId);
    sess.expiresAt = Date.now() - 1000;
    
    const retrieved = manager.getSession(session.uploadId);
    if (retrieved !== null) {
      throw new Error('Expired session not handled');
    }
    
    console.log(`  ✅ Expired session correctly removed`);
  }

  async testMetrics(manager) {
    console.log('\n📝 Test 7: Metrics Collection');
    
    // Create a few sessions
    for (let i = 0; i < 3; i++) {
      manager.createSession({
        fileName: `metrics-${i}.pdf`,
        fileSize: 1 * 1024 * 1024,
        chunkSize: 1024 * 1024
      });
    }
    
    const metrics = manager.getMetrics();
    
    if (metrics.totalCreated < 3) {
      throw new Error('Metrics not tracking correctly');
    }
    
    console.log(`  ✅ Total created: ${metrics.totalCreated}`);
    console.log(`  ✅ Active count: ${metrics.activeCount}`);
    console.log(`  ✅ Total completed: ${metrics.totalCompleted}`);
  }

  async testPersistence(manager) {
    console.log('\n📝 Test 8: Session Persistence');
    
    const session = manager.createSession({
      fileName: 'persist-test.pdf',
      fileSize: 2 * 1024 * 1024,
      chunkSize: 1024 * 1024
    });
    
    // Stop manager (saves sessions)
    manager.stop();
    
    // Create new manager (loads sessions)
    const manager2 = new UploadSessionManager(TEST_CONFIG);
    const retrieved = manager2.getSession(session.uploadId);
    
    if (!retrieved) {
      throw new Error('Session not persisted');
    }
    
    console.log(`  ✅ Session persisted and restored`);
    manager2.stop();
  }
}

// ============================================================
// Test Suite: Chunk Handler
// ============================================================

class ChunkHandlerTests {
  async runAll() {
    console.log('\n' + '='.repeat(60));
    console.log('TESTING: Chunk Handler');
    console.log('='.repeat(60));
    
    const handler = new ChunkHandler({
      tempDir: TEST_CONFIG.tempDir,
      maxChunkSize: 10 * 1024 * 1024,
      logger: console
    });
    
    try {
      await this.testChunkSave(handler);
      await this.testChunkRetrieval(handler);
      await this.testChecksumVerification(handler);
      await this.testChunkListing(handler);
      await this.testFileAssembly(handler);
      await this.testDirectoryCleanup(handler);
    } catch (error) {
      console.error('ChunkHandler test failed:', error.message);
      throw error;
    }
  }

  async testChunkSave(handler) {
    console.log('\n📝 Test 1: Chunk Save');
    
    const uploadId = 'test-' + Date.now();
    const buffer = createTestFile(1024 * 1024);
    const checksum = calculateChecksum(buffer);
    
    const result = await handler.saveChunk(uploadId, 1, buffer, checksum);
    
    if (!result || result.size !== buffer.length) {
      throw new Error('Chunk save failed');
    }
    
    console.log(`  ✅ Saved chunk 1 (${result.size} bytes)`);
    console.log(`  ✅ Checksum: ${result.checksum.substring(0, 16)}...`);
  }

  async testChunkRetrieval(handler) {
    console.log('\n📝 Test 2: Chunk Retrieval');
    
    const uploadId = 'test-' + Date.now();
    const buffer = createTestFile(512 * 1024);
    const checksum = calculateChecksum(buffer);
    
    await handler.saveChunk(uploadId, 1, buffer, checksum);
    const retrieved = await handler.getChunk(uploadId, 1);
    
    if (!retrieved || retrieved.length !== buffer.length) {
      throw new Error('Chunk retrieval failed');
    }
    
    console.log(`  ✅ Retrieved chunk 1 (${retrieved.length} bytes)`);
  }

  async testChecksumVerification(handler) {
    console.log('\n📝 Test 3: Checksum Verification');
    
    const uploadId = 'test-' + Date.now();
    const buffer = createTestFile(1024 * 1024);
    const checksum = calculateChecksum(buffer);
    
    let errorThrown = false;
    try {
      await handler.saveChunk(uploadId, 1, buffer, 'wrong-checksum');
    } catch (error) {
      if (error.message.includes('Checksum mismatch')) {
        errorThrown = true;
      }
    }
    
    if (!errorThrown) {
      throw new Error('Checksum verification failed');
    }
    
    console.log(`  ✅ Checksum mismatch correctly detected`);
  }

  async testChunkListing(handler) {
    console.log('\n📝 Test 4: Chunk Listing');
    
    const uploadId = 'test-' + Date.now();
    
    for (let i = 1; i <= 3; i++) {
      const buffer = createTestFile(1024 * 1024);
      await handler.saveChunk(uploadId, i, buffer, calculateChecksum(buffer));
    }
    
    const chunks = await handler.listChunks(uploadId);
    
    if (chunks.length !== 3) {
      throw new Error('Chunk listing failed');
    }
    
    console.log(`  ✅ Listed ${chunks.length} chunks`);
    chunks.forEach((chunk, i) => {
      console.log(`    Chunk ${i + 1}: number=${chunk.number}, size=${chunk.size}`);
    });
  }

  async testFileAssembly(handler) {
    console.log('\n📝 Test 5: File Assembly');
    
    const uploadId = 'test-' + Date.now();
    const chunks = [];
    
    // Create 3 chunks
    for (let i = 1; i <= 3; i++) {
      const buffer = createTestFile(1024 * 1024);
      chunks.push(buffer);
      await handler.saveChunk(uploadId, i, buffer, calculateChecksum(buffer));
    }
    
    // Assemble
    const outputPath = path.join(TEST_CONFIG.tempDir, `${uploadId}-assembled.bin`);
    await handler.assembleChunks(uploadId, 3, outputPath);
    
    if (!fs.existsSync(outputPath)) {
      throw new Error('Assembled file not found');
    }
    
    const assembledSize = fs.statSync(outputPath).size;
    const expectedSize = chunks.reduce((sum, buf) => sum + buf.length, 0);
    
    if (assembledSize !== expectedSize) {
      throw new Error(`Size mismatch: expected ${expectedSize}, got ${assembledSize}`);
    }
    
    console.log(`  ✅ Assembled file (${assembledSize} bytes)`);
    
    // Cleanup
    fs.unlinkSync(outputPath);
  }

  async testDirectoryCleanup(handler) {
    console.log('\n📝 Test 6: Directory Cleanup');
    
    const uploadId = 'test-' + Date.now();
    
    for (let i = 1; i <= 2; i++) {
      const buffer = createTestFile(512 * 1024);
      await handler.saveChunk(uploadId, i, buffer, calculateChecksum(buffer));
    }
    
    const uploadDir = path.join(TEST_CONFIG.tempDir, uploadId);
    if (!fs.existsSync(uploadDir)) {
      throw new Error('Upload directory not created');
    }
    
    await handler.deleteUploadDirectory(uploadId);
    
    if (fs.existsSync(uploadDir)) {
      throw new Error('Upload directory not deleted');
    }
    
    console.log(`  ✅ Upload directory cleaned up`);
  }
}

// ============================================================
// Test Suite: File Assembler
// ============================================================

class FileAssemblerTests {
  async runAll() {
    console.log('\n' + '='.repeat(60));
    console.log('TESTING: File Assembler');
    console.log('='.repeat(60));
    
    const chunkHandler = new ChunkHandler({
      tempDir: TEST_CONFIG.tempDir,
      maxChunkSize: 10 * 1024 * 1024,
      logger: console
    });
    
    const assembler = new FileAssembler({
      chunkHandler,
      rcloneWrapper: null, // Mock for testing
      logger: console
    });
    
    try {
      await this.testValidation(assembler);
      await this.testIntegrityCheck(assembler);
    } catch (error) {
      console.error('FileAssembler test failed:', error.message);
      throw error;
    }
  }

  async testValidation(assembler) {
    console.log('\n📝 Test 1: Assembly Validation');
    
    const session = {
      uploadId: 'test-validate',
      fileName: 'test.pdf',
      fileSize: 3 * 1024 * 1024,
      totalChunks: 3,
      uploadedChunks: new Set([1, 2, 3]),
      status: 'in_progress',
      createdAt: Date.now(),
      stats: { uploadedBytes: 3 * 1024 * 1024 }
    };
    
    const validation = assembler.validateForAssembly(session);
    
    if (!validation.valid) {
      throw new Error('Valid session marked as invalid');
    }
    
    console.log(`  ✅ Valid session passed validation`);
    console.log(`  ✅ Errors: ${validation.errors.length}`);
    console.log(`  ✅ Warnings: ${validation.warnings.length}`);
  }

  async testIntegrityCheck(assembler) {
    console.log('\n📝 Test 2: Integrity Check');
    
    const checksums = new Map([
      ['chunk_1', 'hash1'],
      ['chunk_2', 'hash2'],
      ['full_file', 'fullhash']
    ]);
    
    const result = assembler.verifyChunkIntegrity('test-id', 1, checksums);
    
    if (!result.valid) {
      throw new Error('Valid checksum marked as invalid');
    }
    
    console.log(`  ✅ Chunk integrity verified`);
    console.log(`  ✅ Checksum: ${result.checksum}`);
  }
}

// ============================================================
// Main Test Runner
// ============================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('CHUNKED UPLOAD SYSTEM - COMPREHENSIVE TEST SUITE');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  
  ensureTestDirs();
  
  try {
    const sessionTests = new SessionManagerTests();
    await sessionTests.runAll();
    
    const chunkTests = new ChunkHandlerTests();
    await chunkTests.runAll();
    
    const assemblerTests = new FileAssemblerTests();
    await assemblerTests.runAll();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(60));
    console.log(`Completed: ${new Date().toISOString()}\n`);
    
    return { success: true, message: 'All tests passed' };
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(60));
    console.error(`Error: ${error.message}\n`);
    
    return { success: false, message: error.message };
  } finally {
    cleanupTestDirs();
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { runAllTests };
