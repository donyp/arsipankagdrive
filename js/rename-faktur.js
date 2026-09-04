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

        // Save to persistent history (only name, not file data)
        const historyToSave = results.map(r => ({
            success: r.success,
            originalName: r.originalName,
            newName: r.newName || null,
            error: r.error || null
        }));
        addToHistory(historyToSave);

        // Update process history for current session
        processHistory = results;

        // Reload and display persistent history
        loadPersistentHistory();

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
    
    // Load and display history on page load
    loadPersistentHistory();
    
    // Cleanup old history on page load (items older than 1 day)
    cleanupOldHistory();
});

// ============================================
// Persistent History Management (localStorage)
// ============================================
const HISTORY_STORAGE_KEY = 'renameFakturHistory';
const HISTORY_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const ITEMS_PER_PAGE = 10;

function getHistoryFromStorage() {
    try {
        const data = localStorage.getItem(HISTORY_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (err) {
        console.error('[History] Error reading from localStorage:', err);
        return [];
    }
}

function saveHistoryToStorage(history) {
    try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (err) {
        console.error('[History] Error saving to localStorage:', err);
    }
}

function addToHistory(results) {
    const history = getHistoryFromStorage();
    
    // Add new results with timestamp
    const newEntries = results.map(r => ({
        ...r,
        timestamp: new Date().getTime(),
        id: Math.random().toString(36).substring(2, 11)
    }));
    
    // Add to beginning (newest first)
    const updated = [...newEntries, ...history];
    saveHistoryToStorage(updated);
}

function cleanupOldHistory() {
    const now = new Date().getTime();
    const history = getHistoryFromStorage();
    
    // Keep only items from last 24 hours
    const filtered = history.filter(item => {
        const age = now - item.timestamp;
        return age < HISTORY_EXPIRY_MS;
    });
    
    if (filtered.length !== history.length) {
        console.log(`[History] Removed ${history.length - filtered.length} expired items`);
        saveHistoryToStorage(filtered);
    }
}

function loadPersistentHistory(page = 1) {
    const history = getHistoryFromStorage();
    const resultsSection = document.getElementById('resultsSection');
    const resultsList = document.getElementById('resultsList');
    
    if (history.length === 0) {
        resultsSection.classList.add('hidden');
        return;
    }
    
    // Pagination
    const totalItems = history.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const pageItems = history.slice(startIdx, endIdx);
    
    // Display results - compact version
    resultsList.innerHTML = pageItems.map((r, idx) => {
        const itemIdx = startIdx + idx + 1;
        const timestamp = new Date(r.timestamp).toLocaleString('id-ID');
        
        return `
            <div class="flex items-center justify-between p-2 rounded-lg border ${r.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    ${r.success ? 
                        '<svg class="w-4 h-4 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>'
                        : '<svg class="w-4 h-4 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>'
                    }
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold ${r.success ? 'text-emerald-900' : 'text-red-900'} truncate">
                            ${itemIdx}. ${r.originalName}
                        </p>
                        ${r.success ? 
                            `<p class="text-xs ${r.success ? 'text-emerald-700' : 'text-red-700'} truncate">
                                ${r.newName}
                            </p>`
                            : `<p class="text-xs text-red-700">${r.error}</p>`
                        }
                        <p class="text-xs text-gray-500">${timestamp}</p>
                    </div>
                </div>
                <button onclick="deleteHistoryItem('${r.id}')" class="p-1 text-red-500 hover:bg-red-100 rounded flex-shrink-0 ml-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        `;
    }).join('');
    
    resultsSection.classList.remove('hidden');
    
    // Add pagination if needed
    if (totalPages > 1) {
        const paginationHTML = `
            <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                <p class="text-xs text-gray-600">Hal ${page}/${totalPages} (${totalItems})</p>
                <div class="flex gap-2">
                    ${page > 1 ? `<button onclick="loadPersistentHistory(${page - 1})" class="px-3 py-1 text-xs rounded bg-blue-100 text-blue-600 hover:bg-blue-200">← Prev</button>` : ''}
                    ${page < totalPages ? `<button onclick="loadPersistentHistory(${page + 1})" class="px-3 py-1 text-xs rounded bg-blue-100 text-blue-600 hover:bg-blue-200">Next →</button>` : ''}
                </div>
            </div>
        `;
        resultsList.insertAdjacentHTML('afterend', paginationHTML);
    }
}

function deleteHistoryItem(id) {
    const history = getHistoryFromStorage();
    const filtered = history.filter(item => item.id !== id);
    saveHistoryToStorage(filtered);
    
    // Reload history display
    loadPersistentHistory();
    Toast.success('History item dihapus');
}

function clearAllHistory() {
    if (confirm('Hapus semua history rename faktur?')) {
        localStorage.removeItem(HISTORY_STORAGE_KEY);
        document.getElementById('resultsSection').classList.add('hidden');
        Toast.success('Semua history dihapus');
    }
}

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
