/**
 * API Module - Wrapper for API calls with authentication
 */

const API = {
    /**
     * Get JWT token from localStorage
     */
    getToken() {
        return localStorage.getItem('jwt_token') || null;
    },

    /**
     * Set JWT token to localStorage
     */
    setToken(token) {
        if (token) {
            localStorage.setItem('jwt_token', token);
        } else {
            localStorage.removeItem('jwt_token');
        }
    },

    /**
     * Make GET request
     */
    async get(url, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const response = await fetch(url, {
            method: 'GET',
            headers,
            ...options
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * Make POST request
     */
    async post(url, data = {}, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
            ...options
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        return response.json();
    },

    /**
     * Make POST request with FormData (for file uploads)
     */
    async postFormData(url, formData, options = {}) {
        const token = this.getToken();
        const headers = {
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData,
            ...options
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        return response.json();
    },

    /**
     * Make PUT request
     */
    async put(url, data = {}, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const response = await fetch(url, {
            method: 'PUT',
            headers,
            body: JSON.stringify(data),
            ...options
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    },

    /**
     * Make DELETE request
     */
    async delete(url, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const response = await fetch(url, {
            method: 'DELETE',
            headers,
            ...options
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }
};

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}
