/**
 * Dark Mode Initialization Script
 * This script handles dark mode CSS variables and initialization for all pages
 * Include this in the head of any page that needs dark mode support
 * 
 * Features:
 * - Smooth transitions between dark/light mode (300ms)
 * - No flickering or jumping on page load
 * - Global CSS variables for consistent theming
 * - Automatic body/document background transition
 * - Prevents FOUC (Flash of Unstyled Content)
 */

(function() {
    'use strict';

    // Inject comprehensive smooth transition CSS at the very beginning
    const styleId = 'dark-mode-transitions-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* ========================================
               DARK MODE SMOOTH TRANSITIONS
               ======================================== */
            
            /* Disable transitions on page load and during toggle */
            html.no-transition,
            html.no-transition * {
                transition: none !important;
            }
            
            /* Enable smooth transitions after load */
            html:not(.no-transition) {
                background-color: #ffffff;
                color: #1f2937;
                transition: background-color 0.3s ease, color 0.3s ease;
            }
            
            html:not(.no-transition) body {
                background-color: #f5f7fa;
                color: #1f2937;
                transition: background-color 0.3s ease, color 0.3s ease;
            }
            
            html:not(.no-transition) * {
                transition: background-color 0.3s ease, 
                           color 0.3s ease, 
                           border-color 0.3s ease,
                           box-shadow 0.3s ease,
                           fill 0.3s ease,
                           stroke 0.3s ease;
            }
            
            /* Prevent transition animations from blocking interactions */
            * {
                pointer-events: auto;
            }
            
            /* ========================================
               LIGHT MODE (DEFAULT)
               ======================================== */
            
            :root {
                --color-bg-primary: #ffffff;
                --color-bg-secondary: #f5f7fa;
                --color-bg-tertiary: #f3f4f6;
                --color-text-primary: #1f2937;
                --color-text-secondary: #6b7280;
                --color-text-tertiary: #9ca3af;
                --color-border: #e5e7eb;
                --color-border-dark: #d1d5db;
            }
            
            html {
                background-color: #ffffff;
            }
            
            body {
                background-color: #f5f7fa;
                color: #1f2937;
            }
            
            /* ========================================
               DARK MODE
               ======================================== */
            
            html[data-dark-mode="true"] {
                background-color: #0f172a;
                color: #f1f5f9;
                --color-bg-primary: #0f172a;
                --color-bg-secondary: #1e293b;
                --color-bg-tertiary: #334155;
                --color-text-primary: #f1f5f9;
                --color-text-secondary: #cbd5e1;
                --color-text-tertiary: #94a3b8;
                --color-border: #475569;
                --color-border-dark: #64748b;
            }
            
            html[data-dark-mode="true"] body {
                background-color: #0f172a;
                color: #f1f5f9;
            }
            
            /* Specific smooth transitions for common elements */
            input:not(.no-transition),
            select:not(.no-transition),
            textarea:not(.no-transition) {
                transition: background-color 0.3s ease, 
                           color 0.3s ease, 
                           border-color 0.3s ease;
            }
            
            button:not(.no-transition),
            [role="button"]:not(.no-transition) {
                transition: background-color 0.3s ease, 
                           color 0.3s ease, 
                           border-color 0.3s ease;
            }
        `;
        document.head.insertBefore(style, document.head.firstChild);
    }

    // Function to apply CSS variables based on dark mode
    window.applyDarkModeInlineStyles = function(isDark) {
        const root = document.documentElement;
        
        if (isDark) {
            // Dark mode variables
            root.style.setProperty('--color-bg-primary', '#0f172a');
            root.style.setProperty('--color-bg-secondary', '#1e293b');
            root.style.setProperty('--color-bg-tertiary', '#334155');
            root.style.setProperty('--color-text-primary', '#f1f5f9');
            root.style.setProperty('--color-text-secondary', '#cbd5e1');
            root.style.setProperty('--color-text-tertiary', '#94a3b8');
            root.style.setProperty('--color-border', '#475569');
            root.style.setProperty('--color-border-dark', '#64748b');
        } else {
            // Light mode variables
            root.style.setProperty('--color-bg-primary', '#ffffff');
            root.style.setProperty('--color-bg-secondary', '#f5f7fa');
            root.style.setProperty('--color-bg-tertiary', '#f3f4f6');
            root.style.setProperty('--color-text-primary', '#1f2937');
            root.style.setProperty('--color-text-secondary', '#6b7280');
            root.style.setProperty('--color-text-tertiary', '#9ca3af');
            root.style.setProperty('--color-border', '#e5e7eb');
            root.style.setProperty('--color-border-dark', '#d1d5db');
        }
    };

    // Add no-transition class initially to prevent flashing on load
    document.documentElement.classList.add('no-transition');
    
    // Initialize dark mode on page load
    if (localStorage.getItem('dark_mode_enabled') === 'true') {
        document.documentElement.setAttribute('data-dark-mode', 'true');
        window.applyDarkModeInlineStyles(true);
    } else {
        window.applyDarkModeInlineStyles(false);
    }
    
    // Remove no-transition class after page load to enable transitions
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                document.documentElement.classList.remove('no-transition');
            }, 50);
        });
    } else {
        setTimeout(() => {
            document.documentElement.classList.remove('no-transition');
        }, 50);
    }

    console.log('[DarkModeInit] ✓ Dark mode smooth transitions initialized');
})();
