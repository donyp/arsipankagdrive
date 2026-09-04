// Rename Faktur Pajak Endpoints
// Extracts data from PDF and renames as: tax-NAMA_TOKO NOMINAL

const pdfParse = require('pdf-parse');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

module.exports = (app, supabase) => {
    // ============================================
    // POST /api/invoice/rename-faktur
    // Extract data from PDF and prepare renamed file
    // ============================================
    app.post('/api/invoice/rename-faktur', async (req, res) => {
        try {
            if (!req.files || !req.files.file) {
                return res.status(400).json({ error: 'File PDF wajib diupload' });
            }

            const file = req.files.file;
            const originalName = file.name;

            console.log(`[Rename Faktur] Processing: ${originalName}`);

            // Parse PDF
            const pdfData = await pdfParse(file.data);
            const textContent = pdfData.text;

            console.log(`[Rename Faktur] PDF text extracted, length: ${textContent.length}`);

            // Extract nama toko (Pembeli Barang Kena Pajak)
            const namaTokoMatch = textContent.match(/Pembeli\s+Barang\s+Kena\s+Pajak\/Penerima\s+Jasa\s+Kena\s+Pajak:[^\n]*\n\s*Nama\s*:\s*([^\n]+)/i);
            const namaToko = namaTokoMatch ? namaTokoMatch[1].trim() : null;

            // Skip if nama adalah Garuda Gemilang Indonesia
            if (!namaToko || namaToko.includes('GARUDA GEMILANG INDONESIA')) {
                return res.json({
                    success: false,
                    error: 'Nama toko tidak valid atau merupakan Garuda Gemilang Indonesia'
                });
            }

            console.log(`[Rename Faktur] Nama Toko: ${namaToko}`);

            // Extract Harga Jual/Penggantian/Uang Muka/Termin
            const hargaMatch = textContent.match(/Harga\s+Jual\s*\/\s*Penggantian\s*\/\s*Uang\s+Muka\s*\/\s*Termin[^\d]*?([\d.,]+)/i);
            const harga = hargaMatch ? cleanNumber(hargaMatch[1]) : 0;

            console.log(`[Rename Faktur] Harga: ${harga}`);

            // Extract Jumlah PPN
            const ppnMatch = textContent.match(/Jumlah\s+PPN\s*\([^)]*\)[^\d]*?([\d.,]+)/i);
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

            // Return success with new filename
            // File will be downloaded directly - not stored on server
            res.json({
                success: true,
                originalName,
                newName,
                namaToko,
                harga,
                ppn,
                totalNominal
            });

        } catch (err) {
            console.error('[Rename Faktur] Error:', err.message);
            res.status(500).json({
                error: 'Gagal memproses PDF: ' + err.message
            });
        }
    });

    // ============================================
    // GET /api/invoice/rename-faktur/download/:filename
    // Download renamed faktur (if stored)
    // ============================================
    app.get('/api/invoice/rename-faktur/download/:filename', async (req, res) => {
        try {
            const filename = req.params.filename;
            const tempDir = path.join(__dirname, '../temp-faktur');
            const filepath = path.join(tempDir, filename);

            // Security: prevent directory traversal
            if (!filepath.startsWith(tempDir)) {
                return res.status(403).json({ error: 'Access denied' });
            }

            if (fs.existsSync(filepath)) {
                res.download(filepath, filename, (err) => {
                    if (!err) {
                        // Delete file after download
                        fs.unlink(filepath, (err) => {
                            if (err) console.error('[Rename Faktur] Error deleting temp file:', err);
                        });
                    }
                });
            } else {
                res.status(404).json({ error: 'File tidak ditemukan' });
            }
        } catch (err) {
            console.error('[Rename Faktur] Download error:', err);
            res.status(500).json({ error: 'Gagal download file' });
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
