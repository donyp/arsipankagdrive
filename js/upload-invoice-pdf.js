// ============================================
// Upload Invoice PDF Flow
// ============================================

let currentInvoice = null;
let currentFile = null;

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fakturInput = document.getElementById('fakturInput');

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
            handleFileSelected(e.dataTransfer.files[0]);
        }
    });

    // Click to select
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelected(e.target.files[0]);
        }
    });

    // Enter key on faktur input
    fakturInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchFaktur();
        }
    });
});

async function searchFaktur() {
    const fakturInput = document.getElementById('fakturInput').value.trim();
    
    if (!fakturInput) {
        showError('Masukkan nomor faktur terlebih dahulu');
        return;
    }

    // Remove .pdf extension if present
    let faktur = fakturInput.replace(/\.pdf$/i, '');
    
    console.log('[PDF Upload] Searching for faktur:', faktur);
    hideError();

    try {
        const token = API.getToken() || localStorage.getItem('jwt_token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/invoice/check-faktur/${faktur}`, {
            method: 'GET',
            headers: headers
        });

        const result = await response.json();
        console.log('[PDF Upload] Check result:', result);

        if (response.ok && result.data) {
            const invoice = result.data;
            currentInvoice = invoice;

            // Show invoice info
            document.getElementById('infofaktur').textContent = invoice.faktur || '-';
            document.getElementById('infokonsumen').textContent = invoice.konsumen || '-';
            document.getElementById('infotoko').textContent = invoice.toko || '-';
            document.getElementById('infototal').textContent = 'Rp ' + parseInt(invoice.total_jumlah_jual).toLocaleString('id-ID');
            document.getElementById('infoketerangan').textContent = invoice.keterangan || '-';
            document.getElementById('invoiceInfo').classList.add('show');

            // Move to step 2
            document.getElementById('card1').style.display = 'none';
            document.getElementById('card2').style.display = 'block';
        } else {
            showError('Faktur tidak ditemukan: ' + faktur);
            currentInvoice = null;
        }
    } catch (error) {
        console.error('[PDF Upload] Error:', error);
        showError('Error: ' + error.message);
    }
}

function handleFileSelected(file) {
    console.log('[PDF] File selected:', file.name);
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        alert('❌ Hanya file PDF yang diizinkan');
        return;
    }

    currentFile = file;

    // Show file info
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = (file.size / 1024).toFixed(2) + ' KB';
    document.getElementById('fileInfo').classList.add('show');

    // Enable upload button
    document.getElementById('btnUpload').disabled = false;
}

async function uploadPdf() {
    if (!currentFile || !currentInvoice) {
        alert('❌ File atau invoice tidak valid');
        return;
    }

    const btnUpload = document.getElementById('btnUpload');
    const originalText = btnUpload.textContent;
    btnUpload.disabled = true;
    btnUpload.textContent = '⏳ Uploading...';

    try {
        console.log('[PDF] Uploading PDF for faktur:', currentInvoice.faktur);

        const formData = new FormData();
        formData.append('pdf', currentFile);

        const token = API.getToken() || localStorage.getItem('jwt_token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/invoice/upload-pdf', {
            method: 'POST',
            headers: headers,
            body: formData
        });

        const result = await response.json();
        console.log('[PDF] Response:', result);

        if (response.ok && result.success) {
            console.log('[PDF] ✅ Success!');
            
            document.getElementById('successFaktur').textContent = result.faktur;
            document.getElementById('successPath').textContent = result.remotePath;

            document.getElementById('card2').style.display = 'none';
            document.getElementById('card3').style.display = 'block';
        } else {
            alert('❌ Error: ' + (result.error || 'Upload failed'));
            btnUpload.disabled = false;
            btnUpload.textContent = originalText;
        }
    } catch (error) {
        console.error('[PDF] Exception:', error);
        alert('❌ Error: ' + error.message);
        btnUpload.disabled = false;
        btnUpload.textContent = originalText;
    }
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = '❌ ' + message;
    errorEl.classList.add('show');
}

function hideError() {
    const errorEl = document.getElementById('errorMessage');
    errorEl.classList.remove('show');
}

function goBackToSearch() {
    currentFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').classList.remove('show');
    document.getElementById('btnUpload').disabled = true;
    document.getElementById('invoiceInfo').classList.remove('show');

    document.getElementById('card1').style.display = 'block';
    document.getElementById('card2').style.display = 'none';
    hideError();
}

function resetForm() {
    currentInvoice = null;
    currentFile = null;

    document.getElementById('fakturInput').value = '';
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').classList.remove('show');
    document.getElementById('invoiceInfo').classList.remove('show');
    document.getElementById('btnUpload').disabled = true;

    document.getElementById('card1').style.display = 'block';
    document.getElementById('card2').style.display = 'none';
    document.getElementById('card3').style.display = 'none';

    hideError();
}

function goDashboard() {
    window.location.href = '/invoice-list.html';
}

// Attach upload button handler
document.addEventListener('DOMContentLoaded', () => {
    const btnUpload = document.getElementById('btnUpload');
    if (btnUpload) {
        btnUpload.addEventListener('click', uploadPdf);
    }
});
