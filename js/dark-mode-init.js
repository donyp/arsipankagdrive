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
            
            /* Base smooth transitions for all elements */
            * {
                transition: background-color 0.3s ease, 
                           color 0.3s ease, 
                           border-color 0.3s ease,
                           box-shadow 0.3s ease,
                           fill 0.3s ease,
                           stroke 0.3s ease !important;
            }
            
            /* Disable transitions on page load and during toggle */
            html.no-transition,
            html.no-transition * {
                transition: none !important;
            }
            
            /* Prevent FOUC on page load */
            html {
                background-color: #ffffff;
                color: #1f2937;
                transition: none;
            }
            
            body {
                background-color: #f5f7fa;
                color: #1f2937;
                transition: background-color 0.3s ease, color 0.3s ease;
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
            
            /* Ensure smooth transitions work for common Tailwind classes */
            .bg-white { transition: background-color 0.3s ease !important; }
            .bg-gray-50 { transition: background-color 0.3s ease !important; }
            .bg-gray-100 { transition: background-color 0.3s ease !important; }
            .text-gray-900 { transition: color 0.3s ease !important; }
            .text-gray-500 { transition: color 0.3s ease !important; }
            .border-gray-200 { transition: border-color 0.3s ease !important; }
            
            /* Input transitions */
            input, select, textarea {
                transition: background-color 0.3s ease, 
                           color 0.3s ease, 
                           border-color 0.3s ease !important;
            }
            
            /* Button transitions */
            button, [role="button"] {
                transition: background-color 0.3s ease, 
                           color 0.3s ease, 
                           border-color 0.3s ease !important;
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
