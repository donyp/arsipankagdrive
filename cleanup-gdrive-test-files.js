#!/usr/bin/env node
/**
 * Cleanup test/junk files dari Google Drive ARSIP ANKA root
 * Delete files yang tidak sesuai struktur folder
 */

const { execSync } = require('child_process');
const path = require('path');

const RCLONE_CONFIG = path.join(__dirname, 'rclone.conf');
const GDRIVE_REMOTE = 'gdrive:/ARSIP ANKA';

console.log('🧹 Cleaning up test files dari Google Drive...');
console.log(`Config: ${RCLONE_CONFIG}`);
console.log(`Remote: ${GDRIVE_REMOTE}\n`);

// Files to delete (junk/test files di root)
const filesToDelete = [
    'PPN PASAR KEMIS TEST2.pdf',
    'PPN PASAR KEMIS TEST.pdf',
    // Add more test files here if needed
];

let deletedCount = 0;
let failedCount = 0;

filesToDelete.forEach(filename => {
    const remotePath = `${GDRIVE_REMOTE}/${filename}`;
    
    try {
        console.log(`❌ Deleting: ${filename}`);
        execSync(
            `rclone delete "${remotePath}" --config="${RCLONE_CONFIG}" -v`,
            { stdio: 'pipe' }
        );
        console.log(`   ✅ Deleted successfully`);
        deletedCount++;
    } catch (err) {
        console.error(`   ⚠️  Failed: ${err.message.split('\n')[0]}`);
        failedCount++;
    }
});

console.log(`\n================================================`);
console.log(`✅ Cleanup complete: ${deletedCount} deleted, ${failedCount} failed`);
console.log(`================================================`);

// Show remaining files in root
console.log('\n📋 Remaining files in ARSIP ANKA root:');
try {
    const output = execSync(
        `rclone ls "${GDRIVE_REMOTE}" --config="${RCLONE_CONFIG}"`,
        { encoding: 'utf8' }
    );
    
    if (output.trim()) {
        console.log(output);
    } else {
        console.log('(no files in root)');
    }
} catch (err) {
    console.error('Failed to list files:', err.message);
}

process.exit(failedCount > 0 ? 1 : 0);
