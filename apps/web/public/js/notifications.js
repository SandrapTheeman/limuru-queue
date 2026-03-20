/**
 * Hospital Queue System - Notifications Module
 * Handles SMS and WhatsApp notifications management
 */

(function() {
    'use strict';

    const Notifications = {
        config: {
            apiBase: '/api',
            pollInterval: 30000, // 30 seconds
            maxMessageLength: 1600
        },

        templates: {},
        selectedTemplate: null,
        pollTimer: null,

        /**
         * Initialize the notifications module
         */
        init(options = {}) {
            this.config = { ...this.config, ...options };
            this._setupEventListeners();
            this._injectStyles();
            this.loadTemplates();
            this.startPolling();
            
            console.log('[Notifications] Initialized');
        },

        /**
         * Get authentication header
         */
        _getAuthHeader() {
            const token = localStorage.getItem('hospital_queue_token');
            return token ? { 'Authorization': `Bearer ${token}` } : {};
        },

        /**
         * Setup event listeners
         */
        _setupEventListeners() {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeNotificationsModal();
                }
            });

            window.addEventListener('openNotifications', () => {
                this.openNotificationsModal();
            });
        },

        // ===================
        // Template Management
        // ===================

        /**
         * Fetch available notification templates
         */
        async getTemplates() {
            try {
                const response = await fetch(`${this.config.apiBase}/notifications/templates`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this._getAuthHeader()
                    }
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch templates');
                }

                this.templates = data.data || {};
                return this.templates;
            } catch (err) {
                console.error('[Notifications] Failed to get templates:', err);
                this._showToast('Failed to load templates', 'error');
                return {};
            }
        },

        /**
         * Load and cache templates
         */
        async loadTemplates() {
            return this.getTemplates();
        },

        /**
         * Render templates list in UI
         */
        renderTemplates() {
            const container = document.getElementById('notification-templates');
            if (!container) return;

            if (Object.keys(this.templates).length === 0) {
                container.innerHTML = `
                    <div class="notif-empty">
                        <p>No templates available</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = Object.entries(this.templates).map(([key, template]) => `
                <div class="notif-template-item ${this.selectedTemplate === key ? 'selected' : ''}" 
                     onclick="Notifications.selectTemplate('${key}')">
                    <div class="notif-template-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                    </div>
                    <div class="notif-template-content">
                        <div class="notif-template-title">${template.title || key}</div>
                        <div class="notif-template-preview">${this._getTemplatePreview(template)}</div>
                    </div>
                    ${this.selectedTemplate === key ? '<span class="notif-selected-badge">Selected</span>' : ''}
                </div>
            `).join('');
        },

        /**
         * Get template preview text
         */
        _getTemplatePreview(template) {
            const preview = template.sms || template.whatsapp || '';
            return preview.substring(0, 60) + (preview.length > 60 ? '...' : '');
        },

        /**
         * Select a template for use
         */
        selectTemplate(id) {
            this.selectedTemplate = id;
            const template = this.templates[id];
            
            if (template) {
                // Pre-fill message fields with template content
                const smsField = document.getElementById('notif-message');
                if (smsField && template.sms) {
                    smsField.value = template.sms;
                }
                
                this.renderTemplates();
                this._showToast(`Template "${template.title || id}" selected`, 'success');
            }
        },

        // ===================
        // Sending Notifications
        // ===================

        /**
         * Send SMS notification
         */
        async sendSMS(phone, message) {
            if (!phone || !message) {
                throw new Error('Phone number and message are required');
            }

            if (message.length > this.config.maxMessageLength) {
                throw new Error(`Message exceeds ${this.config.maxMessageLength} characters`);
            }

            try {
                const response = await fetch(`${this.config.apiBase}/notifications/sms`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this._getAuthHeader()
                    },
                    body: JSON.stringify({
                        phone: phone.trim(),
                        message: message.trim(),
                        template_id: this.selectedTemplate
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || data.message || 'Failed to send SMS');
                }

                this._showToast('SMS sent successfully!', 'success');
                this.refreshNotifications();
                return data;
            } catch (err) {
                console.error('[Notifications] Failed to send SMS:', err);
                this._showToast(err.message, 'error');
                throw err;
            }
        },

        /**
         * Send WhatsApp notification
         */
        async sendWhatsApp(phone, message) {
            if (!phone || !message) {
                throw new Error('Phone number and message are required');
            }

            if (message.length > this.config.maxMessageLength) {
                throw new Error(`Message exceeds ${this.config.maxMessageLength} characters`);
            }

            try {
                const response = await fetch(`${this.config.apiBase}/notifications/whatsapp`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this._getAuthHeader()
                    },
                    body: JSON.stringify({
                        phone: phone.trim(),
                        message: message.trim(),
                        template_id: this.selectedTemplate
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || data.message || 'Failed to send WhatsApp');
                }

                this._showToast('WhatsApp message sent!', 'success');
                this.refreshNotifications();
                return data;
            } catch (err) {
                console.error('[Notifications] Failed to send WhatsApp:', err);
                this._showToast(err.message, 'error');
                throw err;
            }
        },

        // ===================
        // Notification History
        // ===================

        /**
         * Fetch notification history
         */
        async getNotifications(limit = 50) {
            try {
                const response = await fetch(`${this.config.apiBase}/notifications?limit=${limit}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this._getAuthHeader()
                    }
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch notifications');
                }

                return data;
            } catch (err) {
                console.error('[Notifications] Failed to get notifications:', err);
                return { success: false, data: [] };
            }
        },

        /**
         * Refresh notifications list
         */
        async refreshNotifications() {
            const data = await this.getNotifications();
            if (data.success && data.data) {
                this.renderNotifications(data.data);
            }
            await this.getStats().then(stats => {
                if (stats.success) {
                    this.renderStats(stats.data);
                }
            });
        },

        /**
         * Render notifications in UI
         */
        renderNotifications(notifications) {
            const container = document.getElementById('notification-history');
            if (!container) return;

            if (!notifications || notifications.length === 0) {
                container.innerHTML = `
                    <div class="notif-empty">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        <p>No notifications sent yet</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = notifications.map(notif => `
                <div class="notif-history-item ${notif.status === 'failed' ? 'failed' : ''} ${notif.status === 'delivered' ? 'delivered' : ''}">
                    <div class="notif-history-icon ${notif.type}">
                        ${this._getNotificationIcon(notif.type)}
                    </div>
                    <div class="notif-history-content">
                        <div class="notif-history-header">
                            <span class="notif-history-type">${notif.type?.toUpperCase() || 'SMS'}</span>
                            <span class="notif-history-phone">${notif.phone || 'Unknown'}</span>
                            <span class="notif-history-status ${notif.status || 'pending'}">${notif.status || 'pending'}</span>
                        </div>
                        <div class="notif-history-message">${this._escapeHtml(notif.message?.substring(0, 80) || '')}${notif.message?.length > 80 ? '...' : ''}</div>
                        <div class="notif-history-time">${this._formatTime(notif.created_at)}</div>
                    </div>
                </div>
            `).join('');
        },

        /**
         * Get notification type icon
         */
        _getNotificationIcon(type) {
            if (type === 'whatsapp') {
                return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>`;
            }
            return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>`;
        },

        // ===================
        // Statistics
        // ===================

        /**
         * Fetch notification statistics
         */
        async getStats() {
            try {
                const response = await fetch(`${this.config.apiBase}/notifications/stats`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this._getAuthHeader()
                    }
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch stats');
                }

                return data;
            } catch (err) {
                console.error('[Notifications] Failed to get stats:', err);
                return { success: false, data: null };
            }
        },

        /**
         * Render statistics cards
         */
        renderStats(stats) {
            const container = document.getElementById('notif-stats');
            if (!container || !stats) return;

            container.innerHTML = `
                <div class="notif-stat-card">
                    <div class="notif-stat-icon total">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                        </svg>
                    </div>
                    <div class="notif-stat-content">
                        <div class="notif-stat-value">${stats.total || 0}</div>
                        <div class="notif-stat-label">Total Sent</div>
                    </div>
                </div>
                <div class="notif-stat-card">
                    <div class="notif-stat-icon sms">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <div class="notif-stat-content">
                        <div class="notif-stat-value">${stats.sms_count || 0}</div>
                        <div class="notif-stat-label">SMS</div>
                    </div>
                </div>
                <div class="notif-stat-card">
                    <div class="notif-stat-icon whatsapp">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                    </div>
                    <div class="notif-stat-content">
                        <div class="notif-stat-value">${stats.whatsapp_count || 0}</div>
                        <div class="notif-stat-label">WhatsApp</div>
                    </div>
                </div>
                <div class="notif-stat-card">
                    <div class="notif-stat-icon delivered">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <div class="notif-stat-content">
                        <div class="notif-stat-value">${stats.delivered || 0}</div>
                        <div class="notif-stat-label">Delivered</div>
                    </div>
                </div>
            `;
        },

        // ===================
        // Polling
        // ===================

        /**
         * Start polling for updates
         */
        startPolling() {
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
            }

            this.pollTimer = setInterval(() => {
                this.refreshNotifications();
            }, this.config.pollInterval);
        },

        /**
         * Stop polling
         */
        stopPolling() {
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
                this.pollTimer = null;
            }
        },

        // ===================
        // Modal UI
        // ===================

        /**
         * Open notifications modal
         */
        openNotificationsModal() {
            let modal = document.getElementById('notifications-modal');
            
            if (!modal) {
                modal = this._createNotificationsModal();
                document.body.appendChild(modal);
            }

            this.renderModal();
            modal.classList.add('notif-modal-active');
            this.refreshNotifications();
        },

        /**
         * Close notifications modal
         */
        closeNotificationsModal() {
            const modal = document.getElementById('notifications-modal');
            if (modal) {
                modal.classList.remove('notif-modal-active');
            }
        },

        /**
         * Render the complete modal UI
         */
        renderModal() {
            this.renderTemplates();
            this.refreshNotifications();
        },

        /**
         * Send notification form handler
         */
        async sendNotification(type) {
            const phone = document.getElementById('notif-phone')?.value;
            const message = document.getElementById('notif-message')?.value;

            if (!phone) {
                this._showToast('Please enter a phone number', 'error');
                return;
            }

            if (!message) {
                this._showToast('Please enter a message', 'error');
                return;
            }

            const sendBtn = document.getElementById(`notif-send-${type}`);
            if (sendBtn) {
                sendBtn.disabled = true;
                sendBtn.textContent = 'Sending...';
            }

            try {
                if (type === 'whatsapp') {
                    await this.sendWhatsApp(phone, message);
                } else {
                    await this.sendSMS(phone, message);
                }

                // Clear form on success
                document.getElementById('notif-phone').value = '';
                document.getElementById('notif-message').value = '';
            } catch (err) {
                // Error already shown via toast
            } finally {
                if (sendBtn) {
                    sendBtn.disabled = false;
                    sendBtn.textContent = type === 'whatsapp' ? 'Send WhatsApp' : 'Send SMS';
                }
            }
        },

        /**
         * Replace template placeholders in message
         */
        replacePlaceholders(templateKey, replacements) {
            let template = this.templates[templateKey];
            if (!template) return '';

            let message = template.sms || template.whatsapp || '';
            
            Object.entries(replacements).forEach(([key, value]) => {
                message = message.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
            });

            return message;
        },

        // ===================
        // Utilities
        // ===================

        /**
         * Format timestamp for display
         */
        _formatTime(dateString) {
            if (!dateString) return '';
            
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            
            if (diff < 60000) return 'Just now';
            if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
            if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
            
            return date.toLocaleDateString();
        },

        /**
         * Escape HTML to prevent XSS
         */
        _escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        /**
         * Show toast notification
         */
        _showToast(message, type = 'info') {
            const existing = document.querySelector('.notif-toast');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.className = `notif-toast notif-toast-${type}`;
            toast.innerHTML = `
                <span class="notif-toast-icon">${this._getToastIcon(type)}</span>
                <span class="notif-toast-message">${this._escapeHtml(message)}</span>
            `;
            document.body.appendChild(toast);

            setTimeout(() => toast.classList.add('show'), 10);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        },

        /**
         * Get toast icon based on type
         */
        _getToastIcon(type) {
            switch (type) {
                case 'success':
                    return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                case 'error':
                    return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
                default:
                    return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
            }
        },

        /**
         * Create notifications modal DOM
         */
        _createNotificationsModal() {
            const modal = document.createElement('div');
            modal.id = 'notifications-modal';
            modal.className = 'notif-modal';
            modal.innerHTML = `
                <div class="notif-modal-content">
                    <div class="notif-modal-header">
                        <div class="notif-modal-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            <h2>Notifications</h2>
                        </div>
                        <button onclick="Notifications.closeNotificationsModal()" class="notif-close-btn">&times;</button>
                    </div>
                    
                    <div class="notif-modal-body">
                        <!-- Stats Section -->
                        <div id="notif-stats" class="notif-stats-grid"></div>
                        
                        <!-- Tabs -->
                        <div class="notif-tabs">
                            <button class="notif-tab active" onclick="Notifications.switchTab('send')">Send</button>
                            <button class="notif-tab" onclick="Notifications.switchTab('templates')">Templates</button>
                            <button class="notif-tab" onclick="Notifications.switchTab('history')">History</button>
                        </div>
                        
                        <!-- Send Tab -->
                        <div id="notif-tab-send" class="notif-tab-content active">
                            <div class="notif-form">
                                <div class="notif-form-group">
                                    <label for="notif-phone">Phone Number</label>
                                    <input type="tel" id="notif-phone" placeholder="+254700000000" />
                                </div>
                                <div class="notif-form-group">
                                    <label for="notif-message">Message</label>
                                    <textarea id="notif-message" placeholder="Type your message..." rows="4"></textarea>
                                    <span class="notif-char-count"><span id="notif-char-count">0</span>/${this.config.maxMessageLength}</span>
                                </div>
                                <div class="notif-form-actions">
                                    <button id="notif-send-sms" class="notif-btn notif-btn-sms" onclick="Notifications.sendNotification('sms')">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                        </svg>
                                        Send SMS
                                    </button>
                                    <button id="notif-send-whatsapp" class="notif-btn notif-btn-whatsapp" onclick="Notifications.sendNotification('whatsapp')">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                        </svg>
                                        Send WhatsApp
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Templates Tab -->
                        <div id="notif-tab-templates" class="notif-tab-content">
                            <div id="notification-templates" class="notif-templates-list"></div>
                        </div>
                        
                        <!-- History Tab -->
                        <div id="notif-tab-history" class="notif-tab-content">
                            <div class="notif-history-actions">
                                <button class="notif-btn-refresh" onclick="Notifications.refreshNotifications()">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="23 4 23 10 17 10"></polyline>
                                        <polyline points="1 20 1 14 7 14"></polyline>
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                    </svg>
                                    Refresh
                                </button>
                            </div>
                            <div id="notification-history" class="notif-history-list"></div>
                        </div>
                    </div>
                </div>
            `;

            // Setup character counter
            setTimeout(() => {
                const messageField = document.getElementById('notif-message');
                const charCount = document.getElementById('notif-char-count');
                if (messageField && charCount) {
                    messageField.addEventListener('input', () => {
                        charCount.textContent = messageField.value.length;
                    });
                }
            }, 100);

            return modal;
        },

        /**
         * Switch between tabs
         */
        switchTab(tabName) {
            document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.notif-tab-content').forEach(c => c.classList.remove('active'));
            
            document.querySelector(`.notif-tab[onclick*="${tabName}"]`)?.classList.add('active');
            document.getElementById(`notif-tab-${tabName}`)?.classList.add('active');
            
            if (tabName === 'templates') {
                this.loadTemplates().then(() => this.renderTemplates());
            }
        },

        // ===================
        // Styles
        // ===================

        /**
         * Inject CSS styles
         */
        _injectStyles() {
            if (document.getElementById('notifications-styles')) return;

            const styles = document.createElement('style');
            styles.id = 'notifications-styles';
            styles.textContent = this._getStyles();
            document.head.appendChild(styles);
        },

        /**
         * Get all CSS styles
         */
        _getStyles() {
            return `
                /* Modal Base */
                .notif-modal {
                    display: none;
                    position: fixed;
                    inset: 0;
                    z-index: 9998;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(8px);
                }

                .notif-modal-active {
                    display: flex !important;
                }

                .notif-modal-content {
                    background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
                    border-radius: 20px;
                    width: 100%;
                    max-width: 650px;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: 
                        0 25px 50px -12px rgba(0, 0, 0, 0.5),
                        0 0 0 1px rgba(255, 255, 255, 0.1),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                }

                .notif-modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px 24px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    background: rgba(255, 255, 255, 0.03);
                }

                .notif-modal-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: white;
                }

                .notif-modal-title h2 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 600;
                    background: linear-gradient(135deg, #60a5fa, #a78bfa);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .notif-close-btn {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    border-radius: 10px;
                    padding: 10px 14px;
                    color: rgba(255, 255, 255, 0.7);
                    cursor: pointer;
                    font-size: 24px;
                    transition: all 0.2s;
                    line-height: 1;
                }

                .notif-close-btn:hover {
                    background: rgba(239, 68, 68, 0.3);
                    color: white;
                }

                .notif-modal-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px 24px;
                }

                /* Stats Grid */
                .notif-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 12px;
                    margin-bottom: 20px;
                }

                .notif-stat-card {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 14px;
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    transition: all 0.3s;
                }

                .notif-stat-card:hover {
                    background: rgba(255, 255, 255, 0.08);
                    transform: translateY(-2px);
                }

                .notif-stat-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .notif-stat-icon.total {
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    color: white;
                }

                .notif-stat-icon.sms {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                }

                .notif-stat-icon.whatsapp {
                    background: linear-gradient(135deg, #22c55e, #16a34a);
                    color: white;
                }

                .notif-stat-icon.delivered {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                }

                .notif-stat-content {
                    flex: 1;
                }

                .notif-stat-value {
                    font-size: 22px;
                    font-weight: 700;
                    color: white;
                    line-height: 1.2;
                }

                .notif-stat-label {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.5);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                /* Tabs */
                .notif-tabs {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 20px;
                    background: rgba(255, 255, 255, 0.05);
                    padding: 6px;
                    border-radius: 12px;
                }

                .notif-tab {
                    flex: 1;
                    padding: 10px 16px;
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .notif-tab:hover {
                    color: white;
                    background: rgba(255, 255, 255, 0.05);
                }

                .notif-tab.active {
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    color: white;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }

                .notif-tab-content {
                    display: none;
                }

                .notif-tab-content.active {
                    display: block;
                }

                /* Form Styles */
                .notif-form {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    padding: 20px;
                }

                .notif-form-group {
                    margin-bottom: 16px;
                    position: relative;
                }

                .notif-form-group label {
                    display: block;
                    font-size: 13px;
                    font-weight: 500;
                    color: rgba(255, 255, 255, 0.7);
                    margin-bottom: 8px;
                }

                .notif-form-group input,
                .notif-form-group textarea {
                    width: 100%;
                    padding: 12px 16px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    color: white;
                    font-size: 14px;
                    transition: all 0.2s;
                }

                .notif-form-group input:focus,
                .notif-form-group textarea:focus {
                    outline: none;
                    border-color: #3b82f6;
                    background: rgba(59, 130, 246, 0.1);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
                }

                .notif-form-group input::placeholder,
                .notif-form-group textarea::placeholder {
                    color: rgba(255, 255, 255, 0.3);
                }

                .notif-form-group textarea {
                    resize: vertical;
                    min-height: 100px;
                }

                .notif-char-count {
                    position: absolute;
                    right: 12px;
                    bottom: 12px;
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.4);
                }

                .notif-form-actions {
                    display: flex;
                    gap: 12px;
                    margin-top: 20px;
                }

                .notif-btn {
                    flex: 1;
                    padding: 14px 20px;
                    border: none;
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.3s;
                }

                .notif-btn-sms {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                }

                .notif-btn-sms:hover {
                    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
                    transform: translateY(-2px);
                }

                .notif-btn-whatsapp {
                    background: linear-gradient(135deg, #22c55e, #16a34a);
                    color: white;
                }

                .notif-btn-whatsapp:hover {
                    box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
                    transform: translateY(-2px);
                }

                .notif-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none !important;
                }

                /* Templates List */
                .notif-templates-list {
                    max-height: 400px;
                    overflow-y: auto;
                }

                .notif-template-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                    padding: 16px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 14px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                    position: relative;
                }

                .notif-template-item:hover {
                    background: rgba(255, 255, 255, 0.06);
                    border-color: rgba(59, 130, 246, 0.3);
                }

                .notif-template-item.selected {
                    background: rgba(59, 130, 246, 0.15);
                    border-color: #3b82f6;
                }

                .notif-template-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    flex-shrink: 0;
                }

                .notif-template-content {
                    flex: 1;
                    min-width: 0;
                }

                .notif-template-title {
                    font-weight: 600;
                    color: white;
                    margin-bottom: 4px;
                }

                .notif-template-preview {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.5);
                    line-height: 1.4;
                }

                .notif-selected-badge {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    padding: 4px 10px;
                    background: #3b82f6;
                    color: white;
                    font-size: 11px;
                    font-weight: 600;
                    border-radius: 6px;
                }

                /* History List */
                .notif-history-actions {
                    margin-bottom: 16px;
                }

                .notif-btn-refresh {
                    padding: 8px 16px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 13px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s;
                }

                .notif-btn-refresh:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                }

                .notif-history-list {
                    max-height: 350px;
                    overflow-y: auto;
                }

                .notif-history-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                    padding: 14px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 12px;
                    margin-bottom: 8px;
                    transition: all 0.2s;
                }

                .notif-history-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                }

                .notif-history-item.delivered {
                    border-left: 3px solid #22c55e;
                }

                .notif-history-item.failed {
                    border-left: 3px solid #ef4444;
                }

                .notif-history-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .notif-history-icon.sms {
                    background: rgba(16, 185, 129, 0.2);
                    color: #10b981;
                }

                .notif-history-icon.whatsapp {
                    background: rgba(34, 197, 94, 0.2);
                    color: #22c55e;
                }

                .notif-history-content {
                    flex: 1;
                    min-width: 0;
                }

                .notif-history-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 6px;
                    flex-wrap: wrap;
                }

                .notif-history-type {
                    font-size: 11px;
                    font-weight: 700;
                    padding: 3px 8px;
                    border-radius: 4px;
                    background: rgba(59, 130, 246, 0.2);
                    color: #60a5fa;
                }

                .notif-history-phone {
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.8);
                    font-weight: 500;
                }

                .notif-history-status {
                    font-size: 11px;
                    padding: 3px 8px;
                    border-radius: 4px;
                    margin-left: auto;
                }

                .notif-history-status.pending {
                    background: rgba(245, 158, 11, 0.2);
                    color: #fbbf24;
                }

                .notif-history-status.delivered {
                    background: rgba(34, 197, 94, 0.2);
                    color: #4ade80;
                }

                .notif-history-status.failed {
                    background: rgba(239, 68, 68, 0.2);
                    color: #f87171;
                }

                .notif-history-message {
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.6);
                    line-height: 1.4;
                    margin-bottom: 6px;
                }

                .notif-history-time {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.4);
                }

                /* Empty State */
                .notif-empty {
                    text-align: center;
                    padding: 40px 20px;
                    color: rgba(255, 255, 255, 0.4);
                }

                .notif-empty svg {
                    margin-bottom: 12px;
                    opacity: 0.5;
                }

                .notif-empty p {
                    margin: 0;
                    font-size: 14px;
                }

                /* Toast Notifications */
                .notif-toast {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    padding: 14px 20px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 14px;
                    z-index: 9999;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: all 0.3s ease;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                }

                .notif-toast.show {
                    opacity: 1;
                    transform: translateY(0);
                }

                .notif-toast-success {
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95));
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .notif-toast-error {
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95));
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .notif-toast-info {
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(37, 99, 235, 0.95));
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .notif-toast-icon {
                    display: flex;
                    align-items: center;
                }

                /* Responsive */
                @media (max-width: 640px) {
                    .notif-modal-content {
                        margin: 16px;
                        max-height: calc(100vh - 32px);
                    }

                    .notif-stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }

                    .notif-form-actions {
                        flex-direction: column;
                    }

                    .notif-tabs {
                        flex-direction: column;
                    }
                }
            `;
        }
    };

    // Expose globally
    window.Notifications = Notifications;
})();
