// ============================================================
// Shared Sidebar Component - Perfect Left Alignment
// Version 3.4.0 - All items aligned left
// ============================================================

(function() {
    console.log('[Sidebar] Initializing...');
    
    const activePage = window.location.pathname.split('/').pop() || 'dashboard';
    
    const menuItems = [
        { section: 'Menu Utama' },
        { href: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        { href: '/whatsapp-messages', label: 'Notify Zona', icon: 'M12 8c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm0 2c-1.657 0-3 1.343-3 3v2h6v-2c0-1.657-1.343-3-3-3zm6 5.5c.829 0 1.5.671 1.5 1.5s-.671 1.5-1.5 1.5-1.5-.671-1.5-1.5.671-1.5 1.5-1.5z' },
        
        {
            isDropdown: true,
            id: 'dd-rename-tools',
            label: 'Rename Tools',
            icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 0v2m0-2a2 2 0 100 4m0-4a2 2 0 110 4m0 4v2m0-6V4',
            children: [
                { href: '/rename-faktur', label: 'Faktur Pajak', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
                { href: '/rename-invoice-hijau', label: 'Invoice Hijau', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            ]
        },

        {
            isDropdown: true,
            id: 'dd-invoice',
            label: 'Upload File',
            icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
            children: [
                { href: '/upload-excel', label: 'Upload Excel', icon: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                { href: '/upload-invoice', label: 'Upload Invoice', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                { href: '/upload-bukti-bayar', label: 'Upload Bukti Bayar', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                { href: '/upload-faktur', label: 'Upload Faktur Pajak', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            ]
        },
        
        {
            isDropdown: true,
            id: 'dd-manajemen',
            label: 'Manajemen',
            icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
            children: [
                { href: '/users', label: 'Manajemen Pengguna', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
                { href: '/tokos', label: 'Daftar Toko', icon: 'M19 21V5a2 2 0 012-2H9a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
                { href: '/zonas', label: 'Zona Operasional', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
            ]
        },

        { section: 'System Administration' },
        {
            isDropdown: true,
            id: 'dd-system',
            label: 'System Admin',
            icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M12 9a3 3 0 100-6 3 3 0 000 6z',
            children: [
                { href: '/admin-database-backups', label: 'Database Backups', icon: 'M12 7c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm9-3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 12.5c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5 4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z' },
                { href: '/admin-system-logs-monitoring', label: 'Logs & Monitoring', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                { href: '/admin-system-health', label: 'System Health', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            ]
        }
    ];

    function renderIcon(iconStr) {
        if (!iconStr) return '';
        return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconStr}" />`;
    }

    window.toggleSidebarDropdown = function(id) {
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

    let navHTML = '';

    for (const item of menuItems) {
        if (item.section) {
            navHTML += `<p style="font-size: 0.625rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; padding: 0.75rem 1rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.25rem;">${item.section}</p>`;
            continue;
        }

        if (item.isDropdown) {
            const visibleChildren = item.children || [];
            const hasActiveChild = visibleChildren.some(child => activePage === child.href);
            const maxH = hasActiveChild ? '1000px' : '0px';

            let childrenHTML = '';
            for (const child of visibleChildren) {
                const isActive = activePage === child.href;
                childrenHTML += `
                    <a href="${child.href}" style="display: flex; align-items: center; padding: 0.6rem 1rem 0.6rem 2.8rem; margin: 0.05rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; ${isActive ? 'color: #2563eb; background: #eff6ff; font-weight: 600;' : 'color: #6b7280;'} text-decoration: none; width: calc(100% - 1rem); box-sizing: border-box; display: flex; align-items: center; min-height: 1.9rem;">
                        <svg style="width: 0.9rem; height: 0.9rem; flex-shrink: 0; margin-right: 0.6rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            ${renderIcon(child.icon)}
                        </svg>
                        <span style="flex: 1; overflow: visible; line-height: 1.2;">${child.label}</span>
                    </a>
                `;
            }

            navHTML += `
                <div id="${item.id}-parent" style="padding: 0.25rem 0.5rem; margin: 0;">
                    <button onclick="toggleSidebarDropdown('${item.id}')" style="width: 100%; display: flex; align-items: center; padding: 0.65rem 1rem; border-radius: 0.375rem; font-size: 0.8rem; color: #374151; border: none; background: transparent; cursor: pointer; font-weight: 500; min-height: 2.3rem; line-height: 1.2;">
                        <svg style="width: 1.25rem; height: 1.25rem; flex-shrink: 0; margin-right: 0.875rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            ${renderIcon(item.icon)}
                        </svg>
                        <span style="flex: 1; overflow: visible; text-align: left;">${item.label}</span>
                        <svg class="sidebar-dropdown-icon" style="width: 0.875rem; height: 0.875rem; opacity: 0.5; transition: transform 300ms; flex-shrink: 0; margin-left: 0.25rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </button>
                    <div id="${item.id}" class="sidebar-dropdown-content" style="max-height: ${maxH}; overflow: hidden; transition: max-height 300ms;">
                        <div style="padding: 0;">
                            ${childrenHTML}
                        </div>
                    </div>
                </div>
            `;
        } else {
            const isActive = activePage === item.href;
            navHTML += `
                <div style="padding: 0.25rem 0.5rem; margin: 0;">
                    <a href="${item.href}" style="display: flex; align-items: center; padding: 0.65rem 1rem; border-radius: 0.375rem; font-size: 0.8rem; ${isActive ? 'color: #2563eb; background: rgba(59, 130, 246, 0.1); font-weight: 600;' : 'color: #374151;'} text-decoration: none; font-weight: 500; width: 100%; box-sizing: border-box; min-height: 2.3rem; display: flex; align-items: center; line-height: 1.2;">
                        <svg style="width: 1.25rem; height: 1.25rem; flex-shrink: 0; margin-right: 0.875rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            ${renderIcon(item.icon)}
                        </svg>
                        <span style="flex: 1; overflow: visible; text-align: left;">${item.label}</span>
                    </a>
                </div>
            `;
        }
    }

    function inject() {
        let sidebar = document.getElementById('sidebar');
        if (!sidebar) {
            console.log('[Sidebar] No sidebar element found');
            return;
        }

        console.log('[Sidebar] Injecting...');

        // Check if global announcement banner exists
        const hasAnnouncement = !!document.getElementById('global-announcement-banner');
        const topOffset = hasAnnouncement ? '60px' : '0px';

        sidebar.style.cssText = `
            position: fixed;
            top: ${topOffset};
            left: 0;
            width: 16rem;
            height: ${hasAnnouncement ? 'calc(100vh - 60px)' : '100vh'};
            display: flex;
            flex-direction: column;
            background: #ffffff;
            border-right: 1px solid #e5e7eb;
            z-index: 9999;
            overflow: hidden;
            box-sizing: border-box;
            min-height: ${hasAnnouncement ? 'calc(100vh - 60px)' : '100vh'};
        `;

        sidebar.innerHTML = `
            <div style="padding: 1.5rem; border-bottom: 1px solid #f3f4f6; flex-shrink: 0;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 2.5rem; height: 2.5rem; border-radius: 1rem; background: #2563eb; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <svg style="width: 1.25rem; height: 1.25rem; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                    </div>
                    <div>
                        <h1 style="font-size: 0.8125rem; font-weight: 900; color: #111827; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">Pusat Arsip Anka</h1>
                        <span style="font-size: 0.625rem; color: #3b82f6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; display: block;">Multi-Zona v3.1</span>
                    </div>
                </div>
            </div>

            <nav style="padding: 0.5rem 0; overflow-y: auto; overflow-x: hidden; flex: 1; -webkit-overflow-scrolling: touch; display: flex; flex-direction: column;">
                ${navHTML}
            </nav>
        `;

        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.style.marginLeft = '16rem';
            mainContent.style.width = 'calc(100% - 16rem)';
        }

        console.log('[Sidebar] Injection complete');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[Sidebar] DOMContentLoaded');
            inject();
        });
    } else {
        console.log('[Sidebar] Document ready');
        inject();
    }

})();
