// ============================================================
// Shared Sidebar Component — Single Source of Truth
// Auto-detects current page and renders the sidebar
// Version 3.1.0 - Clean Build
// ============================================================

(function () {
    try {
        const activePage = window.location.pathname.split('/').pop() || 'dashboard.html';

    const menuItems = [
        { section: 'Menu Utama' },
        { href: 'dashboard.html', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', guard: 'data-role="super_admin,moderator,admin_zona"' },

        {
            isDropdown: true,
            id: 'dd-upload',
            label: 'Unggah',
            icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
            children: [
                { href: 'upload.html', label: 'Invoice Merah', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', guard: 'data-permission="upload_single"' },
                { href: 'upload-piutang.html', label: 'Bukti Piutang', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', guard: 'data-permission="upload_single"' },
                { href: 'history.html', label: 'Riwayat Batch', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', guard: 'data-role="super_admin"' },
            ]
        },
        {
            isDropdown: true,
            id: 'dd-invoice',
            label: 'Sistem Invoice',
            icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
            children: [
                { href: 'upload-excel.html', label: 'Upload Excel REKAP LABA', icon: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', guard: 'data-role="super_admin,moderator"' },
                { href: 'invoice-list.html', label: 'Daftar Invoice', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', guard: 'data-role="super_admin,moderator,user"' },
                { href: 'invoice-batches.html', label: 'Riwayat Upload', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', guard: 'data-role="super_admin,moderator"' },
            ]
        },
        {
            isDropdown: true,
            id: 'dd-manajemen',
            label: 'Manajemen',
            icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
             children: [
                { href: 'users.html', label: 'Manajemen Pengguna', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', guard: 'data-permission="manage_users"' },
                { href: 'tokos.html', label: 'Daftar Toko', icon: 'M19 21V5a2 2 0 012-2H9a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', guard: 'data-permission="manage_toko"' },
                { href: 'zonas.html', label: 'Zona Operasional', iconPaths: ['M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z', 'M15 11a3 3 0 11-6 0 3 3 0 016 0z'], guard: 'data-permission="manage_zonas"' },
            ]
        },
        {
            isDropdown: true,
            id: 'dd-sistem',
            label: 'Sistem',
            iconPaths: ['M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'],
            children: [
                { href: 'notification-settings.html', label: '🔔 Pengaturan Notifikasi', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', guard: '' },
                { href: 'activity-log.html', label: '📋 Activity Log', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', guard: 'data-role="super_admin,moderator"' },
                { href: 'admin-system-health.html', label: 'Kesehatan Sistem', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', guard: 'data-role="super_admin,moderator"' },
                { href: 'admin-data-quality.html', label: 'Kualitas Data', icon: 'M5 13l4 4L19 7', guard: 'data-role="super_admin,moderator"' },
                { href: 'faq.html', label: 'FAQ & Bantuan', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', guard: '' },
                { href: 'requests.html', label: 'Request Revisi', icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z', guard: '' },
                { href: 'fleet.html', label: 'Manajemen Armada', icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0', guard: 'data-role="super_admin,moderator"' },
                { href: 'bugs.html', label: 'Laporan Bug', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z', guard: 'data-role="super_admin,moderator"' },
                { href: 'trash.html', label: 'Tong Sampah', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', guard: 'data-role="super_admin,moderator"' },
                { href: 'cleanup.html', label: 'Optimasi Data', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.051.046M15.571 8.572a2 2 0 011.022.547l2.387.477a6 6 0 013.86-.517l.318-.158a6 6 0 003.86-.517L20.95 8.79a2 2 0 011.051-.046M12 7v10m0 0l-1.5-1.5M12 17l1.5-1.5', guard: 'data-role="super_admin"' },
            ]
        }
    ];

    window.toggleSidebarDropdown = function (id) {
        const container = document.getElementById(id);
        const parent = document.getElementById(id + '-parent');
        if (!container || !parent) return;

        const isExpanded = parent.classList.contains('expanded');
        if (isExpanded) {
            container.style.maxHeight = '0px';
            parent.classList.remove('expanded');
        } else {
            container.style.maxHeight = container.scrollHeight + 'px';
            parent.classList.add('expanded');
        }
    };

    function renderIcon(iconStr, iconPathsArr) {
        if (iconPathsArr) {
            return iconPathsArr.map(p => `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${p}" />`).join('');
        }
        return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconStr}" />`;
    }

    let navHTML = '';
    for (const item of menuItems) {
        if (item.section) {
            navHTML += `<p class="text-[10px] text-gray-400 uppercase tracking-widest mt-6 mb-1 px-5 font-bold">${item.section}</p>`;
            continue;
        }

        if (item.isDropdown) {
            const visibleChildren = item.children.filter(child => child.href !== 'cleanup.html');
            const hasActiveChild = visibleChildren.some(child => activePage === child.href);
            const parentClass = hasActiveChild ? 'expanded' : '';
            const maxH = hasActiveChild ? '1000px' : '0px';

            let childrenHTML = '';
            for (const child of visibleChildren) {
                const isActive = activePage === child.href;
                const activeClass = isActive
                    ? 'active text-blue-600 bg-blue-50 font-bold'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50';

                // Handle both link and button items
                if (child.isButton) {
                    childrenHTML += `
                        <button onclick="${child.onclick}" ${child.guard || ''}
                            class="sidebar-link flex items-center gap-3 px-5 py-2.5 mt-0.5 mx-2 rounded-xl text-xs transition-all group text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-none bg-transparent cursor-pointer w-full text-left">
                            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                ${renderIcon(child.icon, child.iconPaths)}
                            </svg>
                            ${child.label}
                        </button>
                     `;
                } else {
                    childrenHTML += `
                        <a href="${child.href}" ${child.guard || ''}
                            class="sidebar-link flex items-center gap-3 px-5 py-2.5 mt-0.5 mx-2 rounded-xl text-xs transition-all group ${activeClass}">
                            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                ${renderIcon(child.icon, child.iconPaths)}
                            </svg>
                            ${child.label}
                        </a>
                     `;
                }
            }

            navHTML += `
                <div id="${item.id}-parent" class="sidebar-dropdown ${parentClass} mt-1 mb-0.5 px-2">
                    <button onclick="toggleSidebarDropdown('${item.id}')" class="sidebar-dropdown-btn w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs text-gray-600 hover:text-gray-900 group font-bold tracking-tight">
                        <div class="flex items-center gap-3">
                            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                ${renderIcon(item.icon, item.iconPaths)}
                            </svg>
                            <span>${item.label}</span>
                        </div>
                        <svg class="sidebar-dropdown-icon w-3.5 h-3.5 opacity-40 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </button>
                    <div id="${item.id}" class="sidebar-dropdown-content" style="max-height: ${maxH};">
                        <div class="py-1">
                            ${childrenHTML}
                        </div>
                    </div>
                </div>
            `;

        } else {
            const isActive = activePage === item.href;
            const activeClass = isActive
                ? 'active text-blue-600 bg-blue-100/50 font-bold'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50';

            navHTML += `
                <div class="px-2">
                <a href="${item.href}" ${item.guard || ''}
                    class="sidebar-link flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs transition-all group font-bold tracking-tight ${activeClass}">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        ${renderIcon(item.icon, item.iconPaths)}
                    </svg>
                    ${item.label}
                </a>
                </div>`;
        }
    }

    function inject() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        sidebar.innerHTML = `
            <div class="p-6 border-b border-gray-100">
                <div class="flex items-center gap-3 group">
                    <div class="w-10 h-10 rounded-[1rem] bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform duration-300">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                    </div>
                    <div>
                        <h1 class="text-[13px] font-black text-gray-900 uppercase tracking-tight">Pusat Arsip Anka</h1>
                        <span class="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Multi-Zona v3.1</span>
                    </div>
                </div>
            </div>

            <nav class="flex-1 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
                ${navHTML}
            </nav>
        `;

        const mainContent = document.getElementById('main-content');
        if (mainContent && !document.getElementById('global-broadcast-bar')) {
            const bar = document.createElement('div');
            bar.id = 'global-broadcast-bar';
            bar.className = 'modern-broadcast-bar hidden';
            bar.innerHTML = `
                <div class="broadcast-badge font-black uppercase italic">BERITA</div>
                <div class="broadcast-content-wrapper">
                    <div id="global-broadcast-ticker" class="broadcast-ticker font-bold text-sm tracking-wide"></div>
                </div>
            `;
            mainContent.prepend(bar);
            loadGlobalBroadcast();
        }

        if (typeof updateUserUI === 'function') {
            updateUserUI();
        }

        // --- Final cleanups ---
        setTimeout(() => {
            const data = localStorage.getItem('user_data');
            if (data) {
                const user = JSON.parse(data);
                const avatar = document.getElementById('user-avatar-sidebar');
                const name = document.getElementById('user-name-sidebar');
                const role = document.getElementById('user-role-sidebar');
                if (avatar) avatar.textContent = user.username.charAt(0).toUpperCase();
                if (name) name.textContent = user.username;
                if (role) role.textContent = user.role.replace('_', ' ');
            }
        }, 100);
    }

    async function loadGlobalBroadcast() {
        try {
            if (typeof API === 'undefined') return;
            const { broadcast } = await API.get('/api/broadcasts/latest');
            const bar = document.getElementById('global-broadcast-bar');
            const ticker = document.getElementById('global-broadcast-ticker');

            if (broadcast && broadcast.content && bar && ticker) {
                ticker.textContent = broadcast.content;
                bar.classList.remove('hidden');
            } else if (bar) {
                bar.classList.add('hidden');
            }
        } catch (err) { }
    }

    // Polling for updates every 30 seconds
    setInterval(loadGlobalBroadcast, 30000);

    // Check for update history notifications on page load (if function exists on this page)
    // Wait a bit longer to ensure all page-specific initialization is done
    const checkNotification = async () => {
        if (typeof initUpdateHistoryNotification === 'function') {
            console.log('[Sidebar] Calling initUpdateHistoryNotification...');
            try {
                await initUpdateHistoryNotification();
            } catch (err) {
                console.error('[Sidebar] Error in initUpdateHistoryNotification:', err);
            }
        } else {
            console.log('[Sidebar] initUpdateHistoryNotification not available on this page');
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[Sidebar] DOMContentLoaded event');
            inject();
            setTimeout(checkNotification, 1500);
        });
    } else {
        console.log('[Sidebar] Document already loaded, injecting sidebar');
        inject();
        setTimeout(checkNotification, 1000);
    }
    
    // Listen for storage changes from other tabs/windows (cross-tab notification)
    window.addEventListener('storage', (event) => {
        if (event.key === 'lastNewUpdateId' && typeof initUpdateHistoryNotification === 'function') {
            console.log('[Sidebar] Update notification from another tab detected');
            setTimeout(() => initUpdateHistoryNotification(), 500);
        }
    });
    } catch (err) {
        console.error('[Sidebar] Error loading sidebar:', err);
        // Unhide page so at least content is visible
        document.documentElement.style.opacity = '1';
    }
})();
