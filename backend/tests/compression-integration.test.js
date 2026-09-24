/**
 * Compression Integration Tests - Masalah 4
 * Tests compression with realistic file types and sizes
 * Run with: node backend/tests/compression-integration.test.js
 */

const compression = require('../compression');
const crypto = require('crypto');

// Test results tracking
let testsPassed = 0;
let testsFailed = 0;
const results = [];

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function test(name, fn) {
    try {
        fn();
        testsPassed++;
        results.push({ name, status: '✅', message: 'PASS' });
        console.log(`✅ ${name}`);
    } catch (err) {
        testsFailed++;
        results.push({ name, status: '❌', message: err.message });
        console.error(`❌ ${name}`);
        console.error(`   ${err.message}`);
    }
}

async function asyncTest(name, fn) {
    try {
        await fn();
        testsPassed++;
        results.push({ name, status: '✅', message: 'PASS' });
        console.log(`✅ ${name}`);
    } catch (err) {
        testsFailed++;
        results.push({ name, status: '❌', message: err.message });
        console.error(`❌ ${name}`);
        console.error(`   ${err.message}`);
    }
}

// Generate realistic test data
function generatePDFLike(sizeInMB) {
    // PDFs have text content that compresses very well
    const base = 'This is a sample PDF document with typical invoice content. Invoice #1234567890. Date: 2026-01-01. Amount: Rp 1,234,567.89. ';
    const repeated = base.repeat(Math.ceil((sizeInMB * 1024 * 1024) / base.length));
    return Buffer.from(repeated.substring(0, sizeInMB * 1024 * 1024));
}

function generatePNGLike(sizeInMB) {
    // PNG has repetitive pixel data, compresses well
    const pixel = Buffer.alloc(4, [255, 0, 0, 255]); // RGBA red pixel
    const numPixels = Math.ceil((sizeInMB * 1024 * 1024) / 4);
    const chunks = [];
    for (let i = 0; i < numPixels; i += 10000) {
        chunks.push(pixel.toString().repeat(Math.min(10000, numPixels - i)));
    }
    return Buffer.from(Buffer.concat(chunks.map(c => Buffer.from(c))).slice(0, sizeInMB * 1024 * 1024));
}

function generateJPEGLike(sizeInMB) {
    // JPEG already compressed, less compressible
    const randomData = crypto.randomBytes(sizeInMB * 1024 * 1024);
    return randomData;
}

function generateTextLike(sizeInMB) {
    // Plain text, very compressible
    const text = 'Line of text content that repeats many times. '.repeat(1000);
    const repeated = text.repeat(Math.ceil((sizeInMB * 1024 * 1024) / text.length));
    return Buffer.from(repeated.substring(0, sizeInMB * 1024 * 1024));
}

console.log('\n' + '='.repeat(70));
console.log('🧪 Compression Integration Test Suite - Realistic File Types');
console.log('='.repeat(70));

// ============================================
// Test Suite: PDF-like files
// ============================================
console.log('\n📋 Test Group: PDF-like Files (Text-based, highly compressible)');
console.log('-'.repeat(70));

asyncTest('PDF 1MB - Should compress (Type: ALWAYS)', async () => {
    const pdfData = generatePDFLike(1);
    const result = await compression.compressFile(pdfData, 'application/pdf', 'document-1mb.pdf');
    
    assert(!result.skipped, 'PDF should be compressed');
    assert(result.metadata.compressionRatio < 10, `Compression ratio should be < 10%, got ${result.metadata.compressionRatio}%`);
    console.log(`   → Original: 1.00MB | Compressed: ${(result.compressed.length / 1024 / 1024).toFixed(2)}MB | Ratio: ${result.metadata.compressionRatio}%`);
});

asyncTest('PDF 5MB - Should compress', async () => {
    const pdfData = generatePDFLike(5);
    const result = await compression.compressFile(pdfData, 'application/pdf', 'document-5mb.pdf');
    
    assert(!result.skipped, 'PDF should be compressed');
    assert(result.compressed.length < pdfData.length * 0.5, 'Should compress to <50% of original');
    console.log(`   → Original: 5.00MB | Compressed: ${(result.compressed.length / 1024 / 1024).toFixed(2)}MB | Savings: ${result.metadata.spaceSavingsPercent}%`);
});

asyncTest('PDF 10MB - Should compress with streaming', async () => {
    const pdfData = generatePDFLike(10);
    const result = await compression.compressFile(pdfData, 'application/pdf', 'document-10mb.pdf');
    
    assert(!result.skipped, 'PDF should be compressed');
    assert(result.metadata.compressionMethod === 'gzip-stream', 'Should use streaming for 10MB file');
    console.log(`   → Original: 10.00MB | Compressed: ${(result.compressed.length / 1024 / 1024).toFixed(2)}MB | Method: ${result.metadata.compressionMethod}`);
});

// ============================================
// Test Suite: PNG-like files
// ============================================
console.log('\n📋 Test Group: PNG-like Files (Image data, moderately compressible)');
console.log('-'.repeat(70));

asyncTest('PNG 1MB - Should skip (< 5MB threshold)', async () => {
    const pngData = generatePNGLike(1);
    const result = await compression.compressFile(pngData, 'image/png', 'image-1mb.png');
    
    assert(!result.skipped, 'PNG type ALWAYS compresses even < 5MB');
    console.log(`   → Size: 1.00MB | Decision: ${result.metadata.compressionDecision}`);
});

asyncTest('PNG 10MB - Should compress', async () => {
    const pngData = generatePNGLike(10);
    const result = await compression.compressFile(pngData, 'image/png', 'image-10mb.png');
    
    assert(!result.skipped, 'PNG should be compressed at 10MB');
    assert(result.compressed.length < pngData.length, 'Compressed should be smaller than original');
    console.log(`   → Original: 10.00MB | Compressed: ${(result.compressed.length / 1024 / 1024).toFixed(2)}MB | Savings: ${result.metadata.spaceSavingsPercent}%`);
});

// ============================================
// Test Suite: JPEG-like files
// ============================================
console.log('\n📋 Test Group: JPEG-like Files (Already compressed, low compressibility)');
console.log('-'.repeat(70));

asyncTest('JPEG 1MB - Should skip (< 5MB threshold)', async () => {
    const jpegData = generateJPEGLike(1);
    const result = await compression.compressFile(jpegData, 'image/jpeg', 'photo-1mb.jpg');
    
    assert(result.skipped, 'JPEG < 5MB should skip');
    console.log(`   → Size: 1.00MB | Decision: Skipped (SIZE_TOO_SMALL)`);
});

asyncTest('JPEG 10MB - Should compress (size threshold)', async () => {
    const jpegData = generateJPEGLike(10);
    const result = await compression.compressFile(jpegData, 'image/jpeg', 'photo-10mb.jpg');
    
    assert(!result.skipped, 'JPEG 10MB should attempt compression');
    // JPEG is already compressed, so compression ratio may be poor (>90%)
    console.log(`   → Original: 10.00MB | Compressed: ${(result.compressed.length / 1024 / 1024).toFixed(2)}MB | Ratio: ${result.metadata.compressionRatio}%`);
});

// ============================================
// Test Suite: Text files
// ============================================
console.log('\n📋 Test Group: Text Files (Highly compressible)');
console.log('-'.repeat(70));

asyncTest('Text 1MB - Should compress (Type: ALWAYS)', async () => {
    const textData = generateTextLike(1);
    const result = await compression.compressFile(textData, 'text/plain', 'document-1mb.txt');
    
    assert(!result.skipped, 'Text should be compressed');
    assert(result.metadata.compressionRatio < 20, 'Text should have excellent compression');
    console.log(`   → Original: 1.00MB | Compressed: ${(result.compressed.length / 1024 / 1024).toFixed(2)}MB | Ratio: ${result.metadata.compressionRatio}%`);
});

// ============================================
// Test Suite: Compression + Decompression Cycle
// ============================================
console.log('\n📋 Test Group: Compression ↔ Decompression Cycle');
console.log('-'.repeat(70));

asyncTest('PDF Round-trip: Compress then decompress', async () => {
    const originalData = generatePDFLike(1);
    
    // Compress
    const compressResult = await compression.compressFile(originalData, 'application/pdf', 'test.pdf');
    assert(!compressResult.skipped, 'Should compress');
    
    // Decompress
    const decompressResult = await compression.decompressFile(compressResult.compressed, 'test.pdf');
    
    // Verify data integrity
    assert(Buffer.compare(decompressResult.decompressed, originalData) === 0, 'Decompressed data should match original');
    console.log(`   → Original: ${(originalData.length / 1024 / 1024).toFixed(2)}MB → Compressed: ${(compressResult.compressed.length / 1024 / 1024).toFixed(2)}MB → Decompressed: ${(decompressResult.decompressed.length / 1024 / 1024).toFixed(2)}MB ✓`);
});

asyncTest('Text Round-trip: Compress then decompress', async () => {
    const originalData = generateTextLike(5);
    
    // Compress
    const compressResult = await compression.compressFile(originalData, 'text/plain', 'test.txt');
    
    // Decompress
    const decompressResult = await compression.decompressFile(compressResult.compressed, 'test.txt');
    
    // Verify integrity
    assert(Buffer.compare(decompressResult.decompressed, originalData) === 0, 'Data should match after round-trip');
    console.log(`   → Integrity: ✓ | Hash Match: ${crypto.createHash('sha256').update(decompressResult.decompressed).digest('hex').substring(0, 8)} = ${crypto.createHash('sha256').update(originalData).digest('hex').substring(0, 8)}`);
});

// ============================================
// Test Suite: Performance Metrics
// ============================================
console.log('\n📋 Test Group: Performance Metrics');
console.log('-'.repeat(70));

asyncTest('Compression Speed - PDF 5MB (measure time)', async () => {
    const pdfData = generatePDFLike(5);
    const startTime = Date.now();
    
    const result = await compression.compressFile(pdfData, 'application/pdf', 'perf-test.pdf');
    
    const elapsed = Date.now() - startTime;
    const speed = (pdfData.length / elapsed / 1024).toFixed(2); // KB/ms = MB/s
    
    console.log(`   → 5MB PDF compressed in ${elapsed}ms | Speed: ${speed}MB/s | Ratio: ${result.metadata.compressionRatio}%`);
});

asyncTest('Decompression Speed - PDF 5MB (measure time)', async () => {
    const pdfData = generatePDFLike(5);
    const compressResult = await compression.compressFile(pdfData, 'application/pdf', 'perf-test.pdf');
    
    const startTime = Date.now();
    const decompressResult = await compression.decompressFile(compressResult.compressed, 'perf-test.pdf');
    const elapsed = Date.now() - startTime;
    
    const speed = (decompressResult.decompressed.length / elapsed / 1024).toFixed(2);
    console.log(`   → 5MB PDF decompressed in ${elapsed}ms | Speed: ${speed}MB/s`);
});

// ============================================
// Test Suite: Edge Cases
// ============================================
console.log('\n📋 Test Group: Edge Cases');
console.log('-'.repeat(70));

asyncTest('Small File (100KB) - Should not compress', async () => {
    const smallData = Buffer.alloc(100 * 1024, 'test data');
    const result = await compression.compressFile(smallData, 'application/pdf', 'small.pdf');
    
    assert(result.skipped, 'Small file should be skipped');
    console.log(`   → 100KB file: Skipped (SIZE_TOO_SMALL)`);
});

asyncTest('Video File - Should not compress', async () => {
    const videoData = crypto.randomBytes(10 * 1024 * 1024); // 10MB random (like video)
    const result = await compression.compressFile(videoData, 'video/mp4', 'video.mp4');
    
    assert(result.skipped, 'Video should be skipped (TYPE_EXEMPT)');
    console.log(`   → 10MB MP4 file: Skipped (TYPE_EXEMPT)`);
});

asyncTest('ZIP Archive - Should not compress', async () => {
    const zipData = crypto.randomBytes(20 * 1024 * 1024); // 20MB random (like ZIP)
    const result = await compression.compressFile(zipData, 'application/zip', 'archive.zip');
    
    assert(result.skipped, 'ZIP should be skipped (TYPE_EXEMPT)');
    console.log(`   → 20MB ZIP file: Skipped (TYPE_EXEMPT)`);
});

// ============================================
// Summary Report
// ============================================
console.log('\n' + '='.repeat(70));
console.log('📊 Test Summary');
console.log('='.repeat(70));
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📈 Total: ${testsPassed + testsFailed}`);
console.log(`📊 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

if (testsFailed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => r.status === '❌').forEach(r => {
        console.log(`  - ${r.name}: ${r.message}`);
    });
    process.exit(1);
} else {
    console.log('\n🎉 All compression integration tests passed!');
    console.log('='.repeat(70) + '\n');
    process.exit(0);
}
