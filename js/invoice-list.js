// ============================================================
// Invoice List Handler
// Display invoice list with filters and PDF upload
// ============================================================

let invoiceCurrentPage = 0;
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
    // Check if DOM elements exist (only init if embedded properly)
    if (!tableBody || !btnApplyFilter) {
        console.warn('[Invoice List] DOM elements not found, skipping init');
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
                'Authorization': `Bearer ${API.getToken()}`
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
            offset: invoiceCurrentPage * pageSize,
            ...currentFilters
        });

        const response = await fetch(`/api/invoice/list?${params}`, {
            headers: {
                'Authorization': `Bearer ${API.getToken()}`
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

    invoiceCurrentPage = 0;
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
    invoiceCurrentPage = 0;
    loadInvoiceList();
}

// ============================================
// Pagination
// ============================================
function updatePagination() {
    const start = invoiceCurrentPage * pageSize + 1;
    const end = Math.min((invoiceCurrentPage + 1) * pageSize, totalCount);

    paginationInfo.textContent = `Menampilkan ${start} - ${end} dari ${totalCount} invoice`;

    btnPrevPage.disabled = invoiceCurrentPage === 0;
    btnNextPage.disabled = end >= totalCount;
}

function navigatePage(direction) {
    invoiceCurrentPage += direction;
    if (invoiceCurrentPage < 0) invoiceCurrentPage = 0;
    
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
                    'Authorization': `Bearer ${API.getToken()}`
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
// Upload Excel Modal
// ============================================
function openUploadExcelModal() {
    const modal = document.createElement('div');
    modal.id = 'upload-excel-modal';
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-md animate-fade-in overflow-y-auto';
    modal.innerHTML = `
        <div class="relative bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-scale-up border border-gray-100 max-h-[90vh] overflow-y-auto">
            <!-- Header -->
            <div class="text-center mb-6">
                <div class="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                </div>
                <h2 class="text-2xl font-black text-gray-900 leading-tight mb-1 uppercase tracking-tight">Upload Excel</h2>
                <p class="text-xs font-bold text-green-500 uppercase tracking-widest">Invoice Data</p>
            </div>

            <!-- Instructions -->
            <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <p class="text-xs font-bold text-yellow-800 uppercase tracking-widest mb-2">📋 Petunjuk Upload</p>
                <ul class="text-xs text-yellow-700 space-y-1.5">
                    <li class="flex items-start gap-2">
                        <span class="text-green-600 font-bold mt-0.5">✓</span>
                        <span>File harus berformat <strong>.xls atau .xlsx</strong></span>
                    </li>
                    <li class="flex items-start gap-2">
                        <span class="text-green-600 font-bold mt-0.5">✓</span>
                        <span>Pastikan kolom: <strong>TANGGAL, TOKO, FAKTUR, METODE BAYAR, JENIS TRANSAKSI, KONSUMEN, JUMLAH JUAL, KETERANGAN</strong></span>
                    </li>
                    <li class="flex items-start gap-2">
                        <span class="text-green-600 font-bold mt-0.5">✓</span>
                        <span>Nomor faktur harus unik (tidak boleh duplikat)</span>
                    </li>
                    <li class="flex items-start gap-2">
                        <span class="text-green-600 font-bold mt-0.5">✓</span>
                        <span>Maksimal upload <strong>1 file</strong></span>
                    </li>
                </ul>
            </div>

            <!-- File Input -->
            <div id="excel-drop-zone" class="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center mb-6 bg-blue-50 cursor-pointer transition-all hover:border-blue-500 hover:bg-blue-100">
                <svg class="w-12 h-12 text-blue-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p class="text-sm font-bold text-gray-900 mb-1">Drag & Drop atau Klik</p>
                <p class="text-xs text-gray-500">File Excel di sini</p>
                <input type="file" id="excel-file-input" accept=".xls,.xlsx" class="hidden" />
            </div>

            <!-- File Info -->
            <div id="file-info" class="hidden mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p class="text-xs font-bold text-gray-600 uppercase mb-2">File Terpilih</p>
                <p id="file-name" class="text-sm font-bold text-gray-900 break-all"></p>
                <p id="file-size" class="text-xs text-gray-500 mt-1"></p>
            </div>

            <!-- Excel Format Verification Notice -->
            <div id="format-notice" class="hidden mb-6 p-4 rounded-xl border-2">
                <div id="format-status" class="flex items-center gap-2 mb-2">
                    <div id="format-icon" class="w-5 h-5 rounded-full flex items-center justify-center"></div>
                    <p id="format-message" class="text-sm font-bold"></p>
                </div>
                <p id="format-details" class="text-xs text-gray-600 mt-2"></p>
            </div>

            <!-- Buttons -->
            <div class="flex gap-3">
                <button onclick="this.closest('.fixed').remove()" class="flex-1 py-3 bg-gray-200 text-gray-900 font-bold rounded-xl hover:bg-gray-300 transition-all uppercase tracking-widest text-xs">
                    Batal
                </button>
                <button id="btn-upload-excel-confirm" class="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                    Upload
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // File input handling
    const dropZone = document.getElementById('excel-drop-zone');
    const fileInput = document.getElementById('excel-file-input');
    const fileInfo = document.getElementById('file-info');
    const uploadBtn = document.getElementById('btn-upload-excel-confirm');
    let selectedFile = null;

    // Click to browse
    dropZone.addEventListener('click', () => fileInput.click());

    // File selection
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            showFileInfo(selectedFile);
            uploadBtn.disabled = false;
        }
    });

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-green-500', 'bg-green-100');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-green-500', 'bg-green-100');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-green-500', 'bg-green-100');
        
        if (e.dataTransfer.files.length > 0) {
            selectedFile = e.dataTransfer.files[0];
            showFileInfo(selectedFile);
            uploadBtn.disabled = false;
        }
    });

    // Show file info
    function showFileInfo(file) {
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-size').textContent = `Ukuran: ${formatFileSize(file.size)}`;
        fileInfo.classList.remove('hidden');
        
        // Validate Excel format
        validateExcelFormat(file);
    }

    // Validate Excel format
    async function validateExcelFormat(file) {
        try {
            // Parse Excel to check columns
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { header: 1 });
            
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                showFormatNotice(false, 'File tidak valid atau tidak ada sheet');
                return;
            }

            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const headers = workbook.SheetNames[0] ? XLSX.utils.sheet_to_json(firstSheet, { header: 1 })[0] : [];
            
            // Required columns (KET 2 = KETERANGAN, either name works)
            const requiredColumns = ['TANGGAL', 'TOKO', 'FAKTUR', 'METODE BAYAR', 'JENIS TRANSAKSI', 'KONSUMEN', 'JUMLAH JUAL'];
            const headerString = (headers || []).map(h => (h || '').toString().toUpperCase().trim()).join('|');
            const hasAllColumns = requiredColumns.every(col => headerString.includes(col.toUpperCase()));

            if (hasAllColumns) {
                const totalRows = workbook.Sheets[workbook.SheetNames[0]]['!ref']?.split(':')[1] ? parseInt(workbook.Sheets[workbook.SheetNames[0]]['!ref'].split(':')[1].replace(/\D/g, '')) : 0;
                showFormatNotice(true, `Format ✅ Valid - ${totalRows - 1} baris data ditemukan`);
            } else {
                const missingCols = requiredColumns.filter(col => !headerString.includes(col.toUpperCase()));
                showFormatNotice(false, `Kolom tidak lengkap: ${missingCols.join(', ')}`);
            }
        } catch (error) {
            console.error('Format validation error:', error);
            showFormatNotice(false, 'Gagal membaca file Excel: ' + error.message);
        }
    }

    // Show format validation notice
    function showFormatNotice(isValid, message) {
        const notice = document.getElementById('format-notice');
        const icon = document.getElementById('format-icon');
        const statusMsg = document.getElementById('format-message');
        const details = document.getElementById('format-details');

        if (isValid) {
            icon.className = 'w-5 h-5 rounded-full flex items-center justify-center bg-green-100 text-green-600';
            icon.innerHTML = '✓';
            statusMsg.className = 'text-sm font-bold text-green-700';
            statusMsg.textContent = '✅ Format Valid';
            details.textContent = message;
            notice.className = 'p-4 rounded-xl border-2 border-green-200 bg-green-50';
        } else {
            icon.className = 'w-5 h-5 rounded-full flex items-center justify-center bg-red-100 text-red-600';
            icon.innerHTML = '✕';
            statusMsg.className = 'text-sm font-bold text-red-700';
            statusMsg.textContent = '❌ Format Tidak Valid';
            details.textContent = message;
            notice.className = 'p-4 rounded-xl border-2 border-red-200 bg-red-50';
            uploadBtn.disabled = true;
        }
        
        notice.classList.remove('hidden');
    }

    // Upload handler
    uploadBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        // Validate file format
        const validFormats = ['.xls', '.xlsx'];
        const fileName = selectedFile.name.toLowerCase();
        const hasValidFormat = validFormats.some(fmt => fileName.endsWith(fmt));

        if (!hasValidFormat) {
            alert('❌ File harus berformat .xls atau .xlsx');
            return;
        }

        // Validate file size (max 10MB)
        if (selectedFile.size > 10 * 1024 * 1024) {
            alert('❌ Ukuran file maksimal 10MB');
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';

        try {
            const formData = new FormData();
            formData.append('excel', selectedFile);

            const response = await fetch('/api/invoice/upload-excel', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API.getToken()}`
                },
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.details || 'Upload gagal');
            }

            // Success
            alert(`✅ Upload Sukses!\n\nFile: ${selectedFile.name}\nTotal: ${result.summary.totalRows} baris\nProses: ${result.summary.processedRows} invoice dibuat`);
            
            // Close modal
            modal.remove();

            // Reload invoice list
            await loadStats();
            await loadInvoiceList();

        } catch (error) {
            console.error('Upload error:', error);
            alert(`❌ Upload Gagal\n\n${error.message}`);
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload';
        }
    });
}

// Make globally accessible
window.openUploadExcelModal = openUploadExcelModal;
async function uploadBulkPDFs() {
    // Create file input that accepts multiple files
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,.pdf';
    input.multiple = true;  // Allow multiple files
    
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Validate all files
        const invalidFiles = [];
        const validFiles = [];

        for (const file of files) {
            if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
                invalidFiles.push(`${file.name} (bukan PDF)`);
                continue;
            }
            if (file.size > 10 * 1024 * 1024) {
                invalidFiles.push(`${file.name} (> 10MB)`);
                continue;
            }
            validFiles.push(file);
        }

        if (invalidFiles.length > 0) {
            alert(`❌ File tidak valid:\n${invalidFiles.join('\n')}`);
            return;
        }

        if (validFiles.length === 0) {
            alert('Tidak ada file valid untuk di-upload');
            return;
        }

        // Confirm bulk upload
        const confirmMsg = `Upload ${validFiles.length} file PDF?\n\nFile:\n${validFiles.map(f => f.name).join('\n')}`;
        if (!confirm(confirmMsg)) {
            return;
        }

        showLoading();
        let successCount = 0;
        let failureCount = 0;
        const failedFiles = [];

        try {
            for (const file of validFiles) {
                try {
                    // Extract faktur from filename (e.g., 835100310.pdf -> 835100310)
                    const faktur = file.name.replace(/\.pdf$/i, '').trim();
                    
                    const formData = new FormData();
                    formData.append('pdf', file);
                    formData.append('faktur', faktur);

                    const response = await fetch('/api/invoice/upload-pdf', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${API.getToken()}`
                        },
                        body: formData
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Upload gagal');
                    }

                    successCount++;
                    console.log(`✅ Uploaded: ${faktur}`);

                } catch (error) {
                    failureCount++;
                    failedFiles.push({
                        name: file.name,
                        error: error.message
                    });
                    console.error(`❌ Failed: ${file.name} - ${error.message}`);
                }

                // Small delay between uploads to avoid overload
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Show summary
            let summary = `✅ Bulk Upload Complete\n\nBerhasil: ${successCount}\nGagal: ${failureCount}`;
            if (failedFiles.length > 0) {
                summary += `\n\nGagal:\n${failedFiles.map(f => `- ${f.name}: ${f.error}`).join('\n')}`;
            }
            alert(summary);

            // Reload data
            await loadStats();
            await loadInvoiceList();

        } catch (error) {
            console.error('Bulk upload error:', error);
            alert(`❌ Error: ${error.message}`);
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
window.uploadBulkPDFs = uploadBulkPDFs;
window.viewFile = viewFile;
