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
        
        console.log('[Upload] Workbook loaded. Sheets:', workbook.SheetNames);
        
        // Try to find "REKAP LABA" sheet, otherwise use first sheet
        let sheetName = workbook.SheetNames.find(name => name.includes('REKAP')) || workbook.SheetNames[0];
        console.log('[Upload] Using sheet:', sheetName);
        
        const worksheet = workbook.Sheets[sheetName];
        
        // Skip title rows - data starts at row 4 (after "REKAP LABA" title)
        // Try without range first to see what we get
        const rawData = XLSX.utils.sheet_to_json(worksheet, { 
            defval: null, 
            blankrows: false,
            header: 1  // Get as array first to debug
        });
        
        console.log('[Upload] Raw data length:', rawData.length);
        console.log('[Upload] First 5 rows:', rawData.slice(0, 5));
        
        // Find header row (contains "TANGGAL")
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, rawData.length); i++) {
            const row = rawData[i];
            if (Array.isArray(row) && row.some(cell => cell && cell.toString().includes('TANGGAL'))) {
                headerRowIndex = i;
                console.log('[Upload] Found header at row', i, ':', row);
                break;
            }
        }
        
        if (headerRowIndex === -1) {
            alert('❌ File Excel kosong atau format tidak valid\n\nTidak dapat menemukan header row dengan kolom TANGGAL');
            return;
        }
        
        // Now parse with correct header row
        const parsedData = XLSX.utils.sheet_to_json(worksheet, { 
            defval: null, 
            blankrows: false,
            range: headerRowIndex  // Start from header row
        });
        
        console.log('[Upload] Parsed', parsedData.length, 'rows');
        console.log('[Upload] First row sample:', parsedData[0]);
        console.log('[Upload] First row keys:', parsedData[0] ? Object.keys(parsedData[0]) : 'NO DATA');
        
        if (parsedData.length === 0) {
            alert('❌ File Excel kosong atau format tidak valid\n\nPastikan file memiliki header row dengan kolom:\nTANGGAL, TOKO, FAKTUR, METODE BAYAR, JENIS TRANSAKSI, KONSUMEN, JUMLAH JUAL, KET 2');
            return;
        }
        
        // Transform data to match backend expectation
        const invoices = parsedData.map(row => ({
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

        console.log('[Upload] Response:', response.status, response.statusText);
        
        const responseText = await response.text();
        console.log('[Upload] Response text:', responseText);
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseErr) {
            console.error('[Upload] JSON parse error:', parseErr.message);
            console.error('[Upload] Raw response was:', responseText.substring(0, 500));
            return alert('❌ Error: Server returned invalid response\n\n' + responseText.substring(0, 200));
        }

        console.log('[Upload] Parsed result:', result);

        if (response.ok && result.success) {
            const msg = 'Processed: ' + (result.summary?.processed || 0) + ' invoices\n' +
                        'Duplicates: ' + (result.summary?.duplicates || 0);
            console.log('[Upload] SUCCESS');
            alert('✅ Upload Berhasil!\n' + msg + '\n\nSilakan refresh halaman untuk melihat data terbaru');
            window.closeUploadExcelModal();
            // Don't reload - let user refresh manually
            // Page reload sometimes timeout, better to let user do it
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

// ============================================
// Clear Test Data Function
// ============================================
window.clearTestData = async function() {
    if (!confirm('⚠️ PERINGATAN!\n\nIni akan menghapus SEMUA data test invoice.\nAksi tidak bisa diundo!\n\nLanjutkan?')) {
        return;
    }
    
    try {
        const token = API.getToken() || localStorage.getItem('jwt_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        console.log('[ClearTest] Sending DELETE request to /api/invoice/clear-test-data');
        
        const response = await fetch('/api/invoice/clear-test-data', {
            method: 'DELETE',
            headers: headers
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('✅ Success!\n\n' + result.message + '\n\nHalaman akan di-reload...');
            setTimeout(() => location.reload(), 1000);
        } else {
            alert('❌ Error: ' + (result.error || 'Failed to clear data'));
        }
    } catch (error) {
        console.error('[ClearTest] Error:', error);
        alert('❌ Error: ' + error.message);
    }
};

// Setup event listener for clear button
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const clearBtn = document.getElementById('btnClearTestData');
        if (clearBtn) {
            clearBtn.addEventListener('click', window.clearTestData);
            console.log('[Invoice-Init] Clear test data button handler attached');
        }
    });
} else {
    const clearBtn = document.getElementById('btnClearTestData');
    if (clearBtn) {
        clearBtn.addEventListener('click', window.clearTestData);
        console.log('[Invoice-Init] Clear test data button handler attached');
    }
}

setTimeout(() => {
    const clearBtn = document.getElementById('btnClearTestData');
    if (clearBtn) {
        clearBtn.addEventListener('click', window.clearTestData);
        console.log('[Invoice-Init] Clear test data button handler attached (delayed)');
    }
}, 500);

if (document.readyState === 'loading') {
    console.log('[Invoice-Init] Document loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', setupExcelUploadModal);
} else {
    console.log('[Invoice-Init] Document already loaded, calling setup now');
    setupExcelUploadModal();
}

console.log('[Invoice-Init] Also scheduling setup for 500ms');
setTimeout(setupExcelUploadModal, 500);