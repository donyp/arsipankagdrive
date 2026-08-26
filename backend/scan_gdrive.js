require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

const RCLONE_CONFIG = path.join(__dirname, 'rclone.conf');

function scanGdrive() {
    try {
        console.log('📊 SCANNING GOOGLE DRIVE FOR PDF FILES...\n');
        
        const cmd = `rclone lsjson "gdrive:/ARSIP ANKA" --config "${RCLONE_CONFIG}" --recursive`;
        console.log('Running: rclone lsjson gdrive:/ARSIP ANKA --recursive\n');
        
        const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
        const files = JSON.parse(output);
        
        const pdfFiles = files.filter(f => !f.IsDir && f.Name.toLowerCase().endsWith('.pdf'));
        
        console.log(`📁 Total items in ARSIP ANKA: ${files.length}`);
        console.log(`📄 PDF files found: ${pdfFiles.length}\n`);
        
        if (pdfFiles.length > 0) {
            console.log('PDF FILES:');
            pdfFiles.forEach((f, i) => {
                console.log(`  ${i+1}. ${f.Name}`);
                console.log(`     Path: ${f.Path || '(no path)'}`);
                console.log(`     Size: ${(f.Size / 1024).toFixed(1)} KB\n`);
            });
        } else {
            console.log('❌ No PDF files found in ARSIP ANKA');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

scanGdrive();
