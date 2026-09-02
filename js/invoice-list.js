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
    
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert('Pilih file terlebih dahulu');
        return;
    }

    const file = fileInput.files[0];
    console.log('[Upload] File selected:', file.name, file.size, 'bytes');
    
    const originalText = uploadBtn.textContent;
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Parsing...';

    try {
        // Parse Excel in browser first
        console.log('[Upload] Reading file...');
        const arrayBuffer = await file.arrayBuffer();
        
        console.log('[Upload] Parsing Excel with XLSX...');
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: null, blankrows: false });
        
        console.log('[Upload] Parsed', rawData.length, 'rows');
        
        if (rawData.length === 0) {
            alert('❌ File Excel kosong atau format tidak valid');
            return;
        }
        
        // Transform data to match backend expectation
        const invoices = rawData.map(row => ({
            tanggal: row['TANGGAL'] || row['tanggal'],
            toko: row['TOKO'] || row['toko'],
            faktur: row['FAKTUR'] || row['faktur'],
            metode_bayar: row['METODE BAYAR'] || row['metode_bayar'],
            jenis_transaksi: row['JENIS TRANSAKSI'] || row['jenis_transaksi'],
            konsumen: row['KONSUMEN'] || row['konsumen'],
            total_jumlah_jual: parseFloat(row['JUMLAH JUAL'] || row['jumlah_jual'] || 0),
            keterangan: row['KET 2'] || row['ket_2'] || 'NON PPN'
        })).filter(inv => inv.faktur); // Remove rows without faktur
        
        console.log('[Upload] Processed', invoices.length, 'valid invoices');
        
        uploadBtn.textContent = 'Uploading...';
        
        // Get token
        const token = API.getToken() || localStorage.getItem('jwt_token');
        
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        console.log('[Upload] Posting JSON to /api/invoice/upload-excel-data');
        const response = await fetch('/api/invoice/upload-excel-data', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                filename: file.name,
                data: invoices
            })
        });

        console.log('[Upload] Response:', response.status);
        
        const responseText = await response.text();
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseErr) {
            console.error('[Upload] JSON parse error:', parseErr.message);
            return alert('❌ Error: Server returned invalid response');
        }

        if (response.ok && result.success) {
            const msg = 'Processed: ' + (result.summary?.processed || 0) + ' invoices\n' +
                        'Duplicates: ' + (result.summary?.duplicates || 0);
            console.log('[Upload] SUCCESS');
            alert('✅ Upload Berhasil!\n' + msg);
            window.closeUploadExcelModal();
            // Reload page to show new data
            location.reload();
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