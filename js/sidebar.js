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
        
        {
            isDropdown: true,
            id: 'dd-rename-tools',
            label: 'Rename Tools',
            icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 0v2m0-2a2 2 0 100 4m0-4a2 2 0 110 4m0 4v2m0-6V4',
            guard: 'data-role="super_admin,moderator"',
            children: [
                { href: '/rename-faktur', label: 'Faktur Pajak', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', guard: 'data-role="super_admin,moderator"' },
                { href: '/rename-invoice-hijau', label: 'Invoice Hijau', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', guard: 'data-role="super_admin,moderator"' },
            ]
        },

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
            navHTML += `<p style="font-size: 0.625rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; padding: 0.5rem 1rem; font-weight: 700; ${item.marginTop ? 'margin-top: 3rem;' : 'margin-top: 1.5rem;'} margin-bottom: 0.25rem; word-break: break-word;">${item.section}</p>`;
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
                            style="display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 1rem; margin-top: 0.125rem; border-radius: 0.75rem; font-size: 0.75rem; transition: all 0.2s ease; color: #6b7280; text-align: left; border: none; background: transparent; cursor: pointer; width: 100%; min-width: 0; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">
                            <svg style="width: 1rem; height: 1rem; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                ${renderIcon(child.icon, child.iconPaths)}
                            </svg>
                            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${child.label}</span>
                        </button>
                     `;
                } else {
                    childrenHTML += `
                        <a href="${child.href}" ${child.guard || ''}
                            style="display: flex; align-items: center; gap: 1rem; padding: 0.5rem 1rem; margin-top: 0.125rem; border-radius: 0.75rem; font-size: 0.875rem; transition: all 0.2s ease; ${isActive ? 'color: #2563eb; background: #eff6ff; font-weight: 700;' : 'color: #6b7280;'} text-decoration: none; width: 100%; box-sizing: border-box; display: flex; align-items: center;">
                            <svg style="width: 1rem; height: 1rem; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                ${renderIcon(child.icon, child.iconPaths)}
                            </svg>
                            <span style="white-space: nowrap;">${child.label}</span>
                        </a>
                     `;
                }
            }

            navHTML += `
                <div id="${item.id}-parent" style="margin-top: 0.25rem; margin-bottom: 0.125rem; padding-left: 0.5rem; padding-right: 0.5rem;">
                    <button onclick="toggleSidebarDropdown('${item.id}')" style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-radius: 0.75rem; font-size: 0.875rem; color: #4b5563; border: none; background: transparent; cursor: pointer; font-weight: 700; letter-spacing: 0.05em; box-sizing: border-box;">
                        <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
                            <svg style="width: 1.25rem; height: 1.25rem; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                ${renderIcon(item.icon, item.iconPaths)}
                            </svg>
                            <span style="white-space: nowrap;">${item.label}</span>
                        </div>
                        <svg class="sidebar-dropdown-icon" style="width: 0.875rem; height: 0.875rem; opacity: 0.4; transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1); flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </button>
                    <div id="${item.id}" class="sidebar-dropdown-content" style="max-height: ${maxH}; overflow: hidden; transition: max-height 300ms cubic-bezier(0.4, 0, 0.2, 1);">
                        <div style="padding-top: 0.25rem; padding-bottom: 0.25rem;">
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
                <div style="padding-left: 0.5rem; padding-right: 0.5rem; margin-top: 0.25rem; margin-bottom: 0.125rem;">
            navHTML += `
                <div style="padding-left: 0.5rem; padding-right: 0.5rem; margin-top: 0.25rem; margin-bottom: 0.125rem;">
                <a href="${item.href}" ${item.guard || ''}
                    style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; border-radius: 0.75rem; font-size: 0.875rem; transition: all 0.2s ease; ${isActive ? 'color: #2563eb; background: rgba(59, 130, 246, 0.1); font-weight: 700;' : 'color: #6b7280;'} text-decoration: none; font-weight: 700; letter-spacing: 0.05em; width: 100%; box-sizing: border-box;">
                    <svg style="width: 1.25rem; height: 1.25rem; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        ${renderIcon(item.icon, item.iconPaths)}
                    </svg>
                    <span style="white-space: nowrap;">${item.label}</span>
                </a>
                </div>`;
                </div>`;
        }
    }

    function inject() {
        // Support both #sidebar and #sidebar-container
        let sidebar = document.getElementById('sidebar');
        if (!sidebar) {
            sidebar = document.getElementById('sidebar-container');
        }
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
            overflow: hidden;
            box-sizing: border-box;
        `;

        sidebar.innerHTML = `
            <!-- Header -->
            <div style="padding: 1.5rem; border-bottom: 1px solid #f3f4f6; flex-shrink: 0; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 0.75rem; min-width: 0;">
                    <div style="width: 2.5rem; height: 2.5rem; border-radius: 1rem; background: #2563eb; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <svg style="width: 1.25rem; height: 1.25rem; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                    </div>
                    <div style="min-width: 0; flex: 1; overflow: hidden;">
                        <h1 style="font-size: 0.8125rem; font-weight: 900; color: #111827; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; word-break: break-word;">Pusat Arsip Anka</h1>
                        <span style="font-size: 0.625rem; color: #3b82f6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; display: block; word-break: break-word;">Multi-Zona v3.1</span>
                    </div>
                </div>
            </div>

            <nav style="padding: 0.5rem 0; overflow-y: auto; overflow-x: hidden; flex: 1; min-width: 0; -webkit-overflow-scrolling: touch;">
                ${navHTML}
            </nav>
        `;

        // Ensure main content area is properly offset
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.style.marginLeft = '16rem';
            mainContent.style.width = 'calc(100% - 16rem)';
        }

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
