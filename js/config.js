// ============================================================
// Pusat Arsip Anka — Configuration
// ============================================================

const CONFIG = {
    // Backend API URL
    // For production (Railway/Replit): use empty string for relative URLs (same domain)
    // For local development: use http://localhost:5000
    // Detect environment: if URL contains railway.app or replit, use relative
    API_URL: (typeof window !== 'undefined' && (window.location.hostname.includes('railway') || window.location.hostname.includes('replit'))) 
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
