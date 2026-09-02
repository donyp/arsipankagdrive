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

    // File input
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleExcelFileSelected(e.target.files[0]);
        }
    });
}

window.handleExcelFileSelected = function(file) {
    console.log('[File] Selected:', file.name);
    const fileInfo = document.getElementById('fileInfo');
    if (fileInfo) fileInfo.classList.remove('hidden');
};

window.uploadExcelFile = function() {
    console.log('[Upload] Starting');
    alert('Upload started!');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupExcelUploadModal);
} else {
    setupExcelUploadModal();
}
setTimeout(setupExcelUploadModal, 500);