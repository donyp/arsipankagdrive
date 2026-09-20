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

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Support-Moderator] Initializing moderator dashboard...');
    
    // Wait for auth to load
    await new Promise(resolve => {
        const checkInterval = setInterval(() => {
            if (typeof currentUser !== 'undefined' && currentUser) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
    });

    console.log('[Support-Moderator] Current user:', currentUser);

    // Check if user is moderator/super_admin
    if (currentUser.role !== 'moderator' && currentUser.role !== 'super_admin') {
        console.log('[Support-Moderator] User is not moderator, redirecting...');
        window.location.href = '/support-dashboard.html';
        return;
    }

    // Load zona list for dropdown first
    await loadZonaList();
    
    // Load initial data
    await loadStats();
    await loadTickets();

    // Setup event listeners
    document.getElementById('searchInput').addEventListener('input', debounce(() => {
        currentSearch = document.getElementById('searchInput').value;
        currentPage = 1;
        loadTickets();
    }, 300));

    document.getElementById('filterStatus').addEventListener('change', () => {
        currentStatus = document.getElementById('filterStatus').value;
        currentPage = 1;
        loadTickets();
    });

    document.getElementById('filterZona').addEventListener('change', () => {
        currentZona = document.getElementById('filterZona').value;
        currentPage = 1;
        loadTickets();
    });

    console.log('[Support-Moderator] Dashboard fully initialized');
});

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

async function loadZonaList() {
    try {
        console.log('[Support-Moderator] Loading zona list...');
        const token = localStorage.getItem('jwt_token');
        
        if (!token) {
            console.warn('[Support-Moderator] No JWT token found');
            return;
        }

        const response = await fetch('/api/zonas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.warn('[Support-Moderator] Failed to load zonas:', response.status);
            return;
        }

        const data = await response.json();
        const zonas = data.zonas || data.data || [];
        
        console.log('[Support-Moderator] Loaded', zonas.length, 'zonas:', zonas);
        
        const filterZona = document.getElementById('filterZona');
        
        zonas.forEach(zona => {
            const option = document.createElement('option');
            option.value = zona.id;
            option.textContent = zona.nama || `Zona ${zona.id}`;
            filterZona.appendChild(option);
        });

    } catch (error) {
        console.error('[Support-Moderator] Error loading zonas:', error);
    }
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
        console.log('[Support-Moderator] Loading stats...');
        const token = localStorage.getItem('jwt_token');
        
        const response = await fetch('/api/support/tickets/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error('[Support-Moderator] Failed to load stats:', response.status);
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('[Support-Moderator] Stats response:', data);
        
        const stats = data.stats || {};

        document.getElementById('statTotal').textContent = stats.total || 0;
        document.getElementById('statOpen').textContent = stats.open || 0;
        document.getElementById('statInProgress').textContent = stats.in_progress || 0;
        document.getElementById('statAnswered').textContent = stats.answered || 0;
        document.getElementById('statClosed').textContent = stats.closed || 0;

        console.log('[Support-Moderator] Stats loaded successfully');
    } catch (error) {
        console.error('[Support-Moderator] Error loading stats:', error);
        // Set all to 0 if error
        document.getElementById('statTotal').textContent = '0';
        document.getElementById('statOpen').textContent = '0';
        document.getElementById('statInProgress').textContent = '0';
        document.getElementById('statAnswered').textContent = '0';
        document.getElementById('statClosed').textContent = '0';
    }
}

async function loadTickets() {
    try {
        console.log('[Support-Moderator] Loading tickets...', {
            page: currentPage,
            limit: currentLimit,
            status: currentStatus,
            zona: currentZona,
            search: currentSearch
        });

        const token = localStorage.getItem('jwt_token');
        
        if (!token) {
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
        console.log('[Support-Moderator] Fetching from:', url);

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[Support-Moderator] API Error:', response.status, errorData);
            throw new Error(`HTTP ${response.status}: ${errorData.error || 'Unknown error'}`);
        }

        const data = await response.json();
        console.log('[Support-Moderator] API Response:', data);

        const tickets = data.tickets || [];
        const pagination = data.pagination || {};

        totalPages = pagination.pages || 1;
        
        console.log('[Support-Moderator] Got', tickets.length, 'tickets');
        
        renderTickets(tickets);
        updatePagination();

    } catch (error) {
        console.error('[Support-Moderator] Error loading tickets:', error);
        document.getElementById('ticketsContainer').innerHTML = `
            <div class="table-row">
                <div style="grid-column: 1 / -1; text-align: center; color: #ef4444; padding: 24px;">
                    <i class="fas fa-exclamation-triangle"></i> ${error.message}
                </div>
            </div>
        `;
    }
}

function renderTickets(tickets) {
    console.log('[Support-Moderator] Rendering', tickets.length, 'tickets');
    const container = document.getElementById('ticketsContainer');

    if (tickets.length === 0) {
        container.innerHTML = `
            <div class="table-row">
                <div style="grid-column: 1 / -1;">
                    <div class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <div class="text-gray-600">Tidak ada tiket ditemukan</div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = tickets.map(ticket => `
        <div class="table-row" onclick="openTicket('${ticket.id}')">
            <div class="font-medium text-gray-900">${ticket.ticket_number || 'N/A'}</div>
            <div class="text-gray-700 truncate" title="${ticket.subject}">${ticket.subject || 'N/A'}</div>
            <div class="text-gray-600 text-sm">Zona ${ticket.zona_id || '-'}</div>
            <div>
                <span class="priority-indicator priority-${(ticket.priority || 'medium').toLowerCase()}"></span>
                <span class="text-xs text-gray-700">${ticket.priority || 'Medium'}</span>
            </div>
            <div>
                <span class="status-badge status-${(ticket.status || 'open').toLowerCase().replace(/\s+/g, '-')}">
                    ${ticket.status || 'Open'}
                </span>
            </div>
            <div class="text-sm text-gray-600">${formatUserId(ticket.user_id)}</div>
            <div>
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openTicket('${ticket.id}')">
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function updatePagination() {
    const info = `Halaman ${currentPage} dari ${totalPages}`;
    document.getElementById('paginationInfo').textContent = info;

    document.getElementById('btnPrevPage').disabled = currentPage <= 1;
    document.getElementById('btnNextPage').disabled = currentPage >= totalPages;
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
    window.location.href = `/support-ticket-detail.html?id=${ticketId}`;
}

function formatUserId(userId) {
    if (!userId) return '-';
    return userId.substring(0, 8);
}
