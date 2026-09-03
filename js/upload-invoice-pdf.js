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
    `;
    document.head.appendChild(style);
}

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
    btnUpload.disabled = true;
    btnUpload.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

    // Show loading overlay
    if (window.showLoadingOverlay) {
        window.showLoadingOverlay(`Uploading ${validFiles.length} file...`);
    }

    try {
        const token = API.getToken() || localStorage.getItem('jwt_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // OPTIMIZATION: Upload files in parallel (up to 3 concurrent uploads)
        // Instead of sequential upload, use Promise.all with concurrency limit
        const CONCURRENT_LIMIT = 3;
        let successCount = 0;
        let failCount = 0;

        // Create upload tasks
        const uploadTasks = validFiles.map((fileResult, index) => async () => {
            try {
                const formData = new FormData();
                formData.append('pdf', fileResult.file);
                
                console.log(`[PDF Bulk] Uploading (${index + 1}/${validFiles.length}): ${fileResult.file.name}`);
                
                // Update loading text
                if (window.showLoadingOverlay) {
                    window.showLoadingOverlay(`Uploading ${index + 1} of ${validFiles.length}...`);
                }

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
        if (window.hideLoadingOverlay) {
            window.hideLoadingOverlay();
        }

        // Show final result message
        const message = `✅ ${successCount}/${validFiles.length} file berhasil diupload${failCount > 0 ? ` (${failCount} gagal)` : ''}`;
        showNotification(message, successCount > 0 ? 'success' : 'error', 5000);

        // Reset if all successful
        if (failCount === 0) {
            resetUpload();
        }

    } catch (error) {
        console.error('[PDF Bulk] Exception:', error);
        showNotification('Error: ' + error.message, 'error', 5000);
        if (window.hideLoadingOverlay) {
            window.hideLoadingOverlay();
        }
    } finally {
        btnUpload.disabled = false;
        btnUpload.innerHTML = originalText;
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
