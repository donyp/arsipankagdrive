// ============================================================
// Invoice Hijau (Green Invoice) Rename Endpoints
// Extract No. Invoice from PDF and rename to invoice number
// ============================================================

const busboy = require('busboy');
const fs = require('fs');
const path = require('path');
const os = require('os');
let pdfParse;
let Tesseract;
let pdfjs;

// Lazy-load dependencies
async function initPdfParse() {
    if (!pdfParse) {
        try {
            pdfParse = require('pdf-parse');
        } catch (err) {
            console.error('[Rename Invoice Hijau] pdf-parse not installed');
        }
    }
    return pdfParse;
}

async function initTesseract() {
    if (!Tesseract) {
        try {
            Tesseract = require('tesseract.js');
            console.log('[Rename Invoice Hijau] ✅ Tesseract.js loaded');
        } catch (err) {
            console.error('[Rename Invoice Hijau] Tesseract.js not installed:', err.message);
        }
    }
    return Tesseract;
}

async function initPdfjs() {
    if (!pdfjs) {
        try {
            pdfjs = require('pdfjs-dist');
            console.log('[Rename Invoice Hijau] ✅ PDF.js loaded');
        } catch (err) {
            console.error('[Rename Invoice Hijau] PDF.js not installed:', err.message);
        }
    }
    return pdfjs;
}

// Extract text via OCR from PDF using pdf2pic and Tesseract
async function extractTextViaOCR(pdfBuffer) {
    try {
        console.log('[Rename Invoice Hijau] OCR: Starting PDF-to-image conversion...');
        
        // Try pdf2pic first for better PDF handling
        let imagePaths = [];
        try {
            const pdf2pic = require('pdf2pic');
            const options = {
                density: 100,      // DPI - lower for speed, higher for quality
                saveFilename: 'invoice-page',
                savePath: require('os').tmpdir(),
                format: 'png',
                width: 1200,
                height: 1600
            };
            
            // Write PDF to temp file
            const fs = require('fs');
            const path = require('path');
            const tmpDir = require('os').tmpdir();
            const tmpFile = path.join(tmpDir, `pdf-${Date.now()}.pdf`);
            
            fs.writeFileSync(tmpFile, pdfBuffer);
            console.log('[Rename Invoice Hijau] OCR: PDF written to temp file:', tmpFile);
            
            // Convert PDF to images (process only first 2 pages for speed)
            try {
                const converter = pdf2pic.fromFilePath(tmpFile, options);
                const result = await converter.bulk(-1, { start: 1, end: 2 });
                
                if (result && result.length > 0) {
                    imagePaths = result.map(r => r.path);
                    console.log(`[Rename Invoice Hijau] OCR: Converted ${imagePaths.length} pages to images`);
                } else {
                    console.warn('[Rename Invoice Hijau] OCR: No pages converted');
                }
                
                // Clean up temp PDF
                try { fs.unlinkSync(tmpFile); } catch (e) {}
            } catch (convErr) {
                console.warn('[Rename Invoice Hijau] OCR: pdf2pic conversion error:', convErr.message);
                try { fs.unlinkSync(tmpFile); } catch (e) {}
                throw convErr;
            }
        } catch (pdf2picErr) {
            console.warn('[Rename Invoice Hijau] OCR: pdf2pic not available or failed:', pdf2picErr.message);
            // Fallback: try using sharp with PDF buffer directly (limited support)
        }
        
        if (imagePaths.length === 0) {
            console.warn('[Rename Invoice Hijau] OCR: No images to process');
            return null;
        }
        
        // Run Tesseract OCR on each image
        const Tesseract = require('tesseract.js');
        console.log('[Rename Invoice Hijau] OCR: Loading Tesseract worker...');
        
        let allText = '';
        for (const imagePath of imagePaths) {
            try {
                console.log(`[Rename Invoice Hijau] OCR: Processing image: ${imagePath}`);
                
                const result = await Tesseract.recognize(
                    imagePath,
                    'ind+eng',  // Indonesian + English
                    {
                        logger: m => {
                            if (m.status === 'recognizing text') {
                                console.log(`[Rename Invoice Hijau] OCR: Progress ${(m.progress * 100).toFixed(0)}%`);
                            }
                        }
                    }
                );
                
                const text = result.data.text;
                console.log(`[Rename Invoice Hijau] OCR: Extracted ${text.length} characters from image`);
                allText += '\n' + text;
                
                // Clean up
                try { require('fs').unlinkSync(imagePath); } catch (e) {}
            } catch (ocrErr) {
                console.error('[Rename Invoice Hijau] OCR: Tesseract processing error:', ocrErr.message);
                continue;
            }
        }
        
        if (allText && allText.length > 50) {
            console.log(`[Rename Invoice Hijau] OCR: ✅ Successfully extracted ${allText.length} total characters`);
            return allText;
        } else {
            console.warn('[Rename Invoice Hijau] OCR: Extracted text too short or empty');
            return null;
        }

    } catch (err) {
        console.error('[Rename Invoice Hijau] OCR extraction error:', err.message);
        return null;
    }
}

module.exports = (app, supabase) => {
    // ============================================
    // GET /api/invoice/rename-invoice-hijau/status
    // Check if PDF processing is ready
    // ============================================
    app.get('/api/invoice/rename-invoice-hijau/status', (req, res) => {
        try {
            require('pdf-parse');
            res.json({ ready: true, message: 'PDF parsing ready' });
        } catch (err) {
            res.json({ ready: false, message: 'PDF parsing not available' });
        }
    });

    // ============================================
    // POST /api/invoice/rename-invoice-hijau
    // Extract No. Invoice from PDF and prepare renamed file
    // ============================================
    app.post('/api/invoice/rename-invoice-hijau', async (req, res) => {
        let responsesSent = false;
        
        const sendResponse = (status, data) => {
            if (!responsesSent) {
                responsesSent = true;
                res.status(status).json(data);
            }
        };

        try {
            console.log('[Rename Invoice Hijau] POST request received');
            console.log('[Rename Invoice Hijau] Content-Type:', req.headers['content-type']);

            // Validate content-type
            if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
                return sendResponse(400, { error: 'Content-Type must be multipart/form-data' });
            }

            // Parse multipart form data
            let bb;
            try {
                bb = busboy({ headers: req.headers });
            } catch (bberr) {
                console.error('[Rename Invoice Hijau] Busboy init error:', bberr.message);
                return sendResponse(400, { error: 'Error initializing form parser: ' + bberr.message });
            }

            let fileData = null;
            let fileName = null;
            let processingStarted = false;

            bb.on('file', (fieldname, file, info) => {
                console.log(`[Rename Invoice Hijau] File field: ${fieldname}, filename: ${info.filename}`);
                fileName = info.filename;

                const chunks = [];
                file.on('data', (data) => {
                    chunks.push(data);
                });

                file.on('end', () => {
                    try {
                        fileData = Buffer.concat(chunks);
                        console.log(`[Rename Invoice Hijau] File received: ${fileName}, size: ${fileData.length} bytes`);
                    } catch (err) {
                        console.error('[Rename Invoice Hijau] Buffer concat error:', err.message);
                    }
                });

                file.on('error', (err) => {
                    console.error('[Rename Invoice Hijau] File stream error:', err.message);
                });
            });

            bb.on('error', (err) => {
                console.error('[Rename Invoice Hijau] Busboy error:', err);
                return sendResponse(400, { error: 'Error parsing form data: ' + err.message });
            });

            bb.on('close', async () => {
                if (processingStarted) return;
                processingStarted = true;

                try {
                    if (!fileData || !fileName) {
                        console.error('[Rename Invoice Hijau] Missing file data');
                        return sendResponse(400, { error: 'File PDF wajib diupload' });
                    }

                    console.log(`[Rename Invoice Hijau] Processing: ${fileName}`);

                    // Initialize pdf-parse
                    const pdf = await initPdfParse();
                    
                    if (!pdf) {
                        console.error('[Rename Invoice Hijau] PDF parser not available');
                        return sendResponse(503, { error: 'PDF parser not available - sistem sedang diinisialisasi' });
                    }

                    // Parse PDF
                    let textContent = '';
                    try {
                        const pdfData = await pdf(fileData);
                        textContent = pdfData.text || '';
                        console.log(`[Rename Invoice Hijau] PDF text extracted, length: ${textContent.length}`);
                    } catch (pdfErr) {
                        console.error('[Rename Invoice Hijau] PDF text extraction failed:', pdfErr.message);
                        textContent = '';
                    }

                    // If PDF text extraction failed or returned minimal text, try OCR
                    if (!textContent || textContent.length < 50) {
                        console.log('[Rename Invoice Hijau] ⚠️  PDF text too short or empty, starting automatic OCR...');
                        
                        try {
                            const ocrText = await extractTextViaOCR(fileData);
                            if (ocrText && ocrText.length > 20) {
                                textContent = ocrText;
                                console.log(`[Rename Invoice Hijau] ✅ OCR extracted ${textContent.length} characters`);
                            } else {
                                console.warn('[Rename Invoice Hijau] OCR returned minimal text or failed');
                            }
                        } catch (ocrErr) {
                            console.error('[Rename Invoice Hijau] OCR processing error:', ocrErr.message);
                            console.error('[Rename Invoice Hijau] Stack:', ocrErr.stack);
                            // Continue anyway - might still have some text from pdf-parse
                        }
                    }

                    // Extract No. Invoice using priority patterns with confidence matching
                    let noInvoice = null;
                    let confidence = 'low';

                    // Remove common PDF artifacts and normalize spaces
                    const cleanText = textContent.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
                    
                    console.log(`[Rename Invoice Hijau] Cleaned text (first 1000 chars):\n${cleanText.substring(0, 1000)}`);
                    console.log(`[Rename Invoice Hijau] ===== EXTRACTION SUMMARY =====`);
                    console.log(`[Rename Invoice Hijau] Raw text length: ${textContent.length}`);
                    console.log(`[Rename Invoice Hijau] First 500 chars:\n${textContent.substring(0, 500)}`);
                    console.log(`[Rename Invoice Hijau] ============================`);

                    // Extract any 12+ digit number (invoice numbers are typically long)
                    // Try multiple patterns in priority order
                    
                    // Pattern 1: "No. Invoice: XXXXXX..." or "No Invoice: XXXXXX..."
                    let pattern1 = /No\.?\s*Invoice\s*[:=]?\s*([0-9]{12,})/gi;
                    let matches1 = cleanText.match(pattern1);
                    let priority1Number = null;
                    
                    if (matches1 && matches1.length > 0) {
                        console.log(`[Rename Invoice Hijau] Pattern1 raw matches: ${matches1.join(' | ')}`);
                        for (let match of matches1) {
                            const numberMatch = match.match(/([0-9]+)/g);
                            if (numberMatch && numberMatch.join('').length >= 12) {
                                priority1Number = numberMatch.join('');
                                console.log(`[Rename Invoice Hijau] Priority 1 (No. Invoice :) found: ${priority1Number}`);
                                break;
                            }
                        }
                    }

                    // Pattern 2: Just find any 12-15 digit continuous number
                    let pattern2 = /\b([0-9]{12,15})\b/g;
                    let matches2 = cleanText.match(pattern2);
                    let priority2Number = null;
                    
                    if (matches2 && matches2.length > 0) {
                        console.log(`[Rename Invoice Hijau] Pattern2 raw matches: ${matches2.join(' | ')}`);
                        // Take the first 12-15 digit number found
                        priority2Number = matches2[0];
                        console.log(`[Rename Invoice Hijau] Priority 2 (12-15 digit number): ${priority2Number}`);
                    }

                    // Matching logic - use first priority that finds something
                    if (priority1Number) {
                        noInvoice = priority1Number;
                        console.log(`[Rename Invoice Hijau] Selected: Priority 1 - ${noInvoice}`);
                    } else if (priority2Number) {
                        noInvoice = priority2Number;
                        console.log(`[Rename Invoice Hijau] Selected: Priority 2 - ${noInvoice}`);
                    }

                    // If no invoice found, return error - but OCR should have gotten it
                    if (!noInvoice) {
                        console.warn('[Rename Invoice Hijau] No invoice number found even after OCR');
                        return sendResponse(400, {
                            success: false,
                            error: 'Nomor Invoice tidak ditemukan',
                            details: 'Meski sudah diproses dengan OCR, nomor invoice tidak terdeteksi dalam PDF ini. File mungkin kualitas sangat rendah atau tidak memiliki informasi invoice yang jelas.'
                        });
                    }

                    // Prepare renamed filename
                    const renamedFileName = `${noInvoice}.pdf`;

                    console.log(`[Rename Invoice Hijau] Extracted No. Invoice: ${noInvoice}`);
                    console.log(`[Rename Invoice Hijau] New filename: ${renamedFileName}`);

                    // Return success with extracted data
                    sendResponse(200, {
                        success: true,
                        originalFileName: fileName,
                        renamedFileName: renamedFileName,
                        noInvoice: noInvoice,
                        fileData: fileData.toString('base64'), // Send as base64 for download
                        message: 'No. Invoice berhasil diextract'
                    });

                } catch (err) {
                    console.error('[Rename Invoice Hijau] Processing error:', err.message, err.stack);
                    return sendResponse(500, { 
                        error: 'Error processing PDF: ' + err.message 
                    });
                }
            });

            // Pipe request to busboy
            req.pipe(bb);

        } catch (error) {
            console.error('[Rename Invoice Hijau] Endpoint error:', error.message, error.stack);
            sendResponse(500, { error: 'Server error', details: error.message });
        }
    });
};
