// ============================================================
// FINAL VERSION - renderTable() Function
// UI Daftar File - Modern 2-Row Card Layout
// Date: August 24, 2026
// Status: ✅ LOCKED - PRODUCTION READY
// ============================================================

function renderTable() {
    console.log('[renderTable] Called with', archives.length, 'files in archives, filteredArchives:', filteredArchives.length);
    
    // First, let's debug the DOM structure
    console.log('[renderTable] Checking DOM structure...');
    const mainContent = document.getElementById('main-content');
    console.log('[renderTable] main-content found:', !!mainContent);
    
    const archiveTable = document.getElementById('archive-table');
    console.log('[renderTable] archive-table found:', !!archiveTable);
    
    let tbody = document.getElementById('archive-body');
    console.log('[renderTable] archive-body found:', !!tbody);
    
    if (!tbody) {
        console.warn('[renderTable] archive-body NOT FOUND - creating it');
        if (archiveTable) {
            tbody = document.createElement('div');
            tbody.id = 'archive-body';
            archiveTable.appendChild(tbody);
            console.log('[renderTable] Created archive-body element');
        } else {
            console.error('[renderTable] archive-table element also not found!');
            return;
        }
    }
    
    const emptyState = document.getElementById('empty-state');
    const pagination = document.getElementById('pagination');

    // In Infinite Scroll mode, we render ALL loaded items
    const pageItems = filteredArchives;

    if (filteredArchives.length === 0) {
        console.log('[renderTable] No items to render, showing empty state');
        tbody.innerHTML = '';
        emptyState?.classList.remove('hidden');
        pagination?.classList.add('hidden');
        return;
    }

    console.log('[renderTable] Rendering', pageItems.length, 'items');
    emptyState?.classList.add('hidden');
    pagination?.classList.add('hidden'); // We now use infinite scroll instead of frontend pagination

    tbody.innerHTML = pageItems.map((a, i) => {
        let cleanName = a.nama_file.toUpperCase().replace(/^(NON\s+|PPN\s+)/i, '');
        // Strip out trailing or embedded dates like " 18 FEB"
        cleanName = cleanName.replace(/\s+\d{1,2}\s+(JAN|FEB|MAR|APR|MEI|MAY|JUN|JUL|AGU|AUG|SEP|OKT|OCT|NOV|DES|DEC)[A-Z]*\b/i, '').trim();

        const isAnomali = a.status && a.status.includes('Anomali');
        
        // Determine styling
        let borderLeftClass = '';
        let iconBgClass = 'bg-gray-100 text-gray-600';
        let nameColorClass = 'text-gray-900';
        
        if (isAnomali) {
            borderLeftClass = 'border-l-4 border-red-500';
            iconBgClass = 'bg-red-100 text-red-600';
            nameColorClass = 'text-red-900 font-semibold';
        } else if (a.status === 'Unread' && !isSuperAdmin()) {
            borderLeftClass = 'border-l-4 border-blue-500';
            iconBgClass = 'bg-blue-100 text-blue-600';
            nameColorClass = 'text-blue-900 font-semibold';
        } else if (isSuperAdmin() && a.status && a.status.includes('Read')) {
            iconBgClass = 'bg-emerald-100 text-emerald-600';
        }

        const docDate = a.tanggal_dokumen ? new Date(a.tanggal_dokumen).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' }) : (extractDateFromFilename(a.nama_file) || new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' }));

        let statusBadges = '';
        if (isAnomali) {
            statusBadges = '<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-200 text-red-800 uppercase tracking-wide animate-pulse"><span class="w-2 h-2 rounded-full bg-red-600"></span>ANOMALI</span>';
        } else if (a.status === 'Unread' && !isSuperAdmin()) {
            statusBadges = '<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide"><span class="w-2 h-2 rounded-full bg-blue-600"></span>Belum Dibaca</span>';
        } else if (isSuperAdmin() && a.status && a.status.includes('Read')) {
            statusBadges = '<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wide"><span class="w-2 h-2 rounded-full bg-emerald-600"></span>Dibaca</span>';
        }
        
        if (a.status === 'Revision') {
            statusBadges += `<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wide" title="Alasan: ${a.dispute_reason || '-'}\nCatatan: ${a.dispute_note || '-'}"><span class="w-2 h-2 rounded-full bg-amber-600"></span>Revisi</span>`;
        }

        return `
        <div class="animate-fade-in group/card transition-all duration-300" style="animation-delay: ${i * 25}ms">
            <div class="bg-white border border-gray-150 rounded-lg p-3.5 mb-4 ${borderLeftClass} hover:border-blue-300 hover:shadow-md transition-all duration-200">
                <!-- TOP ROW: Checkbox + Filename + Status + Actions -->
                <div class="flex items-center justify-between gap-3 mb-3">
                    <!-- LEFT: Checkbox + Icon + Name (gap-4 = NOT dempet) -->
                    <div class="flex items-center gap-4 flex-1 min-w-0">
                        <!-- Checkbox -->
                        <input type="checkbox" class="custom-checkbox row-checkbox w-4 h-4 flex-shrink-0 accent-blue-600 cursor-pointer" data-id="${a.id}" 
                            ${selectedIds.includes(a.id) ? 'checked' : ''} 
                            onclick="toggleItemSelection('${a.id}', this)">
                        
                        <!-- File Icon -->
                        <div class="w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center bg-gradient-to-br ${iconBgClass} border border-gray-200/50">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                ${isSuperAdmin() && a.status && a.status.includes('Read') && !isAnomali ?
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>' :
                    (isAnomali ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>' :
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>')}
                            </svg>
                        </div>

                        <!-- Filename -->
                        <div class="flex-1 min-w-0">
                            <p class="font-bold text-sm truncate ${nameColorClass} transition-colors" title="${a.nama_file}">
                                ${truncate(cleanName, 45)}
                            </p>
                        </div>
                    </div>

                    <!-- RIGHT: Status + Quick Actions -->
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <!-- Status Badges (Compact) -->
                        <div class="flex gap-1">
                            ${statusBadges}
                        </div>

                        <!-- Quick Action Buttons (Compact Icons) -->
                        <div class="flex gap-1.5 pl-2 border-l border-gray-150">
                            ${viewMode === 'active' ? `
                                <button onclick="openPreview('${a.id}', '${a.nama_file}')" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Preview">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                </button>
                                <a href="${CONFIG.API_URL}/api/files/${a.id}/download?token=${API.getToken()}" class="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Download">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                </a>
                                ${isSuperAdmin() ? `
                                    <button onclick="copyFileLink('${a.id}', this)" class="p-1.5 text-purple-600 hover:bg-purple-50 rounded-md transition-colors" title="Salin Link">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                                    </button>
                                ` : ''}
                                ${isSuperAdmin() || currentUser?.role === 'moderator' ? `
                                    <button onclick="deleteArchive('${a.id}', '${a.nama_file}')" class="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hapus">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    </button>
                                ` : ''}
                            ` : `
                                ${isSuperAdmin() || currentUser?.role === 'moderator' ? `
                                    <button onclick="restoreArchive('${a.id}', '${a.nama_file}')" class="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Pulihkan">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                                    </button>
                                    <button onclick="deleteArchive('${a.id}', '${a.nama_file}', true)" class="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Hapus Permanen">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    </button>
                                ` : ''}
                            `}
                        </div>
                    </div>
                </div>

                <!-- BOTTOM ROW: Metadata (Tanggal dokumen only) -->
                <div class="mt-2 pt-2 border-t border-gray-150"></div>
                <div class="flex items-center gap-4 text-[11px] font-semibold text-gray-600 pl-10 py-1.5">
                    <div class="flex items-center gap-0.5">
                        <span class="text-gray-400">📁</span>
                        <span>${getCategoryLabel(a.category)}${a.tipe_ppn ? ` • ${getTipePPNLabel(a.tipe_ppn)}` : ''}</span>
                    </div>
                    <div class="flex items-center gap-0.5">
                        <span class="text-gray-400">📍</span>
                        <span>${a.zonas?.nama || '-'}</span>
                    </div>
                    <div class="flex items-center gap-0.5">
                        <span class="text-gray-400">📅</span>
                        <span>${docDate}</span>
                    </div>
                    ${syncStatusBadge(a.storage_path) ? `
                        <div class="ml-auto">
                            ${syncStatusBadge(a.storage_path)}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>`;
    }).join('');

    updateBulkUI();
}

// ============================================================
// CRITICAL SPACING VALUES (DO NOT CHANGE)
// ============================================================
/*
TOP ROW:
- gap-4 between checkbox, icon, filename (NOT dempet)
- gap-2 between status and actions
- mb-3 between top and bottom rows
- mb-4 between file cards

BOTTOM ROW:
- gap-0.5 between emoji and text (tight)
- gap-4 between metadata items (readable)
- py-1.5 vertical padding
- mt-2 pt-2 separator line spacing
- pl-10 left padding (aligns with icon)

ANIMATION:
- Stagger delay: ${i * 25}ms
- Fade-in duration: 300ms
*/
