// Rename Faktur Pajak
// Extract nama toko & nominal from PDF, rename as: tax-NAMA_TOKO NOMINAL

let selectedFiles = [];
let processHistory = [];  // Track success/fail history

// ============================================
// Setup Drag & Drop
// ============================================
const dropzone = document.getElementById('dropzone');

dropzone.addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('border-blue-500', 'bg-blue-50');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('border-blue-500', 'bg-blue-50');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('border-blue-500', 'bg-blue-50');
    handleFiles(e.dataTransfer.files);
});

// ============================================
// Handle Files
// ============================================
function handleFiles(files) {
    selectedFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    
    if (selectedFiles.length === 0) {
        Toast.error('Pilih file PDF yang valid');
        return;
    }

    // Show file list
    const fileList = document.getElementById('fileList');
    const filesContainer = document.getElementById('filesContainer');
    const processButtonContainer = document.getElementById('processButtonContainer');
    
    fileList.classList.remove('hidden');
    filesContainer.innerHTML = selectedFiles.map((f, i) => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-3">
                <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
                </svg>
                <span class="text-sm font-medium text-gray-700">${f.name}</span>
                <span class="text-xs text-gray-500">${(f.size / 1024).toFixed(1)} KB</span>
            </div>
            <button onclick="removeFile(${i})" class="p-1 text-red-500 hover:bg-red-50 rounded">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `).join('');
    
    processButtonContainer.classList.remove('hidden');
}

// ============================================
// Remove File
// ============================================
function removeFile(index) {
    selectedFiles.splice(index, 1);
    
    if (selectedFiles.length === 0) {
        document.getElementById('fileList').classList.add('hidden');
        document.getElementById('processButtonContainer').classList.add('hidden');
        // Don't hide results - keep history visible
    } else {
        handleFiles(new DataTransfer().items.length === 0 ? selectedFiles : selectedFiles);
    }
}

// ============================================
// Process Files
// ============================================
async function processFiles() {
    if (selectedFiles.length === 0) {
        Toast.error('Tidak ada file untuk diproses');
        return;
    }

    const processBtn = event.target.closest('button');
    processBtn.disabled = true;
    processBtn.innerHTML = '<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Memproses...';

    const results = [];
    const resultsSection = document.getElementById('resultsSection');
    const resultsList = document.getElementById('resultsList');

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const result = await processFile(file);
        results.push(result);
    }

    // Update process history
    processHistory = results;

    // Display results with numbering
    resultsList.innerHTML = results.map((r, idx) => `
        <div class="p-4 rounded-lg border ${r.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}">
            <div class="flex items-start gap-3">
                ${r.success ? 
                    '<svg class="w-5 h-5 text-emerald-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>'
                    : '<svg class="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>'
                }
                <div class="flex-1">
                    <p class="font-bold ${r.success ? 'text-emerald-900' : 'text-red-900'}">${idx + 1}. ${r.originalName}</p>
                    ${r.success ? 
                        `<p class="text-sm text-emerald-700 mt-1">
                            ✓ Nama baru: <span class="font-mono text-xs">${r.newName}</span>
                            <button onclick="downloadFile('${r.newName}', '${r.fileData}')" class="ml-2 text-blue-600 hover:underline text-xs">Download</button>
                        </p>`
                        : `<p class="text-sm text-red-700 mt-1">✗ ${r.error}</p>`
                    }
                </div>
            </div>
        </div>
    `).join('');

    resultsSection.classList.remove('hidden');
    processBtn.disabled = false;
    processBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Proses & Download';

    // Auto-download successful files
    const successFiles = results.filter(r => r.success);
    if (successFiles.length > 0) {
        setTimeout(() => {
            successFiles.forEach(r => {
                downloadFile(r.newName, r.fileData);
            });
        }, 500);
    }

    // Show notification
    const failedCount = results.filter(r => !r.success).length;
    if (failedCount > 0) {
        Toast.error(`${failedCount} dari ${results.length} file gagal diproses`);
    } else {
        Toast.success(`${successFiles.length} file berhasil diproses!`);
    }
}

// ============================================
// Process Single File
// ============================================
async function processFile(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);

        console.log(`[Rename Faktur] Uploading file: ${file.name}, size: ${file.size}`);

        const response = await fetch('/api/invoice/rename-faktur', {
            method: 'POST',
            body: formData
            // NO Content-Type header - browser will set it with boundary
        });

        const result = await response.json();

        console.log(`[Rename Faktur] Response:`, result);

        if (response.ok && result.success) {
            return {
                success: true,
                originalName: file.name,
                newName: result.newName,
                namaToko: result.namaToko,
                harga: result.harga,
                ppn: result.ppn,
                fileData: result.fileData  // Base64 encoded PDF
            };
        } else {
            return {
                success: false,
                originalName: file.name,
                error: result.error || 'Gagal memproses file'
            };
        }
    } catch (err) {
        console.error('[Rename Faktur] Error:', err);
        return {
            success: false,
            originalName: file.name,
            error: err.message || 'Terjadi kesalahan saat memproses'
        };
    }
}

// ============================================
// Download File
// ============================================
function downloadFile(filename, fileData) {
    // Create blob from base64
    const byteCharacters = atob(fileData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });

    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ============================================
// Export History (not stored on server)
// ============================================
function exportHistory() {
    if (processHistory.length === 0) {
        Toast.warning('Tidak ada history untuk diexport');
        return;
    }

    const timestamp = new Date().toLocaleString('id-ID');
    const csvContent = [
        'No,Status,Nama File Original,Nama File Baru,Error Pesan,Timestamp',
        ...processHistory.map((r, idx) => 
            `${idx + 1},"${r.success ? 'BERHASIL' : 'GAGAL'}","${r.originalName}","${r.newName || '-'}","${(r.error || '-').replace(/"/g, '\\"')}","${timestamp}"`
        )
    ].join('\n');

    // Create CSV download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rename-faktur-history-${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    Toast.success('History diexport ke CSV');
}

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Rename Faktur] Initialized');
});
