/**
 * Dark Mode Initialization Script
 * This script handles dark mode CSS variables and initialization for all pages
 * Include this in the head of any page that needs dark mode support
 */

(function() {
    'use strict';

    // Function to apply/reset CSS variables based on dark mode
    window.applyDarkModeInlineStyles = function(isDark) {
        const root = document.documentElement;
        if (isDark) {
            // Apply dark mode CSS variables
            root.style.cssText = `
                --color-bg-primary: #0f172a;
                --color-bg-secondary: #1e293b;
                --color-bg-tertiary: #334155;
                --color-text-primary: #f1f5f9;
                --color-text-secondary: #cbd5e1;
                --color-border: #475569;
                --color-border-dark: #64748b;
            `;
        } else {
            // Reset to light mode CSS variables (or remove inline styles to use :root defaults)
            root.style.cssText = '';
        }
    };

    // Initialize dark mode on page load
    if (localStorage.getItem('dark_mode_enabled') === 'true') {
        document.documentElement.setAttribute('data-dark-mode', 'true');
        window.applyDarkModeInlineStyles(true);
    }

    console.log('[DarkModeInit] Dark mode initialization script loaded');
})();
