/**
 * Hospital Queue System - Messaging Module
 * Handles internal messaging between staff members
 */

(function() {
    'use strict';

    const Messaging = {
        config: {
            apiBase: '/api',
            pollInterval: 10000,
            maxSubjectLength: 200,
            maxContentLength: 5000
        },

        currentUser: null,
        pollTimer: null,
        unreadCount: 0,

        init(options = {}) {
            this.config = { ...this.config, ...options };
            
            if (options.userId && options.userName) {
                this.currentUser = {
                    id: options.userId,
                    name: options.userName,
                    role: options.userRole || 'staff'
                };
            }

            this._setupEventListeners();
            this._injectStyles();
            this.startPolling();
            
            console.log('[Messaging] Initialized', this.currentUser);
        },

        _getAuthHeader() {
            const token = localStorage.getItem('hospital_queue_token');
            return token ? { 'Authorization': `Bearer ${token}` } : {};
        },

        _setupEventListeners() {
            document.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                
                if (e.key === 'Escape') {
                    this.closeMessagesModal();
                }
            });

            window.addEventListener('openMessages', () => {
                this.openMessagesModal();
            });
        },

        async sendMessage(options) {
            const { recipientId, subject, content, type = 'direct', departmentId, priority = 'normal' } = options;

            if (!content || content.trim().length === 0) {
                throw new Error('Message content is required');
            }

            if (content.length > this.config.maxContentLength) {
                throw new Error(`Message content exceeds ${this.config.maxContentLength} characters`);
            }

            try {
                const response = await fetch(`${this.config.apiBase}/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this._getAuthHeader()
                    },
                    body: JSON.stringify({
                        recipient_id: recipientId,
                        subject: subject || '',
                        content: content.trim(),
                        type,
                        department_id: departmentId,
                        priority
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || data.message || 'Failed to send message');
                }

                return data;
            } catch (err) {
                console.error('[Messaging] Failed to send message:', err);
                throw err;
            }
        },

        async getMessages(options = {}) {
            const { limit = 50, offset = 0, unreadOnly = false } = options;

            try {
                let url = `${this.config.apiBase}/messages?limit=${limit}&offset=${offset}`;
                if (unreadOnly) {
                    url += '&unread=true';
                }

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this._getAuthHeader()
                    }
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch messages');
                }

                return data;
            } catch (err) {
                console.error('[Messaging] Failed to get messages:', err);
                throw err;
            }
        },

        async getMessage(id) {
            try {
                const response = await fetch(`${this.config.apiBase}/messages/${id}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this._getAuthHeader()
                    }
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch message');
                }

                return data;
            } catch (err) {
                console.error('[Messaging] Failed to get message:', err);
                throw err;
            }
        },

        async markAsRead(id) {
            try {
                const response = await fetch(`${this.config.apiBase}/messages/${id}/read`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this._getAuthHeader()
                    }
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to mark message as read');
                }

                this.updateBadge();
                return data;
            } catch (err) {
                console.error('[Messaging] Failed to mark as read:', err);
                throw err;
            }
        },

        async getUnreadCount() {
            try {
                const response = await fetch(`${this.config.apiBase}/messages/unread-count`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this._getAuthHeader()
                    }
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    this.unreadCount = data.data || 0;
                    return this.unreadCount;
                }

                return 0;
            } catch (err) {
                return 0;
            }
        },

        async broadcastToDepartment(departmentId, subject, content, priority = 'normal') {
            return this.sendMessage({
                subject,
                content,
                type: 'department',
                departmentId,
                priority
            });
        },

        updateBadge() {
            this.getUnreadCount().then(count => {
                const badge = document.getElementById('messaging-badge');
                if (badge) {
                    if (count > 0) {
                        badge.textContent = count > 99 ? '99+' : count;
                        badge.style.display = 'flex';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            });
        },

        startPolling() {
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
            }

            this.updateBadge();

            this.pollTimer = setInterval(() => {
                this.updateBadge();
            }, this.config.pollInterval);
        },

        stopPolling() {
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
                this.pollTimer = null;
            }
        },

        openMessagesModal() {
            let modal = document.getElementById('messaging-modal');
            
            if (!modal) {
                modal = this._createMessagesModal();
                document.body.appendChild(modal);
            }

            this._loadMessagesList();
            modal.classList.add('messaging-modal-active');
        },

        closeMessagesModal() {
            const modal = document.getElementById('messaging-modal');
            if (modal) {
                modal.classList.remove('messaging-modal-active');
            }
        },

        async _loadMessagesList() {
            const container = document.getElementById('messaging-list');
            if (!container) return;

            container.innerHTML = '<div class="messaging-loading"><div class="spinner"></div><p>Loading messages...</p></div>';

            try {
                const data = await this.getMessages({ limit: 50 });
                
                if (data.success && data.data && data.data.length > 0) {
                    this._renderMessages(data.data);
                } else {
                    container.innerHTML = '<div class="messaging-empty"><p>No messages yet</p></div>';
                }
            } catch (err) {
                container.innerHTML = '<div class="messaging-empty"><p>Failed to load messages</p></div>';
            }
        },

        _renderMessages(messages) {
            const container = document.getElementById('messaging-list');
            if (!container) return;

            container.innerHTML = messages.map(msg => `
                <div class="messaging-item ${msg.is_read ? '' : 'unread'} ${msg.priority === 'urgent' ? 'priority-urgent' : ''} ${msg.priority === 'emergency' ? 'priority-emergency' : ''}" onclick="Messaging.openMessageDetail('${msg.id}')">
                    <div class="messaging-item-header">
                        <div class="messaging-sender">${msg.sender_name || 'System'}</div>
                        <div class="messaging-time">${this._formatTime(msg.created_at)}</div>
                    </div>
                    ${msg.subject ? `<div class="messaging-subject">${this._escapeHtml(msg.subject)}</div>` : ''}
                    <div class="messaging-preview">${this._escapeHtml(msg.content.substring(0, 100))}${msg.content.length > 100 ? '...' : ''}</div>
                    ${msg.priority !== 'normal' ? `<span class="messaging-priority-badge ${msg.priority}">${msg.priority}</span>` : ''}
                </div>
            `).join('');
        },

        async openMessageDetail(id) {
            const modal = document.getElementById('messaging-detail-modal');
            const content = document.getElementById('messaging-detail-content');

            if (!modal || !content) return;

            try {
                const data = await this.getMessage(id);
                
                if (data.success && data.data) {
                    const msg = data.data;
                    content.innerHTML = `
                        <div class="messaging-detail-header">
                            <div class="messaging-detail-from">
                                <strong>From:</strong> ${msg.sender_name || 'System'}
                            </div>
                            <div class="messaging-detail-time">
                                ${new Date(msg.created_at).toLocaleString()}
                            </div>
                        </div>
                        ${msg.subject ? `<div class="messaging-detail-subject"><strong>Subject:</strong> ${this._escapeHtml(msg.subject)}</div>` : ''}
                        ${msg.priority !== 'normal' ? `<div class="messaging-detail-priority"><span class="messaging-priority-badge ${msg.priority}">${msg.priority.toUpperCase()}</span></div>` : ''}
                        <div class="messaging-detail-body">${this._escapeHtml(msg.content).replace(/\n/g, '<br>')}</div>
                        <div class="messaging-detail-actions">
                            <button class="btn btn-secondary" onclick="Messaging.replyToMessage('${msg.sender_id}', '${this._escapeHtml(msg.sender_name)}')">↩️ Reply</button>
                        </div>
                    `;
                    
                    if (!msg.is_read) {
                        await this.markAsRead(id);
                        this._loadMessagesList();
                    }
                }
            } catch (err) {
                content.innerHTML = '<p>Failed to load message</p>';
            }

            modal.classList.add('messaging-modal-active');
        },

        closeMessageDetail() {
            const modal = document.getElementById('messaging-detail-modal');
            if (modal) {
                modal.classList.remove('messaging-modal-active');
            }
        },

        openComposeModal() {
            this.closeMessagesModal();
            
            let modal = document.getElementById('messaging-compose-modal');
            
            if (!modal) {
                modal = this._createComposeModal();
                document.body.appendChild(modal);
            }

            modal.classList.add('messaging-modal-active');
        },

        closeComposeModal() {
            const modal = document.getElementById('messaging-compose-modal');
            if (modal) {
                modal.classList.remove('messaging-modal-active');
            }
        },

        async replyToMessage(senderId, senderName) {
            this.closeMessageDetail();
            this.openComposeModal();
            
            setTimeout(() => {
                const recipientInput = document.getElementById('msg-recipient-id');
                const recipientDisplay = document.getElementById('msg-recipient-display');
                if (recipientInput) recipientInput.value = senderId;
                if (recipientDisplay) recipientDisplay.textContent = `To: ${senderName}`;
            }, 100);
        },

        async loadStaffForSelect() {
            const select = document.getElementById('msg-recipient');
            if (!select) return;

            try {
                const response = await fetch(`${this.config.apiBase}/users`, {
                    headers: { ...this._getAuthHeader() }
                });
                const data = await response.json();

                if (data.success && data.data) {
                    const currentUserId = this.currentUser?.id;
                    const otherUsers = data.data.filter(u => u.id !== currentUserId);
                    
                    select.innerHTML = '<option value="">Select recipient...</option>' +
                        otherUsers.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('');
                }
            } catch (err) {
                console.error('[Messaging] Failed to load staff:', err);
            }
        },

        async loadDepartmentsForSelect() {
            const select = document.getElementById('msg-department');
            if (!select) return;

            try {
                const response = await fetch(`${this.config.apiBase}/departments`);
                const data = await response.json();

                if (data.success && data.data) {
                    select.innerHTML = '<option value="">Select department...</option>' +
                        data.data.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
                }
            } catch (err) {
                console.error('[Messaging] Failed to load departments:', err);
            }
        },

        async sendDirectMessage() {
            const recipientId = document.getElementById('msg-recipient')?.value;
            const subject = document.getElementById('msg-subject')?.value || '';
            const content = document.getElementById('msg-content')?.value;
            const priority = document.getElementById('msg-priority')?.value || 'normal';

            if (!recipientId) {
                alert('Please select a recipient');
                return;
            }

            if (!content || content.trim().length === 0) {
                alert('Please enter a message');
                return;
            }

            try {
                await this.sendMessage({
                    recipientId,
                    subject,
                    content,
                    priority,
                    type: 'direct'
                });

                this.closeComposeModal();
                this._showNotification('Message sent successfully!', 'success');
            } catch (err) {
                this._showNotification('Failed to send message: ' + err.message, 'error');
            }
        },

        async sendDepartmentBroadcast() {
            const departmentId = document.getElementById('msg-department')?.value;
            const subject = document.getElementById('msg-subject')?.value || '';
            const content = document.getElementById('msg-content')?.value;
            const priority = document.getElementById('msg-priority')?.value || 'normal';

            if (!departmentId) {
                alert('Please select a department');
                return;
            }

            if (!content || content.trim().length === 0) {
                alert('Please enter a message');
                return;
            }

            try {
                await this.broadcastToDepartment(departmentId, subject, content, priority);
                this.closeComposeModal();
                this._showNotification('Broadcast sent successfully!', 'success');
            } catch (err) {
                this._showNotification('Failed to send broadcast: ' + err.message, 'error');
            }
        },

        _showNotification(message, type) {
            const existing = document.querySelector('.messaging-toast');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.className = `messaging-toast messaging-toast-${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => toast.classList.add('show'), 10);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },

        _formatTime(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            
            if (diff < 60000) return 'Just now';
            if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
            if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
            
            return date.toLocaleDateString();
        },

        _escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        _createMessagesModal() {
            const modal = document.createElement('div');
            modal.id = 'messaging-modal';
            modal.className = 'messaging-modal';
            modal.innerHTML = `
                <div class="messaging-modal-content">
                    <div class="messaging-modal-header">
                        <div class="messaging-modal-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            <h2>Messages</h2>
                        </div>
                        <button onclick="Messaging.closeMessagesModal()" class="messaging-close-btn">&times;</button>
                    </div>
                    <div class="messaging-modal-toolbar">
                        <button class="btn btn-primary btn-sm" onclick="Messaging.openComposeModal()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            New Message
                        </button>
                    </div>
                    <div id="messaging-list" class="messaging-list"></div>
                </div>
            `;
            return modal;
        },

        _createMessageDetailModal() {
            const modal = document.createElement('div');
            modal.id = 'messaging-detail-modal';
            modal.className = 'messaging-modal';
            modal.innerHTML = `
                <div class="messaging-modal-content messaging-modal-detail">
                    <div class="messaging-modal-header">
                        <div class="messaging-modal-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            <h2>Message</h2>
                        </div>
                        <button onclick="Messaging.closeMessageDetail()" class="messaging-close-btn">&times;</button>
                    </div>
                    <div id="messaging-detail-content" class="messaging-detail-content"></div>
                </div>
            `;
            return modal;
        },

        _createComposeModal() {
            const modal = document.createElement('div');
            modal.id = 'messaging-compose-modal';
            modal.className = 'messaging-modal';
            modal.innerHTML = `
                <div class="messaging-modal-content messaging-modal-compose">
                    <div class="messaging-modal-header">
                        <div class="messaging-modal-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            <h2>Compose Message</h2>
                        </div>
                        <button onclick="Messaging.closeComposeModal()" class="messaging-close-btn">&times;</button>
                    </div>
                    <div class="messaging-compose-tabs">
                        <button class="messaging-tab active" onclick="Messaging.switchComposeTab('direct')">Direct</button>
                        <button class="messaging-tab" onclick="Messaging.switchComposeTab('broadcast')">Department</button>
                    </div>
                    <div id="msg-direct-form" class="messaging-compose-form">
                        <div class="form-group">
                            <label>Recipient</label>
                            <select id="msg-recipient" onchange="Messaging.onRecipientSelect(this.value)">
                                <option value="">Select recipient...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Priority</label>
                            <select id="msg-priority">
                                <option value="normal">Normal</option>
                                <option value="urgent">Urgent</option>
                                <option value="emergency">Emergency</option>
                            </select>
                        </div>
                    </div>
                    <div id="msg-broadcast-form" class="messaging-compose-form" style="display: none;">
                        <div class="form-group">
                            <label>Department</label>
                            <select id="msg-department">
                                <option value="">Select department...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Priority</label>
                            <select id="msg-priority">
                                <option value="normal">Normal</option>
                                <option value="urgent">Urgent</option>
                                <option value="emergency">Emergency</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Subject (optional)</label>
                        <input type="text" id="msg-subject" placeholder="Enter subject...">
                    </div>
                    <div class="form-group">
                        <label>Message</label>
                        <textarea id="msg-content" placeholder="Type your message..." rows="6"></textarea>
                    </div>
                    <div class="messaging-compose-actions">
                        <button class="btn btn-secondary" onclick="Messaging.closeComposeModal()">Cancel</button>
                        <button id="msg-send-btn" class="btn btn-primary" onclick="Messaging.sendDirectMessage()">Send Message</button>
                    </div>
                </div>
            `;

            setTimeout(() => {
                this.loadStaffForSelect();
                this.loadDepartmentsForSelect();
            }, 100);

            return modal;
        },

        switchComposeTab(tab) {
            document.querySelectorAll('.messaging-tab').forEach(t => t.classList.remove('active'));
            event.target.classList.add('active');

            const directForm = document.getElementById('msg-direct-form');
            const broadcastForm = document.getElementById('msg-broadcast-form');
            const sendBtn = document.getElementById('msg-send-btn');

            if (tab === 'direct') {
                directForm.style.display = 'block';
                broadcastForm.style.display = 'none';
                sendBtn.textContent = 'Send Message';
                sendBtn.onclick = () => this.sendDirectMessage();
            } else {
                directForm.style.display = 'none';
                broadcastForm.style.display = 'block';
                sendBtn.textContent = 'Send Broadcast';
                sendBtn.onclick = () => this.sendDepartmentBroadcast();
            }
        },

        onRecipientSelect(value) {
            const display = document.getElementById('msg-recipient-display');
            if (display) {
                display.textContent = value ? `To: ${value}` : '';
            }
        },

        _injectStyles() {
            if (document.getElementById('messaging-styles')) return;

            const styles = document.createElement('style');
            styles.id = 'messaging-styles';
            styles.textContent = this._getStyles();
            document.head.appendChild(styles);
        },

        _getStyles() {
            return `
                .messaging-modal {
                    display: none;
                    position: fixed;
                    inset: 0;
                    z-index: 9998;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                }

                .messaging-modal-active {
                    display: flex !important;
                }

                .messaging-modal-content {
                    background: #1f2937;
                    border-radius: 16px;
                    width: 100%;
                    max-width: 600px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }

                .messaging-modal-detail {
                    max-width: 700px;
                }

                .messaging-modal-compose {
                    max-width: 500px;
                }

                .messaging-modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .messaging-modal-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: white;
                }

                .messaging-modal-title h2 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                }

                .messaging-close-btn {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    border-radius: 8px;
                    padding: 8px 12px;
                    color: rgba(255, 255, 255, 0.7);
                    cursor: pointer;
                    font-size: 20px;
                    transition: all 0.2s;
                }

                .messaging-close-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                }

                .messaging-modal-toolbar {
                    padding: 12px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    gap: 8px;
                }

                .messaging-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                }

                .messaging-item {
                    padding: 14px 16px;
                    border-radius: 10px;
                    margin-bottom: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid transparent;
                    position: relative;
                }

                .messaging-item:hover {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(59, 130, 246, 0.3);
                }

                .messaging-item.unread {
                    background: rgba(59, 130, 246, 0.1);
                    border-color: rgba(59, 130, 246, 0.3);
                }

                .messaging-item.priority-urgent {
                    border-left: 3px solid #f59e0b;
                }

                .messaging-item.priority-emergency {
                    border-left: 3px solid #ef4444;
                    animation: pulse-emergency 2s infinite;
                }

                @keyframes pulse-emergency {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
                    50% { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
                }

                .messaging-item-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 6px;
                }

                .messaging-sender {
                    font-weight: 600;
                    font-size: 14px;
                }

                .messaging-time {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.5);
                }

                .messaging-subject {
                    font-weight: 500;
                    margin-bottom: 4px;
                    color: #93c5fd;
                }

                .messaging-preview {
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.7);
                    line-height: 1.4;
                }

                .messaging-priority-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    margin-top: 8px;
                }

                .messaging-priority-badge.urgent {
                    background: rgba(245, 158, 11, 0.2);
                    color: #fcd34d;
                }

                .messaging-priority-badge.emergency {
                    background: rgba(239, 68, 68, 0.2);
                    color: #fca5a5;
                }

                .messaging-empty {
                    text-align: center;
                    padding: 40px;
                    color: rgba(255, 255, 255, 0.5);
                }

                .messaging-loading {
                    text-align: center;
                    padding: 40px;
                    color: rgba(255, 255, 255, 0.5);
                }

                .messaging-detail-content {
                    padding: 20px;
                    overflow-y: auto;
                }

                .messaging-detail-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .messaging-detail-from {
                    font-size: 14px;
                }

                .messaging-detail-time {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.5);
                }

                .messaging-detail-subject {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 12px;
                    color: #93c5fd;
                }

                .messaging-detail-priority {
                    margin-bottom: 12px;
                }

                .messaging-detail-body {
                    font-size: 14px;
                    line-height: 1.6;
                    white-space: pre-wrap;
                    color: rgba(255, 255, 255, 0.9);
                }

                .messaging-detail-actions {
                    margin-top: 20px;
                    padding-top: 16px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .messaging-compose-tabs {
                    display: flex;
                    padding: 12px 20px;
                    gap: 8px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .messaging-tab {
                    padding: 8px 16px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .messaging-tab:hover {
                    background: rgba(255, 255, 255, 0.1);
                }

                .messaging-tab.active {
                    background: var(--primary, #3b82f6);
                    border-color: var(--primary, #3b82f6);
                    color: white;
                }

                .messaging-compose-form {
                    padding: 16px 20px;
                }

                .messaging-compose-form .form-group {
                    margin-bottom: 14px;
                }

                .messaging-compose-form .form-group label {
                    display: block;
                    font-size: 13px;
                    font-weight: 500;
                    color: rgba(255, 255, 255, 0.7);
                    margin-bottom: 6px;
                }

                .messaging-compose-form .form-group input,
                .messaging-compose-form .form-group select,
                .messaging-compose-form .form-group textarea {
                    width: 100%;
                    padding: 10px 14px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    color: white;
                    font-size: 14px;
                }

                .messaging-compose-form .form-group input:focus,
                .messaging-compose-form .form-group select:focus,
                .messaging-compose-form .form-group textarea:focus {
                    outline: none;
                    border-color: var(--primary, #3b82f6);
                    background: rgba(59, 130, 246, 0.1);
                }

                .messaging-compose-form .form-group textarea {
                    resize: vertical;
                    min-height: 100px;
                }

                .messaging-compose-actions {
                    padding: 16px 20px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }

                .messaging-toast {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    padding: 14px 20px;
                    border-radius: 10px;
                    font-size: 14px;
                    z-index: 9999;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: all 0.3s ease;
                }

                .messaging-toast.show {
                    opacity: 1;
                    transform: translateY(0);
                }

                .messaging-toast-success {
                    background: rgba(16, 185, 129, 0.9);
                    color: white;
                }

                .messaging-toast-error {
                    background: rgba(239, 68, 68, 0.9);
                    color: white;
                }

                #messaging-badge {
                    position: absolute;
                    top: -6px;
                    right: -6px;
                    background: #ef4444;
                    color: white;
                    font-size: 10px;
                    font-weight: 700;
                    min-width: 18px;
                    height: 18px;
                    border-radius: 9px;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    padding: 0 5px;
                }
            `;
        }
    };

    window.Messaging = Messaging;
})();
