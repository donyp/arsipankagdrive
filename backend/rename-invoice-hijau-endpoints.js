// ============================================================
// Invoice Hijau (Green Invoice) Rename Endpoints
// Extract No. Invoice from PDF and rename to invoice number
// ============================================================

const busboy = require('busboy');
let pdfParse;

// Lazy-load pdf-parse to detect if it's installed
async function initPdfParse() {
    if (!pdfParse) {
        try {
            pdfParse = require('pdf-parse');
        } catch (err) {
            console.error('[Rename Invoice Hijau] pdf-parse not installed');
            throw new Error('PDF parsing not available. Please install pdf-parse.');
        }
    }
    return pdfParse;
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
        try {
            console.log('[Rename Invoice Hijau] POST request received');
            console.log('[Rename Invoice Hijau] Content-Type:', req.headers['content-type']);

            // Validate content-type
            if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
                return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
            }

            // Parse multipart form data
            let bb;
            try {
                bb = busboy({ headers: req.headers });
            } catch (bberr) {
                console.error('[Rename Invoice Hijau] Busboy init error:', bberr.message);
                return res.status(400).json({ error: 'Error initializing form parser: ' + bberr.message });
            }

            let fileData = null;
            let fileName = null;

            bb.on('file', (fieldname, file, info) => {
                console.log(`[Rename Invoice Hijau] File field: ${fieldname}, filename: ${info.filename}`);
                fileName = info.filename;

                const chunks = [];
                file.on('data', (data) => {
                    chunks.push(data);
                });

                file.on('end', () => {
                    fileData = Buffer.concat(chunks);
                    console.log(`[Rename Invoice Hijau] File received: ${fileName}, size: ${fileData.length} bytes`);
                });
            });

            bb.on('error', (err) => {
                console.error('[Rename Invoice Hijau] Busboy error:', err);
                return res.status(400).json({ error: 'Error parsing form data: ' + err.message });
            });

            bb.on('close', async () => {
                try {
                    if (!fileData || !fileName) {
                        console.error('[Rename Invoice Hijau] Missing file data');
                        return res.status(400).json({ error: 'File PDF wajib diupload' });
                    }

                    console.log(`[Rename Invoice Hijau] Processing: ${fileName}`);

                    // Initialize pdf-parse
                    const pdf = await initPdfParse();

                    // Parse PDF
                    const pdfData = await pdf(fileData);
                    const textContent = pdfData.text;

                    console.log(`[Rename Invoice Hijau] PDF text extracted, length: ${textContent.length}`);
                    console.log(`[Rename Invoice Hijau] First 1000 chars:\n${textContent.substring(0, 1000)}`);
                    console.log(`[Rename Invoice Hijau] Full text (first 3000 chars for debugging):\n${textContent.substring(0, 3000)}`);

                    // Extract No. Invoice using priority patterns with confidence matching
                    let noInvoice = null;
                    let confidence = 'low';

                    // Remove common PDF artifacts and normalize spaces
                    const cleanText = textContent.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
                    
                    console.log(`[Rename Invoice Hijau] Cleaned text (first 1000 chars):\n${cleanText.substring(0, 1000)}`);

                    // Priority 1: Look for "No. Invoice :" pattern with flexible spacing (usually page 2)
                    const pattern1 = /No\.\s*Invoice\s*[:=]?\s*([0-9\s]{12,})/gi;
                    const matches1 = cleanText.match(pattern1);
                    let priority1Number = null;
                    
                    if (matches1 && matches1.length > 0) {
                        console.log(`[Rename Invoice Hijau] Pattern1 raw matches: ${matches1.join(' | ')}`);
                        // Extract just the numbers, remove spaces
                        for (let match of matches1) {
                            const numberMatch = match.match(/([0-9]+)/g);
                            if (numberMatch && numberMatch.join('').length >= 12) {
                                priority1Number = numberMatch.join('');
                                console.log(`[Rename Invoice Hijau] Priority 1 (No. Invoice :) found: ${priority1Number}`);
                                break;
                            }
                        }
                    }

                    // Priority 2: Look for "Invoice" followed by numbers with flexible spacing
                    const pattern2 = /Invoice\s*[:=]?\s*\.?\s*([0-9\s]{12,})/gi;
                    const matches2 = cleanText.match(pattern2);
                    let priority2Number = null;
                    
                    if (matches2 && matches2.length > 0) {
                        console.log(`[Rename Invoice Hijau] Pattern2 raw matches: ${matches2.join(' | ')}`);
                        for (let match of matches2) {
                            const numberMatch = match.match(/([0-9]+)/g);
                            if (numberMatch && numberMatch.join('').length >= 12) {
                                priority2Number = numberMatch.join('');
                                console.log(`[Rename Invoice Hijau] Priority 2 (Invoice :) found: ${priority2Number}`);
                                break;
                            }
                        }
                    }

                    // Priority 3: Look for numbers starting with 83510031 (Invoice prefix)
                    const pattern3 = /83510031\s*0?[\d\s]{8,15}/g;
                    const matches3 = cleanText.match(pattern3);
                    let priority3Number = null;
                    
                    if (matches3 && matches3.length > 0) {
                        console.log(`[Rename Invoice Hijau] Pattern3 raw matches: ${matches3.join(' | ')}`);
                        for (let match of matches3) {
                            const numberMatch = match.match(/([0-9]+)/g);
                            if (numberMatch && numberMatch.join('').length >= 12) {
                                priority3Number = numberMatch.join('');
                                console.log(`[Rename Invoice Hijau] Priority 3 (83510031 prefix): ${priority3Number}`);
                                break;
                            }
                        }
                    }

                    // Priority 4: Any 15-digit number starting with 8351
                    const pattern4 = /\b8351\d{11,}\b/g;
                    const matches4 = cleanText.match(pattern4);
                    let priority4Number = null;
                    
                    if (matches4 && matches4.length > 0) {
                        priority4Number = matches4[0];
                        console.log(`[Rename Invoice Hijau] Priority 4 (15-digit number): ${priority4Number}`);
                    }

                    // Matching logic - use first priority that finds something
                    if (priority1Number) {
                        noInvoice = priority1Number;
                        console.log(`[Rename Invoice Hijau] Selected: Priority 1 - ${noInvoice}`);
                    } else if (priority2Number) {
                        noInvoice = priority2Number;
                        console.log(`[Rename Invoice Hijau] Selected: Priority 2 - ${noInvoice}`);
                    } else if (priority3Number) {
                        noInvoice = priority3Number;
                        console.log(`[Rename Invoice Hijau] Selected: Priority 3 - ${noInvoice}`);
                    } else if (priority4Number) {
                        noInvoice = priority4Number;
                        console.log(`[Rename Invoice Hijau] Selected: Priority 4 - ${noInvoice}`);
                    }

                    // If no invoice found, return error
                    if (!noInvoice) {
                        return res.json({
                            success: false,
                            error: 'No. Invoice tidak ditemukan di PDF. Pastikan file berisi No. Invoice yang jelas.'
                        });
                    }

                    // Prepare renamed filename
                    const renamedFileName = `${noInvoice}.pdf`;

                    console.log(`[Rename Invoice Hijau] Extracted No. Invoice: ${noInvoice}`);
                    console.log(`[Rename Invoice Hijau] New filename: ${renamedFileName}`);

                    // Return success with extracted data
                    res.json({
                        success: true,
                        originalFileName: fileName,
                        renamedFileName: renamedFileName,
                        noInvoice: noInvoice,
                        fileData: fileData.toString('base64'), // Send as base64 for download
                        message: 'No. Invoice berhasil diextract'
                    });

                } catch (err) {
                    console.error('[Rename Invoice Hijau] Processing error:', err.message, err.stack);
                    return res.status(500).json({ 
                        error: 'Error processing PDF: ' + err.message 
                    });
                }
            });

            // Pipe request to busboy
            req.pipe(bb);

        } catch (error) {
            console.error('[Rename Invoice Hijau] Endpoint error:', error.message);
            res.status(500).json({ error: 'Server error', details: error.message });
        }
    });
};
