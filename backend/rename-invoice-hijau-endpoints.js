// ============================================================
// Invoice Hijau (Green Invoice) Rename Endpoints
// Extract No. Invoice from PDF and rename to invoice number
// ============================================================

const busboy = require('busboy');
const fs = require('fs');
const path = require('path');
const os = require('os');
let pdfParse;
let TesseractModule;
let pdfjs;
let tesseractWorker = null;
let tesseractWorkerInitialized = false;

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

// Initialize Tesseract worker with proper lang pack handling
async function initTesseractWorker() {
    if (tesseractWorkerInitialized && tesseractWorker) {
        return tesseractWorker;
    }
    
    try {
        if (!TesseractModule) {
            TesseractModule = require('tesseract.js');
            console.log('[Rename Invoice Hijau] ✅ Tesseract.js module loaded');
        }
        
        console.log('[Rename Invoice Hijau] Initializing Tesseract worker...');
        
        // Create worker - Tesseract.js v5 expects: createWorker(langs, oem, options, config)
        // Pass empty string for langs since we'll use reinitialize() to set it
        tesseractWorker = await TesseractModule.createWorker(
            '',  // langs - will be set by reinitialize()
            TesseractModule.OEM.LSTM_ONLY,  // oem
            {
                langPath: 'https://tessdata.projectnaptha.com/4.0_best_int',  // LSTM-only path (has _int suffix)
                corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@4.5.0/tesseract-core.wasm.js'
            }
        );
        
        console.log('[Rename Invoice Hijau] ✅ Tesseract worker created');
        
        // Tesseract.js v5 API: use reinitialize() instead of initialize()
        // initialize() and loadLanguage() are both deprecated in v5
        await tesseractWorker.reinitialize('ind');
        console.log('[Rename Invoice Hijau] ✅ Tesseract worker initialized with Indonesian');
        
        tesseractWorkerInitialized = true;
        return tesseractWorker;
        
    } catch (err) {
        console.error('[Rename Invoice Hijau] Tesseract worker initialization failed:', err.message);
        console.error('[Rename Invoice Hijau] Stack:', err.stack);
        tesseractWorker = null;
        tesseractWorkerInitialized = false;
        throw err;
    }
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

// Extract text via OCR from PDF using pdf2pic + Tesseract
async function extractTextViaOCR(pdfBuffer) {
    const fs = require('fs');
    const path = require('path');
    const tmpDir = require('os').tmpdir();
    
    let tmpPdfFile = null;
    let imagePaths = [];
    let worker = null;
    
    try {
        console.log('[Rename Invoice Hijau] OCR: Starting OCR process with pdf2pic + Tesseract...');
        
        // Step 1: Write PDF to temp file (pdf2pic needs file path, not buffer)
        tmpPdfFile = path.join(tmpDir, `invoice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.pdf`);
        fs.writeFileSync(tmpPdfFile, pdfBuffer);
        console.log(`[Rename Invoice Hijau] OCR: PDF written to ${tmpPdfFile} (${pdfBuffer.length} bytes)`);
        
        // Step 2: Verify PDF file exists before conversion
        if (!fs.existsSync(tmpPdfFile)) {
            console.error('[Rename Invoice Hijau] OCR: Temp PDF file not created');
            return null;
        }
        
        // Step 3: Convert PDF to images using pdf2pic
        console.log('[Rename Invoice Hijau] OCR: Converting PDF to images (pdf2pic)...');
        const pdf2pic = require('pdf2pic');
        const options = {
            density: 150,           // DPI for better OCR quality
            saveFilename: 'page',
            savePath: tmpDir,
            format: 'png',
            width: 1600,            // Higher resolution for OCR accuracy
            height: 2200,
            preserveAspectRatio: true
        };
        
        let result = null;
        try {
            console.log('[Rename Invoice Hijau] OCR: Creating converter for:', tmpPdfFile);
            
            // pdf2pic v3.2.0 uses fromPath (not fromFilePath)
            const converter = pdf2pic.fromPath(tmpPdfFile, options);
            
            // Convert first 3 pages
            console.log('[Rename Invoice Hijau] OCR: Converting pages...');
            result = await converter.bulk(-1, { start: 1, end: 3 });
            
            if (!result || result.length === 0) {
                console.warn('[Rename Invoice Hijau] OCR: pdf2pic returned empty result');
                return null;
            }
            
            imagePaths = result.map(r => r.path);
            console.log(`[Rename Invoice Hijau] OCR: ✅ Converted ${imagePaths.length} pages to images`);
            
            // Verify image files exist
            for (let i = 0; i < imagePaths.length; i++) {
                if (!fs.existsSync(imagePaths[i])) {
                    console.warn(`[Rename Invoice Hijau] OCR: Image file ${i + 1} not found: ${imagePaths[i]}`);
                    imagePaths.splice(i, 1);
                    i--;
                } else {
                    const stats = fs.statSync(imagePaths[i]);
                    console.log(`[Rename Invoice Hijau] OCR: Image ${i + 1} exists, size: ${stats.size} bytes`);
                }
            }
            
            if (imagePaths.length === 0) {
                console.error('[Rename Invoice Hijau] OCR: No valid image files created');
                return null;
            }
            
        } catch (convErr) {
            console.error('[Rename Invoice Hijau] OCR: pdf2pic conversion failed:', convErr.message);
            console.error('[Rename Invoice Hijau] OCR: Error stack:', convErr.stack);
            return null;
        }
        
        // Step 4: Initialize Tesseract worker
        console.log('[Rename Invoice Hijau] OCR: Initializing Tesseract worker...');
        try {
            worker = await initTesseractWorker();
            console.log('[Rename Invoice Hijau] OCR: ✅ Tesseract worker ready');
        } catch (initErr) {
            console.error('[Rename Invoice Hijau] OCR: Worker initialization failed:', initErr.message);
            return null;
        }
        
        // Step 5: Run Tesseract OCR on each image
        console.log('[Rename Invoice Hijau] OCR: Running Tesseract on converted images...');
        let allText = '';
        
        for (let i = 0; i < imagePaths.length; i++) {
            const imgPath = imagePaths[i];
            try {
                console.log(`[Rename Invoice Hijau] OCR: Processing image ${i + 1}/${imagePaths.length}: ${imgPath}`);
                
                // Verify file exists before recognition
                if (!fs.existsSync(imgPath)) {
                    console.warn(`[Rename Invoice Hijau] OCR: Image file disappeared: ${imgPath}`);
                    continue;
                }
                
                const startTime = Date.now();
                const result = await worker.recognize(imgPath);
                const elapsedTime = Date.now() - startTime;
                
                const text = result.data.text || '';
                const confidence = result.data.confidence || 0;
                
                console.log(`[Rename Invoice Hijau] OCR: Image ${i + 1} recognized in ${elapsedTime}ms`);
                console.log(`[Rename Invoice Hijau] OCR: Extracted ${text.length} chars, confidence: ${confidence}%`);
                
                allText += '\n' + text;
                
                // Stop if we got good text already
                if (allText.length > 500) {
                    console.log('[Rename Invoice Hijau] OCR: Got enough text (>500 chars), stopping further pages');
                    break;
                }
                
            } catch (ocrErr) {
                console.error(`[Rename Invoice Hijau] OCR: Recognition error on image ${i + 1}:`, ocrErr.message);
                console.error('[Rename Invoice Hijau] OCR: Stack:', ocrErr.stack);
                continue;
            }
        }
        
        if (allText.length > 50) {
            console.log(`[Rename Invoice Hijau] OCR: ✅ Successfully extracted ${allText.length} total characters`);
            return allText;
        } else {
            console.warn('[Rename Invoice Hijau] OCR: Extracted text too short (<50 chars)');
            console.log('[Rename Invoice Hijau] OCR: Text content (first 200 chars):', allText.substring(0, 200));
            return null;
        }
        
    } catch (err) {
        console.error('[Rename Invoice Hijau] OCR extraction error:', err.message);
        console.error('[Rename Invoice Hijau] OCR Stack:', err.stack);
        return null;
    } finally {
        // Cleanup
        try {
            if (tmpPdfFile && fs.existsSync(tmpPdfFile)) {
                fs.unlinkSync(tmpPdfFile);
                console.log('[Rename Invoice Hijau] OCR: Cleaned up temp PDF');
            }
        } catch (e) {}
        
        try {
            for (const imgPath of imagePaths) {
                if (fs.existsSync(imgPath)) {
                    fs.unlinkSync(imgPath);
                }
            }
            if (imagePaths.length > 0) {
                console.log('[Rename Invoice Hijau] OCR: Cleaned up temp images');
            }
        } catch (e) {}
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

                    // If no invoice found, log and return error
                    if (!noInvoice) {
                        console.error('[Rename Invoice Hijau] Failed to extract invoice number from scanned PDF');
                        return sendResponse(400, {
                            success: false,
                            error: 'Gagal ekstrak nomor invoice dari PDF scan',
                            details: 'OCR tidak dapat membaca teks dari file ini. Kemungkinan kualitas scan terlalu rendah atau nomor invoice tidak terlihat jelas.'
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
