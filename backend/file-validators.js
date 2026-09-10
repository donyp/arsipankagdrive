/**
 * File Format Validators
 * Validates files by magic bytes (file signatures) + extension + MIME type
 * Prevents file type spoofing (e.g., .exe renamed to .pdf)
 */

/**
 * Validate PDF file
 * PDF files start with %PDF magic bytes
 */
function validatePDF(buffer, filename) {
    if (!buffer || buffer.length < 4) {
        return {
            valid: false,
            error: 'File terlalu kecil untuk menjadi PDF'
        };
    }

    // Check PDF magic bytes: %PDF
    const pdfSignature = buffer.slice(0, 4).toString('ascii');
    if (pdfSignature !== '%PDF') {
        return {
            valid: false,
            error: 'File bukan PDF yang valid (magic bytes tidak cocok)'
        };
    }

    // Check extension
    if (!filename.toLowerCase().endsWith('.pdf')) {
        return {
            valid: false,
            error: 'Nama file harus berakhir dengan .pdf'
        };
    }

    return { valid: true };
}

/**
 * Validate Excel file (.xlsx)
 * Excel files are ZIP archives with magic bytes PK (0x504B)
 */
function validateExcelXLSX(buffer, filename) {
    if (!buffer || buffer.length < 4) {
        return {
            valid: false,
            error: 'File terlalu kecil untuk menjadi Excel'
        };
    }

    // Check ZIP signature (XLSX is ZIP): PK
    const zipSignature = buffer.slice(0, 2).toString('hex');
    if (zipSignature !== '504b') {
        return {
            valid: false,
            error: 'File bukan Excel yang valid (magic bytes tidak cocok)'
        };
    }

    // Check extension - MUST be .xlsx
    const ext = filename.toLowerCase().split('.').pop();
    if (ext !== 'xlsx') {
        return {
            valid: false,
            error: 'Hanya file Excel format .xlsx yang diizinkan (bukan .xls)'
        };
    }

    return { valid: true };
}

/**
 * Validate Image file (JPEG or PNG)
 */
function validateImage(buffer, filename) {
    if (!buffer || buffer.length < 4) {
        return {
            valid: false,
            error: 'File terlalu kecil'
        };
    }

    const ext = filename.toLowerCase().split('.').pop();
    const hex = buffer.slice(0, 4).toString('hex').toUpperCase();

    // JPEG: FF D8 FF
    if (ext === 'jpg' || ext === 'jpeg') {
        if (hex.slice(0, 6) !== 'FFD8FF') {
            return {
                valid: false,
                error: 'File bukan JPEG yang valid'
            };
        }
        return { valid: true };
    }

    // PNG: 89 50 4E 47
    if (ext === 'png') {
        if (hex !== '89504E47') {
            return {
                valid: false,
                error: 'File bukan PNG yang valid'
            };
        }
        return { valid: true };
    }

    return {
        valid: false,
        error: `Format file .${ext} tidak diizinkan`
    };
}

module.exports = {
    validatePDF,
    validateExcelXLSX,
    validateImage
};
