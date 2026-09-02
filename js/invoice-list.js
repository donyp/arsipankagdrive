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
    console.log('[Invoice-Setup] setupExcelUploadModal called');
    
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('excelFileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    
    console.log('[Invoice-Setup] Elements found:', {
        dropZone: !!dropZone,
        fileInput: !!fileInput,
        uploadBtn: !!uploadBtn
    });
    
    if (!dropZone || !fileInput || !uploadBtn) {
        console.log('[Invoice-Setup] Elements not ready, retrying in 100ms');
        setTimeout(setupExcelUploadModal, 100);
        return;
    }
    
    console.log('[Invoice-Setup] All elements found, setting up listeners');
    
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
        console.log('[Invoice-Setup] File dropped');
        if (e.dataTransfer.files.length > 0) {
            handleExcelFileSelected(e.dataTransfer.files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', function(e) {
        console.log('[Invoice-Setup] File selected via input');
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

    console.log('[Invoice-Setup] Button elements:', {
        btnUploadExcel: !!btnUploadExcel,
        btnSelectFile: !!btnSelectFile,
        btnCancel: !!btnCancel,
        btnClose: !!btnClose,
        backdrop: !!backdrop
    });

    if (btnUploadExcel) {
        btnUploadExcel.addEventListener('click', function() {
            console.log('[Invoice-Setup] btnUploadExcel clicked');
            window.openUploadExcelModal();
        });
        console.log('[Invoice-Setup] Bound: btnUploadExcel');
    }
    if (btnSelectFile) {
        btnSelectFile.addEventListener('click', function() {
            console.log('[Invoice-Setup] btnSelectFile clicked');
            fileInput.click();
        });
        console.log('[Invoice-Setup] Bound: btnSelectFile');
    }
    if (btnCancel) {
        btnCancel.addEventListener('click', function() {
            console.log('[Invoice-Setup] btnCancel clicked');
            window.closeUploadExcelModal();
        });
        console.log('[Invoice-Setup] Bound: btnCancel');
    }
    if (btnClose) {
        btnClose.addEventListener('click', function() {
            console.log('[Invoice-Setup] btnClose clicked');
            window.closeUploadExcelModal();
        });
        console.log('[Invoice-Setup] Bound: btnClose');
    }
    if (backdrop) {
        backdrop.addEventListener('click', function() {
            console.log('[Invoice-Setup] backdrop clicked');
            window.closeUploadExcelModal();
        });
        console.log('[Invoice-Setup] Bound: backdrop');
    }
if (uploadBtn) {
        uploadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[Invoice-Setup] uploadBtn clicked - calling uploadExcelFile');
            window.uploadExcelFile();
        });
        console.log('[Invoice-Setup] Bound: uploadBtn');
    }
    
    console.log('[Invoice-Setup] Setup complete');
    
    // Fallback: Use event delegation for upload button in case element gets replaced
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'uploadBtn') {
            console.log('[Invoice-Delegation] uploadBtn clicked via delegation');
            window.uploadExcelFile();
        }
    }, true); // Use capture phase
}

window.handleExcelFileSelected = function(file) {
    console.log('[File] Selected:', file.name, file.size, 'bytes');
    
    // IMPORTANT: Set file to input element so uploadExcelFile can find it
    const fileInput = document.getElementById('excelFileInput');
    if (fileInput) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        console.log('[File] Set to excelFileInput');
    }
    
    // Show file info
    const fileInfo = document.getElementById('fileInfo');
    if (fileInfo) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = (file.size / 1024).toFixed(2) + ' KB';
        document.getElementById('fileType').textContent = file.type || 'unknown';
        fileInfo.classList.remove('hidden');
        console.log('[File] File info displayed');
    }
};

window.uploadExcelFile = async function() {
    console.log('[Upload] uploadExcelFile called');
    
    const fileInput = document.getElementById('excelFileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    
    console.log('[Upload] fileInput:', fileInput ? 'found' : 'NOT FOUND');
    console.log('[Upload] uploadBtn:', uploadBtn ? 'found' : 'NOT FOUND');
    
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        console.warn('[Upload] No file selected');
        alert('Pilih file terlebih dahulu');
        return;
    }

    const file = fileInput.files[0];
    console.log('[Upload] File selected:', file.name, file.size, 'bytes');
    
    const originalText = uploadBtn.textContent;
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    try {
        const formData = new FormData();
        formData.append('excel', file);

        // Get token from localStorage
        const token = localStorage.getItem('authToken');
        console.log('[Upload] Token present:', !!token, 'length:', token?.length);

        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log('[Upload] Adding Authorization header');
        }

        console.log('[Upload] Posting to /api/invoice/upload-excel');
        const response = await fetch('/api/invoice/upload-excel', {
            method: 'POST',
            body: formData,
            headers: headers
        });

        console.log('[Upload] Response received. Status:', response.status, response.statusText);
        console.log('[Upload] Response content-type:', response.headers.get('content-type'));
        
        // Get response text first
        const responseText = await response.text();
        console.log('[Upload] Response text (first 200 chars):', responseText.substring(0, 200));
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseErr) {
            console.error('[Upload] JSON parse error:', parseErr.message);
            console.error('[Upload] Full response:', responseText);
            return alert('❌ Error: Server returned invalid response\n\nResponse:\n' + responseText.substring(0, 500));
        }

        console.log('[Upload] Parsed result:', result);

        if (response.ok && result.success) {
            const msg = 'Upload successful!\nProcessed: ' + (result.summary?.processed || 0) + ' invoices';
            console.log('[Upload] SUCCESS');
            alert('✅ Upload Berhasil!\n' + msg);
            window.closeUploadExcelModal();
        } else {
            const errMsg = result.error || 'Upload failed';
            console.log('[Upload] FAILED:', errMsg);
            alert('❌ Error: ' + errMsg);
        }
    } catch (error) {
        console.error('[Upload] Exception:', error);
        alert('❌ Error: ' + error.message);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = originalText;
        console.log('[Upload] Done');
    }
};

if (document.readyState === 'loading') {
    console.log('[Invoice-Init] Document loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', setupExcelUploadModal);
} else {
    console.log('[Invoice-Init] Document already loaded, calling setup now');
    setupExcelUploadModal();
}

console.log('[Invoice-Init] Also scheduling setup for 500ms');
setTimeout(setupExcelUploadModal, 500);