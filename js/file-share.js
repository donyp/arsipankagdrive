// ============================================================
// FILE SHARING FUNCTIONALITY
// Enhanced share feature with expiry links
// ============================================================

let currentShareLink = null;

// Open share modal
function openShareModal() {
    const modal = document.getElementById('share-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Close share modal
function closeShareModal() {
    const modal = document.getElementById('share-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Reset form
    document.getElementById('expiry-select').value = '24';
    document.getElementById('max-access').value = '';
    document.getElementById('custom-hours-input').style.display = 'none';
}

// Close share result modal
function closeShareResultModal() {
    const modal = document.getElementById('share-result-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Reload shares list
    loadFileShares();
}

// Handle expiry select change
function handleExpiryChange() {
    const select = document.getElementById('expiry-select');
    const customInput = document.getElementById('custom-hours-input');
    
    if (select.value === 'custom') {
        customInput.style.display = 'block';
    } else {
        customInput.style.display = 'none';
    }
}

// Create share link
async function createShareLink() {
    try {
        if (!currentFileId) {
            Toast.error('File tidak ditemukan');
            return;
        }

        const expirySelect = document.getElementById('expiry-select').value;
        const customHours = document.getElementById('custom-hours').value;
        const maxAccess = document.getElementById('max-access').value;

        let expiryHours = expirySelect;
        if (expirySelect === 'custom') {
            if (!customHours || customHours < 1) {
                Toast.error('Masukkan jumlah jam yang valid');
                return;
            }
            expiryHours = customHours;
        }

        const payload = {
            expiryHours: parseInt(expiryHours),
            maxAccessCount: maxAccess ? parseInt(maxAccess) : null
        };

        const response = await fetch(`${API_BASE_URL}/api/files/${currentFileId}/share-advanced`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create share link');
        }

        currentShareLink = data.shareUrl;

        // Show result modal
        closeShareModal();
        showShareResult(data);

    } catch (err) {
        console.error('Create share error:', err);
        Toast.error(err.message || 'Gagal membuat link sharing');
    }
}

// Show share result modal
function showShareResult(data) {
    const modal = document.getElementById('share-result-modal');
    const urlInput = document.getElementById('share-url-input');
    const detailsDiv = document.getElementById('share-details');

    if (!modal || !urlInput || !detailsDiv) return;

    urlInput.value = data.shareUrl;

    const expiresAt = new Date(data.share.expires_at);
    const maxAccess = data.share.max_access_count || 'Unlimited';

    detailsDiv.innerHTML = `
        <div style="background: #f0fdf4; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; color: #166534;">
                <span style="font-size: 16px;">✅</span>
                <span style="font-weight: 600;">Share link created successfully!</span>
            </div>
        </div>
        <p style="margin: 8px 0;"><strong>⏰ Expires:</strong> ${expiresAt.toLocaleString('id-ID')}</p>
        <p style="margin: 8px 0;"><strong>👁️ Max Access:</strong> ${maxAccess}</p>
        <p style="margin: 8px 0; color: #ef4444; font-size: 12px;">
            ⚠️ Anyone with this link can access the file until it expires
        </p>
    `;

    modal.style.display = 'flex';
}

// Copy share link to clipboard
async function copyShareLink() {
    const urlInput = document.getElementById('share-url-input');
    if (!urlInput) return;

    try {
        await navigator.clipboard.writeText(urlInput.value);
        Toast.success('Link berhasil disalin!');
    } catch (err) {
        // Fallback for older browsers
        urlInput.select();
        document.execCommand('copy');
        Toast.success('Link berhasil disalin!');
    }
}

// Load file shares
async function loadFileShares() {
    try {
        if (!currentFileId) return;

        const response = await fetch(`${API_BASE_URL}/api/files/${currentFileId}/shares`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load shares');
        }

        displayShares(data.shares || []);

    } catch (err) {
        console.error('Load shares error:', err);
    }
}

// Display shares list
function displayShares(shares) {
    const section = document.getElementById('shares-section');
    const listDiv = document.getElementById('shares-list');

    if (!section || !listDiv) return;

    if (shares.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    listDiv.innerHTML = shares.map(share => {
        const isExpired = new Date(share.expires_at) < new Date();
        const isActive = share.is_active && !isExpired;
        const accessInfo = share.max_access_count 
            ? `${share.access_count} / ${share.max_access_count}` 
            : `${share.access_count} (Unlimited)`;

        const statusBadge = isActive 
            ? '<span style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">🟢 ACTIVE</span>'
            : '<span style="background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">🔴 INACTIVE</span>';

        return `
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span style="font-size: 11px; color: #6b7280; font-weight: 600;">Created ${formatTimeAgo(share.created_at)}</span>
                            ${statusBadge}
                        </div>
                        <div style="font-size: 12px; color: #374151; margin-top: 8px;">
                            <div style="margin: 4px 0;">⏰ Expires: ${new Date(share.expires_at).toLocaleString('id-ID')}</div>
                            <div style="margin: 4px 0;">👁️ Accessed: ${accessInfo}</div>
                            <div style="margin: 4px 0;">👤 Created by: ${share.users?.name || 'Unknown'}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 4px;">
                        ${isActive ? `
                            <button onclick="copyExistingShareLink('${share.share_token}')" style="padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600;">
                                📋 Copy
                            </button>
                        ` : ''}
                        <button onclick="revokeShare('${share.id}')" style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600;">
                            🗑️ Revoke
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Copy existing share link
async function copyExistingShareLink(token) {
    const shareUrl = `${window.location.origin}/shared/${token}`;
    
    try {
        await navigator.clipboard.writeText(shareUrl);
        Toast.success('Link berhasil disalin!');
    } catch (err) {
        Toast.error('Gagal menyalin link');
    }
}

// Revoke share
async function revokeShare(shareId) {
    try {
        const result = await Swal.fire({
            title: 'Revoke Share Link?',
            text: 'This link will no longer be accessible',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, revoke it',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        const response = await fetch(`${API_BASE_URL}/api/files/${currentFileId}/share/${shareId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to revoke share');
        }

        Toast.success('Link sharing berhasil dicabut');
        loadFileShares();

    } catch (err) {
        console.error('Revoke share error:', err);
        Toast.error(err.message || 'Gagal mencabut sharing');
    }
}

// Format time ago
function formatTimeAgo(timestamp) {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    if (seconds < 2592000) return Math.floor(seconds / 86400) + ' days ago';
    return new Date(timestamp).toLocaleDateString('id-ID');
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Expiry select change handler
    const expirySelect = document.getElementById('expiry-select');
    if (expirySelect) {
        expirySelect.addEventListener('change', handleExpiryChange);
    }

    // Load shares if on file detail page
    if (typeof currentFileId !== 'undefined' && currentFileId) {
        setTimeout(loadFileShares, 1000);
    }
});
