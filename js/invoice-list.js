// Invoice Excel Upload Modal
let invoiceCurrentPage = 0;

window.openUploadExcelModal = function() {
    const modal = document.getElementById('uploadExcelModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.closeUploadExcelModal = function() {
    const modal = document.getElementById('uploadExcelModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    const input = document.getElementById('excelFileInput');
    if (input) input.value = '';
};

function setupExcelUploadModal() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('excelFileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    
    if (!dropZone || !fileInput || !uploadBtn) {
        console.log('[Invoice] Waiting for modal...');
        setTimeout(setupExcelUploadModal, 100);
        return;
    }
    
    console.log('[Invoice] Setting up modal');
    
    // Drag over
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '#3b82f6';
    });

    // Drag leave
    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '#93c5fd';
    });

    // Drop
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files.length > 0) {
            handleExcelFileSelected(e.dataTransfer.files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleExcelFileSelected(e.target.files[0]);
        }
    });
    
    // Button listeners
    const btnUploadExcel = document.getElementById('btnUploadExcel');
    const btnSelectFile = document.getElementById('btnSelectFile');
    const btnCancel = document.getElementById('btnCancel');
    const btnClose = document.getElementById('modal-close-btn');
    const backdrop = document.getElementById('modal-backdrop');

    if (btnUploadExcel) {
        btnUploadExcel.addEventListener('click', window.openUploadExcelModal);
        console.log('[Invoice] Bound: btnUploadExcel');
    }
    if (btnSelectFile) {
        btnSelectFile.addEventListener('click', function() {
            fileInput.click();
        });
        console.log('[Invoice] Bound: btnSelectFile');
    }
    if (btnCancel) {
        btnCancel.addEventListener('click', window.closeUploadExcelModal);
        console.log('[Invoice] Bound: btnCancel');
    }
    if (btnClose) {
        btnClose.addEventListener('click', window.closeUploadExcelModal);
        console.log('[Invoice] Bound: btnClose');
    }
    if (backdrop) {
        backdrop.addEventListener('click', window.closeUploadExcelModal);
        console.log('[Invoice] Bound: backdrop');
    }
    if (uploadBtn) {
        uploadBtn.addEventListener('click', window.uploadExcelFile);
        console.log('[Invoice] Bound: uploadBtn');
    }
}

window.handleExcelFileSelected = function(file) {
    console.log('[File] Selected:', file.name);
    const fileInfo = document.getElementById('fileInfo');
    if (fileInfo) fileInfo.classList.remove('hidden');
};

window.uploadExcelFile = async function() {
    console.log('[Upload] Starting upload');
    
    const fileInput = document.getElementById('excelFileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert('Pilih file terlebih dahulu');
        return;
    }

    const file = fileInput.files[0];
    const originalText = uploadBtn.textContent;
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    try {
        console.log('[Upload] File:', file.name, 'Size:', file.size);
        
        const formData = new FormData();
        formData.append('excel', file);

        console.log('[Upload] Sending to /api/invoice/upload-excel');
        const response = await fetch('/api/invoice/upload-excel', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        console.log('[Upload] Response status:', response.status);
        console.log('[Upload] Result:', result);

        if (response.ok && result.message) {
            alert('✅ Upload Berhasil!\\n\\n' + result.message);
            closeUploadExcelModal();
        } else {
            alert('❌ Error: ' + (result.error || 'Upload gagal'));
        }
    } catch (error) {
        console.error('[Upload] Error:', error);
        alert('❌ Error: ' + error.message);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = originalText;
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupExcelUploadModal);
} else {
    setupExcelUploadModal();
}
setTimeout(setupExcelUploadModal, 500);