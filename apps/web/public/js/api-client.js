/**
 * Hospital Queue System - Shared API Client
 * Singleton API client with automatic auth, error handling, and structured responses
 * 
 * Usage: const result = await api.queue.list();
 *        if (result.success) { console.log(result.data); }
 */

const api = (function() {
    'use strict';

    // ===================
    // Configuration
    // ===================
    
    const config = {
        baseUrl: '/api',
        tokenKey: 'hospital_queue_token',
        refreshKey: 'hospital_queue_refresh_token',
        userKey: 'hospital_queue_user',
        retryAttempts: 1,
        timeout: 30000
    };

    // ===================
    // State
    // ===================
    
    let _initialized = false;

    // ===================
    // Token Management
    // ===================
    
    function getToken() {
        return localStorage.getItem(config.tokenKey);
    }

    function setToken(token) {
        if (token) {
            localStorage.setItem(config.tokenKey, token);
        }
    }

    function getRefreshToken() {
        return localStorage.getItem(config.refreshKey);
    }

    function setRefreshToken(token) {
        if (token) {
            localStorage.setItem(config.refreshKey, token);
        }
    }

    function getUser() {
        const user = localStorage.getItem(config.userKey);
        return user ? JSON.parse(user) : null;
    }

    function isAuthenticated() {
        return !!getToken();
    }

    function clearAuth() {
        localStorage.removeItem(config.tokenKey);
        localStorage.removeItem(config.refreshKey);
        localStorage.removeItem(config.userKey);
    }

    // ===================
    // Response Helpers
    // ===================
    
    function successResponse(data) {
        return { success: true, data: data };
    }

    function errorResponse(error, statusCode = 500) {
        return { 
            success: false, 
            error: error.message || 'An unexpected error occurred',
            statusCode: statusCode
        };
    }

    // ===================
    // Core HTTP Client
    // ===================
    
    async function request(endpoint, options = {}) {
        const url = `${config.baseUrl}${endpoint}`;
        const token = getToken();
        
        const defaultHeaders = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const config_options = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...(options.headers || {})
            },
            signal: controller.signal
        };

        try {
            const response = await fetch(url, config_options);
            clearTimeout(timeoutId);

            // Handle 401 Unauthorized - attempt token refresh
            if (response.status === 401) {
                const refreshed = await _refreshToken();
                if (refreshed) {
                    // Retry with new token
                    config_options.headers['Authorization'] = `Bearer ${getToken()}`;
                    const retryResponse = await fetch(url, config_options);
                    const retryData = await retryResponse.json();
                    
                    if (!retryResponse.ok) {
                        throw new Error(retryData.error || retryData.message || 'Request failed');
                    }
                    
                    return successResponse(retryData.data || retryData);
                } else {
                    // Refresh failed - logout user
                    _handleAuthFailure();
                    throw new Error('Session expired. Please login again.');
                }
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
            }

            return successResponse(data.data || data);

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                return errorResponse(new Error('Request timed out'), 408);
            }
            
            console.error(`[API] Request failed: ${endpoint}`, error);
            return errorResponse(error);
        }
    }

    // ===================
    // HTTP Methods
    // ===================
    
    async function get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return request(url, { method: 'GET' });
    }

    async function post(endpoint, body = {}) {
        return request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    async function put(endpoint, body = {}) {
        return request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    async function patch(endpoint, body = {}) {
        return request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body)
        });
    }

    async function del(endpoint) {
        return request(endpoint, { method: 'DELETE' });
    }

    // ===================
    // Token Refresh
    // ===================
    
    async function _refreshToken() {
        const refreshToken = getRefreshToken();
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${config.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            const data = await response.json();
            
            if (data.success && data.data) {
                setToken(data.data.accessToken);
                setRefreshToken(data.data.refreshToken);
                return true;
            }
        } catch (error) {
            console.error('[API] Token refresh failed:', error);
        }

        return false;
    }

    function _handleAuthFailure() {
        clearAuth();
        window.dispatchEvent(new CustomEvent('api-auth-failure'));
    }

    // ===================
    // Auth Module
    // ===================
    
    const auth = {
        async login(email, password) {
            const result = await post('/auth/login', { email, password });
            
            if (result.success && result.data) {
                setToken(result.data.accessToken);
                setRefreshToken(result.data.refreshToken);
                localStorage.setItem(config.userKey, JSON.stringify(result.data.user));
                window.dispatchEvent(new CustomEvent('api-auth-success', { detail: result.data }));
            }
            
            return result;
        },

        async refreshToken() {
            return await _refreshToken();
        },

        async register(data) {
            return await post('/auth/register', data);
        },

        async changePassword(currentPassword, newPassword) {
            return await post('/auth/change-password', { currentPassword, newPassword });
        },

        async requestPasswordReset(identifier) {
            return await post('/auth/reset-password/request', { identifier });
        },

        async confirmPasswordReset(token, newPassword) {
            return await post('/auth/reset-password/confirm', { token, newPassword });
        },

        async me() {
            return await get('/auth/me');
        },

        logout() {
            clearAuth();
            window.dispatchEvent(new CustomEvent('api-auth-logout'));
        },

        getUser,
        isAuthenticated
    };

    // ===================
    // Queue Module
    // ===================
    
    const queue = {
        async list(params = {}) {
            return await get('/queue', params);
        },

        async create(data) {
            return await post('/queue', data);
        },

        async update(id, data) {
            return await patch(`/queue/${id}`, data);
        },

        async stats() {
            return await get('/queue/stats');
        },

        async getByDepartment(departmentId) {
            return await get(`/queue/department/${departmentId}`);
        },

        async callPatient(queueId, roomAssigned, doctorId) {
            return await patch(`/queue/${queueId}`, {
                status: 'called',
                room_assigned: roomAssigned,
                doctor_id: doctorId
            });
        },

        async startConsultation(queueId) {
            return await patch(`/queue/${queueId}`, { status: 'in_progress' });
        },

        async complete(queueId, notes = {}) {
            return await patch(`/queue/${queueId}`, {
                status: 'completed',
                ...notes
            });
        },

        async markNoShow(queueId) {
            return await post(`/queue/${queueId}/no-show`);
        },

        async transfer(queueId, departmentId) {
            return await post(`/queue/${queueId}/transfer`, { department_id: departmentId });
        }
    };

    // ===================
    // Departments Module
    // ===================
    
    const departments = {
        async list() {
            return await get('/departments');
        },

        async get(id) {
            return await get(`/departments/${id}`);
        },

        async create(data) {
            return await post('/departments', data);
        },

        async update(id, data) {
            return await patch(`/departments/${id}`, data);
        },

        async delete(id) {
            return await del(`/departments/${id}`);
        }
    };

    // ===================
    // Patients Module
    // ===================
    
    const patients = {
        async list(params = {}) {
            return await get('/patients', params);
        },

        async get(id) {
            return await get(`/patients/${id}`);
        },

        async create(data) {
            return await post('/patients', data);
        },

        async update(id, data) {
            return await patch(`/patients/${id}`, data);
        },

        async search(query, limit = 10) {
            return await post('/patients/search', { query, limit });
        },

        async history(id, params = {}) {
            return await get(`/patients/${id}/history`, params);
        },

        async getVitals(patientId) {
            return await get(`/vitals/${patientId}`);
        },

        async recordVitals(data) {
            return await post('/vitals', data);
        }
    };

    // ===================
    // Appointments Module
    // ===================
    
    const appointments = {
        async list(params = {}) {
            return await get('/appointments', params);
        },

        async get(id) {
            return await get(`/appointments/${id}`);
        },

        async create(data) {
            return await post('/appointments', data);
        },

        async update(id, data) {
            return await patch(`/appointments/${id}`, data);
        },

        async delete(id) {
            return await del(`/appointments/${id}`);
        },

        async cancel(id, reason) {
            return await post(`/appointments/${id}/cancel`, { reason });
        },

        async reschedule(id, newDate, newTime) {
            return await post(`/appointments/${id}/reschedule`, { date: newDate, time: newTime });
        }
    };

    // ===================
    // Messages Module
    // ===================
    
    const messages = {
        async list(params = {}) {
            return await get('/messages', params);
        },

        async get(id) {
            return await get(`/messages/${id}`);
        },

        async send(data) {
            return await post('/messages', data);
        },

        async markRead(id) {
            return await patch(`/messages/${id}/read`);
        },

        async markAllRead() {
            return await post('/messages/read-all');
        },

        async getUnreadCount() {
            return await get('/messages/unread-count');
        },

        async delete(id) {
            return await del(`/messages/${id}`);
        }
    };

    // ===================
    // Doctor Notes Module
    // ===================
    
    const doctorNotes = {
        async list(params = {}) {
            return await get('/doctor-notes', params);
        },

        async get(id) {
            return await get(`/doctor-notes/${id}`);
        },

        async create(data) {
            return await post('/doctor-notes', data);
        },

        async update(id, data) {
            return await patch(`/doctor-notes/${id}`, data);
        },

        async delete(id) {
            return await del(`/doctor-notes/${id}`);
        },

        async templates() {
            return await get('/doctor-notes/templates');
        },

        async getByPatient(patientId, params = {}) {
            return await get(`/doctor-notes/patient/${patientId}`, params);
        },

        async getRecent(limit = 10) {
            return await get(`/doctor-notes/recent`, { limit });
        },

        async search(query, params = {}) {
            return await get('/doctor-notes/search', { q: query, ...params });
        }
    };

    // ===================
    // Analytics Module
    // ===================
    
    const analytics = {
        async overview() {
            return await get('/analytics/overview');
        },

        async volume(params = {}) {
            return await get('/analytics/volume', params);
        },

        async waitTimes(params = {}) {
            return await get('/analytics/wait-times', params);
        },

        async departmentPerformance(params = {}) {
            return await get('/analytics/departments', params);
        },

        async patientTrends(params = {}) {
            return await get('/analytics/patient-trends', params);
        },

        async exportReport(format = 'csv', params = {}) {
            return await get(`/analytics/export/${format}`, params);
        }
    };

    // ===================
    // Predictions Module
    // ===================
    
    const predictions = {
        async waitTime(params = {}) {
            return await get('/predictions/wait-time', params);
        },

        async volume(params = {}) {
            return await get('/predictions/volume', params);
        },

        async busiestTimes(params = {}) {
            return await get('/predictions/busiest-times', params);
        },

        async demandForecast(days = 7) {
            return await get('/predictions/demand-forecast', { days });
        }
    };

    // ===================
    // Admin Module
    // ===================
    
    const admin = {
        async settings() {
            return await get('/admin/settings');
        },

        async updateSettings(settings) {
            return await put('/admin/settings', settings);
        },

        async backup() {
            return await post('/admin/backup');
        },

        async restore(backupId) {
            return await post('/admin/restore', { backupId });
        },

        async getBackupList() {
            return await get('/admin/backups');
        },

        async auditLogs(params = {}) {
            return await get('/admin/audit-logs', params);
        },

        async rateLimits() {
            return await get('/admin/rate-limits');
        },

        async updateRateLimits(limits) {
            return await put('/admin/rate-limits', limits);
        },

        async getStats() {
            return await get('/admin/stats');
        },

        async getUsers(params = {}) {
            return await get('/admin/users', params);
        },

        async createUser(data) {
            return await post('/admin/users', data);
        },

        async updateUser(id, data) {
            return await patch(`/admin/users/${id}`, data);
        },

        async deleteUser(id) {
            return await del(`/admin/users/${id}`);
        },

        async getSystemHealth() {
            return await get('/admin/health');
        }
    };

    // ===================
    // Notifications Module
    // ===================
    
    const notifications = {
        async sms(data) {
            return await post('/notifications/sms', data);
        },

        async whatsapp(data) {
            return await post('/notifications/whatsapp', data);
        },

        async email(data) {
            return await post('/notifications/email', data);
        },

        async templates() {
            return await get('/notifications/templates');
        },

        async list(params = {}) {
            return await get('/notifications', params);
        },

        async getStats() {
            return await get('/notifications/stats');
        },

        async sendBulk(data) {
            return await post('/notifications/bulk', data);
        }
    };

    // ===================
    // Voice Calls Module
    // ===================
    
    const voiceCalls = {
        async list(params = {}) {
            return await get('/voice/calls', params);
        },

        async get(id) {
            return await get(`/voice/calls/${id}`);
        },

        async call(data) {
            return await post('/voice/call', data);
        },

        async accept(id) {
            return await post(`/voice/call/${id}/accept`);
        },

        async reject(id, reason) {
            return await post(`/voice/call/${id}/reject`, { reason });
        },

        async end(id) {
            return await post(`/voice/call/${id}/end`);
        },

        async getActive() {
            return await get('/voice/calls/active');
        },

        async getCallHistory(userId, params = {}) {
            return await get(`/voice/calls/history/${userId}`, params);
        }
    };

    // ===================
    // Doctors Module
    // ===================
    
    const doctors = {
        async list(params = {}) {
            return await get('/doctors', params);
        },

        async get(id) {
            return await get(`/doctors/${id}`);
        },

        async getSchedule(id) {
            return await get(`/doctors/${id}/schedule`);
        },

        async updateStatus(id, isAvailable, breakUntil) {
            return await put(`/doctors/${id}/status`, { isAvailable, breakUntil });
        },

        async getByDepartment(departmentId) {
            return await get(`/doctors/department/${departmentId}`);
        }
    };

    // ===================
    // Rooms Module
    // ===================
    
    const rooms = {
        async list(params = {}) {
            return await get('/rooms', params);
        },

        async get(id) {
            return await get(`/rooms/${id}`);
        },

        async create(data) {
            return await post('/rooms', data);
        },

        async update(id, data) {
            return await patch(`/rooms/${id}`, data);
        },

        async delete(id) {
            return await del(`/rooms/${id}`);
        },

        async updateStatus(id, status) {
            return await patch(`/rooms/${id}/status`, { status });
        }
    };

    // ===================
    // Clinical/Vitals Module
    // ===================
    
    const clinical = {
        async getNotes(params = {}) {
            return await get('/clinical', params);
        },

        async getNote(id) {
            return await get(`/clinical/${id}`);
        },

        async getNotesByPatient(patientId, params = {}) {
            return await get(`/clinical/patient/${patientId}`, params);
        },

        async getNotesByVisit(visitId) {
            return await get(`/clinical/visit/${visitId}`);
        },

        async createNote(data) {
            return await post('/clinical', data);
        },

        async updateNote(id, data) {
            return await patch(`/clinical/${id}`, data);
        },

        async deleteNote(id) {
            return await del(`/clinical/${id}`);
        },

        async searchNotes(query, params = {}) {
            return await get('/clinical/search', { q: query, ...params });
        },

        async performTriage(data) {
            return await post('/vitals/triage', data);
        },

        async getLatestVitals(patientId) {
            return await get(`/vitals/triage/${patientId}`);
        }
    };

    // ===================
    // System Health
    // ===================
    
    async function healthCheck() {
        return await get('/health');
    }

    // ===================
    // Initialization
    // ===================
    
    function init(options = {}) {
        if (options.baseUrl) config.baseUrl = options.baseUrl;
        if (options.timeout) config.timeout = options.timeout;
        _initialized = true;
        
        console.log('[API Client] Initialized', { baseUrl: config.baseUrl });
        return api;
    }

    // ===================
    // Public API
    // ===================
    
    return {
        // Configuration
        init,
        config,
        
        // Core
        get,
        post,
        put,
        patch,
        delete: del,
        request,
        healthCheck,
        
        // Auth
        auth,
        
        // Resources
        queue,
        departments,
        patients,
        appointments,
        messages,
        doctorNotes,
        analytics,
        predictions,
        admin,
        notifications,
        voiceCalls,
        doctors,
        rooms,
        clinical,
        
        // Helpers
        isAuthenticated,
        getUser,
        clearAuth
    };
})();

// Make available globally
window.api = api;

// Auto-initialize with defaults
api.init();

// Listen for auth failures
window.addEventListener('api-auth-failure', () => {
    console.warn('[API] Authentication failed, redirecting to login...');
    if (typeof onAuthFailure === 'function') {
        onAuthFailure();
    } else {
        window.location.href = '/login?reason=session_expired';
    }
});
