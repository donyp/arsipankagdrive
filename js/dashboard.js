// ============================================================
// Dashboard Logic — v2.0 (JWT + Backend API)
// Replaces direct Supabase/Drive calls
// ============================================================

let archives = [];
let filteredArchives = []; // Kept for legacy compatibility
let selectedIds = [];
let currentPage = 1;
let totalPages = 1;
let viewMode = 'active'; // 'active' or 'deleted'
let isAnomalyFilterActive = false;
let hasMoreData = true;
let isFetching = false;
let syncStatuses = {};

// Zona cache for labels
window._zonaCache = [];
window._notifDetailsMap = {}; // Global map for notification details

function normalizeNoticeDetails(details) {
    const entries = Array.isArray(details) ? details : String(details || '').split('\n');
    const items = [];
    let current = null;

    entries.forEach(entry => {
        if (entry && typeof entry === 'object') {
            const summary = String(entry.summary || entry.title || entry.label || '').trim();
            const description = String(entry.description || entry.detail || '').trim();
            if (summary || description) {
                items.push({ summary: summary || description, description: summary ? description : '' });
            }
            current = null;
            return;
        }

        const line = String(entry || '').trim();
        if (!line) return;
        const numbered = line.match(/^\s*\d+\.\s*(.*)$/);
        if (numbered) {
            current = { summary: numbered[1].trim(), description: '' };
            items.push(current);
        } else if (current) {
            current.description = current.description ? `${current.description} ${line}` : line;
        } else {
            items.push({ summary: line, description: '' });
        }
    });

    return items;
}

// ---- Show Notification Detail Modal ----
function showNotifDetail(event, header, details, id = null) {
    if (event) event.stopPropagation(); // Prevent marking notification as read

    // Use map lookup if id is provided (prevents escaping issues)
    if (id && window._notifDetailsMap[id]) {
        header = window._notifDetailsMap[id].header;
        details = window._notifDetailsMap[id].details;
    }

    if (!header) return; // Guard

    const detailItems = normalizeNoticeDetails(details);
    Swal.fire({
        title: '<div class="flex items-center gap-2 px-1"><span class="text-xs font-black text-gray-900 uppercase">Detail Perbaikan</span></div>',
        html: `
            <div class="text-left py-2">
                <div class="flex items-center gap-3 mb-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p class="text-[10px] font-black text-emerald-800 uppercase tracking-widest leading-none">Status</p>
                        <p class="text-xs font-bold text-emerald-700 mt-1">Sistem Kembali Online</p>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 ml-1">Update Utama</label>
                        <div class="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-800">
                            ${escapeNoticeHtml(header)}
                        </div>
                    </div>
                    
                    ${details ? `
                    <div>
                        <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 ml-1">Rincian Perbaikan</label>
                        <div class="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs text-gray-600 leading-relaxed max-h-48 overflow-y-auto font-medium">
                            <ol class="space-y-2">${detailItems.map((item, index) => `
                                <li class="flex items-start gap-2">
                                    <span class="font-black text-emerald-600">${index + 1}.</span>
                                    <span><strong>${escapeNoticeHtml(item.summary)}</strong>${item.description ? `<br><span class="text-gray-500">${escapeNoticeHtml(item.description)}</span>` : ''}</span>
                                </li>`).join('')}</ol>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `,
        confirmButtonText: 'Tutup',
        confirmButtonColor: '#10b981',
        customClass: {
            container: 'z-[9999]',
            popup: 'rounded-[1.5rem] border-0 shadow-2xl',
            confirmButton: 'rounded-xl text-[10px] font-black uppercase px-8 py-3'
        }
    });
}

// ---- Toggle Inline Notification Detail Box ----
function toggleInlineDetail(event, id) {
    if (event) event.stopPropagation();
    const box = document.getElementById(`detail-box-${id}`);
    if (box) {
        box.classList.toggle('hidden');
    }
}

// ---- Initial Dashboard Loading State ----
// Keep one loader over the dashboard while the archive list, cards, and chart
// are all being prepared. The archive list has its own loader for refreshes,
// so this one uses a separate ID and is only removed after initial rendering.
function showDashboardInitialLoading() {
    const target = document.getElementById('main-content');
    if (!target || document.getElementById('dashboard-initial-loading')) return;

    target.style.position = 'relative';
    const loader = document.createElement('div');
    loader.id = 'dashboard-initial-loading';
    loader.className = 'absolute inset-0 z-[60] flex items-center justify-center bg-gray-950/80 backdrop-blur-sm';
    loader.innerHTML = `
        <div class="premium-loader">
            <div class="loader-rings">
                <div class="loader-ring"></div>
                <div class="loader-ring"></div>
                <div class="loader-ring"></div>
            </div>
            <span class="loader-text">Menyiapkan dashboard...</span>
        </div>
    `;
    target.appendChild(loader);
}

function hideDashboardInitialLoading() {
    const loader = document.getElementById('dashboard-initial-loading');
    if (loader) {
        console.log('[Dashboard] Hiding initial loading overlay');
        loader.remove();
    } else {
        console.warn('[Dashboard] Initial loading overlay not found when trying to hide');
    }
}

// ---- Initialize Dashboard ----
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Dashboard] DOMContentLoaded fired');
    
    const user = await initAuth();
    if (!user) {
        // Auth failed — page already unclocked by initAuth()
        console.warn('[Dashboard] Auth initialization failed');
        return;
    }

    console.log('[Dashboard] Auth successful, showing loading overlay');
    showDashboardInitialLoading();

    try {
    console.log('[Dashboard] Starting dashboard initialization...');
    setCurrentDate();
    await loadZonas();
    
    // NEW DASHBOARD: Skip populateFilters and loadArchives - only load stats
    console.log('[Dashboard] Loading stats only...');
    // populateFilters(); // DISABLED
    // await loadArchives(); // DISABLED
    
    console.log('[Dashboard] Loading notifications...');
    loadNotifications();
    // await loadBroadcast(); // Removed: now handled globally by sidebar.js

    await loadStorageStats();

    // Admin controls only for super admin
    if (hasPermission('view_dashboard_stats')) {
        document.getElementById('admin-controls')?.classList.remove('hidden');
    }
    // Admin controls: Show stats grid for all users
    if (user.role) {
        document.getElementById('stats-grid')?.classList.remove('hidden');
    }
    
    // Maintenance/Broadcast buttons only for admins
    if (hasPermission('manage_system') || user.role === 'moderator' || user.role === 'super_admin') {
        document.getElementById('maintenance-btn')?.classList.replace('hidden', 'md:flex');
        document.getElementById('btn-manage-broadcast')?.classList.remove('hidden');
        loadMaintenanceStatus();
    } else {
        // Explicitly remove restricted elements for other roles
        document.getElementById('maintenance-btn')?.remove();
        document.getElementById('btn-manage-broadcast')?.remove();
    }

    // Check for Post-Maintenance Update Notice (Run for ALL users)
    await initUpdateHistoryNotification();

    // NEW DASHBOARD: Hide search since we removed archive list
    document.getElementById('header-search-container')?.classList.add('hidden');
    document.getElementById('dashboard-search-container')?.classList.add('hidden');

    // NEW DASHBOARD: Skip old event listeners and intersection observer for archive list
    // setupEventListeners();
    // setupIntersectionObserver();

    // NEW DASHBOARD: Skip auto-reload on window focus (no archive list to reload)
    // Reload archives when window regains focus (e.g., coming back from file detail page)
    // let lastFocusTime = Date.now();
    // window.addEventListener('focus', () => {
    //     const now = Date.now();
    //     if (now - lastFocusTime > 2000) {
    //         console.log('[Dashboard] Window focused, reloading archives to sync data');
    //         loadArchives();
    //     }
    //     lastFocusTime = now;
    // });

    // Global close for dropdowns
    document.addEventListener('click', (e) => {
        const notifDropdown = document.getElementById('notif-dropdown-parent');
        const notifMenu = document.getElementById('notif-menu');
        if (notifDropdown && !notifDropdown.contains(e.target)) {
            notifMenu?.classList.add('invisible', 'opacity-0', 'translate-y-2');
        }
    });

    } catch (err) {
        console.error('[Dashboard] Error loading dashboard:', err);
        if (window.Toast) {
            Toast.error('Error loading dashboard. Please refresh.');
        }
    } finally {
        // The chart and all statistic cards have now been rendered (or have
        // completed with an error handled by their own loaders).
        hideDashboardInitialLoading();
    }
});



function escapeNoticeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
}

async function checkUpdateNotice() {
    try {
        console.log('[Update Notice] Checking for new updates...');
        const status = await API.get('/api/system/maintenance');

        if (!status || !status.lastResult) {
            console.log('[Update Notice] No updates found in system status.');
            return;
        }

        const lastReadId = localStorage.getItem('last_read_update_id');
        console.log(`[Update Notice] System ID: ${status.lastResult.id}, Local ID: ${lastReadId}`);

        if (lastReadId === status.lastResult.id) {
            console.log('[Update Notice] Update already read.');
            return;
        }

        // Show Modal
        console.log('[Update Notice] Displaying What\'s New modal!');
        showUpdateModal(status.lastResult);
    } catch (err) {
        console.warn('[Update Notice] Error:', err.message);
    }
}

function showUpdateModal(data) {
    const modalId = 'update-notice-modal';
    if (document.getElementById(modalId)) return;

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-gray-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto';

    // Convert details list to HTML (details may be a string or an array)
    const detailItems = normalizeNoticeDetails(data.details);
    const detailsHtml = detailItems.map((item, index) =>
        `<div class="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100/50">
            <span class="w-6 h-6 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black">${index + 1}</span>
            <p class="text-sm font-medium text-gray-700 leading-relaxed">
                <strong>${escapeNoticeHtml(item.summary)}</strong>
                ${item.description ? `<br><span class="text-xs text-gray-400">${escapeNoticeHtml(item.description)}</span>` : ''}
            </p>
        </div>`
    ).join('');

    modal.innerHTML = `
        <div class="bg-white w-full max-w-md max-h-[calc(100vh-2rem)] rounded-[2rem] shadow-2xl p-5 sm:p-7 animate-scale-up border border-white/20 flex flex-col">
            <div class="text-center mb-5 shrink-0">
                <div class="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner ring-4 ring-blue-50/50">
                    <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <h2 class="text-xl font-black text-gray-900 leading-tight mb-1 uppercase tracking-tight">Pembaruan Selesai!</h2>
                <p class="text-[11px] font-bold text-blue-500/80 uppercase tracking-widest">${escapeNoticeHtml(data.title || 'Sistem Kembali Normal')}</p>
            </div>

            <div class="space-y-2 max-h-[min(42vh,320px)] overflow-y-auto px-1 custom-scrollbar mb-5">
                ${detailsHtml}
            </div>

            <div class="pt-1 shrink-0">
                <button onclick="readUpdateNotice('${data.id}')" class="w-full py-3 bg-gray-900 text-white font-black rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 active:scale-95 uppercase tracking-[0.16em] text-[10px]">
                    Selesai & Lanjutkan
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

window.readUpdateNotice = function (id) {
    localStorage.setItem('last_read_update_id', id);
    const modal = document.getElementById('update-notice-modal');
    if (modal) {
        modal.classList.add('opacity-0', 'scale-95');
        setTimeout(() => modal.remove(), 300);
    }
};


// ---- Set Current Date & Time-based Greeting ----
function setCurrentDate() {
    const now = new Date();

    // 1. Current Page Header Date (if still exists)
    const el = document.getElementById('current-date');
    if (el) {
        el.textContent = now.toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    // 2. Banner Dynamic Greeting
    const greetingEl = document.getElementById('time-greeting');
    if (greetingEl) {
        const hour = now.getHours();
        let greeting = 'Selamat Datang';
        // Pagi: 03:00-10:59, Siang: 11:00-14:59, Sore: 15:00-17:59, Malam: 18:00-02:59
        if (hour >= 3 && hour < 11) greeting = 'Pagi';
        else if (hour >= 11 && hour < 15) greeting = 'Siang';
        else if (hour >= 15 && hour < 18) greeting = 'Sore';
        else greeting = 'Malam';
        greetingEl.textContent = greeting;
    }

    // 3. Banner Date (Indonesian Format)
    const bannerDateEl = document.getElementById('banner-date');
    if (bannerDateEl) {
        bannerDateEl.textContent = now.toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    // 4. Auto-fill filter-date-end to today
    const endDate = document.getElementById('filter-date-end');
    if (endDate) {
        endDate.value = now.toISOString().split('T')[0];
    }
}

// ---- Load Zonas from API ----
async function loadZonas() {
    try {
        const { zonas } = await API.get('/api/zonas');
        window._zonaCache = zonas || [];
        if (typeof currentUser !== 'undefined' && currentUser.role === 'admin_zona') {
            await populateTokoFilter();
        }
    } catch (err) {
        console.warn('Failed to load zonas:', err);
    }
}

// ---- Populate Filter Dropdowns ----
function populateFilters() {
    // Zona dropdown (only for super admin)
    const zonaSelect = document.getElementById('filter-zona');
    const broadcastZona = document.getElementById('broadcast-zona'); // New
    if (zonaSelect || broadcastZona) {
        window._zonaCache.forEach(z => {
            const opt = document.createElement('option');
            opt.value = z.id;
            opt.textContent = z.nama;

            if (zonaSelect) zonaSelect.appendChild(opt.cloneNode(true));
            if (broadcastZona) broadcastZona.appendChild(opt.cloneNode(true));
        });
    }

    // FIX 1: Lock zona filter for admin_zona — only show their own zona
    if (zonaSelect && currentUser && currentUser.role === 'admin_zona' && currentUser.zona_id) {
        zonaSelect.value = currentUser.zona_id;
        zonaSelect.disabled = true;
        zonaSelect.classList.add('opacity-50', 'cursor-not-allowed');
    }

    // Inverted Permit: Inject restricted options ONLY for Super Admins
    const catSelect = document.getElementById('filter-category');
    const catReadonly = document.getElementById('filter-category-readonly');

    if (catSelect) {
        if (isSuperAdmin()) {
            // Unlock and Inject
            catSelect.disabled = false;
            catSelect.classList.remove('opacity-50', 'cursor-not-allowed');
            catSelect.classList.add('block');
            catReadonly?.classList.add('hidden');

            // Avoid duplicates
            if (!catSelect.querySelector('option[value=""]')) {
                const allOpt = document.createElement('option');
                allOpt.value = '';
                allOpt.textContent = 'Semua Kategori';
                catSelect.prepend(allOpt);
            }
            if (!catSelect.querySelector('option[value="PIUTANG"]')) {
                const piutangOpt = document.createElement('option');
                piutangOpt.value = 'PIUTANG';
                piutangOpt.textContent = 'Bukti Pembayaran Piutang';
                catSelect.appendChild(piutangOpt);
            }
        } else if (currentUser && currentUser.role === 'admin_zona') {
            // Admin Zona: Hide dropdown, show read-only label
            catSelect.classList.add('hidden');
            catReadonly?.classList.remove('hidden');
            catSelect.value = 'INVOICE'; // Set to INVOICE internally
        } else {
            // Other roles: keep dropdown visible
            catSelect.disabled = false;
            catSelect.classList.remove('opacity-50', 'cursor-not-allowed');
            catSelect.classList.add('block');
            catReadonly?.classList.add('hidden');
        }
    }

    populateTokoFilter();
    
    // Show scan missing files button for admin only
    const scanBtn = document.getElementById('scan-missing-btn');
    if (scanBtn) {
        if (isSuperAdmin() || currentUser?.role === 'moderator') {
            scanBtn.classList.remove('hidden');
        } else {
            scanBtn.classList.add('hidden');
        }
    }
}

// ---- Load Archives from Backend API ----
async function loadArchives(append = false) {
    if (isFetching || (append && !hasMoreData)) return;

    isFetching = true;
    if (!append) {
        currentPage = 1;
        archives = [];
        hasMoreData = true;
        showLoading('main-content');
    } else {
        document.getElementById('scroll-loader')?.classList.remove('hidden');
    }

    try {
        console.log('[loadArchives] API object:', typeof API !== 'undefined' ? 'DEFINED' : 'UNDEFINED');
        console.log('[loadArchives] Token:', API?.getToken?.() ? 'PRESENT' : 'MISSING');
        
        let endpoint = viewMode === 'deleted' && isSuperAdmin() ? '/api/files/trash' : '/api/files';

        const getVal = (id) => document.getElementById(id)?.value || '';
        console.log('[loadArchives] Current filter values:', {
            category: getVal('filter-category'),
            zona_id: getVal('filter-zona'),
            toko_id: getVal('filter-toko'),
            tipe_ppn: getVal('filter-tipe'),
            search: document.getElementById('dashboard-search-input')?.value || '',
            currentUserRole: currentUser?.role
        });
        
        const params = new URLSearchParams({
            page: currentPage,
            limit: CONFIG.PAGE_SIZE || 20,
            category: getVal('filter-category'),
            zona_id: getVal('filter-zona'),
            toko_id: getVal('filter-toko'),
            tipe_ppn: getVal('filter-tipe'),
            search: (document.getElementById('dashboard-search-input')?.value || '').toLowerCase(),
            // Date bounds
            start_date: getVal('filter-date-start'),
            end_date: getVal('filter-date-end')
        });

        if (isAnomalyFilterActive) {
            params.append('is_anomaly', 'true');
        }

        for (const [key, value] of Array.from(params.entries())) {
            if (!value) params.delete(key);
        }

        const fullUrl = `${endpoint}?${params.toString()}`;
        console.log('[loadArchives] Calling API:', fullUrl);
        console.log('[loadArchives] Full params object:', Object.fromEntries(params));
        
        const res = await API.get(fullUrl);
        
        console.log('[loadArchives] API Response:', res);

        if (res.files && res.files.length > 0) {
            archives = append ? [...archives, ...res.files] : res.files;
            console.log('[loadArchives] Files loaded:', res.files.length);
        } else if (!append) {
            archives = [];
            console.log('[loadArchives] No files found');
        }

        totalPages = res.totalPages || 1;
        hasMoreData = currentPage < totalPages;

        filteredArchives = archives;
        await loadSyncStatuses();
        renderTable();
        await loadUploaderNames();  // Load uploader names for badges
        updateStats(res);
        if (!append) await populateTokoFilter();
    } catch (err) {
        Toast.error('Gagal memuat arsip: ' + err.message);
    } finally {
        isFetching = false;
        hideLoading();
        document.getElementById('scroll-loader')?.classList.add('hidden');
    }
}

// Load uploader names for file list badges
async function loadUploaderNames() {
    // Only for moderator and super_admin
    if (!isSuperAdmin() && currentUser?.role !== 'moderator') {
        return;
    }

    // Collect unique uploaded_by ids from current archives
    const uploaderIds = [...new Set(archives
        .filter(f => f.uploaded_by)
        .map(f => f.uploaded_by))];
    
    if (!uploaderIds.length) return;

    try {
        const response = await API.get(`/api/users/names?ids=${uploaderIds.join(',')}`);
        // response is { userId: userName, ... }
        
        // Update each badge with actual username
        uploaderIds.forEach(userId => {
            const badges = document.querySelectorAll(`[data-uploader-id="${userId}"]`);
            const userName = response[userId] || 'Unknown User';
            badges.forEach(badge => {
                badge.textContent = userName;
            });
        });
    } catch (err) {
        console.warn('[loadUploaderNames] Error:', err.message);
        // Fallback: show userId if fetch fails
        archives.filter(f => f.uploaded_by).forEach(file => {
            const badge = document.getElementById(`uploader-${file.id}`);
            if (badge && badge.textContent === 'Memuat...') {
                badge.textContent = `User #${file.uploaded_by}`;
            }
        });
    }
}

async function loadSyncStatuses() {
    const paths = archives.map(file => file.storage_path).filter(Boolean);
    if (!paths.length) return;
    try {
        const query = paths.map(path => encodeURIComponent(path)).join(',');
        const response = await API.get(`/api/sync/statuses?paths=${query}`);
        syncStatuses = { ...syncStatuses, ...(response.statuses || {}) };
        const summary = document.getElementById('sync-status-summary');
        // Only show sync summary for super_admin and moderator (hide for admin_zona)
        if (summary && typeof currentUser !== 'undefined' && currentUser && (isSuperAdmin() || currentUser.role === 'moderator')) {
            summary.classList.remove('hidden');
        }
        const visible = paths.map(path => syncStatuses[path]).filter(Boolean);
        const primary = visible.filter(status => status.primaryStatus === 'verified').length;
        const backup = visible.filter(status => status.backupStatus === 'verified').length;
        document.getElementById('sync-primary-summary')?.replaceChildren(document.createTextNode(`Primary: ${primary}/${paths.length} terverifikasi`));
        document.getElementById('sync-backup-summary')?.replaceChildren(document.createTextNode(`Cadangan: ${backup}/${paths.length} terverifikasi`));
    } catch (err) {
        console.warn('Gagal membaca status sinkronisasi:', err.message);
    }
}

// ---- Populate Toko Filter based on selected Zona ----
async function populateTokoFilter() {
    const tokoSelect = document.getElementById('filter-toko');
    const zonaSelect = document.getElementById('filter-zona');
    if (!tokoSelect) return;

    let zonaId = zonaSelect?.value;

    if (!zonaId && typeof currentUser !== 'undefined' && currentUser.role === 'admin_zona') {
        zonaId = currentUser.zona_id;
    }

    tokoSelect.disabled = !zonaId;

    const currentValue = tokoSelect.value;
    while (tokoSelect.options.length > 1) tokoSelect.remove(1);

    if (!zonaId) {
        tokoSelect.value = '';
        return;
    }

    try {
        const { tokos } = await API.get(`/api/toko?zona_id=${zonaId}`);
        const seenNames = new Set();
        (tokos || []).forEach(t => {
            if (seenNames.has(t.nama)) return;
            seenNames.add(t.nama);

            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.nama;
            tokoSelect.appendChild(opt);
        });

        // Try to re-select
        const opts = Array.from(tokoSelect.options).map(o => o.value);
        if (opts.includes(currentValue)) {
            tokoSelect.value = currentValue;
        } else {
            tokoSelect.value = '';
        }
    } catch (err) {
        console.error('Failed to fill Toko dropdown', err);
    }
}

// ---- Update Stats ----
// Flag: apakah stat-invoice sudah diset dari Alist (sumber otoritatif)
let _alistInvoiceLoaded = false;

async function updateStats(res = {}) {
    const el = (id) => document.getElementById(id);

    try {
        // stat-invoice: jika sudah diisi dari Alist (loadStorageStats), jangan timpa
        // Hanya update jika Alist belum berhasil load
        if (!_alistInvoiceLoaded) {
            const invoiceCount = res.totalInvoice ?? res.total ?? filteredArchives.filter(a => a.category === 'INVOICE').length;
            if (el('stat-invoice')) el('stat-invoice').textContent = invoiceCount;
        }

        // stat-piutang selalu dari data arsip yang terfilter
        const piutangCount = res.totalPiutang ?? filteredArchives.filter(a => a.category === 'PIUTANG').length;
        if (el('stat-piutang')) el('stat-piutang').textContent = piutangCount;
    } catch (err) {
        console.warn('Stats update error:', err);
    }
}

// ---- Apply Filters ----
function applyFilters() {
    loadArchives(false);
}

// ---- Scan Missing Files (Admin Only) ----
async function scanMissingFiles() {
    if (!isSuperAdmin() && !(currentUser?.role === 'moderator')) {
        Toast.error('Akses ditolak');
        return;
    }
    
    const btn = document.getElementById('scan-missing-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="inline-block animate-spin">⏳</span> Scanning...';
    
    try {
        console.log('[Scan Missing] Starting scan...');
        const res = await API.post('/api/admin/scan-missing-files');
        
        if (res.status === 'success') {
            Toast.success(`✓ Scan selesai: ${res.missing} file hilang ditemukan`);
            console.log('[Scan Missing] Result:', res);
            
            // Reload archives to show updated missing status
            await loadArchives();
        } else {
            Toast.error('Scan gagal: ' + (res.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('[Scan Missing] Error:', err);
        Toast.error('Gagal melakukan scan: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// ---- Export CSV ----
function exportCSV() {
    if (filteredArchives.length === 0) {
        Toast.warning('Tidak ada data untuk diexport.');
        return;
    }

    const headers = ['Nama File', 'Kategori', 'Zona', 'Toko', 'Tanggal Upload', 'Status'];
    const rows = filteredArchives.map(a => [
        `"${a.nama_file}"`,
        `"${a.category}"`,
        `"${a.zonas?.nama || ''}"`,
        `"${a.toko?.nama || ''}"`,
        `"${new Date(a.created_at).toLocaleString('id-ID')}"`,
        `"${a.status}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
        + headers.join(',') + "\n"
        + rows.map(e => e.join(',')).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Arsip_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ---- Toggle Recycle Bin ----
function toggleRecycleBin() {
    const btn = document.getElementById('btn-recycle-bin');
    if (viewMode === 'active') {
        viewMode = 'deleted';
        btn.classList.remove('text-red-400');
        btn.classList.add('text-indigo-400', 'bg-indigo-500/10');
        Toast.info('Menampilkan Recycle Bin');
    } else {
        viewMode = 'active';
        btn.classList.add('text-red-400');
        btn.classList.remove('text-indigo-400', 'bg-indigo-500/10');
        Toast.info('Menampilkan Dokumen Aktif');
    }
    loadArchives();
}

// ---- Setup Infinite Scroll ----
function setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreData && !isFetching) {
            currentPage++;
            loadArchives(true);
        }
    }, {
        rootMargin: '200px', // Trigger earlier for smoother experience
        threshold: 0.1
    });

    const sentinel = document.getElementById('infinite-scroll-trigger');
    if (sentinel) observer.observe(sentinel);
}

// ---- Notification System ----
let notifData = [];

window.toggleNotifMenu = function () {
    const menu = document.getElementById('notif-menu');
    if (!menu) return;

    if (menu.classList.contains('invisible')) {
        menu.classList.remove('invisible', 'opacity-0', 'translate-y-2');
        menu.classList.add('opacity-100', 'translate-y-0');
        loadNotifications(); // Refresh on open
    } else {
        menu.classList.add('invisible', 'opacity-0', 'translate-y-2');
        menu.classList.remove('opacity-100', 'translate-y-0');
    }
};

async function loadNotifications() {
    const list = document.getElementById('notif-list');
    if (!list) return;

    try {
        const res = await API.get('/api/notifications');
        notifData = res.notifications || [];
        renderNotifications();
        updateNotifBadge();
    } catch (err) {
        list.innerHTML = `<p class="text-center py-8 text-[10px] font-bold text-red-400 uppercase">Gagal memuat</p>`;
    }
}

function renderNotifications() {
    const list = document.getElementById('notif-list');
    const btnRead = document.getElementById('btn-mark-read');
    if (!list) return;

    const unreadCount = notifData.filter(n => !n.is_read).length;
    if (btnRead) btnRead.classList.toggle('hidden', unreadCount === 0);

    if (notifData.length === 0) {
        list.innerHTML = `<p class="text-center py-8 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Belum ada notifikasi</p>`;
        return;
    }

    list.innerHTML = notifData.map(n => {
        const time = new Date(n.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        const unreadClass = n.is_read ? 'bg-white' : 'bg-blue-50/60';
        const dotClass = n.is_read ? 'hidden' : '';
        let iconColor = 'text-blue-500';
        if (n.type === 'success') iconColor = 'text-emerald-500';
        if (n.type === 'warning') iconColor = 'text-amber-500';

        // --- SPECIAL UI: Maintenance Completion ---
        if (n.title.includes('Perbaikan Selesai')) {
            const lines = String(n.message || '').split('\n').map(line => line.trim()).filter(Boolean);
            const header = lines.shift() || 'Sistem kembali online';
            const detailItems = normalizeNoticeDetails(lines);
            const details = detailItems.length > 0;
            const mapId = `notif_${n.id}`;
            window._notifDetailsMap[mapId] = { header, details: detailItems };

            return `
                <div class="relative group px-4 py-3 rounded-xl ${unreadClass} hover:bg-gray-100/50 transition-all cursor-default border border-transparent hover:border-emerald-100">
                    <div class="flex items-start gap-3">
                        <div class="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0 ${dotClass}"></div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between gap-1.5">
                                <span class="text-[11px] font-black text-gray-900 leading-none">✅ Perbaikan Selesai</span>
                                ${details ? `
                                    <button onclick="openMaintenanceNotification(event, '${mapId}', '${n.id}')"
                                            class="text-[8px] font-black text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-full hover:bg-emerald-500 hover:text-white transition-all shadow-sm ring-1 ring-emerald-100">
                                        DETAIL
                                    </button>` : ''}
                            </div>
                             <p class="text-[10px] font-bold text-emerald-600 mt-1 line-clamp-1">${escapeNoticeHtml(header)}</p>
                            <p class="text-[9px] text-gray-400 mt-1 font-bold uppercase">${time}</p>
                            
                        </div>
                    </div>
                </div>
            `;
        }

        // --- Standard UI ---
        return `
            <div class="flex items-start gap-3 px-4 py-3 rounded-xl ${unreadClass} hover:bg-gray-50 transition-all group cursor-default">
                <div class="mt-0.5 w-2 h-2 rounded-full ${iconColor} bg-current shrink-0 ${dotClass}"></div>
                <div class="flex-1 min-w-0">
                    <p class="text-[11px] font-black text-gray-900 leading-snug">${escapeNoticeHtml(n.title)}</p>
                    <p class="text-[10px] text-gray-500 mt-0.5 leading-relaxed line-clamp-2">${escapeNoticeHtml(n.message)}</p>
                    <p class="text-[9px] text-gray-400 mt-1 font-bold uppercase">${time}</p>
                </div>
            </div>
        `;
    }).join('');
}

function updateNotifBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    const hasUnread = notifData.some(n => !n.is_read);
    badge.classList.toggle('hidden', !hasUnread);
}

async function markNotificationRead(id) {
    const notification = notifData.find(n => String(n.id) === String(id));
    if (!notification || notification.is_read) return true;

    notification.is_read = true;
    renderNotifications();
    updateNotifBadge();

    try {
        await API.put(`/api/notifications/${encodeURIComponent(id)}/read`);
        return true;
    } catch (err) {
        notification.is_read = false;
        renderNotifications();
        updateNotifBadge();
        Toast.error('Gagal menandai notifikasi.');
        return false;
    }
}

window.openMaintenanceNotification = async function (event, mapId, notificationId) {
    if (event) event.stopPropagation();
    const markedRead = await markNotificationRead(notificationId);
    if (markedRead) {
        showNotifDetail(null, null, null, mapId);
    }
};

window.markAllNotifRead = async function () {
    try {
        await API.put('/api/notifications/read-all');
        notifData.forEach(n => n.is_read = true);
        renderNotifications();
        updateNotifBadge();
    } catch (err) {
        Toast.error('Gagal menandai notifikasi.');
    }
};

// Auto-refresh notifications every 60 seconds
setInterval(() => {
    loadNotifications();
}, 60000);

// ---- Render Table ----
function renderTable() {
    console.log('[renderTable] START - Called with', archives.length, 'files');
    
    let tbody = document.getElementById('archive-body');
    
    if (!tbody) {
        const mainContent = document.getElementById('main-content');
        const archiveTable = document.getElementById('archive-table');
        if (archiveTable) {
            tbody = document.createElement('div');
            tbody.id = 'archive-body';
            archiveTable.appendChild(tbody);
        } else {
            console.error('[renderTable] archive-table element not found!');
            return;
        }
    }
    
    const emptyState = document.getElementById('empty-state');
    const pagination = document.getElementById('pagination');

    // In Infinite Scroll mode, we render ALL loaded items
    const pageItems = filteredArchives;

    if (filteredArchives.length === 0) {
        tbody.innerHTML = '';
        emptyState?.classList.remove('hidden');
        pagination?.classList.add('hidden');
        return;
    }

    console.log('[renderTable] Rendering', pageItems.length, 'items');
    
    // Client-side enrichment: for PIUTANG files with toko_id but no toko object, fetch toko data
    const piutangFilesNeedingToko = pageItems.filter(f => f.category === 'PIUTANG' && f.toko_id && !f.toko);
    if (piutangFilesNeedingToko.length > 0) {
        console.log('[renderTable] Found', piutangFilesNeedingToko.length, 'PIUTANG files needing toko enrichment');
        // Try to enrich from API
        API.get('/api/toko').then(response => {
            const allTokos = response.tokos || [];
            const tokoMap = {};
            allTokos.forEach(t => {
                tokoMap[t.id] = t;
            });
            
            pageItems.forEach(f => {
                if (f.category === 'PIUTANG' && f.toko_id && !f.toko && tokoMap[f.toko_id]) {
                    f.toko = tokoMap[f.toko_id];
                    console.log('[renderTable] Enriched:', f.nama_file, '→ toko:', f.toko.nama);
                }
            });
            
            // Re-render after enrichment
            renderTableHTML(tbody, pageItems);
        }).catch(err => {
            console.error('[renderTable] Error fetching toko data:', err);
            renderTableHTML(tbody, pageItems);
        });
        return; // Don't continue rendering until enrichment completes
    }
    
    renderTableHTML(tbody, pageItems);
    
    emptyState?.classList.add('hidden');
    pagination?.classList.add('hidden'); // We now use infinite scroll instead of frontend pagination
}

// Helper function to render the HTML
function renderTableHTML(tbody, pageItems) {

    tbody.innerHTML = pageItems.map((a, i) => {
        // Get original filename and strip nominal from database level
        let cleanName = a.nama_file.toUpperCase().replace(/^(NON\s+|PPN\s+)/i, '');
        
        // Strip out trailing or embedded dates like " 18 FEB"
        cleanName = cleanName.replace(/\s+\d{1,2}\s+(JAN|FEB|MAR|APR|MEI|MAY|JUN|JUL|AGU|AUG|SEP|OKT|OCT|NOV|DES|DEC)[A-Z]*\b/i, '').trim();
        
        // Remove trailing space and numbers (any combination of digits and dots)
        const beforeClean = cleanName;
        // First remove .PDF or file extension, then remove nominal
        cleanName = cleanName.replace(/\.(PDF|JPG|PNG|JPEG|DOC|DOCX|XLS|XLSX)$/i, '');
        // Remove underscore + timestamp pattern (e.g., _20260705_130234)
        cleanName = cleanName.replace(/_\d{8}_\d{6}$/, '').trim();
        // Remove nominal with dots or commas at end
        cleanName = cleanName.replace(/\s+[\d\.,]+$/, '');
        // Add back .PDF
        cleanName = cleanName + '.PDF';

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
        const uploadDate = new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' });

        let statusBadges = '';
        if (isAnomali) {
            statusBadges = '<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-200 text-red-800 uppercase tracking-wide animate-pulse"><span class="w-2 h-2 rounded-full bg-red-600"></span>ANOMALI</span>';
        } else if (a.status === 'Unread' && !isSuperAdmin() && !(currentUser && currentUser.role === 'admin_zona')) {
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
                <!-- Top Row: Checkbox + Filename + Status + Actions -->
                <div class="flex items-center justify-between gap-3 mb-3">
                    <!-- Left: Checkbox + Icon + Name -->
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
                            <div class="flex items-center gap-2 min-w-0">
                                <p class="font-bold text-sm truncate ${nameColorClass} transition-colors" title="${a.nama_file}">
                                    ${truncate(cleanName, 45)}
                                </p>
                                ${a.is_missing ? `<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold whitespace-nowrap flex-shrink-0" title="File tidak ditemukan di Google Drive">⚠️ Missing</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- Right: Status + Quick Actions -->
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <!-- Status Badges (Compact) -->
                        <div class="flex gap-1">
                            ${statusBadges}
                        </div>

                        <!-- Quick Action Buttons (Compact Icons) -->
                        <div class="flex gap-1.5 pl-2 border-l border-gray-150">
                            ${viewMode === 'active' ? `
                                <button onclick="openFileDetail('${a.id}')" style="padding: ${(currentUser && currentUser.role === 'admin_zona') ? '0.75rem' : '0.375rem'}" class="text-purple-600 hover:bg-purple-50 rounded-md transition-colors" title="Lihat Detail & Komentar">
                                    <svg class="transition-all" style="width: ${(currentUser && currentUser.role === 'admin_zona') ? '1.5rem' : '1rem'}; height: ${(currentUser && currentUser.role === 'admin_zona') ? '1.5rem' : '1rem'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
                                </button>
                                <a href="${CONFIG.API_URL}/api/files/${a.id}/download?token=${API.getToken()}" style="padding: ${(currentUser && currentUser.role === 'admin_zona') ? '0.75rem' : '0.375rem'}" class="text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Download">
                                    <svg class="transition-all" style="width: ${(currentUser && currentUser.role === 'admin_zona') ? '1.5rem' : '1rem'}; height: ${(currentUser && currentUser.role === 'admin_zona') ? '1.5rem' : '1rem'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                </a>

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

                <!-- Bottom Row: Metadata (Hidden for PIUTANG) -->
                <div class="mt-2 pt-2 border-t border-gray-150"></div>
                <div class="flex items-center gap-4 text-[12px] font-bold text-gray-700 pl-10 py-2">
                    <!-- Category/Type Badge -->
                    <div class="flex items-center gap-0.5">
                        <span class="text-gray-400 text-lg">📁</span>
                        ${(() => {
                            const badges = getCategoryBadges(a.category, a.tipe_ppn);
                            let display = '';
                            if (badges.typeLabel) {
                                display = `${badges.typeLabel} - ${badges.categoryLabel}`;
                            } else {
                                display = badges.categoryLabel;
                            }
                            return `<span class="font-bold text-gray-800">${display}</span>`;
                        })()}
                    </div>
                    
                    <!-- Nominal Badge (ONLY for INVOICE files, not PIUTANG) -->
                    ${a.category !== 'PIUTANG' && a.total_jual ? `
                    <div class="flex items-center gap-0.5">
                        <span class="text-gray-400">💰</span>
                        <span class="text-xs font-bold text-gray-900">Rp ${new Intl.NumberFormat('id-ID').format(a.total_jual)}</span>
                    </div>
                    ` : ''}
                    
                    <!-- Toko Badge (ONLY for PIUTANG) -->
                    ${a.category === 'PIUTANG' && a.toko?.nama ? `
                    <div class="flex items-center gap-0.5">
                        <span class="text-gray-400">🏪</span>
                        <span class="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">${a.toko.nama}</span>
                    </div>
                    ` : ''}
                    
                    <!-- Tanggal Badge (ONLY for PIUTANG) -->
                    ${a.category === 'PIUTANG' && a.tanggal_dokumen ? `
                    <div class="flex items-center gap-0.5">
                        <span class="text-gray-400">📅</span>
                        <span class="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">${new Date(a.tanggal_dokumen).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                    </div>
                    ` : ''}
                    
                    <!-- Zona Badge (HIDE for PIUTANG) -->
                    ${a.category !== 'PIUTANG' && a.zonas?.nama ? `
                    <div class="flex items-center gap-0.5">
                        <span class="text-gray-400">📍</span>
                        <span>${a.zonas?.nama || '-'}</span>
                    </div>
                    ` : ''}
                    
                    <!-- Date Badge (HIDE for PIUTANG) -->
                    ${a.category !== 'PIUTANG' ? `
                    <div class="flex items-center gap-0.5">
                        <span class="text-gray-400">📅</span>
                        <span>${docDate}</span>
                    </div>
                    ` : ''}
                    
                    <!-- Uploader Badge (HIDE for PIUTANG) -->
                    ${a.category !== 'PIUTANG' && (isSuperAdmin() || currentUser?.role === 'moderator') && a.uploaded_by ? `
                    <div class="flex items-center gap-0.5">
                        <span class="text-gray-400">👤</span>
                        <span class="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-100" id="uploader-${a.id}" data-uploader-id="${a.uploaded_by}">Memuat...</span>
                    </div>
                    ` : ''}
                    
                    <!-- Sync Status Badge (HIDE for PIUTANG) -->
                    ${a.category !== 'PIUTANG' && syncStatusBadge(a.storage_path) ? `
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

function syncStatusBadge(storagePath) {
    // Only show sync status for super_admin and moderator
    if (!(isSuperAdmin() || currentUser?.role === 'moderator')) {
        return '';
    }
    
    const status = syncStatuses[storagePath];
    if (!status) return '';
    const primaryOk = status.primaryStatus === 'verified';
    const backupOk = status.backupStatus === 'verified';
    const unknown = status.primaryStatus === 'unknown';
    const color = primaryOk && backupOk ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : (status.lastError ? 'text-red-600 bg-red-100/60 border-red-200' : (unknown ? 'text-red-600 bg-red-100/60 border-red-200' : 'text-amber-600 bg-amber-50 border-amber-100'));
    const label = primaryOk && backupOk ? 'SYNC OK' : (status.lastError ? 'SYNC GAGAL' : (unknown ? 'BELUM DIVERIFIKASI' : 'SYNC TERTUNDA'));
    return `<span title="Primary: ${primaryOk ? 'terverifikasi' : 'belum'} | Cadangan: ${backupOk ? 'terverifikasi' : 'belum'}${status.lastError ? ` | ${status.lastError}` : ''}" class="inline-block mt-1 px-1.5 py-0.5 rounded-md border ${color} text-[8px] font-black uppercase tracking-wider">${label}</span>`;
}

// ---- Pagination ----
function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
}

// ---- Reset Filters ----
function resetFilters() {
    const searchMobile = document.getElementById('search-input-mobile');
    if (searchMobile) searchMobile.value = '';

    // reset anomaly
    isAnomalyFilterActive = false;
    const btnAnomaly = document.getElementById('btn-filter-anomaly');
    if (btnAnomaly) {
        btnAnomaly.classList.add('border-transparent');
        btnAnomaly.classList.remove('border-red-500/50', 'bg-red-500/10');
    }

    ['filter-category', 'filter-tipe', 'filter-zona', 'filter-toko', 'filter-date-start', 'filter-date-end'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === 'filter-category' && !isSuperAdmin()) {
                // leave it as is
            } else {
                el.value = '';
            }
        }
    });
    
    // Remove active state from quick filter buttons
    document.querySelectorAll('.quick-filter-btn').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white', 'border-blue-500');
        btn.classList.add('bg-gray-50', 'text-gray-600', 'border-gray-200');
    });
    
    loadArchives();
}

// ---- Quick Date Filters ----
function applyQuickFilter(filterType, event) {
    const today = new Date();
    const dateStart = document.getElementById('filter-date-start');
    const dateEnd = document.getElementById('filter-date-end');
    
    let startDate, endDate;
    
    switch(filterType) {
        case 'today':
            startDate = endDate = today;
            break;
            
        case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            startDate = endDate = yesterday;
            break;
            
        case 'thisWeek':
            // Start of week (Monday)
            const startOfWeek = new Date(today);
            const day = startOfWeek.getDay();
            const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            startOfWeek.setDate(diff);
            startDate = startOfWeek;
            endDate = today;
            break;
            
        case 'lastWeek':
            // Last week Monday to Sunday
            const lastWeekEnd = new Date(today);
            const lastWeekDay = lastWeekEnd.getDay();
            const lastWeekDiff = lastWeekEnd.getDate() - lastWeekDay - (lastWeekDay === 0 ? 6 : 0);
            lastWeekEnd.setDate(lastWeekDiff);
            
            const lastWeekStart = new Date(lastWeekEnd);
            lastWeekStart.setDate(lastWeekStart.getDate() - 6);
            
            startDate = lastWeekStart;
            endDate = lastWeekEnd;
            break;
            
        case 'thisMonth':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = today;
            break;
            
        case 'lastMonth':
            const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
            const lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
            startDate = new Date(lastMonthYear, lastMonth, 1);
            endDate = new Date(lastMonthYear, lastMonth + 1, 0); // Last day of last month
            break;
    }
    
    // Format dates to YYYY-MM-DD
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    if (dateStart && dateEnd) {
        dateStart.value = formatDate(startDate);
        dateEnd.value = formatDate(endDate);
    }
    
    // Highlight active button
    document.querySelectorAll('.quick-filter-btn').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white', 'border-blue-500');
        btn.classList.add('bg-gray-50', 'text-gray-600', 'border-gray-200');
    });
    
    if (event && event.target) {
        event.target.classList.remove('bg-gray-50', 'text-gray-600', 'border-gray-200');
        event.target.classList.add('bg-blue-500', 'text-white', 'border-blue-500');
    }
    
    // Trigger load with new date range
    loadArchives();
}

function acknowledgeFile(fileId) {
    if (currentUser?.role === 'admin_zona') {
        API.post(`/api/files/${fileId}/acknowledge`).then((res) => {
            const index = filteredArchives.findIndex(a => a.id === fileId);
            if (index !== -1 && res.status) {
                filteredArchives[index].status = res.status;
                renderTable();
            }
        }).catch(err => console.error('Acknowledge Error:', err));
    }
}

// ---- Dispute (Sanggah) System ----
let _disputeFileId = null;
let _disputeFileName = null;

function openDisputeModal(fileId, fileName) {
    _disputeFileId = fileId;
    _disputeFileName = fileName;
    const modal = document.getElementById('dispute-modal');
    if (!modal) return;
    document.getElementById('dispute-file-name').textContent = fileName;
    document.getElementById('dispute-reason').value = '';
    document.getElementById('dispute-note').value = '';
    modal.classList.remove('hidden');
}

function closeDisputeModal() {
    const modal = document.getElementById('dispute-modal');
    if (modal) modal.classList.add('hidden');
    _disputeFileId = null;
    _disputeFileName = null;
}

async function submitDispute() {
    if (!_disputeFileId) return;
    const reason = document.getElementById('dispute-reason').value;
    const note = document.getElementById('dispute-note').value.trim();

    if (!reason) {
        Toast.warning('Pilih alasan revisi terlebih dahulu.');
        return;
    }

    try {
        await API.post(`/api/files/${_disputeFileId}/dispute`, { reason, note });
        Toast.success('Permintaan revisi berhasil diajukan!');
        closeDisputeModal();

        // 1. Update the 'archives' (True Source)
        const archivesIdx = archives.findIndex(a => a.id == _disputeFileId);
        if (archivesIdx !== -1) {
            archives[archivesIdx].status = 'Revision';
            archives[archivesIdx].dispute_reason = reason;
            archives[archivesIdx].dispute_note = note;
        }

        // 2. Update the 'filteredArchives' (Current View)
        const filteredIdx = filteredArchives.findIndex(a => a.id == _disputeFileId);
        if (filteredIdx !== -1) {
            filteredArchives[filteredIdx].status = 'Revision';
            filteredArchives[filteredIdx].dispute_reason = reason;
            filteredArchives[filteredIdx].dispute_note = note;
        }

        // 3. Re-render UI
        renderTable();
        updateStats();
    } catch (err) {
        Toast.error('Gagal mengajukan revisi: ' + err.message);
    }
}

// ---- Bug Report System ----
let _bugFile = null;

function openBugModal() {
    const modal = document.getElementById('bug-modal');
    if (!modal) return;
    document.getElementById('bug-tipe').value = '';
    document.getElementById('bug-deskripsi').value = '';
    removeBugFile(); // Reset file

    const mediumRadio = document.querySelector('input[name="bug-level"][value="Medium"]');
    if (mediumRadio) mediumRadio.checked = true;
    modal.classList.remove('hidden');
}

function closeBugModal() {
    const modal = document.getElementById('bug-modal');
    if (modal) modal.classList.add('hidden');
}

// ---- Bug History for Admin Zona ----
function openBugHistoryModal() {
    const modal = document.getElementById('bug-history-modal');
    if (modal) {
        modal.classList.remove('hidden');
        loadBugHistory();
    }
}

function closeBugHistoryModal() {
    const modal = document.getElementById('bug-history-modal');
    if (modal) modal.classList.add('hidden');
}

async function loadBugHistory() {
    const list = document.getElementById('bug-history-list');
    if (!list) return;

    list.innerHTML = `
        <div class="p-12 text-center">
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Memuat riwayat...</p>
        </div>
    `;

    try {
        const res = await API.get('/api/bugs');
        const reports = res.reports || [];

        if (reports.length === 0) {
            list.innerHTML = `
                <div class="p-12 text-center">
                    <p class="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Belum ada riwayat laporan</p>
                </div>
            `;
            return;
        }

        list.innerHTML = reports.map(b => {
            const date = new Date(b.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
            let statusColor = 'bg-gray-100 text-gray-500';
            if (b.status === 'Diproses') statusColor = 'bg-amber-100 text-amber-600';
            if (b.status === 'Selesai') statusColor = 'bg-emerald-100 text-emerald-600';

            return `
                <div class="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-amber-200 transition-all group">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">${b.tipe}</span>
                        <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${statusColor}">${b.status}</span>
                    </div>
                    <p class="text-xs font-bold text-gray-800 line-clamp-2 mb-2 leading-relaxed">${b.deskripsi}</p>
                    <div class="flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase">
                        <span>🗓️ ${date}</span>
                        <span class="flex items-center gap-1">
                            ${b.tautan_file ? '📎 Ada Lampiran' : '🚫 Tanpa Lampiran'}
                        </span>
                    </div>
                    ${b.admin_notes ? `
                        <div class="mt-3 pt-3 border-t border-dashed border-gray-200">
                            <p class="text-[9px] font-black text-amber-600 uppercase mb-1">Catatan Admin:</p>
                            <p class="text-[10px] font-medium text-gray-600 italic">"${b.admin_notes}"</p>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    } catch (err) {
        list.innerHTML = `<p class="text-center py-8 text-red-500 text-[10px] font-black uppercase">${err.message}</p>`;
    }
}

function handleBugFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        Toast.warning('Ukuran file maksimal 5MB.');
        e.target.value = '';
        return;
    }

    _bugFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('bug-preview-img').src = e.target.result;
        document.getElementById('bug-preview-container').classList.remove('hidden');
        document.getElementById('bug-upload-placeholder').classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

function removeBugFile(e) {
    if (e) e.preventDefault();
    _bugFile = null;
    document.getElementById('bug-file').value = '';
    document.getElementById('bug-preview-container').classList.add('hidden');
    document.getElementById('bug-upload-placeholder').classList.remove('hidden');
    document.getElementById('bug-preview-img').src = '';
}

async function submitBugReport() {
    const tipe = document.getElementById('bug-tipe').value;
    const deskripsi = document.getElementById('bug-deskripsi').value.trim();
    const level = document.querySelector('input[name="bug-level"]:checked')?.value || 'Medium';
    const btn = document.getElementById('btn-submit-bug');

    if (!tipe) {
        Toast.warning('Pilih tipe bug terlebih dahulu.');
        return;
    }
    if (!deskripsi) {
        Toast.warning('Deskripsi bug wajib diisi.');
        return;
    }

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<div class="loader-mini"><div class="loader-ring"></div><div class="loader-ring"></div><div class="loader-ring"></div></div><span>Mengirim...</span>`;

    try {
        let tautan_file = null;

        // 1. Upload File if exists
        if (_bugFile) {
            const formData = new FormData();
            formData.append('file', _bugFile);
            const uploadRes = await fetch(`${CONFIG.API_URL}/api/bugs/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${API.getToken()}` },
                body: formData
            });
            const uploadData = await uploadRes.json();
            if (!uploadRes.ok) throw new Error(uploadData.error || 'Gagal upload screenshot');
            tautan_file = uploadData.url;
        }

        // 2. Submit Report
        await API.post('/api/bugs', { tipe, level, deskripsi, tautan_file });

        Toast.success('Laporan bug berhasil dikirim! Terimakasih atas masukannya.');
        closeBugModal();

        // Refresh history if history modal is open or about to be
        if (!document.getElementById('bug-history-modal').classList.contains('hidden')) {
            loadBugHistory();
        }
    } catch (err) {
        Toast.error('Gagal mengirim laporan bug: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

// ---- Preview via PDF.js ----
let previewFileId = null;

function handlePreviewLoaded() {
    document.getElementById('preview-loading')?.classList.add('hidden');

    // Mark the file only after the requested document has actually loaded in
    // the iframe. Loading about:blank while resetting the modal must not count
    // as a preview.
    const iframe = document.getElementById('preview-iframe');
    if (previewFileId && iframe?.src && !iframe.src.endsWith('about:blank')) {
        const fileId = previewFileId;
        previewFileId = null;
        acknowledgeFile(fileId);
    }
}

function openPreview(fileId, fileName) {
    try {
        const modal = document.getElementById('preview-modal');
        const iframe = document.getElementById('preview-iframe');
        const title = document.getElementById('preview-title');
        const download = document.getElementById('preview-download');

        if (!modal || !iframe) {
            Toast.error('Preview modal tidak ditemukan.');
            return;
        }

        if (title) title.textContent = fileName;

        // Reset iframe to avoid showing previous document
        previewFileId = null;
        iframe.src = 'about:blank';

        const loading = document.getElementById('preview-loading');
        if (loading) loading.classList.remove('hidden');

        const token = API.getToken();
        const viewUrl = `${CONFIG.API_URL}/api/files/${fileId}/view?token=${token}`;
        const downloadUrl = `${CONFIG.API_URL}/api/files/${fileId}/download?token=${token}`;

        if (download) download.href = downloadUrl;

        // Show modal first, then wait for layout to fully settle before loading
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Wait for the browser to paint the modal at full size, then load the PDF
        requestAnimationFrame(() => {
            setTimeout(() => {
                previewFileId = fileId;
                iframe.src = viewUrl;
                
                // Add timeout to show error if preview fails to load
                setTimeout(() => {
                    if (loading && !loading.classList.contains('hidden')) {
                        loading.classList.add('hidden');
                        Toast.warning('Preview tidak tersedia (file hanya tersimpan di cloud). Gunakan fitur Download untuk membuka file.');
                    }
                }, 5000);
            }, 400);
        });
    } catch (err) {
        console.error('[Preview Error]', err);
        Toast.error('Gagal membuka preview: ' + err.message);
    }
}


function closePreview() {
    const modal = document.getElementById('preview-modal');
    const iframe = document.getElementById('preview-iframe');
    previewFileId = null;
    modal.classList.add('hidden');
    iframe.src = 'about:blank'; // Clear src to stop loading
    document.body.style.overflow = '';
}

// Handler when preview iframe loads
function handlePreviewLoaded() {
    console.log('[Preview] iframe loaded successfully');
    const loading = document.getElementById('preview-loading');
    if (loading) loading.classList.add('hidden');
}


async function sendBroadcast() {
    const input = document.getElementById('broadcast-input');
    const zonaSelect = document.getElementById('broadcast-zona');
    const content = input?.value.trim();
    const target_zona_id = zonaSelect?.value || null;

    if (!content) return;

    try {
        await API.post('/api/broadcasts', { content, target_zona_id });
        Toast.success('Pengumuman berhasil disiarkan!');
        input.value = '';

        // Live updates — reload management list and global bar
        if (typeof window.loadGlobalBroadcast === 'function') {
            await window.loadGlobalBroadcast();
        }
        await openManageBroadcasts();
    } catch (err) {
        Toast.error('Gagal mengirim pengumuman: ' + err.message);
    }
}

// ---- Broadcast Management (Super Admin) ----
async function openManageBroadcasts() {
    const modal = document.getElementById('broadcast-manage-modal');
    const list = document.getElementById('broadcast-list');
    if (!modal || !list) return;

    list.innerHTML = '<div class="py-10 flex justify-center"><div class="premium-loader"><div class="loader-rings"><div class="loader-ring"></div><div class="loader-ring"></div><div class="loader-ring"></div></div></div></div>';
    modal.classList.remove('hidden');

    try {
        const { broadcasts } = await API.get('/api/broadcasts');
        if (!broadcasts || broadcasts.length === 0) {
            list.innerHTML = '<p class="text-center text-gray-500 py-10 text-sm">Belum ada riwayat pengumuman.</p>';
            return;
        }

        list.innerHTML = broadcasts.map(b => `
            <div class="glass-card p-4 rounded-2xl border border-white/5 flex items-center justify-between group">
                <div class="flex-1 min-w-0 pr-4">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-tighter">
                            ${b.zonas?.nama || 'Semua Zona'}
                        </span>
                        <span class="text-[10px] text-gray-500">${new Date(b.created_at).toLocaleString('id-ID')}</span>
                    </div>
                    <p class="text-sm text-gray-700 truncate" title="${b.content}">${b.content}</p>
                </div>
                <button onclick="deleteBroadcast('${b.id}')" class="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = `<p class="text-center text-red-400 py-10 text-sm">${err.message}</p>`;
    }
}

function closeBroadcastManage() {
    document.getElementById('broadcast-manage-modal')?.classList.add('hidden');
}

async function deleteBroadcast(id) {
    showConfirm(
        'Hapus Pengumuman',
        'Apakah Anda yakin ingin menghapus pengumuman ini? Tindakan ini tidak dapat dibatalkan.',
        async () => {
            try {
                await API.del(`/api/broadcasts/${id}`);
                Toast.success('Pengumuman dihapus');
                openManageBroadcasts(); // Refresh list
                if (typeof window.loadGlobalBroadcast === 'function') {
                    await window.loadGlobalBroadcast();
                }
            } catch (err) {
                Toast.error('Gagal menghapus: ' + err.message);
            }
        }
    );
}

// ---- Storage Stats ----
async function loadStorageStats() {
    try {
        // UPDATED: Google Drive storage + New Invoice System
        const stats = await API.get('/api/stats/storage');

        // 1. Storage usage (from database/Google Drive)
        if (stats) {
            const { total_bytes, today_bytes, limit_bytes } = stats;
            const storageEl = document.getElementById('stat-storage');
            const progressEl = document.getElementById('stat-storage-progress');
            if (storageEl) {
                // Use only database bytes (Google Drive real data)
                const usedBytes = total_bytes || 0;
                const usedGB = (usedBytes / (1024 ** 3)).toFixed(2);
                const totalGB = ((limit_bytes || (1024 ** 4)) / (1024 ** 3)).toFixed(0);
                storageEl.textContent = `${usedGB} / ${totalGB} GB`;
                if (progressEl) {
                    const percent = Math.min((usedBytes / (limit_bytes || (1024 ** 4))) * 100, 100);
                    progressEl.style.width = percent + '%';
                }
            }

            // 2. Today's Usage (from database)
            const todayEl = document.getElementById('stat-storage-today');
            if (todayEl) {
                if (today_bytes >= 1024 ** 2) {
                    todayEl.textContent = (today_bytes / (1024 ** 2)).toFixed(2) + ' MB';
                } else {
                    todayEl.textContent = (today_bytes / 1024).toFixed(1) + ' KB';
                }
            }
        }

        // 3. Total Arsip Invoice Merah — dari Database (files table)
        const invoiceEl = document.getElementById('stat-invoice');
        try {
            const response = await API.get('/api/files');
            const invoiceCount = response.total || 0;
            if (invoiceEl) {
                invoiceEl.textContent = invoiceCount.toLocaleString('id-ID');
                _alistInvoiceLoaded = true;
            }
        } catch (err) {
            console.warn('Failed to load invoice count from database:', err);
        }

        // 4. NEW: Invoice System Statistics (from invoice_file_list table)
        try {
            const invoiceStats = await API.get('/api/invoice/stats');
            if (invoiceStats && invoiceStats.stats) {
                const { total_count, uploaded_count, pending_count } = invoiceStats.stats;
                
                // Update stat cards in stats-grid
                const invoiceNewEl = document.getElementById('stat-invoice-new');
                if (invoiceNewEl) {
                    invoiceNewEl.textContent = (total_count || 0).toLocaleString('id-ID');
                }
                
                const uploadedEl = document.getElementById('stat-invoice-uploaded');
                if (uploadedEl) {
                    uploadedEl.textContent = (uploaded_count || 0).toLocaleString('id-ID');
                }
                
                const pendingEl = document.getElementById('stat-invoice-pending');
                if (pendingEl) {
                    pendingEl.textContent = (pending_count || 0).toLocaleString('id-ID');
                }

                // Update quick stats in main dashboard card
                const quickTotal = document.getElementById('quick-stat-total');
                const quickUploaded = document.getElementById('quick-stat-uploaded');
                const quickPending = document.getElementById('quick-stat-pending');
                
                if (quickTotal) quickTotal.textContent = (total_count || 0).toLocaleString('id-ID');
                if (quickUploaded) quickUploaded.textContent = (uploaded_count || 0).toLocaleString('id-ID');
                if (quickPending) quickPending.textContent = (pending_count || 0).toLocaleString('id-ID');
            }
        } catch (err) {
            console.warn('Failed to load new invoice stats:', err);
            // Invoice system might not be available yet (dependencies not installed)
        }

    } catch (err) {
        console.warn('Failed to load storage stats:', err);
    }
}



// ---- Soft Delete / Hard Delete (Super Admin) ----
async function deleteArchive(id, fileName, isHardDelete = false) {
    const msg = isHardDelete
        ? `Apakah Anda yakin ingin MENGHAPUS PERMANEN "${fileName}"? Tindakan ini tidak dapat dibatalkan.`
        : `Apakah Anda yakin ingin memindahkan "${fileName}" ke Tong Sampah?`;

    showConfirm(
        isHardDelete ? 'Hapus Permanen' : 'Pindahkan ke Sampah',
        msg,
        async () => {
            try {
                const endpoint = isHardDelete
                    ? `/api/files/${id}?hard=true`
                    : `/api/files/${id}`;

                await API.del(endpoint);
                Toast.success(isHardDelete ? 'Arsip dihapus permanen' : 'Arsip dipindahkan ke Sampah');
                await loadArchives();
            } catch (err) {
                Toast.error('Gagal menghapus: ' + err.message);
            }
        },
        'Hapus'
    );
}

// ---- Restore Archive ----
function toggleAnomalyFilter() {
    isAnomalyFilterActive = !isAnomalyFilterActive;
    const btn = document.getElementById('btn-filter-anomaly');
    if (isAnomalyFilterActive) {
        btn.classList.remove('border-transparent');
        btn.classList.add('border-red-500/50', 'bg-red-500/10');
    } else {
        btn.classList.add('border-transparent');
        btn.classList.remove('border-red-500/50', 'bg-red-500/10');
    }
    loadArchives();
}

async function restoreArchive(id, fileName) {
    showConfirm(
        'Pulihkan Arsip',
        `Kembalikan arsip "${fileName}" menjadi aktif kembali?`,
        async () => {
            try {
                await API.put(`/api/files/${id}/restore`);
                Toast.success('Arsip berhasil dipulihkan');
                await loadArchives();
            } catch (err) {
                Toast.error('Gagal memulihkan: ' + err.message);
            }
        },
        'Pulihkan'
    );
}

// ---- Event Listeners ----
function setupEventListeners() {
    // Filters
    ['filter-category', 'filter-tipe', 'filter-zona', 'filter-toko', 'filter-date-start', 'filter-date-end'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                if (id === 'filter-zona') populateTokoFilter();
                applyFilters();
            });
        }
    });

    // Search (trigger on Enter key only)
    const searchInput = document.getElementById('search-input');
    const searchMobile = document.getElementById('search-input-mobile');
    const searchOnEnter = (e) => { if (e.key === 'Enter') { e.preventDefault(); applyFilters(); } };

    if (searchInput) searchInput.addEventListener('keydown', searchOnEnter);
    if (searchMobile) searchMobile.addEventListener('keydown', searchOnEnter);

    // Close preview on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePreview();
    });
}

document.addEventListener('DOMContentLoaded', setupEventListeners);

// ---- Back to Top Button ----
function initBackToTopButton() {
    // Create button
    const backToTopBtn = document.createElement('button');
    backToTopBtn.id = 'back-to-top-btn';
    backToTopBtn.innerHTML = `
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3-3m0 0l3 3m-3-3v12"/>
        </svg>
    `;
    backToTopBtn.title = 'Kembali ke Grafik Invoice';
    backToTopBtn.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        padding: 12px;
        background-color: rgb(37, 99, 235);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        opacity: 0;
        visibility: hidden;
        transform: translateY(20px);
        transition: all 0.3s ease;
        display: none;
    `;
    
    document.body.appendChild(backToTopBtn);

    // Show/hide based on scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            backToTopBtn.style.display = 'flex';
            backToTopBtn.style.alignItems = 'center';
            backToTopBtn.style.justifyContent = 'center';
            setTimeout(() => {
                backToTopBtn.style.opacity = '1';
                backToTopBtn.style.visibility = 'visible';
                backToTopBtn.style.transform = 'translateY(0)';
            }, 10);
        } else {
            backToTopBtn.style.opacity = '0';
            backToTopBtn.style.visibility = 'hidden';
            backToTopBtn.style.transform = 'translateY(20px)';
            setTimeout(() => {
                backToTopBtn.style.display = 'none';
            }, 300);
        }
    });

    // Scroll to top on click with animation
    backToTopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        const scrollDuration = 800; // ms
        const scrollTop = window.scrollY;
        const startTime = Date.now();
        
        const easeInOutQuad = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        
        const scroll = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / scrollDuration, 1);
            const ease = easeInOutQuad(progress);
            
            window.scrollTo(0, scrollTop * (1 - ease));
            
            if (progress < 1) {
                requestAnimationFrame(scroll);
            }
        };
        
        requestAnimationFrame(scroll);
    });
    
    // Hover effects
    backToTopBtn.addEventListener('mouseenter', () => {
        backToTopBtn.style.backgroundColor = 'rgb(29, 78, 216)';
        backToTopBtn.style.transform = 'translateY(0) scale(1.1)';
    });
    
    backToTopBtn.addEventListener('mouseleave', () => {
        backToTopBtn.style.backgroundColor = 'rgb(37, 99, 235)';
        if (window.scrollY > 400) {
            backToTopBtn.style.transform = 'translateY(0)';
        }
    });
}

// Initialize back-to-top button
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackToTopButton);
} else {
    initBackToTopButton();
}

/**
 * Parses patterns like "17 FEB" or "2 MAR" from filename.
 * Used as fallback if database field is empty.
 */
function extractDateFromFilename(name) {
    if (!name) return null;
    const text = name.toUpperCase();

    // 1. DD/MM/YYYY or DD-MM-YYYY
    const dmyRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4}|\d{2})/;
    const dmyMatch = text.match(dmyRegex);
    if (dmyMatch) {
        let y = dmyMatch[3];
        if (y.length === 2) y = '20' + y;
        const m = dmyMatch[2].padStart(2, '0');
        const d = dmyMatch[1].padStart(2, '0');
        return `${parseInt(d, 10)} ${['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGT', 'SEP', 'OKT', 'NOV', 'DES'][parseInt(m, 10) - 1]} ${y}`;
    }

    // 2. YYYY/MM/DD or YYYY-MM-DD
    const ymdRegex = /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/;
    const ymdMatch = text.match(ymdRegex);
    if (ymdMatch) {
        const y = ymdMatch[1];
        const m = ymdMatch[2].padStart(2, '0');
        const d = ymdMatch[3].padStart(2, '0');
        return `${parseInt(d, 10)} ${['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGT', 'SEP', 'OKT', 'NOV', 'DES'][parseInt(m, 10) - 1]} ${y}`;
    }

    const months = {
        'JAN': '01', 'FEB': '02', 'PEB': '02', 'MAR': '03', 'APR': '04',
        'MEI': '05', 'MAY': '05', 'JUN': '06', 'JUL': '07', 'AGU': '08',
        'AUG': '08', 'SEP': '09', 'OKT': '10', 'OCT': '10', 'NOV': '11',
        'NOP': '11', 'DES': '12', 'DEC': '12'
    };

    // 3. DD MMM (e.g. 17 FEB or 2 MAR, 17FEB, 2MAR)
    // Matches 1-2 digits followed optionally by space then 3 letters
    const regex = /(\d{1,2})\s*([A-Z]{3})/i;
    const match = text.match(regex);
    if (match) {
        const day = match[1].padStart(2, '0');
        const monthAbbr = match[2];
        const month = months[monthAbbr];
        if (month) {
            const year = new Date().getFullYear();
            return `${parseInt(day, 10)} ${['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGT', 'SEP', 'OKT', 'NOV', 'DES'][parseInt(month, 10) - 1]} ${year}`;
        }
    }
    return null;
}

/**
 * Bulk Selection Logic
 */
function toggleSelectAll(master) {
    if (master.checked) {
        selectedIds = filteredArchives.map(a => a.id);
    } else {
        selectedIds = [];
    }

    // Sync UI for the current page only
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = master.checked;
    });

    updateBulkUI();
}

function toggleItemSelection(id, cb) {
    if (cb.checked) {
        if (!selectedIds.includes(id)) selectedIds.push(id);
    } else {
        selectedIds = selectedIds.filter(sid => sid !== id);
        // Uncheck master if one unselected
        const master = document.getElementById('select-all');
        if (master) master.checked = false;
    }
    updateBulkUI();
}

function updateBulkUI() {
    const bar = document.getElementById('bulk-action-bar');
    const countEl = document.getElementById('selected-count');

    if (!bar || !countEl) return;

    if (selectedIds.length >= 3) {
        bar.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
        bar.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
        countEl.textContent = selectedIds.length;
    } else {
        bar.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
        bar.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
        const master = document.getElementById('select-all');
        if (master) master.checked = false;
    }
}

function clearSelection() {
    selectedIds = [];
    const checkboxes = document.querySelectorAll('.custom-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    updateBulkUI();
}

async function bulkDownloadSelected() {
    if (selectedIds.length === 0) return;

    const btn = document.getElementById('btn-bulk-download');
    const originalContent = btn.innerHTML;
    btn.disabled = true;

    try {
        // ZIP Bulk Download via Backend
        btn.innerHTML = `
            <div class="loader-mini">
                <div class="loader-ring"></div>
                <div class="loader-ring"></div>
                <div class="loader-ring"></div>
            </div>
            <span>Zipping...</span>
        `;

        const token = API.getToken();
        const downloadUrl = `${CONFIG.API_URL}/api/files/bulk-download?token=${token}`;

        // We use a hidden form to send a large number of IDs via POST 
        // while still allowing the browser to handle the resulting stream as a download.
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = downloadUrl;
        form.style.display = 'none';

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'ids';
        input.value = selectedIds.join(',');
        form.appendChild(input);

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);

        // Give it some time before resetting UI
        setTimeout(() => {
            Toast.success('Proses ZIP dimulai. Tunggu hingga download selesai.');
            btn.disabled = false;
            btn.innerHTML = originalContent;
            clearSelection();
        }, 3000);
    } catch (err) {
        console.error('Bulk Download Error:', err);
        Toast.error('Gagal mendownload berkas masal.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
        clearSelection();
    }
}

async function bulkDeleteSelected() {
    if (selectedIds.length === 0) return;

    showConfirm(
        viewMode === 'active' ? 'Pindahkan ke Sampah' : 'Hapus Permanen',
        viewMode === 'active'
            ? `Apakah Anda yakin ingin memindahkan ${selectedIds.length} berkas ke Tong Sampah?`
            : `HAPUS PERMANEN ${selectedIds.length} berkas? Tindakan ini tidak dapat dibatalkan.`,
        async () => {
            const btn = document.getElementById('btn-bulk-delete');
            const originalContent = btn.innerHTML;
            btn.disabled = true;

            try {
                const endpoint = viewMode === 'active'
                    ? '/api/files/bulk-delete'
                    : '/api/files/bulk-trash-delete';

                await API.post(endpoint, { ids: selectedIds });

                Toast.success(`${selectedIds.length} arsip berhasil dihapus.`);
                clearSelection();
                await loadArchives();
            } catch (err) {
                Toast.error('Gagal menghapus: ' + err.message);
            } finally {
                btn.innerHTML = originalContent;
                btn.disabled = false;
            }
        },
        'Hapus',
        'Batal',
        false // Solid Light Theme
    );
}

// ============================================================
// REQUEST TIKET (MODAL LOGIC)
// ============================================================

function openRequestModal() {
    const modal = document.getElementById('request-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('request-input').value = '';
        document.getElementById('request-input').focus();
    }
}

function closeRequestModal() {
    const modal = document.getElementById('request-modal');
    if (modal) modal.classList.add('hidden');
}

async function submitRequest() {
    const btnSubmit = document.getElementById('btn-submit-request');
    const input = document.getElementById('request-input');
    const pesan = input.value.trim();

    if (!pesan) {
        Toast.error('Pesan tidak boleh kosong.');
        return;
    }

    const originalText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = `
        <div class="loader-mini">
            <div class="loader-ring"></div>
            <div class="loader-ring"></div>
            <div class="loader-ring"></div>
        </div>
    `;
    btnSubmit.disabled = true;

    try {
        await API.post('/api/requests', { pesan });
        Toast.success('Pesan berhasil dikirim ke ANKA');
        closeRequestModal();
    } catch (err) {
        Toast.error('Gagal mengirim request: ' + err.message);
    } finally {
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;
    }
}

async function loadRequestHistory() {
    const loader = document.getElementById('history-loading');
    const emptyState = document.getElementById('history-empty');
    const tbody = document.getElementById('request-history-body');

    loader.classList.remove('hidden');
    emptyState.classList.add('hidden');
    tbody.innerHTML = '';

    try {
        const res = await API.get('/api/requests?limit=50');
        const list = res.requests || [];

        if (list.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            list.forEach(item => {
                let statusClass = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
                if (item.status === 'Selesai') statusClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                else if (item.status === 'Ditolak') statusClass = 'text-red-400 bg-red-500/10 border-red-500/20';

                let notesHtml = '';
                if (item.status === 'Ditolak' && item.notes) {
                    notesHtml = `<p class="text-xs text-red-400/90 mt-1 italic leading-relaxed">Alasan Ditolak: ${item.notes}</p>`;
                }

                const tr = document.createElement('tr');
                tr.className = 'border-b border-white/5 hover:bg-white/5 transition-colors';
                tr.innerHTML = `
                    <td class="py-3 text-gray-300 align-top">${new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td class="py-3 text-white font-medium align-top">
                        ${item.pesan}
                        ${notesHtml}
                    </td>
                    <td class="py-3 text-right align-top">
                        <span class="px-2 py-1 rounded text-xs border ${statusClass} inline-block whitespace-nowrap">${item.status}</span>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (err) {
        Toast.error('Gagal memuat riwayat: ' + err.message);
    } finally {
        loader.classList.add('hidden');
    }
}

function openRequestHistoryModal() {
    const modal = document.getElementById('request-history-modal');
    if (modal) {
        modal.classList.remove('hidden');
        loadRequestHistory();
    }
}

function closeRequestHistoryModal() {
    const modal = document.getElementById('request-history-modal');
    if (modal) modal.classList.add('hidden');
}

// ---- Maintenance Mode ----
async function loadMaintenanceStatus() {
    try {
        const sys = await API.get('/api/system/maintenance');
        updateMaintenanceUI(sys.isMaintenance);
    } catch (err) {
        console.warn('Failed to load maintenance status:', err);
    }
}

function updateMaintenanceUI(isActive) {
    const btn = document.getElementById('maintenance-btn');
    const text = document.getElementById('maintenance-text');
    const ping = document.getElementById('maintenance-ping');
    const dot = document.getElementById('maintenance-dot');

    if (!btn) return;

    // Set data attribute for reliable state tracking
    btn.dataset.maintenance = isActive ? 'active' : 'inactive';

    if (isActive) {
        btn.className = 'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all duration-300 shadow-lg shadow-red-500/20 cursor-pointer';
        text.textContent = 'PERBAIKAN AKTIF';
        ping.classList.remove('hidden');
        dot.className = 'relative inline-flex rounded-full h-3 w-3 bg-red-500';
    } else {
        btn.className = 'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold bg-gray-500/10 text-gray-400 border border-white/5 hover:bg-white/5 transition-all duration-300 cursor-pointer';
        text.textContent = 'Mode Perbaikan';
        ping.classList.add('hidden');
        dot.className = 'relative inline-flex rounded-full h-3 w-3 bg-gray-500';
    }
}

async function toggleMaintenance() {
    const btn = document.getElementById('maintenance-btn');
    if (!btn) return;

    const currentStatus = btn.dataset.maintenance || (document.getElementById('maintenance-text').textContent === 'PERBAIKAN AKTIF' ? 'active' : 'inactive');
    const isActive = currentStatus === 'active';

    if (isActive) {
        const formHtml = `
            <div class="space-y-4 text-left">
                <p class="text-[11px] text-gray-500 leading-relaxed">Dokumentasikan perbaikan ini agar user tahu apa saja yang telah diperbarui saat mereka login nanti.</p>
                <div>
                    <label class="block text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">Judul Perbaikan</label>
                    <select id="maint-res-title" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 transition-all cursor-pointer">
                        <option value="" disabled selected>Pilih Kategori...</option>
                        <option value="Update Website">Update Website</option>
                        <option value="Perbaikan Bug">Perbaikan Bug</option>
                        <option value="Optimalisasi Sistem">Optimalisasi Sistem</option>
                        <option value="Lainnya">Lainnya</option>
                    </select>
                </div>
                <div id="maint-details-container" class="space-y-3">
                    <label class="block text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">Detail Perbaikan</label>
                    <div id="maint-detail-list" class="space-y-3">
                        <div class="maint-detail-item rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
                            <div class="flex items-center gap-2">
                                <span class="maint-detail-number w-7 h-7 shrink-0 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">1.</span>
                                <input type="text" class="maint-detail-summary flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 transition-all" placeholder="Ringkasan perbaikan...">
                            </div>
                            <input type="text" class="maint-detail-description mt-2 ml-9 w-[calc(100%-2.25rem)] bg-white border border-gray-200 rounded-lg px-3 py-2 text-[11px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 transition-all" placeholder="Detail penjelasan (subteks, opsional)...">
                        </div>
                    </div>
                </div>
                <button type="button" id="btn-add-detail" title="Tambah detail perbaikan" aria-label="Tambah detail perbaikan" class="mx-auto w-10 h-10 rounded-full border border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-500 hover:text-indigo-600 text-xl font-bold transition-all flex items-center justify-center">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>
        `;

        showConfirm(
            'Selesaikan Perbaikan',
            'Sistem akan kembali online dan update tersedia di menu Update History.',
            async () => {
                await API.put('/api/system/maintenance', { is_maintenance: false });
                Toast.success('Sistem kembali Online');
                loadMaintenanceStatus();
                return true;
            },
            'Selesaikan',
            'Batal',
            false // Light mode
        );

    } else {
        showConfirm(
            'Aktifkan Perbaikan',
            'Sistem akan masuk ke mode perbaikan. Semua Admin Zona akan otomatis diperintahkan logout.',
            async () => {
                await API.put('/api/system/maintenance', { is_maintenance: true });
                Toast.success('Mode Perbaikan Aktif');
                loadMaintenanceStatus();
                return true;
            },
            'Aktifkan Sekarang',
            'Batal',
            false // Light default for Premium look
        );
    }
}

// ---- Search Synchronization ----
function syncSearch(value) {
    const dashboardSearch = document.getElementById('dashboard-search-input');

    // Update input to stay in sync (useful for programmatic calls)
    if (dashboardSearch) dashboardSearch.value = value;

    // Trigger search logic
    currentPage = 1;
    loadArchives();
}

// ============================================================
// HELPER FUNCTIONS - Labels & Metadata
// ============================================================

/**
 * Get combined display labels for file category + PPN type
 * Handles both old format (category=NON_PPN) and new format (category=INVOICE, tipe_ppn=NON)
 */
function getCategoryBadges(category, tipe_ppn) {
    console.log('[getCategoryBadges] Input:', { category, tipe_ppn });
    
    // Handle INVOICE category
    if (category === 'INVOICE') {
        const typeName = tipe_ppn === 'PPN' || tipe_ppn === 'NON_PPN' ? 'PPN' : 'NON';
        const result = {
            typeLabel: typeName,
            categoryLabel: 'Invoice Merah'
        };
        console.log('[getCategoryBadges] Result:', result);
        return result;
    }
    
    // Handle legacy format where category is NON_PPN or PPN
    if (category === 'NON_PPN' || category === 'NON') {
        const result = {
            typeLabel: 'NON',
            categoryLabel: 'Invoice Merah'
        };
        console.log('[getCategoryBadges] Result (legacy NON):', result);
        return result;
    }
    
    if (category === 'PPN') {
        const result = {
            typeLabel: 'PPN',
            categoryLabel: 'Invoice Merah'
        };
        console.log('[getCategoryBadges] Result (legacy PPN):', result);
        return result;
    }
    
    // For PIUTANG, no type badge
    const result = {
        typeLabel: null,
        categoryLabel: category === 'PIUTANG' || category === 'BUKTI PIUTANG' ? 'Bukti Piutang' : category
    };
    console.log('[getCategoryBadges] Result (other):', result);
    return result;
}

/**
 * Get combined display label for file category + PPN type
 * Examples: "Invoice Merah - PPN", "Invoice Putih - NON", "Bukti Piutang"
 */
function getCombinedCategoryLabel(category, tipe_ppn) {
    // For INVOICE category, combine with PPN type
    if (category === 'INVOICE') {
        if (tipe_ppn === 'PPN') {
            return 'Invoice Merah - PPN';
        } else if (tipe_ppn === 'NON' || tipe_ppn === 'NON_PPN') {
            return 'Invoice Putih - NON';
        } else {
            return 'Invoice Merah'; // Fallback
        }
    }
    
    // For other categories, just return category label
    const labels = {
        'PIUTANG': 'Bukti Piutang',
        'BUKTI PIUTANG': 'Bukti Piutang'
    };
    return labels[category] || category;
}

/**
 * Get display label for file category
 */
function getCategoryLabel(category) {
    const labels = {
        'INVOICE': 'Invoice Merah',
        'PIUTANG': 'Bukti Piutang',
        'BUKTI PIUTANG': 'Bukti Piutang'
    };
    return labels[category] || category;
}

/**
 * Get display label for PPN type
 */
function getTipePPNLabel(tipe_ppn) {
    const labels = {
        'PPN': 'PPN',
        'NON': 'NON',
        'NON_PPN': 'NON'
    };
    return labels[tipe_ppn] || tipe_ppn;
}

/**
 * Extract nominal (Rp value) from filename
 * Looks for patterns like "13.242.200", "1.521.000" (dot-separated numbers)
 * Returns formatted string like "Rp 13.242.200" or null if not found
 */
function extractNominalFromFilename(filename) {
    if (!filename) return null;
    
    // Pattern: digits with dots, e.g., "13.242.200" or "1.521.000"
    // Match 1-2 digits, then (dot + 3 digits) repeated 1-3 times
    const nominalMatch = filename.match(/\b(\d{1,2}(?:\.\d{3})+)\b/);
    
    if (nominalMatch) {
        const nominal = nominalMatch[1];
        return `Rp ${nominal}`;
    }
    
    return null;
}

// ============================================================
// File Detail View Function
// ============================================================
function openFileDetail(fileId) {
    window.location.href = `file-detail.html?id=${fileId}`;
}


// ============================================
// INVOICE LIST FUNCTIONS - Migrated from invoice-list.js
// ============================================

const INVOICE_PAGE_SIZE = 20;
let invoiceCurrentPage = 1;
let invoiceTotalCount = 0;

async function loadInvoicesInDashboard(page = 1) {
    try {
        console.log('[LoadInvoices] ===== LOADING PAGE', page, '=====');
        
        const token = API.getToken() || localStorage.getItem('jwt_token');
        console.log('[LoadInvoices] Auth token present:', !!token);
        
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const offset = (page - 1) * INVOICE_PAGE_SIZE;
        const url = `/api/invoice/list?limit=${INVOICE_PAGE_SIZE}&offset=${offset}`;
        console.log('[LoadInvoices] Fetching from:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });
        
        console.log('[LoadInvoices] Response status:', response.status);
        
        if (!response.ok) {
            const errText = await response.text();
            throw new Error('Failed to load invoices: ' + response.statusText + ' - ' + errText);
        }
        
        const result = await response.json();
        console.log('[LoadInvoices] API Response:', JSON.stringify(result, null, 2));
        console.log('[LoadInvoices] Data length:', (result.data || []).length);
        console.log('[LoadInvoices] Count:', result.count);
        
        renderInvoiceTable(result.data || []);
        invoiceCurrentPage = page;
        
        // Track total count for pagination
        if (result.count !== undefined) {
            invoiceTotalCount = result.count;
            console.log('[LoadInvoices] ✅ Set invoiceTotalCount to', invoiceTotalCount);
            updatePaginationInfo();
            updateInvoiceStatsFromData(result.data || [], result.count);
        } else {
            console.warn('[LoadInvoices] ⚠️ result.count is undefined! Using data.length instead');
            invoiceTotalCount = (result.data || []).length;
            updatePaginationInfo();
            updateInvoiceStatsFromData(result.data || [], invoiceTotalCount);
        }
        
    } catch (error) {
        console.error('[LoadInvoices] ❌ Error:', error);
    }
}

function renderInvoiceTable(invoices) {
    const tbody = document.getElementById('invoiceTableBody');
    if (!tbody) {
        console.warn('[RenderTable] invoiceTableBody not found - available elements:');
        console.warn('[RenderTable] All tbody elements:', document.querySelectorAll('tbody').length);
        document.querySelectorAll('tbody').forEach((el, i) => {
            console.warn(`  tbody[${i}] id=${el.id}, class=${el.className}`);
        });
        return;
    }
    
    console.log('[RenderTable] Rendering', invoices.length, 'invoices');
    
    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: #7f8c8d;">Belum ada data invoice</td></tr>';
        return;
    }
    
    tbody.innerHTML = invoices.map(inv => {
        const statusClass = inv.status === 'UPLOADED' ? 'uploaded' : inv.status === 'MISSING' ? 'missing' : 'pending';
        const statusText = inv.status === 'UPLOADED' ? 'Lunas' : inv.status === 'MISSING' ? 'MISSING' : 'Belum Lunas';
        const statusStyle = statusClass === 'uploaded' ? 'background: #d4edda; color: #000000;' : 
                           statusClass === 'pending' ? 'background: #fff3cd; color: #000000;' : 
                           'background: #f8d7da; color: #000000;';
        
        // Format date dd/mm/yy
        let formattedDate = inv.tanggal || '-';
        if (inv.tanggal && inv.tanggal.includes('-')) {
            const parts = inv.tanggal.split('-');
            if (parts.length === 3) {
                formattedDate = `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
            }
        }
        
        // Capitalize first letter of tipe
        const tipe = inv.jenis_transaksi ? inv.jenis_transaksi.charAt(0).toUpperCase() + inv.jenis_transaksi.slice(1).toLowerCase() : '-';
        
        // Auto-adjust font size for long text
        const konsumenText = inv.konsumen || '-';
        const tokoText = inv.toko || '-';
        const konsumenFontSize = konsumenText.length > 25 ? '11px' : '14px';
        const tokoFontSize = tokoText.length > 20 ? '11px' : '14px';
        
        return `
        <tr style="transition: background 0.2s; border-bottom: 4px solid #34495e;">
            <td style="padding: 15px 12px; font-size: 14px; color: #2c3e50; vertical-align: middle;">
                <span style="display: inline-block; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; ${statusStyle}">
                    ${statusText}
                </span>
            </td>
            <td style="padding: 15px 12px; font-size: 14px; color: #2c3e50; vertical-align: middle;">${formattedDate}</td>
            <td style="padding: 15px 12px; font-size: 14px; color: #2c3e50; vertical-align: middle;"><strong>${inv.faktur || '-'}</strong></td>
            <td style="padding: 15px 12px; font-size: 14px; color: #2c3e50; vertical-align: middle;">${inv.metode_bayar || '-'}</td>
            <td style="padding: 15px 12px; font-size: 14px; color: #2c3e50; vertical-align: middle;">${tipe}</td>
            <td style="padding: 15px 12px; font-size: ${konsumenFontSize}; color: #2c3e50; vertical-align: middle;">${konsumenText}</td>
            <td style="padding: 15px 12px; font-size: ${tokoFontSize}; color: #2c3e50; vertical-align: middle;">${tokoText}</td>
            <td style="padding: 15px 12px; font-size: 14px; color: #2c3e50; vertical-align: middle;">${formatCurrency(inv.total_jumlah_jual)}</td>
            <td style="padding: 15px 12px; font-size: 14px; color: #2c3e50; vertical-align: middle;">${inv.keterangan || '-'}</td>
        </tr>
    `}).join('');
    
    console.log('[RenderTable] ✅ Rendered successfully');
}

function formatCurrency(value) {
    if (!value) return 'Rp 0';
    return 'Rp ' + parseInt(value).toLocaleString('id-ID');
}

// Load unique filter values from database
async function loadFilterOptions() {
    try {
        console.log('[Filter] Starting loadFilterOptions');
        const token = API.getToken() || localStorage.getItem('jwt_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        console.log('[Filter] Auth token present:', !!token);
        console.log('[Filter] Current user role:', currentUser?.role, 'zona_id:', currentUser?.zona_id);
        
        // Get all invoices with high limit to count everything
        // Note: API automatically filters by zona_id for admin_zona users
        const url = '/api/invoice/list?limit=10000&offset=0';
        console.log('[Filter] Fetching from:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });
        
        console.log('[Filter] Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Failed to load filter options (${response.status}): ${errText}`);
        }
        
        const result = await response.json();
        console.log('[Filter] Full API response:', JSON.stringify(result, null, 2));
        
        const invoices = result.data || [];
        invoiceTotalCount = result.count || invoices.length || 0;
        
        console.log('[Filter] Total invoice count set to:', invoiceTotalCount, 'Invoices received:', invoices.length);
        console.log('[Filter] For admin_zona users, this is already filtered by their zone');
        
        if (invoices.length === 0) {
            console.warn('[Filter] ⚠️ WARNING: No invoices returned from API!');
        }
        
        // Get unique values from filtered invoices
        // For admin_zona: show konsumen (actual store names from Excel)
        // For regular users: show toko field
        const tokos = [...new Set(invoices.map(inv => 
            currentUser?.role === 'admin_zona' ? inv.konsumen : inv.toko
        ).filter(Boolean))];
        const keterangans = [...new Set(invoices.map(inv => inv.keterangan).filter(Boolean))];
        
        // Extract unique years and months from invoices
        const yearSet = new Set();
        const monthSet = new Set();
        invoices.forEach(inv => {
            // Try both tanggal and tanggal_dokumen fields
            const dateField = inv.tanggal || inv.tanggal_dokumen;
            if (dateField) {
                const date = new Date(dateField);
                if (!isNaN(date.getTime())) {
                    yearSet.add(date.getFullYear().toString());
                    monthSet.add(date.getMonth() + 1); // getMonth() returns 0-11
                }
            }
        });
        const years = Array.from(yearSet).sort().reverse();
        const months = Array.from(monthSet).sort((a, b) => a - b);
        
        console.log('[Filter] Loaded options - Years:', years.length, 'Months with data:', months.length, 'Tokos:', tokos.length, 'Keterangans:', keterangans.length);
        if (currentUser?.role === 'admin_zona') {
            console.log('[Filter] ✅ Admin Zona: Showing actual konsumen (store) names from invoices');
        }
        
        // Populate year select
        const yearSelect = document.getElementById('filterYear');
        if (yearSelect) {
            while (yearSelect.options.length > 1) {
                yearSelect.remove(1);
            }
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            });
            console.log('[Filter] Year select populated with', years.length, 'options');
        }
        
        // Populate month select - ONLY with months that have data
        const monthSelect = document.getElementById('filterMonth');
        if (monthSelect) {
            while (monthSelect.options.length > 1) {
                monthSelect.remove(1);
            }
            months.forEach(month => {
                const option = document.createElement('option');
                option.value = month;
                const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                                   'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                option.textContent = monthNames[month - 1];
                monthSelect.appendChild(option);
            });
            console.log('[Filter] Month select populated with', months.length, 'options (only months with data)');
        }
        
        // Populate toko select - clear existing first to avoid duplicates
        const tokoSelect = document.getElementById('filterToko');
        if (tokoSelect) {
            // Keep only the first option (Semua Toko)
            while (tokoSelect.options.length > 1) {
                tokoSelect.remove(1);
            }
            tokos.forEach(toko => {
                const option = document.createElement('option');
                option.value = toko;
                option.textContent = toko;
                tokoSelect.appendChild(option);
            });
            console.log('[Filter] Toko select populated with', tokoSelect.options.length - 1, 'options');
        }
        
        // Populate keterangan select - clear existing first to avoid duplicates
        const keteranganSelect = document.getElementById('filterKeterangan');
        if (keteranganSelect) {
            // Keep only the first option (Semua)
            while (keteranganSelect.options.length > 1) {
                keteranganSelect.remove(1);
            }
            keterangans.forEach(ket => {
                const option = document.createElement('option');
                option.value = ket;
                option.textContent = ket;
                keteranganSelect.appendChild(option);
            });
            console.log('[Filter] Keterangan select populated with', keteranganSelect.options.length - 1, 'options');
        }
        
        // Update pagination and stats based on loaded data
        updateInvoiceStatsFromData(invoices, invoiceTotalCount);
        
    } catch (error) {
        console.error('[Filter] Error loading options:', error);
    }
}

// Update stats from loaded invoice data
function updateInvoiceStatsFromData(invoices, totalCount) {
    console.log('[StatsFromData] ===== UPDATING STATS =====');
    console.log('[StatsFromData] Invoices:', invoices.length, 'Total count:', totalCount);
    
    // Count statuses from loaded data
    // Map status to payment status for display
    // Let's use tipe_ppn or status to determine lunas/belum lunas
    const lunasCount = invoices.filter(r => {
        // Lunas = UPLOADED or paid status
        return r.status === 'UPLOADED' || r.payment_status === 'LUNAS';
    }).length;
    const belumLunasCount = invoices.filter(r => {
        // Belum Lunas = PENDING or unpaid status
        return r.status === 'PENDING' || r.payment_status === 'BELUM_LUNAS';
    }).length;
    
    let finalLunasCount = lunasCount;
    let finalBelumLunasCount = belumLunasCount;
    
    // If this is first page with 20 items and all are same status, use totalCount
    if (invoices.length === 20 && belumLunasCount === 20 && lunasCount === 0) {
        console.log('[StatsFromData] ⚠️ All 20 loaded items are BELUM LUNAS - likely paginated view');
        console.log('[StatsFromData] Using totalCount as BELUM LUNAS instead of 20');
        finalBelumLunasCount = totalCount;
    }
    
    console.log('[StatsFromData] Counts - Total:', totalCount, 'Lunas:', finalLunasCount, 'Belum Lunas:', finalBelumLunasCount);
    
    // Update stat elements by ID
    const elements = {
        total: document.getElementById('statTotal'),
        uploaded: document.getElementById('statUploaded'),
        pending: document.getElementById('statPending')
    };
    
    console.log('[StatsFromData] Found elements - total:', !!elements.total, 'uploaded:', !!elements.uploaded, 'pending:', !!elements.pending);
    
    if (elements.total) elements.total.textContent = totalCount;
    if (elements.uploaded) elements.uploaded.textContent = finalLunasCount;    // Renamed to Lunas
    if (elements.pending) elements.pending.textContent = finalBelumLunasCount;  // Renamed to Belum Lunas
    
    console.log('[StatsFromData] ✅ Stats updated successfully');
    console.log('[StatsFromData] ===== STATS UPDATE COMPLETE =====');
}

// Load invoices when dashboard loads
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for auth to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('[Dashboard] Loading invoices...');
    
    // Wait for DOM to be fully ready (invoice table injected)
    let retries = 0;
    while (!document.getElementById('invoiceTableBody') && retries < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
    }
    
    if (document.getElementById('invoiceTableBody')) {
        console.log('[Dashboard] Invoice table found, loading data...');
        // Load invoices first
        await loadInvoicesInDashboard(1);
        // Then populate filters from loaded invoices
        await loadFilterOptions();
        // Initialize event listeners for pagination and filters
        initInvoiceSystem();
    } else {
        console.warn('[Dashboard] Invoice table not found after 5 seconds');
    }
});


// ============================================
// INVOICE FILTER FUNCTIONS
// ============================================

async function applyInvoiceFilters() {
    try {
        const status = document.getElementById('filterStatus')?.value || '';
        const toko = document.getElementById('filterToko')?.value || '';
        const keterangan = document.getElementById('filterKeterangan')?.value || '';
        const year = document.getElementById('filterYear')?.value || '';
        const month = document.getElementById('filterMonth')?.value || '';
        const search = document.getElementById('filterSearch')?.value || '';
        
        console.log('[Filter] Applying filters:', { status, toko, keterangan, year, month, search });
        
        const token = API.getToken() || localStorage.getItem('jwt_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        // Build query string
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (toko) params.append('toko', toko);
        if (keterangan) params.append('keterangan', keterangan);
        if (search) params.append('search', search);
        
        // Handle Year and Month filtering
        if (year && month) {
            // Both year and month selected
            const dateFromValue = `${year}-${String(month).padStart(2, '0')}-01`;
            const dateToObj = new Date(parseInt(year), parseInt(month), 0);
            const dateToValue = `${year}-${String(month).padStart(2, '0')}-${dateToObj.getDate()}`;
            params.append('date_from', dateFromValue);
            params.append('date_to', dateToValue);
            console.log('[Filter] Filtering by year-month:', { year, month, dateFromValue, dateToValue });
        } else if (year) {
            // Only year selected
            const dateFromValue = `${year}-01-01`;
            const dateToValue = `${year}-12-31`;
            params.append('date_from', dateFromValue);
            params.append('date_to', dateToValue);
            console.log('[Filter] Filtering by year only:', { year, dateFromValue, dateToValue });
        } else if (month) {
            // Only month (use current year)
            const currentYear = new Date().getFullYear();
            const dateFromValue = `${currentYear}-${String(month).padStart(2, '0')}-01`;
            const dateToObj = new Date(currentYear, parseInt(month), 0);
            const dateToValue = `${currentYear}-${String(month).padStart(2, '0')}-${dateToObj.getDate()}`;
            params.append('date_from', dateFromValue);
            params.append('date_to', dateToValue);
            console.log('[Filter] Filtering by month only:', { month, dateFromValue, dateToValue });
        }
        
        params.append('limit', INVOICE_PAGE_SIZE);
        params.append('offset', 0);
        
        console.log('[Filter] Query params:', params.toString());
        
        const response = await fetch(`/api/invoice/list?${params.toString()}`, {
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error('Failed to filter invoices');
        }
        
        const result = await response.json();
        console.log('[Filter] Result:', result);
        
        renderInvoiceTable(result.data || []);
        invoiceCurrentPage = 1;
        
        // Track total count for pagination
        if (result.count !== undefined) {
            invoiceTotalCount = result.count;
            console.log('[Filter] Set invoiceTotalCount to', invoiceTotalCount);
            updatePaginationInfo();
            updateInvoiceStatsFromData(result.data || [], result.count);
        }
        
    } catch (error) {
        console.error('[Filter] Error:', error);
        alert('Error applying filters: ' + error.message);
    }
}

function resetInvoiceFilters() {
    console.log('[Filter] Resetting filters');
    const filterStatus = document.getElementById('filterStatus');
    const filterToko = document.getElementById('filterToko');
    const filterKeterangan = document.getElementById('filterKeterangan');
    const filterYear = document.getElementById('filterYear');
    const filterMonth = document.getElementById('filterMonth');
    const filterSearch = document.getElementById('filterSearch');
    
    if (filterStatus) filterStatus.value = '';
    if (filterToko) filterToko.value = '';
    if (filterKeterangan) filterKeterangan.value = '';
    if (filterYear) filterYear.value = '';
    if (filterMonth) filterMonth.value = '';
    if (filterSearch) filterSearch.value = '';
    
    loadInvoicesInDashboard(1);
}

// Setup admin zona specific filters - hide stats
function setupAdminZonaFilters() {
    console.log('[AdminZonaFilters] Setting up admin zona specific filters');
    
    // Hide stats for admin zona (they only see their zone's data)
    const statTotal = document.getElementById('statTotal');
    const statUploaded = document.getElementById('statUploaded');
    const statPending = document.getElementById('statPending');
    const statMissing = document.getElementById('statMissing');
    
    if (statTotal) statTotal.closest('div').style.display = 'none';
    if (statUploaded) statUploaded.closest('div').style.display = 'none';
    if (statPending) statPending.closest('div').style.display = 'none';
    if (statMissing) statMissing.closest('div').style.display = 'none';
    
    // Hide invoice table filters and show admin_zona filters
    const invoiceTableSection = document.getElementById('invoiceTableSection');
    const adminZonaFilterSection = document.getElementById('adminZonaFilterSection');
    
    if (invoiceTableSection) {
        invoiceTableSection.style.display = 'none';
        console.log('[AdminZonaFilters] ✅ Invoice table section hidden');
    }
    
    if (adminZonaFilterSection) {
        adminZonaFilterSection.style.display = 'block';
        console.log('[AdminZonaFilters] ✅ Admin Zona filter section shown');
    }
    
    console.log('[AdminZonaFilters] ✅ Admin Zona filters setup complete');
}

// Setup regular filters for super_admin and moderator - no special setup needed
function setupRegularFilters() {
    console.log('[RegularFilters] Setting up regular user filters (super_admin/moderator)');
    // All filters already visible in HTML for regular users
    console.log('[RegularFilters] ✅ Regular user filters active');
}

// Admin Zona Filter Functions
async function applyAdminZonaFilters() {
    const supplier = document.getElementById('filterSupplier')?.value || '';
    const keterangan = document.getElementById('filterAdminZonaKeterangan')?.value || '';
    const year = document.getElementById('filterYear')?.value || '';
    const month = document.getElementById('filterAdminZonaMonth')?.value || '';
    
    console.log('[AdminZonaFilter] Applying filters:', { supplier, keterangan, year, month });
    
    try {
        const params = new URLSearchParams();
        if (supplier) params.append('konsumen', supplier);
        if (keterangan) params.append('keterangan', keterangan);
        if (year) params.append('year', year);
        if (month) params.append('month', month);
        
        const url = `/api/invoice/list?${params.toString()}`;
        console.log('[AdminZonaFilter] Calling:', url);
        
        const response = await API.get(url);
        console.log('[AdminZonaFilter] Response:', response);
        
        // Display results - for now just log
        alert(`Found ${response.count || 0} invoices matching filters`);
    } catch (err) {
        console.error('[AdminZonaFilter] Error:', err);
        alert('Gagal memuat data: ' + err.message);
    }
}

function resetAdminZonaFilters() {
    document.getElementById('filterSupplier').value = '';
    document.getElementById('filterAdminZonaKeterangan').value = '';
    document.getElementById('filterYear').value = '';
    document.getElementById('filterAdminZonaMonth').value = '';
    
    console.log('[AdminZonaFilter] Filters reset');
}
function populateMonthDropdown() {
    console.log('[PopulateMonth] Month input (type=month) is handled by browser');
    // input type="month" returns value in YYYY-MM format automatically
}

// Initialize invoice system after content is loaded
function initInvoiceSystem() {
    console.log('[InvoiceInit] ===== INITIALIZING INVOICE SYSTEM =====');
    console.log('[InvoiceInit] currentUser:', currentUser);
    console.log('[InvoiceInit] currentUser?.role:', currentUser?.role);
    console.log('[InvoiceInit] Check: currentUser !== undefined:', typeof currentUser !== 'undefined');
    console.log('[InvoiceInit] Check: currentUser truthy:', !!currentUser);
    
    // Setup admin zona specific filters or regular filters based on role
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'admin_zona') {
        console.log('[InvoiceInit] ✅ Admin Zona detected - setting up admin zona filters');
        setupAdminZonaFilters();
    } else {
        console.log('[InvoiceInit] ✅ Regular user (super_admin/moderator) detected - setting up regular filters');
        console.log('[InvoiceInit] currentUser.role =', currentUser?.role);
        setupRegularFilters();
    }
    
    // Setup pagination buttons
    const btnNext = document.getElementById('btnNextPage');
    const btnPrev = document.getElementById('btnPrevPage');
    
    if (btnNext) {
        btnNext.onclick = nextInvoicePage;
        console.log('[InvoiceInit] ✅ Next button event listener attached');
    } else {
        console.warn('[InvoiceInit] ⚠️ btnNextPage not found');
    }
    
    if (btnPrev) {
        btnPrev.onclick = previousInvoicePage;
        console.log('[InvoiceInit] ✅ Prev button event listener attached');
    } else {
        console.warn('[InvoiceInit] ⚠️ btnPrevPage not found');
    }
    
    // Setup filter buttons with IDs from invoice-list.html
    const btnApply = document.getElementById('btnApplyFilter');
    const btnReset = document.getElementById('btnResetFilter');
    
    if (btnApply) {
        btnApply.onclick = applyInvoiceFilters;
        console.log('[InvoiceInit] ✅ Apply filter button event listener attached');
    } else {
        console.warn('[InvoiceInit] ⚠️ btnApplyFilter not found');
    }
    
    if (btnReset) {
        btnReset.onclick = resetInvoiceFilters;
        console.log('[InvoiceInit] ✅ Reset filter button event listener attached');
    } else {
        console.warn('[InvoiceInit] ⚠️ btnResetFilter not found');
    }
    
    console.log('[InvoiceInit] ===== INVOICE SYSTEM INITIALIZED =====');
}

function updatePaginationInfo() {
    const paginationInfo = document.getElementById('paginationInfo');
    if (!paginationInfo) return;
    
    const start = (invoiceCurrentPage - 1) * INVOICE_PAGE_SIZE + 1;
    const end = Math.min(invoiceCurrentPage * INVOICE_PAGE_SIZE, invoiceTotalCount);
    const total = invoiceTotalCount;
    
    if (total === 0) {
        paginationInfo.textContent = 'Menampilkan 0 - 0 dari 0 invoice';
    } else {
        paginationInfo.textContent = `Menampilkan ${start} - ${end} dari ${total} invoice`;
    }
    
    // Update button states
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (prevBtn) {
        prevBtn.disabled = invoiceCurrentPage === 1;
    }
    
    if (nextBtn) {
        const totalPages = Math.ceil(invoiceTotalCount / INVOICE_PAGE_SIZE);
        nextBtn.disabled = invoiceCurrentPage >= totalPages;
    }
    
    console.log('[Pagination] Updated - Page', invoiceCurrentPage, 'Total:', total, 'Showing', start, '-', end);
}

function nextInvoicePage() {
    const totalPages = Math.ceil(invoiceTotalCount / INVOICE_PAGE_SIZE);
    if (invoiceCurrentPage < totalPages) {
        loadInvoicesInDashboard(invoiceCurrentPage + 1);
    }
}

function previousInvoicePage() {
    if (invoiceCurrentPage > 1) {
        loadInvoicesInDashboard(invoiceCurrentPage - 1);
    }
}
