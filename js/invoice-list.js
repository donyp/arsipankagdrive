// ============================================================
// Invoice List Handler
// Display invoice list with filters and PDF upload
// ============================================================

let currentPage = 0;
const pageSize = 100;
let totalCount = 0;
let currentFilters = {};

// DOM Elements
const tableBody = document.getElementById('invoiceTableBody');
const emptyState = document.getElementById('emptyState');
const paginationContainer = document.getElementById('paginationContainer');
const paginationInfo = document.getElementById('paginationInfo');
const btnPrevPage = document.getElementById('btnPrevPage');
const btnNextPage = document.getElementById('btnNextPage');
const loadingOverlay = document.getElementById('loadingOverlay');

// Stats
const statTotal = document.getElementById('statTotal');
const statUploaded = document.getElementById('statUploaded');
const statPending = document.getElementById('statPending');
const statMissing = document.getElementById('statMissing');

// Filters
const filterStatus = document.getElementById('filterStatus');
const filterToko = document.getElementById('filterToko');
const filterKeterangan = document.getElementById('filterKeterangan');
const filterDateFrom = document.getElementById('filterDateFrom');
const filterDateTo = document.getElementById('filterDateTo');
const filterSearch = document.getElementById('filterSearch');
const btnApplyFilter = document.getElementById('btnApplyFilter');
const btnResetFilter = document.getElementById('btnResetFilter');

// ============================================
// Initialize
// ============================================
async function init() {
    // Check authentication
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    setupEventListeners();
    await loadStats();
    await loadInvoiceList();
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    btnApplyFilter.addEventListener('click', applyFilters);
    btnResetFilter.addEventListener('click', resetFilters);
    btnPrevPage.addEventListener('click', () => navigatePage(-1));
    btnNextPage.addEventListener('click', () => navigatePage(1));
    
    // Enter key on search
    filterSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });
}

// ============================================
// Load Statistics
// ============================================
async function loadStats() {
    try {
        const response = await fetch('/api/invoice/stats', {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) throw new Error('Failed to load stats');

        const result = await response.json();
        const stats = result.stats || {};

        statTotal.textContent = stats.total_count || 0;
        statUploaded.textContent = stats.uploaded_count || 0;
        statPending.textContent = stats.pending_count || 0;
        statMissing.textContent = stats.missing_count || 0;

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ============================================
// Load Invoice List
// ============================================
async function loadInvoiceList() {
    showLoading();

    try {
        const params = new URLSearchParams({
            limit: pageSize,
            offset: currentPage * pageSize,
            ...currentFilters
        });

        const response = await fetch(`/api/invoice/list?${params}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) throw new Error('Failed to load invoice list');

        const result = await response.json();
        totalCount = result.count || 0;

        renderTable(result.data || []);
        updatePagination();

    } catch (error) {
        console.error('Error loading invoice list:', error);
        showError('Gagal memuat daftar invoice');
    } finally {
        hideLoading();
    }
}

// ============================================
// Render Table
// ============================================
function renderTable(invoices) {
    if (invoices.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
        paginationContainer.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    paginationContainer.style.display = 'flex';

    tableBody.innerHTML = invoices.map(invoice => {
        const statusClass = invoice.status.toLowerCase();
        const tanggal = formatDate(invoice.tanggal);
        const total = formatCurrency(invoice.total_jumlah_jual);

        return `
            <tr>
                <td>
                    ${invoice.status === 'UPLOADED' ? 
                        `<button class="btn-view-file" onclick="viewFile('${invoice.uploaded_file_path}')">
                            <i class="fas fa-file-pdf"></i> Lihat
                        </button>` :
                        `<button class="btn-upload-pdf" onclick="uploadPDF('${invoice.faktur}')">
                            <i class="fas fa-upload"></i> Upload
                        </button>`
                    }
                </td>
                <td>${tanggal}</td>
                <td><strong>${invoice.faktur}</strong></td>
                <td>${invoice.metode_bayar || '-'}</td>
                <td>${invoice.jenis_transaksi || '-'}</td>
                <td>${invoice.konsumen || '-'}</td>
                <td>${invoice.toko || '-'}</td>
                <td class="currency">${total}</td>
                <td>${invoice.keterangan || '-'}</td>
                <td>
                    <span class="status-badge ${statusClass}">${invoice.status}</span>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// Filters
// ============================================
function applyFilters() {
    currentFilters = {};

    if (filterStatus.value) currentFilters.status = filterStatus.value;
    if (filterToko.value) currentFilters.toko = filterToko.value;
    if (filterKeterangan.value) currentFilters.keterangan = filterKeterangan.value;
    if (filterDateFrom.value) currentFilters.date_from = filterDateFrom.value;
    if (filterDateTo.value) currentFilters.date_to = filterDateTo.value;
    if (filterSearch.value.trim()) currentFilters.search = filterSearch.value.trim();

    currentPage = 0;
    loadInvoiceList();
}

function resetFilters() {
    filterStatus.value = '';
    filterToko.value = '';
    filterKeterangan.value = '';
    filterDateFrom.value = '';
    filterDateTo.value = '';
    filterSearch.value = '';

    currentFilters = {};
    currentPage = 0;
    loadInvoiceList();
}

// ============================================
// Pagination
// ============================================
function updatePagination() {
    const start = currentPage * pageSize + 1;
    const end = Math.min((currentPage + 1) * pageSize, totalCount);

    paginationInfo.textContent = `Menampilkan ${start} - ${end} dari ${totalCount} invoice`;

    btnPrevPage.disabled = currentPage === 0;
    btnNextPage.disabled = end >= totalCount;
}

function navigatePage(direction) {
    currentPage += direction;
    if (currentPage < 0) currentPage = 0;
    
    loadInvoiceList();
}

// ============================================
// Upload PDF
// ============================================
async function uploadPDF(faktur) {
    // Create file input dynamically
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,.pdf';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
            alert('File harus berformat PDF');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Ukuran file maksimal 10MB');
            return;
        }

        // Confirm upload
        if (!confirm(`Upload PDF untuk faktur ${faktur}?\n\nFile: ${file.name}\nUkuran: ${formatFileSize(file.size)}`)) {
            return;
        }

        showLoading();

        try {
            const formData = new FormData();
            formData.append('pdf', file);
            formData.append('faktur', faktur);

            const response = await fetch('/api/invoice/upload-pdf', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Upload gagal');
            }

            const result = await response.json();
            alert(`✅ Upload berhasil!\n\nFaktur: ${faktur}\nPath: ${result.storagePath}`);

            // Reload data
            await loadStats();
            await loadInvoiceList();

        } catch (error) {
            console.error('Upload error:', error);
            alert(`❌ Upload gagal: ${error.message}`);
        } finally {
            hideLoading();
        }
    };

    input.click();
}

// ============================================
// View File
// ============================================
function viewFile(filePath) {
    // In real implementation, this would open the file from Google Drive
    // For now, show the path
    alert(`File tersimpan di:\n${filePath}\n\nFitur preview akan segera hadir.`);
    
    // TODO: Implement actual file viewing via Rclone/Alist
    // window.open(`/api/files/view?path=${encodeURIComponent(filePath)}`, '_blank');
}

// ============================================
// Utility Functions
// ============================================
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatCurrency(amount) {
    if (!amount) return 'Rp 0';
    return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function showLoading() {
    loadingOverlay.classList.add('visible');
}

function hideLoading() {
    loadingOverlay.classList.remove('visible');
}

function showError(message) {
    alert(message);
}

// ============================================
// Initialize on load
// ============================================
document.addEventListener('DOMContentLoaded', init);

// Make functions globally accessible
window.uploadPDF = uploadPDF;
window.viewFile = viewFile;
