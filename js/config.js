// ============================================================
// Pusat Arsip Anka — Configuration
// ============================================================

const CONFIG = {
    // Backend API URL
    // Use http://localhost:5000 for development (local)
    // Empty string uses relative URLs (same domain)
    API_URL: 'http://localhost:5000',

    // App Constants
    CATEGORIES: [
        { value: 'PPN', label: 'PPN' },
        { value: 'NON_PPN', label: 'NON' },
        { value: 'INVOICE', label: 'Invoice Merah' },
        { value: 'PIUTANG', label: 'Bukti Pembayaran Piutang' }
    ],

    CATEGORY_FOLDERS: {
        'PPN': 'PPN',
        'NON_PPN': 'NON_PPN',
        'INVOICE': 'INVOICE',
        'PIUTANG': 'PIUTANG'
    },

    // Pagination
    PAGE_SIZE: 15
};
