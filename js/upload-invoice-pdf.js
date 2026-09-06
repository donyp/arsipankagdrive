// ============================================
// Bulk Upload Invoice PDF with Validation
// ============================================

let selectedFiles = [];
let validationResults = [];

// Helper function to format currency as Rupiah
function formatRupiah(amount) {
    if (!amount) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Custom notification system (toast)
function showNotification(message, type = 'success', duration = 4000) {
    // Create toast container if not exists
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? '#27ae60' : (type === 'error' ? '#e74c3c' : '#3498db');
    const icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
    
    toast.style.cssText = `
        background: ${bgColor};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        animation: slideInRight 0.3s ease-out;
        font-weight: 500;
        font-size: 14px;
        pointer-events: auto;
    `;
    
    toast.innerHTML = `
        <span style="font-size: 18px; font-weight: bold;">${icon}</span>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

// Add animation keyframes if not exists
if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
        
        @keyframes spin {
            from {
                transform: rotate(0deg);
            }
            to {
                transform: rotate(360deg);
            }
        }
        
        @keyframes pulse {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.5;
            }
        }
        
        @keyframes slideUp {
            from {
                transform: translateY(20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(2px);
        }
        
        .loading-modal {
            background: white;
            border-radius: 16px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            min-width: 350px;
            animation: slideUp 0.3s ease-out;
        }
        
        .loading-spinner {
            width: 60px;
            height: 60px;
            margin: 0 auto 20px;
            border: 4px solid #f0f0f0;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        .loading-text {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
        }
        
        .loading-subtext {
            font-size: 14px;
            color: #666;
            margin-bottom: 20px;
        }
        
        .progress-bar-container {
            width: 100%;
            height: 6px;
            background: #f0f0f0;
            border-radius: 3px;
            overflow: hidden;
            margin-top: 20px;
        }
        
        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #3498db, #2ecc71);
            border-radius: 3px;
            transition: width 0.3s ease;
            animation: pulse 1.5s ease-in-out infinite;
        }
    `;
    document.head.appendChild(style);
}

// Loading overlay system
let loadingOverlay = null;

window.showLoadingOverlay = function(text = 'Loading...', subtext = '') {
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        document.body.appendChild(loadingOverlay);
    }
    
    loadingOverlay.innerHTML = `
        <div class="loading-modal">
            <div class="loading-spinner"></div>
            <div class="loading-text">${text}</div>
            ${subtext ? `<div class="loading-subtext">${subtext}</div>` : ''}
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: 100%;"></div>
            </div>
        </div>
    `;
    loadingOverlay.style.display = 'flex';
};

window.hideLoadingOverlay = function() {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleFilesSelected(e.dataTransfer.files);
        }
    });

    // Click to select
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFilesSelected(e.target.files);
        }
    });
});

function handleFilesSelected(files) {
    console.log('[PDF Bulk] Files selected:', files.length);
    
    // Filter only PDF files
    selectedFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    
    if (selectedFiles.length === 0) {
        showNotification('❌ Hanya file PDF yang diizinkan', 'error');
        return;
    }

    console.log('[PDF Bulk] PDF files:', selectedFiles.length);

    // Start validation
    validateAllFiles();
}

async function validateAllFiles() {
    const dropZone = document.getElementById('dropZone');
    const filesList = document.getElementById('filesList');
    const stats = document.getElementById('stats');
    const validating = document.getElementById('validating');

    // Show validating spinner
    dropZone.style.display = 'none';
    validating.style.display = 'block';

    validationResults = [];

    try {
        const token = API.getToken() || localStorage.getItem('jwt_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Validate each file with small delay to show progress
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const faktur = file.name.replace(/\.pdf$/i, '').trim();
            
            console.log(`[PDF Bulk] Validating ${i+1}/${selectedFiles.length}: ${faktur}`);
            
            try {
                const response = await fetch(`/api/invoice/check-faktur/${faktur}`, {
                    method: 'GET',
                    headers: headers
                });

                const result = await response.json();
                
                if (response.ok && result.data) {
                    validationResults.push({
                        file: file,
                        faktur: faktur,
                        valid: true,
                        invoice: result.data
                    });
                    console.log('[PDF Bulk] ✓ Valid:', faktur);
                } else {
                    validationResults.push({
                        file: file,
                        faktur: faktur,
                        valid: false,
                        error: 'Faktur tidak ditemukan'
                    });
                    console.log('[PDF Bulk] ✗ Invalid:', faktur);
                }
            } catch (error) {
                validationResults.push({
                    file: file,
                    faktur: faktur,
                    valid: false,
                    error: error.message
                });
                console.error('[PDF Bulk] Error validating:', faktur, error);
            }

            // Small delay to avoid overwhelming server
            if (i < selectedFiles.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // Hide validating, show results
        validating.style.display = 'none';

        // Render UI
        renderValidationResults();
        stats.style.display = 'grid';
        filesList.classList.add('show');

    } catch (error) {
        console.error('[PDF Bulk] Validation error:', error);
        alert('Error: ' + error.message);
        validating.style.display = 'none';
        dropZone.style.display = 'block';
    }
}

function renderValidationResults() {
    const stats = document.getElementById('stats');
    const filesContainer = document.getElementById('filesContainer');
    
    const validCount = validationResults.filter(r => r.valid).length;
    const invalidCount = validationResults.filter(r => !r.valid).length;
    const totalCount = validationResults.length;

    // Update stats
    document.getElementById('totalFiles').textContent = totalCount;
    document.getElementById('validFiles').textContent = validCount;
    document.getElementById('invalidFiles').textContent = invalidCount;

    // Render file items
    filesContainer.innerHTML = validationResults.map((result, index) => {
        const className = result.valid ? 'valid' : 'invalid';
        const icon = result.valid ? '✓' : '✗';
        const status = result.valid ? 'VALID' : 'INVALID';
        const statusText = result.valid ? 'Faktur ditemukan' : (result.error || 'Faktur tidak ditemukan');
        const fakturText = result.faktur && result.faktur.trim() ? result.faktur : '(tidak terdeteksi)';
        
        let konsumenText = '';
        let nominalText = '';
        if (result.valid && result.invoice) {
            konsumenText = result.invoice.konsumen || '-';
            nominalText = formatRupiah(result.invoice.total_jumlah_jual);
        }
        
        let deleteBtn = '';
        if (!result.valid) {
            deleteBtn = `<button onclick="removeInvalidFile(${index})" class="delete-btn" title="Hapus file">
                <i class="fas fa-times"></i>
            </button>`;
        }

        return `
            <div class="file-item ${className}" id="file-item-${index}">
                <div class="file-item-icon">${icon}</div>
                <div style="flex: 1;">
                    <div class="file-item-name">${result.file.name}</div>
                    <div class="file-item-faktur">
                        Faktur: ${fakturText} ${result.valid ? `| ${konsumenText} | ${nominalText}` : `| ${statusText}`}
                    </div>
                </div>
                <div class="file-item-status">${status}</div>
                ${deleteBtn}
            </div>
        `;
    }).join('');

    // Enable/disable upload button
    document.getElementById('btnUpload').disabled = validCount === 0;
}

async function uploadValidFiles() {
    const validFiles = validationResults.filter(r => r.valid);
    
    if (validFiles.length === 0) {
        showNotification('Tidak ada file valid untuk diupload', 'error');
        return;
    }

    const btnUpload = document.getElementById('btnUpload');
    const originalText = btnUpload.innerHTML;
    const originalDisabled = btnUpload.disabled;
    
    btnUpload.disabled = true;
    btnUpload.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i>Processing...';
    btnUpload.style.opacity = '0.8';

    // Show loading overlay with progress
    window.showLoadingOverlay(
        `📤 Uploading Files`,
        `${validFiles.length} file${validFiles.length > 1 ? 's' : ''} akan diupload ke Google Drive`
    );

    try {
        const token = API.getToken() || localStorage.getItem('jwt_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // OPTIMIZATION: Upload files in parallel (up to 3 concurrent uploads)
        const CONCURRENT_LIMIT = 3;
        let successCount = 0;
        let failCount = 0;
        let currentProgress = 0;

        // Create upload tasks
        const uploadTasks = validFiles.map((fileResult, index) => async () => {
            try {
                const formData = new FormData();
                formData.append('pdf', fileResult.file);
                
                console.log(`[PDF Bulk] Uploading (${index + 1}/${validFiles.length}): ${fileResult.file.name}`);
                
                // Update loading overlay with progress
                currentProgress = Math.round((successCount + failCount) / validFiles.length * 100);
                window.showLoadingOverlay(
                    `📤 Uploading Files`,
                    `${index + 1} of ${validFiles.length} • ${currentProgress}%`
                );

                const response = await fetch('/api/invoice/upload-pdf', {
                    method: 'POST',
                    headers: headers,
                    body: formData
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    successCount++;
                    console.log('[PDF Bulk] ✓ Uploaded:', fileResult.faktur);
                    showNotification(`✓ ${fileResult.faktur}`, 'success', 2000);
                } else {
                    failCount++;
                    console.error('[PDF Bulk] ✗ Upload failed:', fileResult.faktur, result.error);
                    showNotification(`✗ ${fileResult.faktur}: ${result.error}`, 'error', 2000);
                }
            } catch (error) {
                failCount++;
                console.error('[PDF Bulk] Upload error:', fileResult.faktur, error);
                showNotification(`✗ ${fileResult.faktur}: ${error.message}`, 'error', 2000);
            }
        });

        // Execute with concurrency limit
        for (let i = 0; i < uploadTasks.length; i += CONCURRENT_LIMIT) {
            const batch = uploadTasks.slice(i, i + CONCURRENT_LIMIT);
            await Promise.all(batch.map(task => task()));
        }

        // Hide loading overlay
        window.hideLoadingOverlay();

        // Show final result message
        const message = `✅ ${successCount}/${validFiles.length} file berhasil diupload${failCount > 0 ? ` (${failCount} gagal)` : ''}`;
        showNotification(message, successCount > 0 ? 'success' : 'error', 5000);
        
        console.log('[PDF Bulk] Upload complete - all files processed');

        // Refresh invoice list to show updated status with file counts
        if (successCount > 0) {
            console.log('[PDF Bulk] Refreshing invoice list after successful upload...');
            setTimeout(() => {
                try {
                    if (typeof loadInvoicesInDashboard === 'function') {
                        console.log('[PDF Bulk] Calling loadInvoicesInDashboard(1)');
                        loadInvoicesInDashboard(1);
                    } else if (typeof loadInvoices === 'function') {
                        console.log('[PDF Bulk] Calling loadInvoices()');
                        loadInvoices();
                    } else {
                        console.warn('[PDF Bulk] No refresh function found');
                    }
                } catch (refreshErr) {
                    console.error('[PDF Bulk] Error refreshing list:', refreshErr);
                }
            }, 300);
        }

        // Reset if all successful
        if (failCount === 0) {
            setTimeout(() => {
                resetUpload();
            }, 2000);
        }

    } catch (error) {
        console.error('[PDF Bulk] Exception:', error);
        showNotification('Error: ' + error.message, 'error', 5000);
        window.hideLoadingOverlay();
    } finally {
        btnUpload.disabled = originalDisabled;
        btnUpload.innerHTML = originalText;
        btnUpload.style.opacity = '1';
    }
}

function removeInvalidFile(index) {
    console.log('[PDF Bulk] Removing invalid file at index:', index);
    
    // Remove from validationResults
    validationResults.splice(index, 1);
    
    // Re-render
    renderValidationResults();
}

function resetUpload() {
    selectedFiles = [];
    validationResults = [];

    document.getElementById('fileInput').value = '';
    document.getElementById('filesContainer').innerHTML = '';
    document.getElementById('filesList').classList.remove('show');
    document.getElementById('stats').style.display = 'none';
    document.getElementById('dropZone').style.display = 'block';
    document.getElementById('validating').style.display = 'none';
    document.getElementById('btnUpload').disabled = true;
}

// Attach upload button handler
document.addEventListener('DOMContentLoaded', () => {
    const btnUpload = document.getElementById('btnUpload');
    if (btnUpload) {
        btnUpload.addEventListener('click', uploadValidFiles);
    }
});
