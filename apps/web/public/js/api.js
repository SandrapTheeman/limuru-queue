/**
 * Hospital Queue System - Shared API Module
 * Handles all API calls with authentication
 */

const API = {
    // API base URL - uses relative path for nginx proxy
    baseUrl: '/api',
    
    // Token storage keys
    tokenKey: 'hospital_queue_token',
    refreshKey: 'hospital_queue_refresh_token',
    userKey: 'hospital_queue_user',

    /**
     * Get stored token
     */
    getToken() {
        return localStorage.getItem(this.tokenKey);
    },

    /**
     * Get stored user
     */
    getUser() {
        const user = localStorage.getItem(this.userKey);
        return user ? JSON.parse(user) : null;
    },

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return !!this.getToken();
    },

    /**
     * Make authenticated API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const token = this.getToken();
        
        const defaultHeaders = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }
        
        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...(options.headers || {})
            }
        };
        
        try {
            const response = await fetch(url, config);
            
            // Handle 401 Unauthorized
            if (response.status === 401) {
                // Try to refresh token
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // Retry with new token
                    config.headers['Authorization'] = `Bearer ${this.getToken()}`;
                    const retryResponse = await fetch(url, config);
                    const retryData = await retryResponse.json();
                    if (!retryResponse.ok) {
                        throw new Error(retryData.error || 'Request failed');
                    }
                    return retryData;
                } else {
                    // Refresh failed, logout
                    this.logout();
                    throw new Error('Session expired');
                }
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || data.message || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    /**
     * GET request
     */
    async get(endpoint) {
        return this.request(endpoint);
    },

    /**
     * POST request
     */
    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    /**
     * PATCH request
     */
    async patch(endpoint, body) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body)
        });
    },

    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    },

    // ===================
    // Authentication
    // ===================

    /**
     * Login with email and password
     */
    async login(email, password) {
        const data = await this.post('/auth/login', { email, password });
        
        if (data.success && data.data) {
            // Store token and user
            localStorage.setItem(this.tokenKey, data.data.accessToken);
            localStorage.setItem(this.refreshKey, data.data.refreshToken);
            localStorage.setItem(this.userKey, JSON.stringify(data.data.user));
            return data.data;
        }
        
        throw new Error(data.error || 'Login failed');
    },

    /**
     * Refresh access token
     */
    async refreshToken() {
        const refreshToken = localStorage.getItem(this.refreshKey);
        
        if (!refreshToken) {
            return false;
        }
        
        try {
            const data = await this.post('/auth/refresh', { refreshToken });
            
            if (data.success && data.data) {
                localStorage.setItem(this.tokenKey, data.data.accessToken);
                localStorage.setItem(this.refreshKey, data.data.refreshToken);
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }
        
        return false;
    },

    /**
     * Logout
     */
    logout() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.refreshKey);
        localStorage.removeItem(this.userKey);
        
        // Dispatch logout event
        window.dispatchEvent(new CustomEvent('user-logout'));
    },

    /**
     * Get current user info
     */
    async getCurrentUser() {
        return this.get('/auth/me');
    },

    // ===================
    // Departments
    // ===================

    /**
     * Get all departments
     */
    async getDepartments() {
        return this.get('/departments');
    },

    // ===================
    // Patients
    // ===================

    /**
     * Get patients
     */
    async getPatients() {
        return this.get('/patients');
    },

    /**
     * Get patient by ID
     */
    async getPatient(id) {
        return this.get(`/patients/${id}`);
    },

    // ===================
    // Queue
    // ===================

    /**
     * Get queue stats
     */
    async getQueueStats() {
        return this.get('/queue/stats');
    },

    /**
     * Get active queue
     */
    async getQueue() {
        return this.get('/queue');
    },

    /**
     * Get queue by department
     */
    async getQueueByDepartment(departmentId) {
        return this.get(`/queue/department/${departmentId}`);
    },

    /**
     * Add patient to queue
     */
    async addToQueue(patientId, departmentId, options = {}) {
        return this.post('/queue', {
            patient_id: patientId,
            department_id: departmentId,
            ...options
        });
    },

    /**
     * Update queue entry
     */
    async updateQueueEntry(id, updates) {
        return this.patch(`/queue/${id}`, updates);
    },

    /**
     * Call patient
     */
    async callPatient(queueId, roomAssigned) {
        return this.patch(`/queue/${queueId}`, {
            status: 'called',
            room_assigned: roomAssigned
        });
    },

    /**
     * Start consultation
     */
    async startConsultation(queueId) {
        return this.patch(`/queue/${queueId}`, {
            status: 'in_progress'
        });
    },

    /**
     * Complete consultation
     */
    async completeConsultation(queueId) {
        return this.patch(`/queue/${queueId}`, {
            status: 'completed'
        });
    },

    // ===================
    // Rooms
    // ===================

    /**
     * Get rooms
     */
    async getRooms() {
        return this.get('/rooms');
    },

    /**
     * Get room by ID
     */
    async getRoom(id) {
        return this.get(`/rooms/${id}`);
    },

    // ===================
    // Appointments
    // ===================

    /**
     * Get appointments
     */
    async getAppointments() {
        return this.get('/appointments');
    },

    /**
     * Create appointment
     */
    async createAppointment(data) {
        return this.post('/appointments', data);
    },

    // ===================
    // Users / Staff
    // ===================

    /**
     * Get users
     */
    async getUsers() {
        return this.get('/users');
    },

    /**
     * Get users by department
     */
    async getUsersByDepartment(dept) {
        return this.get(`/users/department/${dept}`);
    },

    // ===================
    // Doctors
    // ===================

    /**
     * Get doctors
     */
    async getDoctors() {
        return this.get('/doctors');
    },

    /**
     * Get doctor by ID
     */
    async getDoctor(id) {
        return this.get(`/doctors/${id}`);
    },

    /**
     * Get doctor schedule
     */
    async getDoctorSchedule(id) {
        return this.get(`/doctors/${id}/schedule`);
    },

    // ===================
    // Voice Calls
    // ===================

    /**
     * Get voice calls
     */
    async getVoiceCalls() {
        return this.get('/voice/calls');
    },

    /**
     * Initiate voice call
     */
    async initiateVoiceCall(callerId, callerName, callerRole, calleeId, calleeName, priority = 'normal') {
        return this.post('/voice/call', {
            callerId,
            callerName,
            callerRole,
            calleeId,
            calleeName,
            priority
        });
    },

    /**
     * Accept voice call
     */
    async acceptVoiceCall(callId) {
        return this.post(`/voice/call/${callId}/accept`);
    },

    /**
     * Reject voice call
     */
    async rejectVoiceCall(callId, reason) {
        return this.post(`/voice/call/${callId}/reject`, { reason });
    },

    /**
     * End voice call
     */
    async endVoiceCall(callId) {
        return this.post(`/voice/call/${callId}/end`);
    },

    // ===================
    // Doctor Notes
    // ===================

    /**
     * Get patient clinical notes
     */
    async getPatientNotes(patientId, options = {}) {
        const { limit = 50, offset = 0 } = options;
        return this.get(`/doctor-notes/patient/${patientId}?limit=${limit}&offset=${offset}`);
    },

    /**
     * Get single note by ID
     */
    async getNote(noteId) {
        return this.get(`/doctor-notes/${noteId}`);
    },

    /**
     * Create clinical note (SOAP format)
     */
    async createNote(data) {
        return this.post('/doctor-notes', data);
    },

    /**
     * Update clinical note
     */
    async updateNote(noteId, data) {
        return this.patch(`/doctor-notes/${noteId}`, data);
    },

    /**
     * Delete clinical note
     */
    async deleteNote(noteId) {
        return this.delete(`/doctor-notes/${noteId}`);
    },

    /**
     * Get note templates
     */
    async getNoteTemplates() {
        return this.get('/doctor-notes/templates');
    },

    /**
     * Get recent notes for current doctor
     */
    async getRecentNotes(limit = 10) {
        return this.get(`/doctor-notes/recent?limit=${limit}`);
    }
};

// Make available globally
window.API = API;
