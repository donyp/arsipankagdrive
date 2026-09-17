// ============================================================
// Pusat Arsip Anka — Configuration
// ============================================================

const CONFIG = {
    // Backend API URL
    // For production (Railway/Replit/Custom Domain): use empty string for relative URLs (same domain)
    // For local development: use http://localhost:5000
    // Detect environment: if URL is not localhost/127.0.0.1, use relative URL
    API_URL: (typeof window !== 'undefined' && !window.location.hostname.match(/^(localhost|127\.0\.0\.1)$/)) 
        ? '' 
        : 'http://localhost:5000',

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
