// ============================================
// Support Ticketing - Moderator Dashboard
// ============================================

let currentTab = 'all';
let currentPage = 1;
let currentLimit = 20;
let currentStatus = 'all';
let currentZona = '';
let currentSearch = '';
let totalPages = 1;
let zonasMap = {}; // Cache for zona lookup

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Support-Moderator] Page loaded');
    
    // Initialize auth
    console.log('[Support-Moderator] Initializing auth...');
    await initAuth();
    
    // Check if currentUser is loaded
    if (!currentUser) {
        console.error('[Support-Moderator] currentUser still not defined after initAuth');
        document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Failed to authenticate</div>';
        return;
    }

    console.log('[Support-Moderator] User authenticated:', currentUser.email, 'Role:', currentUser.role);
    
    // Load zonas first
    console.log('[Support-Moderator] Loading zonas...');
    await loadZonas();
    
    console.log('[Support-Moderator] Loading stats...');
    await loadStats();
    
    console.log('[Support-Moderator] Loading tickets...');
    await loadTickets();

    console.log('[Support-Moderator] Setting up event listeners...');
    
    // Setup event listeners
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');
    const filterZona = document.getElementById('filterZona');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            currentSearch = searchInput.value;
            currentPage = 1;
            loadTickets();
        }, 300));
    }

    if (filterStatus) {
        filterStatus.addEventListener('change', () => {
            currentStatus = filterStatus.value;
            currentPage = 1;
            loadTickets();
        });
    }

    if (filterZona) {
        filterZona.addEventListener('change', () => {
            currentZona = filterZona.value;
            currentPage = 1;
            loadTickets();
        });
    }

    console.log('[Support-Moderator] Dashboard ready');
});

async function loadZonas() {
    try {
        const token = localStorage.getItem('jwt_token');
        const response = await fetch('/api/zonas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const zonas = data.zonas || data.data || [];
            
            console.log('[Support-Moderator] Zonas response:', zonas);
            
            // Create map: zona_id (id) -> zona_name (nama)
            zonas.forEach(zona => {
                zonasMap[zona.id] = zona.nama;
            });
            
            console.log('[Support-Moderator] Zonas loaded:', zonasMap);
            
            // Populate filter dropdown AFTER we have the map
            await populateZonaFilter(zonas);
        }
    } catch (error) {
        console.error('[Support-Moderator] Error loading zonas:', error);
    }
}

async function populateZonaFilter(zonas) {
    const filterZona = document.getElementById('filterZona');
    if (!filterZona) return;
    
    // Load all tickets to get unique zonas
    try {
        const token = localStorage.getItem('jwt_token');
        const response = await fetch('/api/support/tickets?limit=1000', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const tickets = data.tickets || [];
            
            // Get unique zona_ids from tickets
            const uniqueZonaIds = [...new Set(tickets.map(t => t.zona_id))].sort((a, b) => a - b);
            
            console.log('[Support-Moderator] Unique zona IDs in tickets:', uniqueZonaIds);
            
            // Clear existing options except first
            while (filterZona.options.length > 1) {
                filterZona.remove(1);
            }
            
            // Add options for zonas that have tickets
            uniqueZonaIds.forEach(zonaId => {
                const zonaName = zonasMap[zonaId] || `Zona ${zonaId}`;
                const option = document.createElement('option');
                option.value = zonaId;
                option.textContent = zonaName;
                filterZona.appendChild(option);
            });
            
            console.log('[Support-Moderator] Zona filter populated');
        }
    } catch (error) {
        console.error('[Support-Moderator] Error populating zona filter:', error);
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function switchTab(event, tab) {
    console.log('[Support-Moderator] Switching to tab:', tab);
    currentTab = tab;
    currentPage = 1;
    
    // Update tab UI
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.tab-btn')?.classList.add('active');
    
    loadTickets();
}

async function loadStats() {
    try {
        console.log('[Support-Moderator] Fetching stats...');
        const token = localStorage.getItem('jwt_token');
        
        if (!token) {
            console.warn('[Support-Moderator] No JWT token');
            return;
        }

        const response = await fetch('/api/support/tickets/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('[Support-Moderator] Stats response status:', response.status);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('[Support-Moderator] Stats error:', error);
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('[Support-Moderator] Stats data:', data);
        
        const stats = data.stats || {};

        document.getElementById('statTotal').textContent = stats.total || 0;
        document.getElementById('statOpen').textContent = stats.open || 0;
        document.getElementById('statInProgress').textContent = stats.in_progress || 0;
        document.getElementById('statAnswered').textContent = stats.answered || 0;
        document.getElementById('statClosed').textContent = stats.closed || 0;

        console.log('[Support-Moderator] Stats updated');
    } catch (error) {
        console.error('[Support-Moderator] Error loading stats:', error);
        // Don't break on stats error, continue to load tickets
    }
}

async function loadTickets() {
    try {
        console.log('[Support-Moderator] Loading tickets with params:', {
            page: currentPage,
            limit: currentLimit,
            status: currentStatus,
            zona: currentZona,
            search: currentSearch
        });

        const token = localStorage.getItem('jwt_token');
        
        if (!token) {
            console.error('[Support-Moderator] No JWT token');
            throw new Error('No JWT token found');
        }

        const params = new URLSearchParams({
            page: currentPage,
            limit: currentLimit,
            ...(currentStatus !== 'all' && { status: currentStatus }),
            ...(currentZona && { zona_id: currentZona }),
            ...(currentSearch && { search: currentSearch })
        });

        const url = `/api/support/tickets?${params}`;
        console.log('[Support-Moderator] Requesting:', url);

        // Add timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('[Support-Moderator] Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[Support-Moderator] Error response:', errorData);
            throw new Error(`HTTP ${response.status}: ${errorData.error || 'Unknown'}`);
        }

        const data = await response.json();
        console.log('[Support-Moderator] Response data:', data);

        const tickets = data.tickets || [];
        const pagination = data.pagination || {};

        totalPages = pagination.pages || 1;
        
        console.log('[Support-Moderator] Rendering', tickets.length, 'tickets');
        renderTickets(tickets);
        updatePagination();

    } catch (error) {
        console.error('[Support-Moderator] Error loading tickets:', error);
        const container = document.getElementById('ticketsContainer');
        if (!container) {
            console.error('[Support-Moderator] Container not found!');
            return;
        }
        
        container.style.minHeight = '200px';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.innerHTML = `
            <div style="text-align: center; color: #ef4444;">
                <div style="margin-bottom: 12px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px;"></i>
                </div>
                <div style="font-weight: 500;">${error.message}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Check browser console for more details</div>
            </div>
        `;
    }
}

function renderTickets(tickets) {
    console.log('[Support-Moderator] renderTickets called with', tickets.length, 'tickets');
    const container = document.getElementById('ticketsContainer');

    if (!container) {
        console.error('[Support-Moderator] ticketsContainer not found');
        return;
    }

    if (tickets.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7" style="padding: 48px 16px; text-align: center;">
                    <div class="empty-state" style="padding: 0;">
                        <div class="empty-state-icon">📭</div>
                        <div style="color: #6b7280;">Tidak ada tiket ditemukan</div>
                    </div>
                </td>
            </tr>
        `;
        console.log('[Support-Moderator] Empty state rendered');
        return;
    }

    const html = tickets.map(ticket => {
        const priorityClass = (ticket.priority || 'medium').toLowerCase();
        const statusClass = (ticket.status || 'open').toLowerCase().replace(/\s+/g, '-');
        
        // Get zona name - extract number from zona_name if available, else use zona_id
        let zonaDisplay = 'N/A';
        if (ticket.zona_name) {
            // If zona_name is "Zona 01", extract just "1"
            const match = ticket.zona_name.match(/(\d+)/);
            if (match) {
                zonaDisplay = 'Zona ' + (match[1].replace(/^0+/, '') || '0');
            } else {
                zonaDisplay = ticket.zona_name;
            }
        } else if (zonasMap[ticket.zona_id]) {
            const zonaName = zonasMap[ticket.zona_id];
            const match = zonaName.match(/(\d+)/);
            if (match) {
                zonaDisplay = 'Zona ' + (match[1].replace(/^0+/, '') || '0');
            } else {
                zonaDisplay = zonaName;
            }
        }
        
        // Get username from ticket - prefer ticket.created_by_username if available
        const username = ticket.created_by_username || ticket.creator_name || formatUserId(ticket.user_id);
        
        return `
            <tr style="border-bottom: 1px solid #e5e7eb; cursor: pointer; transition: background 0.2s;" onclick="openTicket('${ticket.id}')" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                <td style="padding: 12px 16px; font-weight: 500; color: #1f2937;">${ticket.ticket_number || 'N/A'}</td>
                <td style="padding: 12px 16px; color: #374151; max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${ticket.subject}">${ticket.subject || 'N/A'}</td>
                <td style="padding: 12px 16px; color: #6b7280; font-size: 14px;">${zonaDisplay}</td>
                <td style="padding: 12px 16px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="width: 4px; height: 20px; border-radius: 2px; background: ${getPriorityColor(priorityClass)}; display: inline-block;"></span>
                        <span style="font-size: 13px; color: #6b7280;">${ticket.priority || 'Medium'}</span>
                    </div>
                </td>
                <td style="padding: 12px 16px;">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: ${getStatusBg(statusClass)}; color: ${getStatusColor(statusClass)};">
                        ${ticket.status || 'Open'}
                    </span>
                </td>
                <td style="padding: 12px 16px; font-size: 13px; color: #6b7280;">${username}</td>
                <td style="padding: 12px 16px; text-align: center;">
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openTicket('${ticket.id}')">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    container.innerHTML = html;
    console.log('[Support-Moderator] Table rendered with', tickets.length, 'rows');
}

function getPriorityColor(priority) {
    const colors = {
        'low': '#3b82f6',
        'medium': '#f59e0b',
        'high': '#ef4444',
        'urgent': '#7c3aed'
    };
    return colors[priority] || colors['medium'];
}

function getStatusBg(status) {
    const colors = {
        'open': '#fee2e2',
        'in-progress': '#fef3c7',
        'answered': '#dbeafe',
        'resolved': '#dcfce7',
        'closed': '#f3f4f6'
    };
    return colors[status] || colors['open'];
}

function getStatusColor(status) {
    const colors = {
        'open': '#991b1b',
        'in-progress': '#92400e',
        'answered': '#1e40af',
        'resolved': '#166534',
        'closed': '#374151'
    };
    return colors[status] || colors['open'];
}

function updatePagination() {
    const info = `Halaman ${currentPage} dari ${totalPages}`;
    document.getElementById('paginationInfo').textContent = info;

    const prevBtn = document.getElementById('btnPrevPage');
    const nextBtn = document.getElementById('btnNextPage');
    
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        loadTickets();
        window.scrollTo(0, 0);
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        loadTickets();
        window.scrollTo(0, 0);
    }
}

function openTicket(ticketId) {
    console.log('[Support-Moderator] Opening ticket:', ticketId);
    window.location.href = `/support-ticket-detail-moderator.html?id=${ticketId}`;
}

function formatUserId(userId) {
    if (!userId) return '-';
    return userId.substring(0, 8);
}

