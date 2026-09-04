// Rename Faktur Pajak Endpoints
// Extracts data from PDF and renames as: tax-NAMA_TOKO NOMINAL

let pdfParse = null;
const busboy = require('busboy');

// Lazy-load pdf-parse with better error handling
async function initPdfParse() {
    if (!pdfParse) {
        try {
            pdfParse = require('pdf-parse');
            console.log('[Rename Faktur] pdf-parse loaded successfully');
        } catch (err) {
            console.error('[Rename Faktur] pdf-parse not installed:', err.message);
            throw new Error(`PDF parsing library not ready. Please wait while npm installs dependencies. Error: ${err.message}`);
        }
    }
    return pdfParse;
}

module.exports = (app, supabase) => {
    // ============================================
    // POST /api/invoice/rename-faktur
    // Extract data from PDF and prepare renamed file
    // ============================================
    app.post('/api/invoice/rename-faktur', async (req, res) => {
        try {
            console.log('[Rename Faktur] POST request received');
            console.log('[Rename Faktur] Content-Type:', req.headers['content-type']);

            // Parse multipart form data
            const bb = busboy({ headers: req.headers });
            let fileData = null;
            let fileName = null;

            bb.on('file', (fieldname, file, info) => {
                console.log(`[Rename Faktur] File field: ${fieldname}, filename: ${info.filename}`);
                fileName = info.filename;
                
                const chunks = [];
                file.on('data', (data) => {
                    chunks.push(data);
                });
                
                file.on('end', () => {
                    fileData = Buffer.concat(chunks);
                    console.log(`[Rename Faktur] File received: ${fileName}, size: ${fileData.length} bytes`);
                });
            });

            bb.on('error', (err) => {
                console.error('[Rename Faktur] Busboy error:', err);
                res.status(400).json({ error: 'Error parsing form data: ' + err.message });
            });

            bb.on('close', async () => {
                try {
                    if (!fileData || !fileName) {
                        console.error('[Rename Faktur] Missing file data');
                        return res.status(400).json({ error: 'File PDF wajib diupload' });
                    }

                    console.log(`[Rename Faktur] Processing: ${fileName}`);

                    // Initialize pdf-parse
                    const pdf = await initPdfParse();

                    // Parse PDF
                    const pdfData = await pdf(fileData);
                    const textContent = pdfData.text;

                    console.log(`[Rename Faktur] PDF text extracted, length: ${textContent.length}`);
                    console.log(`[Rename Faktur] First 500 chars: ${textContent.substring(0, 500)}`);

                    // Extract nama toko (Pembeli Barang Kena Pajak) - more flexible regex
                    let namaToko = null;
                    
                    // Try multiple patterns
                    const patterns = [
                        /Pembeli\s+Barang\s+Kena\s+Pajak.*?Penerima\s+Jasa\s+Kena\s+Pajak[:\s]*Nama\s*:\s*([^\n]+)/is,
                        /Penerima\s+Jasa\s+Kena\s+Pajak[:\s]*Nama\s*:\s*([^\n]+)/i,
                        /Pembeli\s+Barang[^:]*Nama\s*:\s*([^\n]+)/i,
                        /Nama\s*:\s*([A-Z][^\n]*(?:PT|CV|UD|TOKO|KOPERASI|FIRMA)[^\n]*)/i,
                    ];
                    
                    for (const pattern of patterns) {
                        const match = textContent.match(pattern);
                        if (match) {
                            namaToko = match[1].trim();
                            console.log(`[Rename Faktur] Pattern matched: ${pattern}`);
                            break;
                        }
                    }

                    // Skip if nama adalah Garuda Gemilang Indonesia (pengguna pajak)
                    if (!namaToko) {
                        return res.json({
                            success: false,
                            error: 'Nama toko tidak ditemukan di PDF'
                        });
                    }

                    if (namaToko.toUpperCase().includes('GARUDA') || namaToko.toUpperCase().includes('GEMILANG')) {
                        return res.json({
                            success: false,
                            error: 'File adalah dari Garuda Gemilang Indonesia (pengguna pajak, bukan pembeli)'
                        });
                    }

                    console.log(`[Rename Faktur] Nama Toko: ${namaToko}`);

                    // Extract Harga Jual/Penggantian/Uang Muka/Termin - more flexible
                    let hargaMatch = textContent.match(/Harga\s+Jual\s*\/\s*Penggantian\s*\/\s*Uang\s+Muka\s*\/\s*Termin[:\s]*([0-9.,]+)/i);
                    if (!hargaMatch) {
                        hargaMatch = textContent.match(/Harga\s+Jual[:\s]*([0-9.,]+)/i);
                    }
                    if (!hargaMatch) {
                        hargaMatch = textContent.match(/(?:Harga|Nilai)[^:]*:[^0-9]*([0-9.,]+)/);
                    }
                    const harga = hargaMatch ? cleanNumber(hargaMatch[1]) : 0;

                    console.log(`[Rename Faktur] Harga: ${harga}`);

                    // Extract Jumlah PPN - more flexible
                    let ppnMatch = textContent.match(/Jumlah\s+PPN[^:]*(?:Pajak\s+Pertambahan\s+Nilai)?[:\s]*([0-9.,]+)/i);
                    if (!ppnMatch) {
                        ppnMatch = textContent.match(/PPN[:\s]*([0-9.,]+)/i);
                    }
                    const ppn = ppnMatch ? cleanNumber(ppnMatch[1]) : 0;

                    console.log(`[Rename Faktur] PPN: ${ppn}`);

                    // Calculate total nominal
                    const totalNominal = harga + ppn;

                    if (totalNominal === 0) {
                        return res.json({
                            success: false,
                            error: 'Nominal tidak dapat diekstrak dari PDF'
                        });
                    }

                    // Create new filename
                    const newName = `tax-${namaToko.toUpperCase()} ${formatCurrency(totalNominal)}.pdf`;

                    console.log(`[Rename Faktur] New Name: ${newName}`);

                    // Convert PDF file to base64 for download
                    const fileBase64 = fileData.toString('base64');

                    // Return success with new filename and file data
                    // Client will download file without server storage
                    res.json({
                        success: true,
                        originalName: fileName,
                        newName,
                        namaToko,
                        harga,
                        ppn,
                        totalNominal,
                        fileData: fileBase64  // Base64 encoded PDF file
                    });

                } catch (err) {
                    console.error('[Rename Faktur] Processing error:', err.message, err.stack);
                    res.status(500).json({
                        error: 'Gagal memproses PDF: ' + err.message,
                        details: process.env.NODE_ENV === 'production' ? undefined : err.stack
                    });
                }
            });

            req.pipe(bb);

        } catch (err) {
            console.error('[Rename Faktur] Request error:', err.message, err.stack);
            res.status(500).json({
                error: 'Gagal memproses request: ' + err.message,
                details: process.env.NODE_ENV === 'production' ? undefined : err.stack
            });
        }
    });
};

// ============================================
// Helper Functions
// ============================================

function cleanNumber(str) {
    // Remove currency formatting: 3.321.394,00 -> 3321394
    return parseInt(str.replace(/[.,]/g, '')) || 0;
}

function formatCurrency(num) {
    // Format: 3321394 -> 3.321.394
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
