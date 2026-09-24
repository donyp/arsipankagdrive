/**
 * Quick test for compression module
 * Run with: node backend/tests/compression.test.js
 */

const compression = require('../compression');

// Test data
const testPDF = Buffer.alloc(5 * 1024 * 1024, 'test data for pdf'); // 5MB test buffer
const testPNG = Buffer.alloc(10 * 1024 * 1024, 'test data for png'); // 10MB test buffer
const testSmallFile = Buffer.from('small file content');
const testJSON = Buffer.from(JSON.stringify({ test: 'data' }).repeat(1000000));

console.log('\n' + '='.repeat(60));
console.log('🧪 Compression Module Test Suite');
console.log('='.repeat(60));

// Test 1: shouldCompress decision logic
console.log('\n📋 Test 1: Compression Decision Logic');
console.log('-'.repeat(60));

const testCases = [
    { size: 500 * 1024, type: 'application/pdf', name: 'Small PDF (500KB)' },
    { size: 5 * 1024 * 1024, type: 'application/pdf', name: 'Medium PDF (5MB)' },
    { size: 10 * 1024 * 1024, type: 'application/pdf', name: 'Large PDF (10MB)' },
    { size: 25 * 1024 * 1024, type: 'application/pdf', name: 'Very Large PDF (25MB)' },
    { size: 10 * 1024 * 1024, type: 'image/jpeg', name: 'JPEG (10MB)' },
    { size: 10 * 1024 * 1024, type: 'video/mp4', name: 'MP4 Video (10MB)' },
    { size: 10 * 1024 * 1024, type: 'image/webp', name: 'WEBP (10MB)' },
    { size: 100 * 1024, type: 'text/plain', name: 'Text file (100KB)' },
];

testCases.forEach(test => {
    const decision = compression.shouldCompress(test.size, test.type);
    const emoji = decision.shouldCompress ? '✅' : '⏭️';
    console.log(`${emoji} ${test.name.padEnd(30)} → ${decision.reason}`);
});

// Test 2: Compression decision for different sizes
console.log('\n📋 Test 2: Size Threshold Analysis');
console.log('-'.repeat(60));

const sizes = [
    { bytes: 1 * 1024 * 1024, label: '1MB' },
    { bytes: 3 * 1024 * 1024, label: '3MB' },
    { bytes: 5 * 1024 * 1024, label: '5MB' },
    { bytes: 10 * 1024 * 1024, label: '10MB' },
    { bytes: 20 * 1024 * 1024, label: '20MB' },
    { bytes: 50 * 1024 * 1024, label: '50MB' },
];

sizes.forEach(s => {
    const decision = compression.shouldCompress(s.bytes, 'application/pdf');
    const emoji = decision.shouldCompress ? '🔴' : '🟢';
    console.log(`${emoji} ${s.label.padEnd(5)} → Compress: ${decision.shouldCompress ? 'YES' : 'NO'} (${decision.reason})`);
});

// Test 3: File type detection
console.log('\n📋 Test 3: File Type Classification');
console.log('-'.repeat(60));

const fileTypes = [
    { type: 'application/pdf', name: 'PDF' },
    { type: 'image/png', name: 'PNG' },
    { type: 'image/jpeg', name: 'JPEG' },
    { type: 'video/mp4', name: 'MP4' },
    { type: 'application/zip', name: 'ZIP' },
    { type: 'text/plain', name: 'Text' },
    { type: 'application/json', name: 'JSON' },
];

fileTypes.forEach(ft => {
    const decision = compression.shouldCompress(10 * 1024 * 1024, ft.type);
    const status = decision.shouldCompress ? '✅ COMPRESS' : '⏭️ SKIP';
    console.log(`${status.padEnd(15)} ${ft.name.padEnd(10)} → ${decision.reason}`);
});

// Test 4: Gzip detection
console.log('\n📋 Test 4: Gzip Magic Number Detection');
console.log('-'.repeat(60));

const normalBuffer = Buffer.from('This is normal data');
const gzipBuffer = Buffer.from([0x1f, 0x8b, 0x08, 0x00]); // Gzip magic bytes
const emptyBuffer = Buffer.alloc(0);

console.log(`✅ Gzip magic bytes [0x1f 0x8b]: ${compression.isGzipped(gzipBuffer)}`);
console.log(`✅ Normal data: ${compression.isGzipped(normalBuffer)}`);
console.log(`✅ Empty buffer: ${compression.isGzipped(emptyBuffer)}`);

// Test 5: Actual compression (async)
console.log('\n📋 Test 5: Actual Compression (Async)');
console.log('-'.repeat(60));

(async () => {
    try {
        // Test PDF compression
        console.log('\n📦 Compressing 5MB PDF buffer...');
        const pdfResult = await compression.compressFile(testPDF, 'application/pdf', 'test-invoice.pdf');
        console.log(`Result: ${pdfResult.skipped ? 'SKIPPED' : 'COMPRESSED'}`);
        if (!pdfResult.skipped) {
            console.log(`Metadata:`, JSON.stringify(pdfResult.metadata, null, 2));
        }

        // Test PNG compression
        console.log('\n📦 Compressing 10MB PNG buffer...');
        const pngResult = await compression.compressFile(testPNG, 'image/png', 'test-scan.png');
        console.log(`Result: ${pngResult.skipped ? 'SKIPPED' : 'COMPRESSED'}`);
        if (!pngResult.skipped) {
            console.log(`Metadata:`, JSON.stringify(pngResult.metadata, null, 2));
        }

        // Test small file (should skip)
        console.log('\n📦 Compressing small file...');
        const smallResult = await compression.compressFile(testSmallFile, 'text/plain', 'small.txt');
        console.log(`Result: ${smallResult.skipped ? 'SKIPPED (too small)' : 'COMPRESSED'}`);

        // Test decompression
        if (!pdfResult.skipped) {
            console.log('\n📂 Testing decompression...');
            const decompResult = await compression.decompressFile(pdfResult.compressed, 'test-invoice.pdf');
            console.log(`✅ Decompressed successfully`);
            console.log(`✅ Size match: ${decompResult.decompressed.length === testPDF.length}`);
            console.log(`✅ Content match: ${Buffer.compare(decompResult.decompressed, testPDF) === 0}`);
        }

        // Test gzip detection
        console.log('\n📂 Testing decompressIfNeeded...');
        if (!pdfResult.skipped) {
            const smartDecompress = await compression.decompressIfNeeded(pdfResult.compressed, 'test.pdf.gz');
            console.log(`✅ Smart decompression worked: ${!smartDecompress.wasCompressed ? 'Detected gzip' : 'Error'}`);
        }

        // Test compression stats
        console.log('\n📊 Compression Configuration');
        console.log('-'.repeat(60));
        const stats = compression.getCompressionStats();
        console.log(JSON.stringify(stats, null, 2));

    } catch (err) {
        console.error('\n❌ Test failed:', err.message);
        process.exit(1);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All compression tests completed!');
    console.log('='.repeat(60) + '\n');
    process.exit(0);
})();
