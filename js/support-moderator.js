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
let zonaList = [];

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

    // Check if user is moderator/super_admin
    if (currentUser.role !== 'moderator' && currentUser.role !== 'super_admin') {
        window.location.href = '/support-dashboard.html';
        return;
    }

    // Load zona list for dropdown
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

    console.log('[Support-Moderator] Dashboard initialized for', currentUser.role);
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
        const token = localStorage.getItem('jwt_token');
        const response = await fetch('/api/zonas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load zonas');

        const data = await response.json();
        const zonas = data.zonas || data.data || [];
        
        const filterZona = document.getElementById('filterZona');
        
        zonas.forEach(zona => {
            const option = document.createElement('option');
            option.value = zona.id;
            option.textContent = zona.nama || `Zona ${zona.id}`;
            filterZona.appendChild(option);
        });

        console.log('[Support-Moderator] Loaded', zonas.length, 'zonas');
    } catch (error) {
        console.error('[Support-Moderator] Error loading zonas:', error);
        // Fallback: zones will be populated from ticket data
    }
}

function switchTab(event, tab) {
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
        const token = localStorage.getItem('jwt_token');
        const response = await fetch('/api/support/tickets/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load stats');

        const data = await response.json();
        const stats = data.stats;

        document.getElementById('statTotal').textContent = stats.total;
        document.getElementById('statOpen').textContent = stats.open;
        document.getElementById('statInProgress').textContent = stats.in_progress || 0;
        document.getElementById('statAnswered').textContent = stats.answered;
        document.getElementById('statClosed').textContent = stats.closed;

        console.log('[Support-Moderator] Stats loaded:', stats);
    } catch (error) {
        console.error('[Support-Moderator] Error loading stats:', error);
    }
}

async function loadTickets() {
    try {
        const token = localStorage.getItem('jwt_token');
        const params = new URLSearchParams({
            page: currentPage,
            limit: currentLimit,
            ...(currentStatus !== 'all' && { status: currentStatus }),
            ...(currentZona && { zona_id: currentZona }),
            ...(currentSearch && { search: currentSearch })
        });

        const response = await fetch(`/api/support/tickets?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load tickets');

        const data = await response.json();
        const { tickets, pagination } = data;

        totalPages = pagination.pages;
        renderTickets(tickets);
        updatePagination();

        // Auto-populate zona dropdown from ticket data if not already done
        if (zonaList.length === 0 && tickets.length > 0) {
            populateZonaFromTickets(tickets);
        }

        console.log('[Support-Moderator] Loaded', tickets.length, 'tickets');
    } catch (error) {
        console.error('[Support-Moderator] Error loading tickets:', error);
        document.getElementById('ticketsContainer').innerHTML = `
            <div class="table-row">
                <div style="grid-column: 1 / -1; text-align: center; color: #ef4444; padding: 24px;">
                    <i class="fas fa-exclamation-triangle"></i> Error loading tickets
                </div>
            </div>
        `;
    }
}

function populateZonaFromTickets(tickets) {
    const uniqueZonas = new Set();
    tickets.forEach(ticket => {
        if (ticket.zona_id) {
            uniqueZonas.add(ticket.zona_id);
        }
    });

    const filterZona = document.getElementById('filterZona');
    const existingOptions = new Set();
    
    filterZona.querySelectorAll('option').forEach(opt => {
        existingOptions.add(opt.value);
    });

    Array.from(uniqueZonas).forEach(zonaId => {
        if (!existingOptions.has(zonaId.toString())) {
            const option = document.createElement('option');
            option.value = zonaId;
            option.textContent = `Zona ${zonaId}`;
            filterZona.appendChild(option);
        }
    });
}

function renderTickets(tickets) {
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
            <div class="font-medium text-gray-900">${ticket.ticket_number}</div>
            <div class="text-gray-700 truncate" title="${ticket.subject}">${ticket.subject}</div>
            <div class="text-gray-600 text-sm">Zona ${ticket.zona_id || '-'}</div>
            <div>
                <span class="priority-indicator priority-${ticket.priority.toLowerCase()}"></span>
                <span class="text-xs text-gray-700">${ticket.priority}</span>
            </div>
            <div>
                <span class="status-badge status-${ticket.status.toLowerCase().replace(/\s+/g, '-')}">
                    ${ticket.status}
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
    window.location.href = `/support-ticket-detail.html?id=${ticketId}`;
}

function formatUserId(userId) {
    if (!userId) return '-';
    return userId.substring(0, 8);
}
