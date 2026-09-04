// Rename Faktur Pajak
// Extract nama toko & nominal from PDF, rename as: tax-NAMA_TOKO NOMINAL

let selectedFiles = [];

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
    let fileArray = Array.from(files).filter(f => f.type === 'application/pdf');
    
    if (fileArray.length === 0) {
        Toast.error('Pilih file PDF yang valid');
        return;
    }

    // Max 10 files limit
    const MAX_FILES = 10;
    if (fileArray.length > MAX_FILES) {
        Toast.warning(`Maksimal ${MAX_FILES} file sekaligus. ${fileArray.length - MAX_FILES} file dihapus dari antrian.`);
        fileArray = fileArray.slice(0, MAX_FILES);
    }

    selectedFiles = fileArray;

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
                <span class="text-sm font-medium text-gray-700">${i + 1}. ${f.name}</span>
                <span class="text-xs text-gray-500">${(f.size / 1024).toFixed(1)} KB</span>
            </div>
            <button onclick="removeFile(${i})" class="p-1 text-red-500 hover:bg-red-50 rounded">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `).join('');

    // Add max files note
    const maxFilesNote = document.createElement('p');
    maxFilesNote.className = 'text-xs text-gray-500 mt-3 italic';
    maxFilesNote.textContent = `Maksimal ${MAX_FILES} file, ${selectedFiles.length} file dipilih`;
    filesContainer.appendChild(maxFilesNote);
    
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

    // Hide file list and process button, show loading modal
    document.getElementById('fileList').classList.add('hidden');
    document.getElementById('processButtonContainer').classList.add('hidden');
    showLoadingModal(selectedFiles.length);

    const results = [];
    const resultsSection = document.getElementById('resultsSection');
    const resultsList = document.getElementById('resultsList');

    try {
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            console.log(`[Rename Faktur] Processing file ${i + 1}/${selectedFiles.length}: ${file.name}`);
            
            // Update loading modal
            updateLoadingModal(i + 1, file.name, selectedFiles.length);
            
            const result = await processFile(file);
            results.push(result);
        }

        // Hide loading modal
        hideLoadingModal();

        // Auto-download successful files
        const successFiles = results.filter(r => r.success);
        if (successFiles.length > 0) {
            setTimeout(() => {
                successFiles.forEach(r => {
                    downloadFile(r.newName, r.fileData);
                });
            }, 500);
        }

        // Show notification summary only (no history)
        const failedCount = results.filter(r => !r.success).length;
        if (failedCount > 0) {
            Toast.error(`${failedCount} dari ${results.length} file gagal diproses`);
        } else {
            Toast.success(`${successFiles.length} file berhasil diproses!`);
        }
    } finally {
        // Always re-enable button at the end (success or error)
        processBtn.disabled = false;
        
        // Clear selected files dan reset UI untuk bisa rename lagi
        selectedFiles = [];
        document.getElementById('fileList').classList.add('hidden');
        document.getElementById('processButtonContainer').classList.add('hidden');
        console.log('[Rename Faktur] Process complete - button re-enabled for next batch');
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

        console.log(`[Rename Faktur] Response status: ${response.status}`, result);

        if (!response.ok) {
            console.error(`[Rename Faktur] Error response:`, {
                status: response.status,
                statusText: response.statusText,
                error: result.error,
                details: result
            });
            
            // Check if it's a "not ready yet" error
            if (response.status === 500 && result.error && result.error.includes('not ready')) {
                return {
                    success: false,
                    originalName: file.name,
                    error: 'Sistem masih sedang diinisialisasi... Silakan coba lagi dalam beberapa detik'
                };
            }
            
            return {
                success: false,
                originalName: file.name,
                error: result.error || `HTTP ${response.status}: ${response.statusText}`
            };
        }

        if (result.success) {
            console.log(`[Rename Faktur] Success:`, result.newName);
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
            console.error(`[Rename Faktur] Processing failed:`, result.error);
            return {
                success: false,
                originalName: file.name,
                error: result.error || 'Gagal memproses file'
            };
        }
    } catch (err) {
        console.error('[Rename Faktur] Network/Parse error:', err);
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
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Rename Faktur] Initialized');
});

// ============================================
// Loading Modal Functions
// ============================================
function showLoadingModal(totalFiles) {
    const modal = document.getElementById('loadingModal');
    document.getElementById('loadingTotalFiles').textContent = totalFiles;
    document.getElementById('loadingProgressText').textContent = '0';
    document.getElementById('loadingProgressBar').style.width = '0%';
    modal.classList.remove('hidden');
}

function hideLoadingModal() {
    const modal = document.getElementById('loadingModal');
    modal.classList.add('hidden');
}

function updateLoadingModal(current, fileName, total) {
    // Update progress bar
    const percentage = (current / total) * 100;
    document.getElementById('loadingProgressBar').style.width = percentage + '%';
    
    // Update counters
    document.getElementById('loadingProgressText').textContent = current;
    
    // Update current file being processed
    const displayName = fileName.length > 35 ? fileName.substring(0, 32) + '...' : fileName;
    document.getElementById('loadingCurrentFile').textContent = displayName;
    
    // Update status message based on progress
    const statusEl = document.getElementById('loadingStatus');
    if (current < total) {
        statusEl.textContent = `Mengscan file ${current} dari ${total}...`;
    } else {
        statusEl.textContent = 'Menyelesaikan proses...';
    }
}
