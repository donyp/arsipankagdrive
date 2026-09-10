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
            // Show button to view history after 1 second
            setTimeout(() => {
                showHistoryActionButton(successFiles);
            }, 1000);
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
            
            // Log rename to history
            try {
                const token = API.getToken();
                if (token) {
                    const logResponse = await fetch('/api/faktur-pajak/log-rename', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            faktur: result.newName.split('-')[0] || 'unknown',
                            old_filename: file.name,
                            new_filename: result.newName,
                            old_path: '',
                            new_path: '',
                            reason: 'Manual rename via UI',
                            zona_id: null,
                            notes: `Toko: ${result.namaToko}, Harga: ${result.harga}`
                        })
                    });
                    
                    if (logResponse.ok) {
                        const logResult = await logResponse.json();
                        console.log('[Rename Faktur] History logged:', logResult.history_id);
                    } else {
                        console.warn('[Rename Faktur] Failed to log history:', logResponse.status);
                    }
                } else {
                    console.warn('[Rename Faktur] No auth token for logging');
                }
            } catch (err) {
                console.warn('[Rename Faktur] Error logging history:', err.message);
            }
            
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
    console.log('[Rename Faktur] DOMContentLoaded event triggered');
    
    // Wait for auth to initialize
    let retries = 0;
    const maxRetries = 10;
    
    const waitForAuth = setInterval(async () => {
        retries++;
        const token = API.getToken();
        
        if (token) {
            clearInterval(waitForAuth);
            console.log('[Rename Faktur] Auth ready, loading history');
            loadLatestHistory();
        } else if (retries >= maxRetries) {
            clearInterval(waitForAuth);
            console.warn('[Rename Faktur] Auth failed after', maxRetries, 'retries');
        } else {
            console.log('[Rename Faktur] Waiting for auth... attempt', retries);
        }
    }, 200);
});

async function loadLatestHistory() {
    try {
        const token = API.getToken();
        if (!token) {
            console.warn('[Rename Faktur] No auth token for loading history');
            return;
        }
        
        console.log('[Rename Faktur] Loading history from API...');
        
        // Get recent renames from last 24 hours
        const response = await fetch('/api/faktur-pajak/rename-history/recent?hours=24&limit=20', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('[Rename Faktur] History API response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('[Rename Faktur] Recent history loaded:', data.history.length, 'items');
            console.log('[Rename Faktur] History data:', JSON.stringify(data.history, null, 2));
            
            if (data.history && data.history.length > 0) {
                displayHistorySection(data.history);
            } else {
                console.log('[Rename Faktur] No history records found');
            }
        } else {
            const errData = await response.json().catch(() => ({}));
            console.warn('[Rename Faktur] Failed to load recent history:', response.status, errData);
        }
    } catch (err) {
        console.warn('[Rename Faktur] Error loading recent history:', err.message, err.stack);
    }
}

// ============================================
// History Modal Functions - REMOVED
// Using section instead of modal
// ============================================

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

function showHistoryActionButton(successFiles) {
    // Get latest faktur from success files for history query
    if (successFiles.length === 0) return;
    
    const firstFileName = successFiles[0].newName;
    const parts = firstFileName.split('-');
    const faktur = parts[0] || successFiles[0].originalName;
    
    console.log('[Rename Faktur] Loading history for faktur:', faktur);
    loadAndDisplayHistory(faktur);
}

async function loadAndDisplayHistory(faktur) {
    try {
        const token = API.getToken();
        if (!token) {
            console.warn('[Rename Faktur] No auth token');
            return;
        }
        
        const response = await fetch(`/api/faktur-pajak/rename-history/${encodeURIComponent(faktur)}?limit=10`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('[Rename Faktur] History loaded:', data.history.length, 'items');
            // Clear and display fresh history
            displayHistorySection(data.history || []);
        } else {
            console.warn('[Rename Faktur] Failed to load history:', response.status);
        }
    } catch (err) {
        console.warn('[Rename Faktur] Error loading history:', err.message);
    }
}

function displayHistorySection(histories) {
    const section = document.getElementById('historySection');
    const list = document.getElementById('recentHistoryList');
    
    if (!histories || histories.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    // Deduplicate by ID to prevent double entries
    const uniqueHistories = [];
    const seenIds = new Set();
    
    histories.forEach(h => {
        if (!seenIds.has(h.id)) {
            seenIds.add(h.id);
            uniqueHistories.push(h);
        }
    });
    
    section.classList.remove('hidden');
    list.innerHTML = uniqueHistories.map(h => {
        // Format date/time properly in Indonesia timezone
        const timestamp = formatIndonesianDateTime(h.renamed_at);
        
        return `
        <div class="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors text-sm">
            <div class="flex-1 min-w-0">
                <span class="text-gray-700">
                    File asli: <span class="font-mono text-gray-600">${h.old_filename}</span>
                    <span class="text-gray-400 mx-1">›</span>
                    <span class="font-mono text-green-700 font-semibold">${h.new_filename}</span>
                    <span class="text-gray-400 mx-2">|</span>
                    Oleh: <span class="font-semibold text-gray-700">${h.renamed_by}</span>
                    <span class="text-gray-400 mx-2">|</span>
                    <span class="text-gray-500">${timestamp}</span>
                </span>
            </div>
        </div>
        `;
    }).join('');
}

function formatIndonesianDateTime(isoString) {
    if (!isoString) return 'Tidak ada';
    
    try {
        // Ensure ISO string ends with Z to indicate UTC
        let dateStr = isoString;
        if (!dateStr.includes('Z') && !dateStr.includes('+')) {
            // Add Z to indicate this is UTC time
            dateStr = dateStr.replace(/(\.\d{3})?$/, 'Z');
        }
        
        // Parse as UTC
        const date = new Date(dateStr);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.warn('[Rename Faktur] Invalid date:', isoString);
            return isoString;
        }
        
        console.log('[Rename Faktur] Formatting date:', isoString, '→', date.toISOString());
        
        // Convert to Jakarta time (UTC+7)
        const jakartaDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
        
        // Get date components
        const day = jakartaDate.getUTCDate().toString().padStart(2, '0');
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const month = monthNames[jakartaDate.getUTCMonth()];
        const year = jakartaDate.getUTCFullYear();
        const hour = jakartaDate.getUTCHours().toString().padStart(2, '0');
        const minute = jakartaDate.getUTCMinutes().toString().padStart(2, '0');
        
        const result = `${day} ${month} ${year} ${hour}:${minute} WIB`;
        console.log('[Rename Faktur] Formatted result:', result);
        
        return result;
    } catch (err) {
        console.error('[Rename Faktur] Error formatting date:', err);
        return isoString;
    }
}

function closeHistorySection() {
    const section = document.getElementById('historySection');
    section.classList.add('hidden');
}
