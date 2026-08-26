// ============================================================
// Local Storage - For development/testing without Alist
// ============================================================

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || './local_files';

// Ensure directory exists
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`[LocalStorage] Created directory: ${dirPath}`);
    }
}

// Convert storage path to local file path
function getLocalPath(storagePath) {
    // storagePath format: /ARSIP ANKA/zona-1/toko-balaraja/INVOICE/NON/filename.pdf
    // Convert to: ./local_files/zona-1/toko-balaraja/INVOICE/NON/filename.pdf
    // Remove leading slash and base path prefix
    let relativePath = storagePath.startsWith('/') ? storagePath.substring(1) : storagePath;
    // Remove '/ARSIP ANKA/' prefix (handles both spaces and escaped versions)
    relativePath = relativePath.replace(/^ARSIP\s+ANKA\//, '');
    // Fallback: if still has old /arsip/ prefix, remove it (for backward compatibility)
    relativePath = relativePath.replace(/^arsip\//, '');
    return path.join(LOCAL_STORAGE_PATH, relativePath);
}

// Create mock test files for each zone
function createMockFiles() {
    ensureDir(LOCAL_STORAGE_PATH);
    
    // Create files for ALL zones (1-20 based on database)
    const zones = [];
    // Add specific zones
    zones.push('zona-1', 'zona-2', 'zona-3a', 'zona-3b', 'zona-4', 'zona-5', 'zona-6a', 'zona-6b');
    zones.push('zona-7', 'zona-8', 'zona-9', 'zona-10', 'zona-11', 'zona-12', 'zona-13', 'zona-14', 'zona-15', 'zona-16', 'zona-17', 'zona-99');
    
    const tokos = [
        'toko-balaraja', 'toko-cianjur', 'toko-serang-timur', 'toko-pasarkemis',
        'toko-bitung', 'toko-cilegon', 'toko-cipondoh', 'toko-kutabumi'
    ];
    const categories = ['INVOICE', 'INVOICE/NON', 'INVOICE/PPN', 'BUKTI PIUTANG'];
    
    zones.forEach(zona => {
        tokos.forEach(toko => {
            categories.forEach(category => {
                const dirPath = path.join(LOCAL_STORAGE_PATH, zona, toko, category);
                ensureDir(dirPath);
                
                // Create 2 sample PDF files per location
                for (let i = 1; i <= 2; i++) {
                    const fileName = `Sample_${category.replace(/\//g, '_')}_${i}.pdf`;
                    const filePath = path.join(dirPath, fileName);
                    
                    if (!fs.existsSync(filePath)) {
                        // Create a VALID and COMPLETE PDF file
                        // This uses proper PDF structure that all viewers can read
                        const pdfContent = `%PDF-1.1
%âãÏÓ
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 616 >>
stream
BT
/F1 24 Tf
50 750 Td
(${zona}) Tj
0 -30 Td
(${toko}) Tj
0 -30 Td
(${category}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000015 00000 n 
0000000074 00000 n 
0000000133 00000 n 
0000000281 00000 n 
0000000950 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
1047
%%EOF`;
                        
                        fs.writeFileSync(filePath, pdfContent);
                        console.log(`[LocalStorage] Created mock PDF: ${filePath}`);
                    }
                }
            });
        });
    });
}

module.exports = {
    // Get readable stream for file
    async getStream(storagePath) {
        try {
            const localPath = getLocalPath(storagePath);
            
            if (!fs.existsSync(localPath)) {
                console.log(`[LocalStorage] File not found: ${localPath}`);
                console.log(`[LocalStorage] Serving sample file as fallback...`);
                
                // Fallback: serve a sample file based on category from storage path
                // Extract category from path: /ARSIP ANKA/zona-1/toko-balaraja/INVOICE/NON/filename.pdf
                const pathMatch = storagePath.match(/\/zona-(\w+)\/([^/]+)\/([^/]+(?:\/[^/]+)?)\//);
                if (pathMatch) {
                    const [, zonaNum, toko, category] = pathMatch;
                    const zona = `zona-${zonaNum}`;
                    const sampleFile = path.join(LOCAL_STORAGE_PATH, zona, toko, category, `Sample_${category.replace(/\//g, '_')}_1.pdf`);
                    
                    if (fs.existsSync(sampleFile)) {
                        console.log(`[LocalStorage] ✓ Serving sample: ${sampleFile}`);
                        return fs.createReadStream(sampleFile);
                    }
                }
                
                // Final fallback: any sample file
                const finalFallback = path.join(LOCAL_STORAGE_PATH, 'zona-1', 'toko-balaraja', 'INVOICE', 'Sample_INVOICE_1.pdf');
                if (fs.existsSync(finalFallback)) {
                    console.log(`[LocalStorage] ✓ Serving final fallback: ${finalFallback}`);
                    return fs.createReadStream(finalFallback);
                }
                
                throw new Error(`File not found and no fallback available: ${localPath}`);
            }
            
            console.log(`[LocalStorage] Streaming: ${localPath}`);
            return fs.createReadStream(localPath);
        } catch (err) {
            console.error('[LocalStorage] Stream error:', err.message);
            throw err;
        }
    },
    
    // Check if file exists
    fileExists(storagePath) {
        const localPath = getLocalPath(storagePath);
        return fs.existsSync(localPath);
    },
    
    // Create read stream
    createReadStream(storagePath) {
        const localPath = getLocalPath(storagePath);
        return fs.createReadStream(localPath);
    },
    
    // Upload file directly to local storage
    async uploadDirect(fileBuffer, originalName, storagePath) {
        try {
            const localPath = getLocalPath(storagePath);
            const dirPath = path.dirname(localPath);
            
            // Ensure directory exists
            ensureDir(dirPath);
            
            // Write file
            fs.writeFileSync(localPath, fileBuffer);
            console.log(`[LocalStorage] File uploaded: ${localPath}`);
            
            return { success: true, path: localPath };
        } catch (err) {
            console.error('[LocalStorage] Upload error:', err.message);
            throw err;
        }
    },
    
    // Download file from local storage as buffer
    async downloadBuffer(storagePath) {
        try {
            const localPath = getLocalPath(storagePath);
            
            if (!fs.existsSync(localPath)) {
                throw new Error(`File not found: ${localPath}`);
            }
            
            console.log(`[LocalStorage] Reading buffer: ${localPath}`);
            return fs.readFileSync(localPath);
        } catch (err) {
            console.error('[LocalStorage] Download buffer error:', err.message);
            throw err;
        }
    },
    
    // Initialize mock files for testing
    initializeMockFiles() {
        createMockFiles();
    },

    // Delete file from local storage
    deleteFile(storagePath) {
        try {
            const localPath = getLocalPath(storagePath);
            if (fs.existsSync(localPath)) {
                fs.unlinkSync(localPath);
                console.log(`[LocalStorage] Deleted: ${localPath}`);
                return true;
            } else {
                console.warn(`[LocalStorage] File not found to delete: ${localPath}`);
                return false;
            }
        } catch (err) {
            console.error('[LocalStorage] Delete error:', err.message);
            throw err;
        }
    }
};
