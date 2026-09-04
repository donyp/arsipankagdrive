// Rename Faktur Pajak Endpoints
// Extracts data from PDF and renames as: tax-NAMA_TOKO NOMINAL

let pdfParse = null;

// Lazy-load pdf-parse only if needed
async function initPdfParse() {
    if (!pdfParse) {
        try {
            pdfParse = require('pdf-parse');
        } catch (err) {
            console.error('[Rename Faktur] pdf-parse not installed:', err.message);
            throw err;
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
            if (!req.files || !req.files.file) {
                return res.status(400).json({ error: 'File PDF wajib diupload' });
            }

            const file = req.files.file;
            const originalName = file.name;

            console.log(`[Rename Faktur] Processing: ${originalName}`);

            // Initialize pdf-parse
            const pdf = await initPdfParse();

            // Parse PDF
            const pdfData = await pdf(file.data);
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
            const fileBase64 = file.data.toString('base64');

            // Return success with new filename and file data
            // Client will download file without server storage
            res.json({
                success: true,
                originalName,
                newName,
                namaToko,
                harga,
                ppn,
                totalNominal,
                fileData: fileBase64  // Base64 encoded PDF file
            });

        } catch (err) {
            console.error('[Rename Faktur] Error:', err.message);
            res.status(500).json({
                error: 'Gagal memproses PDF: ' + err.message
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
