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
            navHTML += `<p style="font-size: 0.65rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; padding: 1rem 1rem 0.5rem 1rem; font-weight: 700; margin-top: 1rem; margin-bottom: 0;">${item.section}</p>`;
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
                    <a href="${child.href}" style="display: flex; align-items: center; padding: 0.5rem 1rem 0.5rem 3rem; margin: 0.05rem 0; border-radius: 0; font-size: 0.8rem; ${isActive ? 'color: #2563eb; background: #eff6ff; border-left: 3px solid #2563eb; padding-left: 2.75rem; font-weight: 600;' : 'color: #6b7280;'} text-decoration: none; width: 100%; box-sizing: border-box; display: flex; align-items: center; min-height: 2rem; transition: all 0.2s;">
                        <svg style="width: 0.85rem; height: 0.85rem; flex-shrink: 0; margin-right: 0.6rem; opacity: 0.7;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            ${renderIcon(child.icon)}
                        </svg>
                        <span style="flex: 1; overflow: visible; line-height: 1.3;">${child.label}</span>
                    </a>
                `;
            }

            navHTML += `
                <div id="${item.id}-parent" style="padding: 0; margin: 0;">
                    <button onclick="toggleSidebarDropdown('${item.id}')" style="width: 100%; display: flex; align-items: center; padding: 0.6rem 1rem; border-radius: 0; font-size: 0.85rem; color: #374151; border: none; background: transparent; cursor: pointer; font-weight: 500; min-height: 2.5rem; line-height: 1.3; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='transparent'">
                        <svg style="width: 1.1rem; height: 1.1rem; flex-shrink: 0; margin-right: 0.75rem; opacity: 0.7;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            ${renderIcon(item.icon)}
                        </svg>
                        <span style="flex: 1; overflow: visible; text-align: left; font-weight: 500;">${item.label}</span>
                        <svg class="sidebar-dropdown-icon" style="width: 0.8rem; height: 0.8rem; opacity: 0.4; transition: transform 300ms; flex-shrink: 0; margin-left: 0.25rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </button>
                    <div id="${item.id}" class="sidebar-dropdown-content" style="max-height: ${maxH}; overflow: hidden; transition: max-height 300ms;">
                        <div style="padding: 0; background: #fafbfc;">
                            ${childrenHTML}
                        </div>
                    </div>
                </div>
            `;
        } else {
            const isActive = activePage === item.href;
            navHTML += `
                <div style="padding: 0; margin: 0;">
                    <a href="${item.href}" style="display: flex; align-items: center; padding: 0.6rem 1rem; border-radius: 0; font-size: 0.85rem; color: ${isActive ? '#2563eb' : '#374151'}; background: ${isActive ? '#eff6ff' : 'transparent'}; border-left: ${isActive ? '3px solid #2563eb' : '3px solid transparent'}; text-decoration: none; font-weight: ${isActive ? '600' : '500'}; width: 100%; box-sizing: border-box; min-height: 2.5rem; display: flex; align-items: center; line-height: 1.3; transition: all 0.2s;" onmouseover="this.style.backgroundColor='${isActive ? '#eff6ff' : '#f9fafb'}'" onmouseout="this.style.backgroundColor='${isActive ? '#eff6ff' : 'transparent'}'">
                        <svg style="width: 1.1rem; height: 1.1rem; flex-shrink: 0; margin-right: 0.75rem; opacity: ${isActive ? '1' : '0.7'};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            ${renderIcon(item.icon)}
                        </svg>
                        <span style="flex: 1; overflow: visible; text-align: left; font-weight: ${isActive ? '600' : '500'};">${item.label}</span>
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
            <!-- Header Logo Section -->
            <div style="padding: 1.25rem 1rem; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <!-- Logo -->
                    <div style="width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);">
                        <svg style="width: 1.25rem; height: 1.25rem; color: white;" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z"/>
                        </svg>
                    </div>
                    <!-- Company Name -->
                    <div style="flex: 1;">
                        <h1 style="font-size: 0.85rem; font-weight: 900; color: #1f2937; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; line-height: 1.2;">Arsip Anka</h1>
                        <span style="font-size: 0.65rem; color: #9ca3af; font-weight: 600; text-transform: capitalize; letter-spacing: 0.03em; display: block; line-height: 1.2;">Member Area</span>
                    </div>
                </div>
            </div>

            <!-- Navigation Menu -->
            <nav style="padding: 0.5rem 0; overflow-y: auto; overflow-x: hidden; flex: 1; -webkit-overflow-scrolling: touch; display: flex; flex-direction: column;">
                ${navHTML}
            </nav>

            <!-- Footer Area (Optional) -->
            <div style="padding: 1rem; border-top: 1px solid #e5e7eb; flex-shrink: 0; font-size: 0.7rem; color: #9ca3af; text-align: center;">
                <p style="margin: 0; font-weight: 500;">v3.1</p>
            </div>
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

    // Export loadSidebar function for manual sidebar loading
    window.loadSidebar = async function(currentPage) {
        console.log(`[Sidebar] loadSidebar called for page: ${currentPage}`);
        inject();
        return Promise.resolve();
    };

})();
