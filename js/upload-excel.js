// ============================================
// Upload Excel Flow
// ============================================

let currentFile = null;
let parsedData = null;

// Step 1: File Selection
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const btnCheck = document.getElementById('btnCheck');
    const btnBack1 = document.getElementById('btnBack1');
    const btnPreview = document.getElementById('btnPreview');
    const btnBack2 = document.getElementById('btnBack2');
    const btnUpload = document.getElementById('btnUpload');

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

    // Button handlers
    btnCheck.addEventListener('click', () => checkData());
    btnBack1.addEventListener('click', () => resetUpload());
    btnPreview.addEventListener('click', () => showPreview());
    btnBack2.addEventListener('click', () => goToValidation());
    btnUpload.addEventListener('click', () => uploadData());
});

function handleFileSelected(file) {
    console.log('[Upload] File selected:', file.name);
    
    if (!file.name.toLowerCase().endsWith('.xls') && !file.name.toLowerCase().endsWith('.xlsx')) {
        alert('❌ Hanya file Excel (.xls, .xlsx) yang diizinkan');
        return;
    }

    currentFile = file;

    // Show file info
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
    document.getElementById('fileInfo').classList.add('show');

    // Enable check button
    document.getElementById('btnCheck').disabled = false;
}

async function checkData() {
    if (!currentFile) return;

    console.log('[Upload] Checking data...');
    document.getElementById('card1').style.display = 'none';
    document.getElementById('card2').style.display = 'block';
    document.getElementById('loadingValidation').classList.add('show');
    updateStep(2);

    try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        
        // Find REKAP LABA sheet
        let sheetName = workbook.SheetNames.find(name => name.includes('REKAP')) || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Get raw data to find header
        const rawData = XLSX.utils.sheet_to_json(worksheet, { 
            defval: null, 
            blankrows: false,
            header: 1
        });

        // Find header row
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, rawData.length); i++) {
            const row = rawData[i];
            if (Array.isArray(row) && row.some(cell => cell && cell.toString().includes('TANGGAL'))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            throw new Error('Header row tidak ditemukan');
        }

        // Parse with correct header
        const parsed = XLSX.utils.sheet_to_json(worksheet, { 
            defval: null, 
            blankrows: false,
            range: headerRowIndex
        });

        if (parsed.length === 0) {
            throw new Error('File Excel kosong atau tidak memiliki data');
        }

        // Transform and aggregate
        let invoices = parsed.map(row => {
            // Normalize toko values
            let tokoValue = (row['TOKO'] || row['toko'] || '').trim().toUpperCase();
            
            console.log('[Upload] Raw toko:', row['TOKO'], '-> Normalized:', tokoValue);
            
            // Map all toko variations to their normalized names
            if (tokoValue.includes('PEMALANG')) {
                tokoValue = 'ANKA PEMALANG';
            } else if (tokoValue.includes('ANKA') || tokoValue === 'ANKA') {
                tokoValue = 'ANKA BEKASI';
            }
            
            return {
                tanggal: row['TANGGAL'] || row['tanggal'],
                toko: tokoValue,
                faktur: row['FAKTUR'] || row['faktur'],
                metode_bayar: row['METODE BAYAR'] || row['metode_bayar'],
                jenis_transaksi: row['JENIS TRANSAKSI'] || row['jenis_transaksi'],
                konsumen: row['KONSUMEN'] || row['konsumen'],
                total_jumlah_jual: parseFloat(row['JUMLAH JUAL'] || row['jumlah_jual'] || 0),
                keterangan: row['KET 2'] || row['ket_2'] || 'NON PPN'
            };
        }).filter(inv => inv.faktur);

        // Aggregate by faktur
        const aggregated = {};
        invoices.forEach(inv => {
            if (aggregated[inv.faktur]) {
                aggregated[inv.faktur].total_jumlah_jual += inv.total_jumlah_jual;
                aggregated[inv.faktur].item_count = (aggregated[inv.faktur].item_count || 1) + 1;
            } else {
                aggregated[inv.faktur] = { ...inv, item_count: 1 };
            }
        });

        parsedData = Object.values(aggregated);
        console.log('[Upload] Parsed:', parsedData.length, 'unique fakturs from', parsed.length, 'total rows');

        // Show validation results
        document.getElementById('totalRows').textContent = parsed.length;
        document.getElementById('uniqueFakturs').textContent = parsedData.length;
        document.getElementById('loadingValidation').classList.remove('show');
        document.getElementById('validationResult').classList.add('show');

    } catch (error) {
        console.error('[Upload] Error:', error);
        alert('❌ Error: ' + error.message);
        resetUpload();
    }
}

function showPreview() {
    if (!parsedData) return;

    console.log('[Upload] Showing preview...');
    document.getElementById('card2').style.display = 'none';
    document.getElementById('card3').style.display = 'block';
    updateStep(3);

    // Show first 5 items
    const preview = parsedData.slice(0, 5);
    const tbody = document.getElementById('previewTable');
    if (!tbody) return;
    
    // Render preview immediately WITHOUT zona (non-blocking)
    tbody.innerHTML = preview.map(inv => `
        <tr>
            <td>${inv.tanggal || '-'}</td>
            <td><strong>${inv.faktur || '-'}</strong></td>
            <td>${inv.konsumen || '-'}</td>
            <td>${inv.toko || '-'}</td>
            <td data-konsumen="${inv.konsumen || ''}">⏳ Loading...</td>
            <td>Rp ${parseInt(inv.total_jumlah_jual).toLocaleString('id-ID')}</td>
            <td>${inv.keterangan || '-'}</td>
        </tr>
    `).join('');
    
    // Fetch zona data in background (don't block render)
    setTimeout(async () => {
        try {
            const client = window.supabase;
            if (!client) {
                console.warn('[Preview] window.supabase not available');
                return;
            }
            
            const { data: tokoData } = await client
                .from('toko')
                .select('nama, zona_id, zonas(kode, nama)');
            
            if (tokoData) {
                // Update zona cells
                tokoData.forEach(t => {
                    const cells = tbody.querySelectorAll(`[data-konsumen="${t.nama}"]`);
                    cells.forEach(cell => {
                        cell.innerHTML = `<strong>${t.zonas?.kode || '?'}</strong><br><span style="font-size: 10px; color: #666;">${t.zonas?.nama || 'Unknown'}</span>`;
                    });
                });
            }
        } catch (err) {
            console.warn('[Preview] Zone lookup failed:', err);
            // Silently fail - keep "Loading..." or let user continue
        }
    }, 100);
}

function goToValidation() {
    document.getElementById('card3').style.display = 'none';
    document.getElementById('card2').style.display = 'block';
    updateStep(2);
}

async function uploadData() {
    if (!parsedData || parsedData.length === 0) return;

    const btnUpload = document.getElementById('btnUpload');
    const originalText = btnUpload.textContent;
    btnUpload.disabled = true;
    btnUpload.textContent = '⏳ Uploading...';

    try {
        console.log('[Upload] Uploading', parsedData.length, 'invoices...');

        const token = API.getToken() || localStorage.getItem('jwt_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/invoice/upload-excel-data', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                filename: currentFile.name,
                data: parsedData
            })
        });

        const result = await response.json();
        console.log('[Upload] Response:', result);

        if (response.ok && result.success) {
            const processed = result.summary?.processed || 0;
            document.getElementById('uploadedCount').textContent = processed;
            
            document.getElementById('card3').style.display = 'none';
            document.getElementById('card4').style.display = 'block';
            updateStep(4);

            console.log('[Upload] ✅ Success!');
        } else {
            alert('❌ Error: ' + (result.error || 'Upload failed'));
            btnUpload.disabled = false;
            btnUpload.textContent = originalText;
        }
    } catch (error) {
        console.error('[Upload] Exception:', error);
        alert('❌ Error: ' + error.message);
        btnUpload.disabled = false;
        btnUpload.textContent = originalText;
    }
}

function resetUpload() {
    currentFile = null;
    parsedData = null;

    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').classList.remove('show');
    document.getElementById('btnCheck').disabled = true;

    document.getElementById('card1').style.display = 'block';
    document.getElementById('card2').style.display = 'none';
    document.getElementById('card3').style.display = 'none';
    document.getElementById('card4').style.display = 'none';

    updateStep(1);
}

function goToDashboard() {
    // Redirect to main dashboard
    window.location.href = '/dashboard.html';
}

function updateStep(activeStep) {
    for (let i = 1; i <= 4; i++) {
        const step = document.getElementById(`step${i}`);
        if (i < activeStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (i === activeStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    }
}
