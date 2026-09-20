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
    console.log('[Support-Moderator] Page loaded');
    
    // Wait for auth to load with timeout
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    
    while (attempts < maxAttempts) {
        if (typeof currentUser !== 'undefined' && currentUser) {
            console.log('[Support-Moderator] Current user found:', currentUser);
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    if (attempts >= maxAttempts) {
        console.error('[Support-Moderator] Timeout waiting for currentUser');
        document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Failed to load user data</div>';
        return;
    }

    console.log('[Support-Moderator] User role:', currentUser.role);

    // Check if user is moderator/super_admin
    if (currentUser.role !== 'moderator' && currentUser.role !== 'super_admin') {
        console.log('[Support-Moderator] User is not moderator, is:', currentUser.role);
        // For testing, allow all roles to see this page
        // window.location.href = '/support-dashboard.html';
        // return;
    }

    console.log('[Support-Moderator] Loading stats...');
    await loadStats();
    
    console.log('[Support-Moderator] Loading tickets...');
    await loadTickets();

    console.log('[Support-Moderator] Setting up event listeners...');
    
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

    console.log('[Support-Moderator] Dashboard ready');
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
        container.style.minHeight = '200px';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="text-gray-600">Tidak ada tiket ditemukan</div>
            </div>
        `;
        console.log('[Support-Moderator] Empty state rendered');
        return;
    }

    // Reset container style for table display
    container.style.minHeight = 'auto';
    container.style.display = 'block';
    
    const html = tickets.map(ticket => `
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
    
    container.innerHTML = html;
    console.log('[Support-Moderator] Table rendered with', tickets.length, 'rows');
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
    window.location.href = `/support-ticket-detail.html?id=${ticketId}`;
}

function formatUserId(userId) {
    if (!userId) return '-';
    return userId.substring(0, 8);
}

