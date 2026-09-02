// ============================================================
// Upload Excel Handler - REKAP_LABA.xls
// Handles Excel file upload and processing
// ============================================================

let selectedFile = null;

// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const selectedFileDiv = document.getElementById('selectedFile');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const btnRemove = document.getElementById('btnRemove');
const btnUpload = document.getElementById('btnUpload');
const btnCancel = document.getElementById('btnCancel');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultContainer = document.getElementById('resultContainer');

// ============================================
// Initialize
// ============================================
function init() {
    // Check authentication
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    // Check role (super_admin or moderator only)
    const user = getUserData();
    if (!user || (user.role !== 'super_admin' && user.role !== 'moderator')) {
        alert('Akses ditolak. Hanya Super Admin dan Moderator yang dapat upload Excel.');
        window.location.href = 'index.html';
        return;
    }

    setupEventListeners();
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    // Upload zone click
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        handleFileSelect(e.target.files[0]);
    });

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        handleFileSelect(e.dataTransfer.files[0]);
    });

    // Remove file
    btnRemove.addEventListener('click', () => {
        clearSelection();
    });

    // Upload button
    btnUpload.addEventListener('click', () => {
        uploadExcel();
    });

    // Cancel button
    btnCancel.addEventListener('click', () => {
        window.location.href = 'invoice-list.html';
    });
}

// ============================================
// File Selection
// ============================================
function handleFileSelect(file) {
    if (!file) return;

    // Validate file type
    const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const validExtensions = ['.xls', '.xlsx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
        alert('File harus berformat .xls atau .xlsx');
        return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('Ukuran file maksimal 10MB');
        return;
    }

    selectedFile = file;

    // Display file info
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    selectedFileDiv.classList.add('visible');
    btnUpload.disabled = false;

    // Hide upload zone
    uploadZone.style.display = 'none';
}

function clearSelection() {
    selectedFile = null;
    fileInput.value = '';
    selectedFileDiv.classList.remove('visible');
    uploadZone.style.display = 'block';
    btnUpload.disabled = true;
    resultContainer.style.display = 'none';
}

// ============================================
// Upload Excel
// ============================================
async function uploadExcel() {
    if (!selectedFile) return;

    btnUpload.disabled = true;
    btnRemove.disabled = true;
    progressContainer.style.display = 'block';
    resultContainer.style.display = 'none';

    try {
        const formData = new FormData();
        formData.append('excel', selectedFile);

        progressFill.style.width = '30%';
        progressFill.textContent = '30%';
        progressText.textContent = 'Mengupload file...';

        const response = await fetch('/api/invoice/upload-excel', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            },
            body: formData
        });

        progressFill.style.width = '60%';
        progressFill.textContent = '60%';
        progressText.textContent = 'Memproses data...';

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload gagal');
        }

        const result = await response.json();

        progressFill.style.width = '100%';
        progressFill.textContent = '100%';
        progressText.textContent = 'Selesai!';

        // Show result
        setTimeout(() => {
            progressContainer.style.display = 'none';
            showResult(result);
        }, 500);

    } catch (error) {
        console.error('Upload error:', error);
        progressContainer.style.display = 'none';
        showError(error.message);
        btnUpload.disabled = false;
        btnRemove.disabled = false;
    }
}

// ============================================
// Show Result
// ============================================
function showResult(result) {
    resultContainer.style.display = 'block';

    const summary = result.summary || {};
    const hasErrors = summary.failed > 0;

    let html = `
        <div class="result-success">
            <h3>
                <i class="fas fa-check-circle"></i>
                Upload Berhasil
            </h3>
            <div class="result-stats">
                <div class="stat-item">
                    <div class="stat-value">${summary.totalRows || 0}</div>
                    <div class="stat-label">Total Baris</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${summary.uniqueFakturs || 0}</div>
                    <div class="stat-label">Faktur Unik</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color: #27ae60;">${summary.processed || 0}</div>
                    <div class="stat-label">Berhasil</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color: #f39c12;">${summary.duplicates || 0}</div>
                    <div class="stat-label">Duplikat</div>
                </div>
                ${summary.failed > 0 ? `
                <div class="stat-item">
                    <div class="stat-value" style="color: #e74c3c;">${summary.failed}</div>
                    <div class="stat-label">Gagal</div>
                </div>
                ` : ''}
            </div>
            <button class="btn-view-list" onclick="window.location.href='invoice-list.html'">
                <i class="fas fa-list"></i> Lihat Daftar Invoice
            </button>
        </div>
    `;

    // Show errors if any
    if (hasErrors && summary.errors && summary.errors.length > 0) {
        html += `
            <div class="result-error">
                <h3>
                    <i class="fas fa-exclamation-triangle"></i>
                    Beberapa Data Gagal Diproses
                </h3>
                <div class="error-list">
                    ${summary.errors.map(err => `
                        <div class="error-item">${err}</div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    resultContainer.innerHTML = html;

    // Reset for next upload
    setTimeout(() => {
        clearSelection();
        btnUpload.disabled = false;
        btnRemove.disabled = false;
    }, 1000);
}

function showError(message) {
    resultContainer.style.display = 'block';
    resultContainer.innerHTML = `
        <div class="result-error">
            <h3>
                <i class="fas fa-times-circle"></i>
                Upload Gagal
            </h3>
            <p style="margin-top: 10px; color: #e74c3c;">${message}</p>
        </div>
    `;
}

// ============================================
// Utility Functions
// ============================================
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ============================================
// Initialize on load
// ============================================
document.addEventListener('DOMContentLoaded', init);
