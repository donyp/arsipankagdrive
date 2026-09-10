// ============================================================
// Shared Sidebar Component — Single Source of Truth
// Auto-detects current page and renders the sidebar
// Version 3.1.0 - Clean Build
// ============================================================

(function () {
    try {
        const activePage = window.location.pathname.split('/').pop() || 'dashboard';

    const menuItems = [
        { section: 'Menu Utama' },
        { href: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', guard: 'data-role="super_admin,moderator,admin_zona"' },
        { href: '/whatsapp-messages', label: 'Notify Zona', icon: 'M12 8c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm0 2c-1.657 0-3 1.343-3 3v2h6v-2c0-1.657-1.343-3-3-3zm6 5.5c.829 0 1.5.671 1.5 1.5s-.671 1.5-1.5 1.5-1.5-.671-1.5-1.5.671-1.5 1.5-1.5z', guard: 'data-role="super_admin,moderator"' },
        { href: '/rename-faktur', label: 'Rename Faktur Pajak', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', guard: 'data-role="super_admin,moderator,user"' },

        {
            isDropdown: true,
            id: 'dd-invoice',
            label: 'Upload File',
            icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
            children: [
                { href: '/upload-excel', label: 'Upload Excel', icon: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', guard: 'data-role="super_admin,moderator"' },
                { href: '/upload-invoice', label: 'Upload Invoice', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', guard: 'data-role="super_admin,moderator,user"' },
                { href: '/upload-bukti-bayar', label: 'Upload Bukti Bayar', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', guard: 'data-role="super_admin,moderator"' },
                { href: '/upload-faktur', label: 'Upload Faktur Pajak', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', guard: 'data-role="super_admin,moderator"' },
            ]
        },
        {
            isDropdown: true,
            id: 'dd-manajemen',
            label: 'Manajemen',
            icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
             children: [
                { href: '/users', label: 'Manajemen Pengguna', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', guard: 'data-permission="manage_users"' },
                { href: '/tokos', label: 'Daftar Toko', icon: 'M19 21V5a2 2 0 012-2H9a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', guard: 'data-permission="manage_toko"' },
                { href: '/zonas', label: 'Zona Operasional', iconPaths: ['M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z', 'M15 11a3 3 0 11-6 0 3 3 0 016 0z'], guard: 'data-permission="manage_zonas"' },
            ]
        },

        { section: 'System Administration', marginTop: 'mt-12' },
        {
            isDropdown: true,
            id: 'dd-system',
            label: 'System Admin',
            icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M12 9a3 3 0 100-6 3 3 0 000 6z',
            children: [
                { href: '/admin-database-backups', label: 'Database Backups', icon: 'M12 7c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm9-3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 12.5c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5 4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z', guard: 'data-role="super_admin"' },
                { href: '/admin-system-logs-monitoring', label: 'Logs & Monitoring', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', guard: 'data-role="super_admin"' },
                { href: '/admin-system-health', label: 'System Health', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', guard: 'data-role="super_admin"' },
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
            const marginClass = item.marginTop || 'mt-6';
            navHTML += `<p class="text-[10px] text-gray-400 uppercase tracking-widest ${marginClass} mb-1 px-5 font-bold">${item.section}</p>`;
            continue;
        }

        if (item.isDropdown) {
            const visibleChildren = item.children.filter(child => child.href !== '/cleanup');
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

        // Set sidebar styles properly for fixed positioning
        sidebar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 16rem;
            height: 100vh;
            display: flex;
            flex-direction: column;
            background: #ffffff;
            border-right: 1px solid #e5e7eb;
            z-index: 40;
        `;

        sidebar.innerHTML = `
            <!-- Header -->
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

            <!-- Navigation (scrollable) -->
            <nav class="py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
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
