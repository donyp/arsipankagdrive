// ============================================
// Bulk Upload Invoice PDF with Validation
// ============================================

let selectedFiles = [];
let validationResults = [];

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
        alert('❌ Hanya file PDF yang diizinkan');
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
                        Faktur: ${fakturText} ${result.valid ? `| ${result.invoice.konsumen}` : `| ${statusText}`}
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
        alert('Tidak ada file valid untuk diupload');
        return;
    }

    const btnUpload = document.getElementById('btnUpload');
    const originalText = btnUpload.innerHTML;
    btnUpload.disabled = true;
    btnUpload.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

    try {
        const token = API.getToken() || localStorage.getItem('jwt_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Upload each file
        let successCount = 0;
        let failCount = 0;

        for (const fileResult of validFiles) {
            try {
                const formData = new FormData();
                // File dikirim dengan key 'pdf'
                formData.append('pdf', fileResult.file);
                // Faktur diekstrak dari filename (sudah ada di validationResults)
                
                console.log(`[PDF Bulk] Uploading: ${fileResult.file.name} (faktur: ${fileResult.faktur})`);

                const response = await fetch('/api/invoice/upload-pdf', {
                    method: 'POST',
                    headers: headers,
                    body: formData
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    successCount++;
                    console.log('[PDF Bulk] ✓ Uploaded:', fileResult.faktur);
                } else {
                    failCount++;
                    console.error('[PDF Bulk] ✗ Upload failed:', fileResult.faktur, result.error);
                }
            } catch (error) {
                failCount++;
                console.error('[PDF Bulk] Upload error:', fileResult.faktur, error);
            }
        }

        // Show result message
        const message = `✅ ${successCount} file berhasil diupload${failCount > 0 ? `, ${failCount} file gagal` : ''}`;
        alert(message);

        // Reset if all successful
        if (failCount === 0) {
            resetUpload();
        }

    } catch (error) {
        console.error('[PDF Bulk] Exception:', error);
        alert('Error: ' + error.message);
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
