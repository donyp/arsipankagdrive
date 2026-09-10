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
                    console.log(`[Rename Invoice Hijau] First 500 chars: ${textContent.substring(0, 500)}`);

                    // Extract No. Invoice using priority patterns
                    let noInvoice = null;

                    // Priority 1: Look for numbers starting with 83510031 (usually page 1)
                    const pattern1 = /83510031\d{10,}/;
                    const match1 = textContent.match(pattern1);
                    if (match1) {
                        noInvoice = match1[0];
                        console.log(`[Rename Invoice Hijau] Found via pattern 83510031: ${noInvoice}`);
                    }

                    // Priority 2: Fallback to "No. Invoice :" pattern (usually page 2)
                    if (!noInvoice) {
                        const pattern2 = /No\.\s*Invoice\s*:\s*(\d{12,})/i;
                        const match2 = textContent.match(pattern2);
                        if (match2) {
                            noInvoice = match2[1];
                            console.log(`[Rename Invoice Hijau] Found via pattern No. Invoice: ${noInvoice}`);
                        }
                    }

                    // If still not found, try more flexible patterns
                    if (!noInvoice) {
                        const pattern3 = /Invoice\s*[:#]?\s*(\d{12,})/i;
                        const match3 = textContent.match(pattern3);
                        if (match3) {
                            noInvoice = match3[1];
                            console.log(`[Rename Invoice Hijau] Found via flexible pattern: ${noInvoice}`);
                        }
                    }

                    // If no invoice found, return error
                    if (!noInvoice) {
                        return res.json({
                            success: false,
                            error: 'No. Invoice tidak ditemukan di PDF'
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
