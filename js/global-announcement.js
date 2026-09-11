// ============================================================
// Global Announcement Banner - Appears on all pages
// Version 1.0.0
// ============================================================

(function() {
    console.log('[GlobalAnnouncement] Initializing...');

    function createBanner() {
        const banner = document.createElement('div');
        banner.id = 'global-announcement-banner';
        banner.className = 'global-announcement-banner';
        banner.innerHTML = `
            <div class="announcement-content">
                <div class="announcement-icon">📢</div>
                <div class="announcement-text">
                    <span class="announcement-message">Jika ada kendala, silahkan hubungi admin anka</span>
                </div>
                <button class="announcement-close" onclick="document.getElementById('global-announcement-banner').remove()">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #global-announcement-banner {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                width: 100%;
                z-index: 99999;
                background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                padding: 0;
                margin: 0;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                animation: slideDown 0.4s ease-out;
            }

            @keyframes slideDown {
                from {
                    transform: translateY(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            .announcement-content {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 12px 20px;
                color: white;
                font-size: 14px;
                font-weight: 600;
                letter-spacing: 0.5px;
            }

            .announcement-icon {
                font-size: 18px;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .announcement-text {
                flex: 1;
                display: flex;
                align-items: center;
                overflow: hidden;
            }

            .announcement-message {
                display: inline-block;
                animation: scrollText 15s linear infinite;
                white-space: nowrap;
                padding-left: 20px;
            }

            @keyframes scrollText {
                0% {
                    transform: translateX(0);
                }
                100% {
                    transform: translateX(-100%);
                }
            }

            .announcement-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                flex-shrink: 0;
            }

            .announcement-close:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.05);
            }

            /* Adjust page layout when banner is present */
            body.has-announcement {
                padding-top: 60px;
            }

            /* Ensure sidebar accounts for banner */
            #sidebar {
                top: 60px !important;
                height: calc(100vh - 60px) !important;
            }

            /* Adjust main content for banner */
            #main-content {
                padding-top: 0 !important;
            }

            @media (max-width: 768px) {
                .announcement-content {
                    padding: 10px 12px;
                    font-size: 12px;
                    gap: 8px;
                }

                .announcement-icon {
                    font-size: 16px;
                }

                .announcement-close {
                    width: 28px;
                    height: 28px;
                }

                body.has-announcement {
                    padding-top: 50px;
                }

                #sidebar {
                    top: 50px !important;
                    height: calc(100vh - 50px) !important;
                }
            }
        `;

        // Insert at the very beginning of body
        document.head.appendChild(style);
        document.body.insertBefore(banner, document.body.firstChild);
        document.body.classList.add('has-announcement');

        console.log('[GlobalAnnouncement] Banner created and injected');
    }

    // Inject as soon as DOM is ready
    function init() {
        if (document.body) {
            createBanner();
        } else {
            document.addEventListener('DOMContentLoaded', createBanner);
        }
    }

    // Initialize immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
