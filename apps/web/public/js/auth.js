/**
 * Cottage Queuing System - Shared Authentication Module
 * Handles authentication state, token management, and role-based access control
 */

const Auth = {
    // Configuration
    baseUrl: '/api',
    loginPage: '/login.html',

    // Token storage keys (aligned with API module)
    tokenKey: 'hospital_queue_token',
    refreshKey: 'hospital_queue_refresh_token',
    userKey: 'hospital_queue_user',

    // Event types
    events: {
        LOGIN: 'auth-login',
        LOGOUT: 'auth-logout',
        TOKEN_REFRESH: 'auth-token-refresh'
    },

    /**
     * Get stored authentication token
     * @returns {string|null} Token string or null if not found
     */
    getToken() {
        if (typeof localStorage === 'undefined') return null;
        return localStorage.getItem(this.tokenKey);
    },

    /**
     * Get stored refresh token
     * @returns {string|null} Refresh token or null if not found
     */
    getRefreshToken() {
        if (typeof localStorage === 'undefined') return null;
        return localStorage.getItem(this.refreshKey);
    },

    /**
     * Get stored user data
     * @returns {Object|null} User object or null if not found
     */
    getUser() {
        if (typeof localStorage === 'undefined') return null;
        const user = localStorage.getItem(this.userKey);
        if (!user) return null;
        try {
            return JSON.parse(user);
        } catch (error) {
            console.error('Auth: Failed to parse stored user data', error);
            return null;
        }
    },

    /**
     * Check if user is authenticated
     * @returns {boolean} True if authenticated with valid token
     */
    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;

        // Check token expiration if available
        try {
            const payload = this._decodeToken(token);
            if (payload && payload.exp) {
                const now = Math.floor(Date.now() / 1000);
                return payload.exp > now;
            }
        } catch (error) {
            // If we can't decode, check if token exists
            console.warn('Auth: Could not verify token expiration', error);
        }

        return !!token;
    },

    /**
     * Decode JWT token (without verification - for expiration check only)
     * @param {string} token - JWT token string
     * @returns {Object|null} Decoded payload or null
     */
    _decodeToken(token) {
        try {
            const base64Url = token.split('.')[1];
            if (!base64Url) return null;
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (error) {
            return null;
        }
    },

    /**
     * Login with email and password (Staff login)
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} Resolves with user data and tokens
     * @throws {Error} If login fails
     */
    async login(email, password) {
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        // Sanitize inputs
        const sanitizedEmail = email.trim().toLowerCase();

        try {
            const response = await fetch(`${this.baseUrl}/auth/staff/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: sanitizedEmail,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || data.message || 'Login failed');
            }

            if (data.success && data.data) {
                // Store credentials
                this._storeCredentials(data.data);

                // Dispatch login event
                this._dispatchEvent(this.events.LOGIN, {
                    user: data.data.user,
                    token: data.data.token
                });

                return data.data;
            }

            throw new Error(data.error || 'Invalid response from server');

        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error. Please check your connection.');
            }
            throw error;
        }
    },

    /**
     * Patient login with ID/Phone and password
     * @param {string} identifier - Patient ID or phone number
     * @param {string} password - Patient password
     * @returns {Promise<Object>} Resolves with user data and tokens
     * @throws {Error} If login fails
     */
    async patientLogin(identifier, password) {
        if (!identifier || !password) {
            throw new Error('Patient ID/Phone and password are required');
        }

        try {
            const response = await fetch(`${this.baseUrl}/auth/patient/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identifier: identifier.trim(),
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || data.message || 'Login failed');
            }

            if (data.success && data.data) {
                this._storeCredentials(data.data);
                this._dispatchEvent(this.events.LOGIN, {
                    user: data.data.user,
                    token: data.data.token
                });
                return data.data;
            }

            throw new Error(data.error || 'Invalid response from server');

        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error. Please check your connection.');
            }
            throw error;
        }
    },

    /**
     * Doctor PIN login
     * @param {string} email - Doctor email
     * @param {string} pin - 4-digit PIN
     * @returns {Promise<Object>} Resolves with user data and tokens
     * @throws {Error} If login fails
     */
    async pinLogin(email, pin) {
        if (!email || !pin || pin.length !== 4) {
            throw new Error('Email and 4-digit PIN are required');
        }

        try {
            const response = await fetch(`${this.baseUrl}/auth/pin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    pin: pin
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || data.message || 'Login failed');
            }

            if (data.success && data.data) {
                this._storeCredentials(data.data);
                this._dispatchEvent(this.events.LOGIN, {
                    user: data.data.user,
                    token: data.data.token
                });
                return data.data;
            }

            throw new Error(data.error || 'Invalid response from server');

        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error. Please check your connection.');
            }
            throw error;
        }
    },

    /**
     * Store authentication credentials in localStorage
     * @param {Object} data - Response data containing tokens and user
     */
    _storeCredentials(data) {
        if (data.token) {
            localStorage.setItem(this.tokenKey, data.token);
        }
        if (data.accessToken) {
            localStorage.setItem(this.tokenKey, data.accessToken);
        }
        if (data.refreshToken) {
            localStorage.setItem(this.refreshKey, data.refreshToken);
        }
        if (data.user) {
            localStorage.setItem(this.userKey, JSON.stringify(data.user));
        }
    },

    /**
     * Refresh access token using refresh token
     * @returns {Promise<boolean>} True if refresh successful
     */
    async refreshToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            return false;
        }

        try {
            const response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            const data = await response.json();

            if (data.success && data.data) {
                this._storeCredentials(data.data);
                this._dispatchEvent(this.events.TOKEN_REFRESH, {
                    token: data.data.accessToken
                });
                return true;
            }

            return false;

        } catch (error) {
            console.error('Auth: Token refresh failed', error);
            return false;
        }
    },

    /**
     * Logout current user
     * @param {boolean} redirect - Whether to redirect to login page (default: true)
     */
    logout(redirect = true) {
        // Clear stored credentials
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.refreshKey);
        localStorage.removeItem(this.userKey);

        // Dispatch logout event
        this._dispatchEvent(this.events.LOGOUT, {});

        // Redirect to login page if requested
        if (redirect && typeof window !== 'undefined') {
            const currentPage = window.location.pathname;
            if (currentPage !== this.loginPage) {
                window.location.href = this.loginPage;
            }
        }
    },

    /**
     * Require authentication - redirects to login if not authenticated
     * @param {string|null} returnUrl - URL to redirect back after login (optional)
     * @returns {boolean} True if authenticated, false if redirected
     */
    requireAuth(returnUrl = null) {
        if (!this.isAuthenticated()) {
            const redirectUrl = this.loginPage;
            const url = returnUrl || window.location.href;
            const separator = redirectUrl.includes('?') ? '&' : '?';
            window.location.href = `${redirectUrl}${separator}redirect=${encodeURIComponent(url)}`;
            return false;
        }
        return true;
    },

    /**
     * Check if current user has one of the specified roles
     * @param {string|string[]} roles - Role name or array of role names
     * @returns {boolean} True if user has at least one of the roles
     */
    hasRole(roles) {
        const user = this.getUser();
        if (!user) return false;

        // Normalize roles to array
        const roleArray = Array.isArray(roles) ? roles : [roles];

        // Check for role in user object (support multiple formats)
        const userRole = user.role || user.user_role || user.userType || user.type;
        if (!userRole) return false;

        // Case-insensitive comparison
        const userRoleLower = userRole.toLowerCase();
        return roleArray.some(role => {
            const roleLower = role.toLowerCase();
            return userRoleLower === roleLower;
        });
    },

    /**
     * Check if current user has all specified roles
     * @param {string|string[]} roles - Role name or array of role names
     * @returns {boolean} True if user has all specified roles
     */
    hasAllRoles(roles) {
        const user = this.getUser();
        if (!user) return false;

        const roleArray = Array.isArray(roles) ? roles : [roles];
        const userRole = user.role || user.user_role || user.userType || user.type;
        if (!userRole) return false;

        const userRoleLower = userRole.toLowerCase();
        return roleArray.every(role => {
            return userRoleLower === role.toLowerCase();
        });
    },

    /**
     * Get current user's role
     * @returns {string|null} User role or null
     */
    getRole() {
        const user = this.getUser();
        if (!user) return null;
        return user.role || user.user_role || user.userType || user.type || null;
    },

    /**
     * Check if user has any admin privileges
     * @returns {boolean} True if user is admin
     */
    isAdmin() {
        return this.hasRole('admin');
    },

    /**
     * Dispatch custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail data
     */
    _dispatchEvent(eventName, detail) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(eventName, { detail }));
        }
    },

    /**
     * Subscribe to authentication events
     * @param {string} eventName - Event name to subscribe to
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback) {
        if (typeof window !== 'undefined') {
            window.addEventListener(eventName, (e) => callback(e.detail));
            return () => window.removeEventListener(eventName, (e) => callback(e.detail));
        }
        return () => {};
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.Auth = Auth;
}

// Export for module systems (ES Module / CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}
