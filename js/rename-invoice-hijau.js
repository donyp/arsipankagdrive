// Rename Invoice Hijau
// Extract No. Invoice from PDF, rename as: invoice number

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
    dropzone.classList.add('border-green-500', 'bg-green-50');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('border-green-500', 'bg-green-50');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('border-green-500', 'bg-green-50');
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

    // Max 25 files limit (safe for 2MB avg file size)
    // Memory: 25 × 2MB = 50MB raw; ~67MB with base64 overhead (very safe)
    // Processing time: ~12-13 seconds (acceptable)
    const MAX_FILES = 25;
    if (fileArray.length > MAX_FILES) {
        const deletedCount = fileArray.length - MAX_FILES;
        const deletedFiles = fileArray.slice(MAX_FILES).map(f => f.name).join(', ');
        Toast.warning(`⚠️ Maksimal ${MAX_FILES} file sekaligus\n\n${deletedCount} file terbaru dihapus dari antrian:\n${deletedFiles}`);
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
                <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
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
    maxFilesNote.className = 'text-sm font-semibold text-gray-800 mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded';
    maxFilesNote.textContent = `📋 Maksimal ${MAX_FILES} file | ${selectedFiles.length} file dipilih`;
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
            console.log(`[Rename Invoice Hijau] Processing file ${i + 1}/${selectedFiles.length}: ${file.name}`);
            
            // Update loading modal
            updateLoadingModal(i + 1, file.name, selectedFiles.length);
            
            const result = await processFile(file);
            results.push(result);
        }

        // Hide loading modal
        hideLoadingModal();

        // Auto-download successful files - PARALLEL (semua sekaligus)
        const successFiles = results.filter(r => r.success);
        if (successFiles.length > 0) {
            console.log(`[Rename Invoice Hijau] Starting parallel download for ${successFiles.length} files`);
            const downloadStart = performance.now();
            
            setTimeout(() => {
                // Download all files in parallel (browser will manage queuing)
                successFiles.forEach(r => {
                    downloadFile(r.newName, r.fileData);
                });
                
                console.log(`[Rename Invoice Hijau] Download triggered in ${(performance.now() - downloadStart).toFixed(2)}ms`);
            }, 300);
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
        console.log('[Rename Invoice Hijau] Process complete - button re-enabled for next batch');
    }
}

// ============================================
// Process Single File
// ============================================
async function processFile(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);

        console.log(`[Rename Invoice Hijau] Uploading file: ${file.name}, size: ${file.size}`);
        const uploadStart = performance.now();

        const response = await fetch('/api/invoice/rename-invoice-hijau', {
            method: 'POST',
            body: formData
            // NO Content-Type header - browser will set it with boundary
        });

        const uploadTime = performance.now() - uploadStart;
        console.log(`[Rename Invoice Hijau] Upload took ${uploadTime.toFixed(2)}ms`);

        const result = await response.json();

        console.log(`[Rename Invoice Hijau] Response status: ${response.status}`, result);

        if (!response.ok) {
            console.error(`[Rename Invoice Hijau] Error response:`, {
                status: response.status,
                statusText: response.statusText,
                error: result.error,
                details: result
            });
            
            // Handle scanned PDF - need manual input
            if (response.status === 400 && result.manualInput) {
                console.log('[Rename Invoice Hijau] Scanned PDF detected - requesting manual input');
                const manualResult = await showManualInputModal(file, result);
                return manualResult;
            }
            
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
            console.log(`[Rename Invoice Hijau] Success:`, result.newName);
            
            // Log rename to history - FIRE AND FORGET (don't await)
            // This runs in background without blocking the UI or download
            (async () => {
                try {
                    const token = API.getToken();
                    if (token) {
                        await fetch('/api/invoice/log-rename', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                invoice: result.newName.split('-')[0] || 'unknown',
                                old_filename: file.name,
                                new_filename: result.newName,
                                old_path: '',
                                new_path: '',
                                reason: 'Manual rename via UI',
                                zona_id: null,
                                notes: `No. Invoice: ${result.noInvoice}`
                            })
                        });
                        console.log('[Rename Invoice Hijau] History logged (background)');
                    }
                } catch (err) {
                    console.warn('[Rename Invoice Hijau] Background history logging error:', err.message);
                }
            })();
            
            return {
                success: true,
                originalName: file.name,
                newName: result.newName,
                noInvoice: result.noInvoice,
                fileData: result.fileData  // Base64 encoded PDF
            };
        } else {
            console.error(`[Rename Invoice Hijau] Processing failed:`, result.error);
            return {
                success: false,
                originalName: file.name,
                error: result.error || 'Gagal memproses file'
            };
        }
    } catch (err) {
        console.error('[Rename Invoice Hijau] Network/Parse error:', err);
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
    console.log('[Rename Invoice Hijau] DOMContentLoaded event triggered');
    
    // Wait for auth to initialize
    let retries = 0;
    const maxRetries = 5;
    
    const waitForAuth = setInterval(async () => {
        retries++;
        if (typeof API === 'undefined') {
            if (retries % 5 === 1) {
                console.log('[Rename Invoice Hijau] API not defined yet... attempt', retries);
            }
        } else {
            const token = API.getToken();
            
            if (token) {
                clearInterval(waitForAuth);
                console.log('[Rename Invoice Hijau] Auth ready, loading history');
                loadLatestHistory();
            } else if (retries >= maxRetries) {
                clearInterval(waitForAuth);
                console.warn('[Rename Invoice Hijau] Auth failed after', maxRetries, 'retries');
            } else {
                console.log('[Rename Invoice Hijau] Waiting for auth... attempt', retries);
            }
        }
    }, 500);
});

async function loadLatestHistory() {
    try {
        const token = API.getToken();
        if (!token) {
            console.warn('[Rename Invoice Hijau] No auth token for loading history');
            return;
        }
        
        console.log('[Rename Invoice Hijau] Loading latest history from database...');
        
        // Try to get history by recent updates using a wildcard approach
        // Get recent renames - use a simple prefix which invoice files have
        const response = await fetch('/api/invoice/rename-history?limit=10', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('[Rename Invoice Hijau] History API response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('[Rename Invoice Hijau] History loaded:', data.history.length, 'items');
            console.log('[Rename Invoice Hijau] History data:', JSON.stringify(data.history.slice(0, 2), null, 2));
            
            if (data.history && data.history.length > 0) {
                displayHistorySection(data.history);
            } else {
                console.log('[Rename Invoice Hijau] No history records found');
            }
        } else {
            const errData = await response.json().catch(() => ({}));
            console.warn('[Rename Invoice Hijau] Failed to load history:', response.status, errData);
        }
    } catch (err) {
        console.warn('[Rename Invoice Hijau] Error loading history:', err.message, err.stack);
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

function showHistoryActionButton(successFiles) {
    // Load and display the latest history records
    if (successFiles.length === 0) return;
    
    console.log('[Rename Invoice Hijau] Loading history after successful rename');
    // Load latest history (not filtered by specific invoice)
    loadLatestHistory();
}

async function loadAndDisplayHistory(invoice) {
    try {
        const token = API.getToken();
        if (!token) {
            console.warn('[Rename Invoice Hijau] No auth token');
            return;
        }
        
        const response = await fetch(`/api/invoice/rename-history/${encodeURIComponent(invoice)}?limit=10`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('[Rename Invoice Hijau] History loaded:', data.history.length, 'items');
            // Clear and display fresh history
            displayHistorySection(data.history || []);
        } else {
            console.warn('[Rename Invoice Hijau] Failed to load history:', response.status);
        }
    } catch (err) {
        console.warn('[Rename Invoice Hijau] Error loading history:', err.message);
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
    list.innerHTML = '';
    
    uniqueHistories.forEach(h => {
        // Format date/time properly in Indonesia timezone
        const timestamp = formatIndonesianDateTime(h.renamed_at);
        
        // Use full_name if available, otherwise use renamed_by
        const displayName = h.full_name || h.renamed_by || 'Unknown';
        
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between py-1.5 px-2 hover:bg-green-50 rounded transition-colors text-xs group';
        div.innerHTML = `
            <div class="flex-1 min-w-0">
                <span class="text-gray-700">
                    <span class="font-mono text-gray-600">${h.old_filename}</span>
                    <span class="text-gray-400 mx-1">›</span>
                    <span class="font-mono text-green-700 font-semibold">${h.new_filename}</span>
                    <span class="text-gray-400 mx-1">|</span>
                    <span class="text-gray-600">${displayName}</span>
                    <span class="text-gray-400 mx-1">|</span>
                    <span class="text-gray-500">${timestamp}</span>
                </span>
            </div>
            <button class="ml-2 p-0.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded transition-all opacity-0 group-hover:opacity-100 flex-shrink-0 delete-history-btn" title="Hapus" data-history-id="${h.id}">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        `;
        
        // Add event listener to delete button
        const deleteBtn = div.querySelector('.delete-history-btn');
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            deleteHistoryRecord(h.id);
        });
        
        list.appendChild(div);
    });
}

async function deleteHistoryRecord(historyId) {
    try {
        const token = API.getToken();
        if (!token) {
            console.warn('[Rename Invoice Hijau] No auth token for deleting');
            Toast.error('Tidak dapat menghapus - token tidak valid');
            return;
        }
        
        console.log('[Rename Invoice Hijau] Deleting history record:', historyId);
        
        const response = await fetch(`/api/invoice/rename-history/${historyId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            console.log('[Rename Invoice Hijau] History deleted successfully');
            Toast.success('History dihapus');
            
            // Reload history
            loadLatestHistory();
        } else {
            const errData = await response.json().catch(() => ({}));
            console.warn('[Rename Invoice Hijau] Failed to delete:', response.status, errData);
            Toast.error('Gagal menghapus history: ' + (errData.error || 'Unknown error'));
        }
    } catch (err) {
        console.warn('[Rename Invoice Hijau] Error deleting history:', err.message);
        Toast.error('Error: ' + err.message);
    }
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
            console.warn('[Rename Invoice Hijau] Invalid date:', isoString);
            return isoString;
        }
        
        console.log('[Rename Invoice Hijau] Formatting date:', isoString, '→', date.toISOString());
        
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
        console.log('[Rename Invoice Hijau] Formatted result:', result);
        
        return result;
    } catch (err) {
        console.error('[Rename Invoice Hijau] Error formatting date:', err);
        return isoString;
    }
}

function closeHistorySection() {
    const section = document.getElementById('historySection');
    section.classList.add('hidden');
}


// ============================================
// Manual Input Modal for Scanned PDFs
// ============================================
async function showManualInputModal(file, errorResponse) {
    return new Promise((resolve) => {
        // Create modal HTML
        const modalHTML = `
            <div id="manualInputModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg shadow-lg p-6 w-96 max-w-full mx-4">
                    <div class="mb-4">
                        <h3 class="text-lg font-bold text-gray-800 mb-2">📋 Input Manual - File Scan</h3>
                        <p class="text-sm text-gray-600 mb-3">${errorResponse.message || 'Sistem tidak dapat mengektrak No. Invoice otomatis dari file scan.'}</p>
                        <p class="text-xs text-gray-500 bg-blue-50 p-2 rounded border-l-2 border-blue-400">
                            <strong>File:</strong> ${file.name}
                        </p>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            No. Invoice <span class="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            id="manualInvoiceInput" 
                            placeholder="Masukkan No. Invoice (minimal 12 angka)" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            autocomplete="off"
                        />
                        <p class="text-xs text-gray-500 mt-1">Contoh: 835100310001234 atau 83510031-0001234</p>
                    </div>
                    
                    <div class="flex gap-2 justify-end">
                        <button onclick="document.getElementById('manualInputModal').remove()" class="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition">
                            Batal
                        </button>
                        <button id="manualInputConfirm" class="px-4 py-2 text-white bg-green-500 rounded hover:bg-green-600 transition">
                            Konfirmasi
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Insert modal into DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = document.getElementById('manualInputModal');
        const input = document.getElementById('manualInvoiceInput');
        const confirmBtn = document.getElementById('manualInputConfirm');
        
        // Auto-focus input
        input.focus();
        
        // Handle confirmation
        confirmBtn.addEventListener('click', async () => {
            const invoiceNumber = input.value.trim().replace(/\s/g, '').replace(/-/g, '');
            
            // Validate
            if (!invoiceNumber || invoiceNumber.length < 12 || !/^\d+$/.test(invoiceNumber)) {
                Toast.error('No. Invoice harus minimal 12 angka');
                return;
            }
            
            console.log('[Rename Invoice Hijau] Manual input received:', invoiceNumber);
            modal.remove();
            
            // Return success result
            resolve({
                success: true,
                originalName: file.name,
                newName: `${invoiceNumber}.pdf`,
                noInvoice: invoiceNumber,
                fileData: null,  // Don't have file data from manual input
                isManualInput: true
            });
        });
        
        // Handle Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') confirmBtn.click();
        });
        
        // Handle Cancel
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve({
                    success: false,
                    originalName: file.name,
                    error: 'Input manual dibatalkan'
                });
            }
        });
    });
}
