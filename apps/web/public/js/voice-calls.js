/**
 * Voice Calls Module for Static HTML
 * 
 * A vanilla JavaScript implementation for voice calling functionality
 * that can be used in static HTML pages served by nginx.
 * 
 * Usage:
 *   <script src="/js/api.js"></script>
 *   <script src="/js/voice-calls.js"></script>
 *   <script>
 *     VoiceCalls.init({
 *       userId: 'user-123',
 *       userName: 'Dr. Smith',
 *       userRole: 'doctor'
 *     });
 *   </script>
 */

(function() {
    'use strict';

    const VoiceCalls = {
        // Configuration
        config: {
            // Use relative path for nginx proxy
            apiBase: '/api',
            pollInterval: 5000, // 5 seconds for incoming call polling
            stunServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ],
            autoDeclineAfter: 30 // seconds
        },

        // Current user state
        currentUser: null,

        // Call state
        isInCall: false,
        isRinging: false,
        currentCall: null,
        incomingCall: null,

        // WebRTC
        peerConnection: null,
        localStream: null,
        remoteStream: null,
        audioElements: {},

        // Polling
        pollTimer: null,
        callDurationTimer: null,
        callStartTime: null,

        // Ringtone
        ringtone: null,
        ringtoneInterval: null,

        /**
         * Initialize the voice calls module
         * @param {Object} options - Configuration options
         * @param {string} options.apiBase - API base URL
         * @param {string} options.userId - Current user ID
         * @param {string} options.userName - Current user name
         * @param {string} options.userRole - Current user role
         */
        init(options = {}) {
            // Merge options with defaults
            this.config = { ...this.config, ...options };

            // Set current user
            if (options.userId && options.userName) {
                this.currentUser = {
                    id: options.userId,
                    name: options.userName,
                    role: options.userRole || 'staff'
                };
            }

            // Create audio elements
            this._createAudioElements();

            // Setup event listeners
            this._setupEventListeners();

            // Start polling for incoming calls
            this._startIncomingCallPolling();

            console.log('[VoiceCalls] Initialized', this.currentUser);
        },

        /**
         * Create necessary audio elements
         */
        _createAudioElements() {
            // Remote audio (for hearing the other party)
            this.audioElements.remote = document.createElement('audio');
            this.audioElements.remote.id = 'voice-calls-remote-audio';
            this.audioElements.remote.autoplay = true;
            this.audioElements.remote.style.display = 'none';
            document.body.appendChild(this.audioElements.remote);

            // Create inline ringtone (base64 encoded short beep)
            // This avoids needing external audio files
            const ringtoneData = this._createRingtoneData();
            this.ringtone = new Audio(ringtoneData);
            this.ringtone.loop = true;
        },

        /**
         * Generate simple ringtone as base64 data URL
         */
        _createRingtoneData() {
            // Simple ringtone using Web Audio API would be better,
            // but for simplicity using a minimal WAV data URL
            return 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqF';
        },

        /**
         * Setup event listeners for keyboard shortcuts and custom events
         */
        _setupEventListeners() {
            // Keyboard shortcuts during call
            document.addEventListener('keydown', (e) => {
                if (!this.isInCall) return;
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                switch(e.key.toLowerCase()) {
                    case 'm':
                        this.toggleMute();
                        break;
                    case 'h':
                        this.toggleHold();
                        break;
                    case 'escape':
                        this.endCall();
                        break;
                }
            });

            // Custom event to open staff directory
            window.addEventListener('openVoiceCall', () => {
                this.openStaffDirectory();
            });

            // Listen for call-initiated events
            window.addEventListener('callInitiated', (e) => {
                if (e.detail) {
                    console.log('[VoiceCalls] Call initiated event:', e.detail);
                }
            });
        },

        /**
         * Start polling for incoming calls
         */
        _startIncomingCallPolling() {
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
            }

            this.pollTimer = setInterval(async () => {
                await this._checkForIncomingCalls();
            }, this.config.pollInterval);
        },

        /**
         * Stop polling
         */
        _stopIncomingCallPolling() {
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
                this.pollTimer = null;
            }
        },

        /**
         * Get auth token
         */
        _getAuthHeader() {
            const token = localStorage.getItem('hospital_queue_token');
            return token ? { 'Authorization': `Bearer ${token}` } : {};
        },

        /**
         * Check for incoming calls via API
         */
        async _checkForIncomingCalls() {
            if (!this.currentUser || this.isInCall || this.isRinging) return;

            try {
                const response = await fetch(
                    `${this.config.apiBase}/voice/calls`,
                    { 
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            ...this._getAuthHeader()
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    // Find calls where this user is the callee and status is 'initiated' or 'ringing'
                    if (data.success && data.data) {
                        const incomingCall = data.data.find(call => 
                            call.callee_id === this.currentUser.id && 
                            (call.status === 'initiated' || call.status === 'ringing')
                        );
                        if (incomingCall) {
                            this._handleIncomingCall({
                                callId: incomingCall.id,
                                callerId: incomingCall.caller_id,
                                callerName: incomingCall.caller_name,
                                priority: incomingCall.priority || 'normal'
                            });
                        }
                    }
                }
            } catch (err) {
                // Silently ignore polling errors - API might not be available
            }
        },

        /**
         * Handle incoming call
         */
        _handleIncomingCall(callData) {
            this.incomingCall = callData;
            this.isRinging = true;

            // Show incoming call modal
            this._showIncomingCallModal(callData);

            // Start ringtone
            this._startRingtone();

            // Setup auto-decline timer
            this._setupAutoDeclineTimer();
        },

        /**
         * Start ringtone
         */
        _startRingtone() {
            try {
                this.ringtone.currentTime = 0;
                this.ringtone.play().catch(() => {});
            } catch (err) {
                console.warn('[VoiceCalls] Could not play ringtone');
            }
        },

        /**
         * Stop ringtone
         */
        _stopRingtone() {
            try {
                this.ringtone.pause();
                this.ringtone.currentTime = 0;
            } catch (err) {}
        },

        /**
         * Setup auto-decline timer
         */
        _setupAutoDeclineTimer() {
            let timeRemaining = this.config.autoDeclineAfter;

            const updateTimer = () => {
                const timerEl = document.getElementById('voice-calls-timer');
                if (timerEl) {
                    timerEl.textContent = `${timeRemaining}s`;
                }

                // Update progress bar
                const progressEl = document.getElementById('voice-calls-progress');
                if (progressEl) {
                    const percent = ((this.config.autoDeclineAfter - timeRemaining) / this.config.autoDeclineAfter) * 100;
                    progressEl.style.width = `${percent}%`;
                }

                timeRemaining--;

                if (timeRemaining < 0) {
                    this.rejectCall(this.incomingCall.callId, 'No answer');
                }
            };

            updateTimer();
            setInterval(updateTimer, 1000);
        },

        /**
         * Request microphone permission and get stream
         */
        async requestMicrophone() {
            try {
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
                return true;
            } catch (err) {
                console.error('[VoiceCalls] Microphone access denied:', err);
                alert('Microphone access is required for voice calls. Please allow microphone access and try again.');
                return false;
            }
        },

        /**
         * Initiate a call to another user
         */
        async initiateCall(targetUserId, targetName, priority = 'normal') {
            // Check if already in call
            if (this.isInCall) {
                alert('Already in a call');
                return;
            }

            // Request microphone
            const hasMic = await this.requestMicrophone();
            if (!hasMic) return;

            try {
                const response = await fetch(`${this.config.apiBase}/voice/call`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        ...this._getAuthHeader()
                    },
                    body: JSON.stringify({
                        callerId: this.currentUser.id,
                        callerName: this.currentUser.name,
                        callerRole: this.currentUser.role,
                        calleeId: targetUserId,
                        calleeName: targetName,
                        priority: priority
                    })
                });

                const data = await response.json();

                if (data.success) {
                    this.currentCall = {
                        ...data.data,
                        callerId: this.currentUser.id,
                        callerName: this.currentUser.name,
                        calleeId: targetUserId,
                        calleeName: targetName,
                        status: 'connecting'
                    };
                    this.isInCall = true;

                    // Setup WebRTC
                    this._setupPeerConnection();

                    // Show connecting UI
                    this._showActiveCallUI(this.currentCall, 'connecting');

                    // Simulate call connecting (in production, this would be WebSocket)
                    setTimeout(() => {
                        if (this.currentCall) {
                            this.currentCall.status = 'active';
                            this.callStartTime = Date.now();
                            this._startCallDurationTimer();
                            this._updateActiveCallUI(this.currentCall);
                        }
                    }, 2000);
                } else {
                    // Demo mode - simulate call without API
                    console.log('[VoiceCalls] Demo mode: Simulating call');
                    this._simulateCall(targetUserId, targetName, priority);
                }
            } catch (err) {
                console.error('[VoiceCalls] Failed to initiate call, using demo mode:', err);
                this._simulateCall(targetUserId, targetName, priority);
            }
        },

        /**
         * Simulate a call for demo purposes
         */
        _simulateCall(targetUserId, targetName, priority) {
            this.currentCall = {
                callId: `demo-${Date.now()}`,
                callerId: this.currentUser.id,
                callerName: this.currentUser.name,
                calleeId: targetUserId,
                calleeName: targetName,
                priority,
                status: 'connecting',
                isMuted: false,
                isOnHold: false
            };
            this.isInCall = true;

            this._showActiveCallUI(this.currentCall, 'connecting');

            setTimeout(() => {
                if (this.currentCall) {
                    this.currentCall.status = 'active';
                    this.callStartTime = Date.now();
                    this._startCallDurationTimer();
                    this._updateActiveCallUI(this.currentCall);
                }
            }, 2000);
        },

        /**
         * Accept incoming call
         */
        async acceptCall(callId) {
            if (!callId && this.incomingCall) {
                callId = this.incomingCall.callId;
            }

            // Stop ringtone
            this._stopRingtone();

            // Request microphone
            const hasMic = await this.requestMicrophone();
            if (!hasMic) {
                this.rejectCall(callId, 'Microphone unavailable');
                return;
            }

            // Setup WebRTC
            this._setupPeerConnection();

            try {
                await fetch(`${this.config.apiBase}/voice/call/${callId}/accept`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this._getAuthHeader()
                    }
                });
            } catch (err) {
                console.log('[VoiceCalls] Demo mode: Accepting call');
            }

            // Transition to active call
            this.isRinging = false;
            this.currentCall = {
                callId: callId,
                callerId: this.incomingCall.callerId,
                callerName: this.incomingCall.callerName,
                calleeId: this.currentUser.id,
                calleeName: this.currentUser.name,
                status: 'active',
                priority: this.incomingCall.priority,
                isMuted: false,
                isOnHold: false
            };
            this.incomingCall = null;
            this.isInCall = true;
            this.callStartTime = Date.now();

            // Hide incoming modal and show active UI
            this._hideIncomingCallModal();
            this._showActiveCallUI(this.currentCall, 'active');
            this._startCallDurationTimer();
        },

        /**
         * Reject incoming call
         */
        async rejectCall(callId, reason = 'declined') {
            if (!callId && this.incomingCall) {
                callId = this.incomingCall.callId;
            }

            // Stop ringtone
            this._stopRingtone();

            try {
                await fetch(`${this.config.apiBase}/voice/call/${callId}/reject`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this._getAuthHeader()
                    },
                    body: JSON.stringify({ reason })
                });
            } catch (err) {
                console.log('[VoiceCalls] Demo mode: Rejecting call');
            }

            this.incomingCall = null;
            this.isRinging = false;
            this._hideIncomingCallModal();
        },

        /**
         * End current call
         */
        async endCall() {
            if (!this.currentCall) return;

            // Stop ringtone
            this._stopRingtone();

            // Stop call duration timer
            this._stopCallDurationTimer();

            // Notify API
            try {
                await fetch(`${this.config.apiBase}/voice/call/${this.currentCall.callId}/end`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this._getAuthHeader()
                    }
                });
            } catch (err) {
                console.log('[VoiceCalls] Demo mode: Ending call');
            }

            // Cleanup WebRTC
            this._cleanupPeerConnection();

            // Hide active call UI
            this._hideActiveCallUI();

            // Reset state
            this.currentCall = null;
            this.isInCall = false;
            this.callStartTime = null;

            // Dispatch event
            window.dispatchEvent(new CustomEvent('callEnded'));
        },

        /**
         * Toggle mute
         */
        toggleMute() {
            if (!this.currentCall) return;

            this.currentCall.isMuted = !this.currentCall.isMuted;

            if (this.localStream) {
                this.localStream.getAudioTracks().forEach(track => {
                    track.enabled = !this.currentCall.isMuted;
                });
            }

            this._updateMuteButton();
        },

        /**
         * Toggle hold
         */
        toggleHold() {
            if (!this.currentCall) return;

            this.currentCall.isOnHold = !this.currentCall.isOnHold;

            // In a real implementation, this would send signaling
            // to put the other party on hold

            this._updateHoldButton();
        },

        /**
         * Setup WebRTC peer connection
         */
        _setupPeerConnection() {
            const config = {
                iceServers: this.config.stunServers
            };

            this.peerConnection = new RTCPeerConnection(config);

            // Handle incoming tracks
            this.peerConnection.ontrack = (event) => {
                console.log('[VoiceCalls] Received remote track');
                this.remoteStream = event.streams[0];
                this.audioElements.remote.srcObject = this.remoteStream;
            };

            // Handle ICE candidates
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('[VoiceCalls] ICE candidate:', event.candidate);
                    // In production, send this to the signaling server
                }
            };

            // Handle connection state changes
            this.peerConnection.onconnectionstatechange = () => {
                console.log('[VoiceCalls] Connection state:', this.peerConnection.connectionState);
            };

            // Add local tracks
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    this.peerConnection.addTrack(track, this.localStream);
                });
            }
        },

        /**
         * Cleanup peer connection
         */
        _cleanupPeerConnection() {
            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }

            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }

            if (this.remoteStream) {
                this.remoteStream.getTracks().forEach(track => track.stop());
                this.remoteStream = null;
            }

            if (this.audioElements.remote) {
                this.audioElements.remote.srcObject = null;
            }
        },

        /**
         * Start call duration timer
         */
        _startCallDurationTimer() {
            if (this.callDurationTimer) {
                clearInterval(this.callDurationTimer);
            }

            this.callDurationTimer = setInterval(() => {
                this._updateCallDuration();
            }, 1000);
        },

        /**
         * Stop call duration timer
         */
        _stopCallDurationTimer() {
            if (this.callDurationTimer) {
                clearInterval(this.callDurationTimer);
                this.callDurationTimer = null;
            }
        },

        /**
         * Update call duration display
         */
        _updateCallDuration() {
            if (!this.callStartTime) return;

            const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
            const hours = Math.floor(duration / 3600);
            const minutes = Math.floor((duration % 3600) / 60);
            const seconds = duration % 60;

            let timeStr;
            if (hours > 0) {
                timeStr = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else {
                timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }

            const timerEl = document.getElementById('voice-calls-duration');
            if (timerEl) {
                timerEl.textContent = timeStr;
            }
        },

        /**
         * Fetch staff members for directory
         */
        async getStaffMembers() {
            try {
                const response = await fetch(`${this.config.apiBase}/users`);
                const data = await response.json();
                if (data.success) return data.data;
            } catch (err) {}

            // Return mock data if API fails
            return [
                { id: 'doc-001', name: 'Dr. Sarah Johnson', role: 'doctor', department: 'MED', isOnline: true },
                { id: 'doc-002', name: 'Dr. Michael Chen', role: 'doctor', department: 'CARD', isOnline: true },
                { id: 'nurse-001', name: 'James Wilson', role: 'nurse', department: 'MED', isOnline: true },
                { id: 'nurse-002', name: 'Lisa Anderson', role: 'nurse', department: 'EMER', isOnline: true },
                { id: 'recep-001', name: 'Maria Garcia', role: 'receptionist', department: 'RECEP', isOnline: true },
            ];
        },

        // ===================
        // UI Methods
        // ===================

        /**
         * Show incoming call modal
         */
        _showIncomingCallModal(callData) {
            let modal = document.getElementById('voice-calls-incoming-modal');
            
            if (!modal) {
                modal = this._createIncomingCallModal();
            }

            // Update content
            const nameEl = document.getElementById('voice-calls-caller-name');
            const priorityEl = document.getElementById('voice-calls-caller-priority');
            
            if (nameEl) nameEl.textContent = callData.callerName;
            if (priorityEl) priorityEl.textContent = callData.priority;

            // Show modal
            modal.classList.add('voice-calls-modal-active');
        },

        /**
         * Hide incoming call modal
         */
        _hideIncomingCallModal() {
            const modal = document.getElementById('voice-calls-incoming-modal');
            if (modal) {
                modal.classList.remove('voice-calls-modal-active');
            }
        },

        /**
         * Create incoming call modal element
         */
        _createIncomingCallModal() {
            const modal = document.createElement('div');
            modal.id = 'voice-calls-incoming-modal';
            modal.className = 'voice-calls-modal';
            modal.innerHTML = `
                <div class="voice-calls-modal-content voice-calls-incoming-modal-content">
                    <div class="voice-calls-modal-header">
                        <h2>Incoming Call</h2>
                    </div>
                    <div class="voice-calls-avatar voice-calls-avatar-large voice-calls-avatar-caller">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                    <p id="voice-calls-caller-name" class="voice-calls-caller-name">Unknown Caller</p>
                    <p id="voice-calls-caller-priority" class="voice-calls-priority">Normal Priority</p>
                    <div class="voice-calls-progress-bar">
                        <div id="voice-calls-progress" class="voice-calls-progress"></div>
                    </div>
                    <p class="voice-calls-auto-decline">Auto-decline in <span id="voice-calls-timer">30s</span></p>
                    <div class="voice-calls-modal-actions">
                        <button onclick="VoiceCalls.rejectCall()" class="voice-calls-btn voice-calls-btn-reject">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 2.59 3.4z"></path>
                                <line x1="23" y1="1" x2="1" y2="23"></line>
                            </svg>
                            Reject
                        </button>
                        <button onclick="VoiceCalls.acceptCall()" class="voice-calls-btn voice-calls-btn-accept">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            Accept
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            return modal;
        },

        /**
         * Show active call UI
         */
        _showActiveCallUI(callData, status = 'active') {
            let modal = document.getElementById('voice-calls-active-modal');
            
            if (!modal) {
                modal = this._createActiveCallModal();
            }

            // Update status
            this._updateActiveCallUI(callData);

            // Show modal
            modal.classList.add('voice-calls-modal-active');
        },

        /**
         * Update active call UI
         */
        _updateActiveCallUI(callData) {
            const statusEl = document.getElementById('voice-calls-status');
            const calleeEl = document.getElementById('voice-calls-callee-name');

            if (statusEl) {
                statusEl.textContent = callData.status === 'connecting' ? 'Connecting...' : 'Connected';
                statusEl.className = `voice-calls-call-status ${callData.status === 'connecting' ? 'voice-calls-status-connecting' : 'voice-calls-status-active'}`;
            }

            if (calleeEl) {
                calleeEl.textContent = callData.calleeName || callData.callerName;
            }

            this._updateMuteButton();
            this._updateHoldButton();
        },

        /**
         * Update mute button state
         */
        _updateMuteButton() {
            const btn = document.getElementById('voice-calls-btn-mute');
            if (btn) {
                const isMuted = this.currentCall?.isMuted;
                btn.classList.toggle('voice-calls-btn-muted', isMuted);
                btn.innerHTML = isMuted ? `
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                    <span>Unmute</span>
                ` : `
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                    <span>Mute</span>
                `;
            }
        },

        /**
         * Update hold button state
         */
        _updateHoldButton() {
            const btn = document.getElementById('voice-calls-btn-hold');
            if (btn) {
                const isOnHold = this.currentCall?.isOnHold;
                btn.classList.toggle('voice-calls-btn-hold-active', isOnHold);
                btn.innerHTML = isOnHold ? `
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span>Resume</span>
                ` : `
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                    <span>Hold</span>
                `;
            }
        },

        /**
         * Hide active call UI
         */
        _hideActiveCallUI() {
            const modal = document.getElementById('voice-calls-active-modal');
            if (modal) {
                modal.classList.remove('voice-calls-modal-active');
            }
        },

        /**
         * Create active call modal element
         */
        _createActiveCallModal() {
            const modal = document.createElement('div');
            modal.id = 'voice-calls-active-modal';
            modal.className = 'voice-calls-modal voice-calls-modal-fullscreen';
            modal.innerHTML = `
                <div class="voice-calls-active-content">
                    <div class="voice-calls-avatar-wrapper">
                        <div class="voice-calls-avatar voice-calls-avatar-xlarge voice-calls-avatar-active">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </div>
                        <div id="voice-calls-status" class="voice-calls-call-status voice-calls-status-active">Connected</div>
                    </div>
                    <p id="voice-calls-callee-name" class="voice-calls-callee-name">Unknown</p>
                    <p class="voice-calls-call-label">Voice Call</p>
                    <div class="voice-calls-duration-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span id="voice-calls-duration">0:00</span>
                    </div>
                    <div class="voice-calls-control-buttons">
                        <button id="voice-calls-btn-mute" onclick="VoiceCalls.toggleMute()" class="voice-calls-btn voice-calls-btn-control">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                            </svg>
                            <span>Mute</span>
                        </button>
                        <button id="voice-calls-btn-hold" onclick="VoiceCalls.toggleHold()" class="voice-calls-btn voice-calls-btn-control">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="6" y="4" width="4" height="16"></rect>
                                <rect x="14" y="4" width="4" height="16"></rect>
                            </svg>
                            <span>Hold</span>
                        </button>
                    </div>
                    <button onclick="VoiceCalls.endCall()" class="voice-calls-btn voice-calls-btn-end">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 2.59 3.4z"></path>
                            <line x1="23" y1="1" x2="1" y2="23"></line>
                        </svg>
                        <span>End Call</span>
                    </button>
                    <p class="voice-calls-keyboard-hints">
                        Press M to mute • Press H to hold • Press Escape to end
                    </p>
                </div>
            `;
            document.body.appendChild(modal);
            return modal;
        },

        /**
         * Open staff directory modal
         */
        async openStaffDirectory() {
            let modal = document.getElementById('voice-calls-staff-modal');
            
            if (!modal) {
                modal = this._createStaffDirectoryModal();
                document.body.appendChild(modal);
            }

            // Fetch staff
            const staff = await this.getStaffMembers();

            // Populate staff list
            this._populateStaffList(staff);

            // Show modal
            modal.classList.add('voice-calls-modal-active');
        },

        /**
         * Close staff directory modal
         */
        closeStaffDirectory() {
            const modal = document.getElementById('voice-calls-staff-modal');
            if (modal) {
                modal.classList.remove('voice-calls-modal-active');
            }
        },

        /**
         * Populate staff list
         */
        _populateStaffList(staff) {
            const container = document.getElementById('voice-calls-staff-list');
            if (!container) return;

            // Filter out current user
            staff = staff.filter(s => s.id !== this.currentUser?.id);

            if (staff.length === 0) {
                container.innerHTML = '<p class="voice-calls-empty">No staff members found</p>';
                return;
            }

            container.innerHTML = staff.map(member => `
                <div class="voice-calls-staff-item">
                    <div class="voice-calls-staff-avatar ${member.isOnline ? 'voice-calls-staff-online' : ''}">
                        ${member.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="voice-calls-staff-info">
                        <p class="voice-calls-staff-name">${member.name}</p>
                        <p class="voice-calls-staff-role">${member.role}${member.department ? ` • ${member.department}` : ''}</p>
                    </div>
                    <button onclick="VoiceCalls.initiateCall('${member.id}', '${member.name}')" 
                            class="voice-calls-btn voice-calls-btn-call"
                            ${!member.isOnline ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                        Call
                    </button>
                </div>
            `).join('');
        },

        /**
         * Filter staff list by search query
         */
        filterStaff(query) {
            const items = document.querySelectorAll('.voice-calls-staff-item');
            const lowerQuery = query.toLowerCase();

            items.forEach(item => {
                const name = item.querySelector('.voice-calls-staff-name')?.textContent?.toLowerCase() || '';
                const role = item.querySelector('.voice-calls-staff-role')?.textContent?.toLowerCase() || '';
                const visible = name.includes(lowerQuery) || role.includes(lowerQuery);
                item.style.display = visible ? 'flex' : 'none';
            });

            // Update count
            const countEl = document.getElementById('voice-calls-staff-count');
            const visibleCount = Array.from(items).filter(i => i.style.display !== 'none').length;
            if (countEl) {
                countEl.textContent = `${visibleCount} staff members`;
            }
        },

        /**
         * Filter staff by role
         */
        filterStaffByRole(role) {
            const items = document.querySelectorAll('.voice-calls-staff-item');
            const lowerRole = role.toLowerCase();

            items.forEach(item => {
                const itemRole = item.querySelector('.voice-calls-staff-role')?.textContent?.toLowerCase() || '';
                const visible = lowerRole === 'all' || itemRole.includes(lowerRole);
                item.style.display = visible ? 'flex' : 'none';
            });

            // Update active filter button
            document.querySelectorAll('.voice-calls-filter-btn').forEach(btn => {
                btn.classList.toggle('voice-calls-filter-active', btn.dataset.role === role);
            });
        },

        /**
         * Create staff directory modal element
         */
        _createStaffDirectoryModal() {
            const modal = document.createElement('div');
            modal.id = 'voice-calls-staff-modal';
            modal.className = 'voice-calls-modal';
            modal.innerHTML = `
                <div class="voice-calls-staff-modal-content">
                    <div class="voice-calls-modal-header">
                        <div class="voice-calls-modal-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <h2>Staff Directory</h2>
                        </div>
                        <button onclick="VoiceCalls.closeStaffDirectory()" class="voice-calls-close-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="voice-calls-search-container">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input type="text" id="voice-calls-staff-search" placeholder="Search staff..." oninput="VoiceCalls.filterStaff(this.value)">
                    </div>
                    <div class="voice-calls-filters">
                        <button class="voice-calls-filter-btn voice-calls-filter-active" data-role="all" onclick="VoiceCalls.filterStaffByRole('all')">All</button>
                        <button class="voice-calls-filter-btn" data-role="doctor" onclick="VoiceCalls.filterStaffByRole('doctor')">Doctors</button>
                        <button class="voice-calls-filter-btn" data-role="nurse" onclick="VoiceCalls.filterStaffByRole('nurse')">Nurses</button>
                        <button class="voice-calls-filter-btn" data-role="receptionist" onclick="VoiceCalls.filterStaffByRole('receptionist')">Receptionists</button>
                    </div>
                    <div id="voice-calls-staff-list" class="voice-calls-staff-list">
                        <p class="voice-calls-empty">Loading...</p>
                    </div>
                    <div class="voice-calls-modal-footer">
                        <p id="voice-calls-staff-count">Loading staff...</p>
                    </div>
                </div>
            `;
            return modal;
        },

        /**
         * Show voice call FAB (Floating Action Button)
         */
        showFAB() {
            let fab = document.getElementById('voice-calls-fab');
            
            if (!fab) {
                fab = document.createElement('button');
                fab.id = 'voice-calls-fab';
                fab.className = 'voice-calls-fab';
                fab.onclick = () => this.openStaffDirectory();
                fab.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                `;
                document.body.appendChild(fab);
            }

            fab.style.display = 'flex';
            this._updateFABState();
        },

        /**
         * Hide FAB
         */
        hideFAB() {
            const fab = document.getElementById('voice-calls-fab');
            if (fab) {
                fab.style.display = 'none';
            }
        },

        /**
         * Update FAB state based on call status
         */
        _updateFABState() {
            const fab = document.getElementById('voice-calls-fab');
            if (!fab) return;

            fab.classList.remove('voice-calls-fab-ringing', 'voice-calls-fab-active');
            
            if (this.isRinging) {
                fab.classList.add('voice-calls-fab-ringing');
                fab.innerHTML = '📞';
            } else if (this.isInCall) {
                fab.classList.add('voice-calls-fab-active');
                fab.innerHTML = '📱';
            }
        },

        /**
         * Inject CSS styles into document
         */
        injectStyles() {
            if (document.getElementById('voice-calls-styles')) return;

            const styles = document.createElement('style');
            styles.id = 'voice-calls-styles';
            styles.textContent = this._getStyles();
            document.head.appendChild(styles);
        },

        /**
         * Get CSS styles
         */
        _getStyles() {
            return `
                /* Voice Calls Styles */
                .voice-calls-modal {
                    display: none;
                    position: fixed;
                    inset: 0;
                    z-index: 9999;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                }

                .voice-calls-modal-active {
                    display: flex !important;
                }

                .voice-calls-modal-fullscreen {
                    background: linear-gradient(135deg, #1f2937 0%, #111827 50%, #1f2937 100%);
                }

                .voice-calls-modal-content {
                    background: white;
                    border-radius: 16px;
                    padding: 24px;
                    width: 100%;
                    max-width: 400px;
                    text-align: center;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    animation: voiceCallsBounce 0.5s ease-out;
                }

                .voice-calls-incoming-modal-content {
                    border: 2px solid #3b82f6;
                    animation: voiceCallsBounce 0.5s ease-out;
                }

                .voice-calls-active-content {
                    width: 100%;
                    max-width: 500px;
                    text-align: center;
                    padding: 40px 20px;
                }

                .voice-calls-staff-modal-content {
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

                .voice-calls-modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .voice-calls-modal-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: white;
                }

                .voice-calls-modal-title h2 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                }

                .voice-calls-close-btn {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    border-radius: 8px;
                    padding: 8px;
                    color: rgba(255, 255, 255, 0.7);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .voice-calls-close-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                }

                .voice-calls-avatar {
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    margin: 0 auto 16px;
                }

                .voice-calls-avatar-large {
                    width: 96px;
                    height: 96px;
                }

                .voice-calls-avatar-xlarge {
                    width: 128px;
                    height: 128px;
                }

                .voice-calls-avatar-caller {
                    border: 4px solid white;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                }

                .voice-calls-avatar-active {
                    border: 4px solid #10b981;
                    box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
                }

                .voice-calls-avatar-wrapper {
                    position: relative;
                    margin-bottom: 20px;
                }

                .voice-calls-call-status {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    margin-top: 8px;
                }

                .voice-calls-status-connecting {
                    background: #fbbf24;
                    color: #1f2937;
                }

                .voice-calls-status-active {
                    background: #10b981;
                    color: white;
                }

                .voice-calls-caller-name,
                .voice-calls-callee-name {
                    font-size: 24px;
                    font-weight: 600;
                    color: #1f2937;
                    margin: 0 0 4px;
                }

                .voice-calls-callee-name {
                    color: white;
                }

                .voice-calls-priority {
                    color: #6b7280;
                    text-transform: capitalize;
                    margin: 0 0 16px;
                }

                .voice-calls-call-label {
                    color: rgba(255, 255, 255, 0.6);
                    margin: 0 0 8px;
                }

                .voice-calls-duration-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    color: #10b981;
                    margin-bottom: 24px;
                }

                .voice-calls-duration-wrapper span {
                    font-size: 20px;
                    font-family: monospace;
                }

                .voice-calls-progress-bar {
                    width: 100%;
                    height: 4px;
                    background: #e5e7eb;
                    border-radius: 2px;
                    overflow: hidden;
                    margin-bottom: 8px;
                }

                .voice-calls-progress {
                    height: 100%;
                    background: #3b82f6;
                    width: 0%;
                    transition: width 1s linear;
                }

                .voice-calls-auto-decline {
                    color: #9ca3af;
                    font-size: 12px;
                    margin-bottom: 20px;
                }

                .voice-calls-modal-actions {
                    display: flex;
                    gap: 16px;
                    justify-content: center;
                }

                .voice-calls-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 12px 20px;
                    border-radius: 12px;
                    border: none;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .voice-calls-btn-accept {
                    background: #10b981;
                    color: white;
                    flex: 1;
                }

                .voice-calls-btn-accept:hover {
                    background: #059669;
                    transform: scale(1.02);
                }

                .voice-calls-btn-reject {
                    background: #ef4444;
                    color: white;
                    flex: 1;
                }

                .voice-calls-btn-reject:hover {
                    background: #dc2626;
                    transform: scale(1.02);
                }

                .voice-calls-control-buttons {
                    display: flex;
                    gap: 16px;
                    justify-content: center;
                    margin-bottom: 24px;
                }

                .voice-calls-btn-control {
                    background: #374151;
                    color: white;
                    flex-direction: column;
                    padding: 16px 24px;
                    border-radius: 12px;
                }

                .voice-calls-btn-control:hover {
                    background: #4b5563;
                }

                .voice-calls-btn-control span {
                    font-size: 12px;
                    margin-top: 4px;
                }

                .voice-calls-btn-muted {
                    background: #dc2626 !important;
                }

                .voice-calls-btn-hold-active {
                    background: #f59e0b !important;
                }

                .voice-calls-btn-end {
                    background: #ef4444;
                    color: white;
                    padding: 16px 32px;
                    border-radius: 30px;
                    font-size: 16px;
                }

                .voice-calls-btn-end:hover {
                    background: #dc2626;
                    transform: scale(1.05);
                }

                .voice-calls-keyboard-hints {
                    margin-top: 24px;
                    color: rgba(255, 255, 255, 0.4);
                    font-size: 12px;
                }

                /* Staff Directory Styles */
                .voice-calls-search-container {
                    position: relative;
                    padding: 16px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .voice-calls-search-container svg {
                    position: absolute;
                    left: 32px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: rgba(255, 255, 255, 0.4);
                }

                .voice-calls-search-container input {
                    width: 100%;
                    padding: 10px 12px 10px 36px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    color: white;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.2s;
                }

                .voice-calls-search-container input::placeholder {
                    color: rgba(255, 255, 255, 0.4);
                }

                .voice-calls-search-container input:focus {
                    border-color: rgba(59, 130, 246, 0.5);
                }

                .voice-calls-filters {
                    display: flex;
                    gap: 8px;
                    padding: 12px 20px;
                    overflow-x: auto;
                }

                .voice-calls-filter-btn {
                    padding: 6px 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid transparent;
                    border-radius: 8px;
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 12px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    white-space: nowrap;
                }

                .voice-calls-filter-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                }

                .voice-calls-filter-active {
                    background: rgba(59, 130, 246, 0.3);
                    color: #93c5fd;
                    border-color: rgba(59, 130, 246, 0.5);
                }

                .voice-calls-staff-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px 20px;
                }

                .voice-calls-staff-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    margin-bottom: 8px;
                    transition: background 0.2s;
                }

                .voice-calls-staff-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                }

                .voice-calls-staff-avatar {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 600;
                    font-size: 16px;
                    position: relative;
                    flex-shrink: 0;
                }

                .voice-calls-staff-online::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 12px;
                    height: 12px;
                    background: #10b981;
                    border: 2px solid #1f2937;
                    border-radius: 50%;
                }

                .voice-calls-staff-info {
                    flex: 1;
                    min-width: 0;
                }

                .voice-calls-staff-name {
                    color: white;
                    font-weight: 500;
                    margin: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .voice-calls-staff-role {
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 12px;
                    margin: 2px 0 0;
                    text-transform: capitalize;
                }

                .voice-calls-btn-call {
                    background: #10b981;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 13px;
                }

                .voice-calls-btn-call:hover:not(:disabled) {
                    background: #059669;
                }

                .voice-calls-btn-call:disabled {
                    background: rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.3);
                    cursor: not-allowed;
                }

                .voice-calls-modal-footer {
                    padding: 12px 20px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    text-align: center;
                }

                .voice-calls-modal-footer p {
                    color: rgba(255, 255, 255, 0.4);
                    font-size: 12px;
                    margin: 0;
                }

                .voice-calls-empty {
                    text-align: center;
                    color: rgba(255, 255, 255, 0.4);
                    padding: 40px 20px;
                }

                /* FAB Styles */
                .voice-calls-fab {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    z-index: 9998;
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: #3b82f6;
                    border: none;
                    color: white;
                    cursor: pointer;
                    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .voice-calls-fab:hover {
                    transform: scale(1.1);
                    background: #2563eb;
                }

                .voice-calls-fab-ringing {
                    background: #fbbf24;
                    animation: voiceCallsPulse 1s infinite;
                }

                .voice-calls-fab-active {
                    background: #10b981;
                }

                /* Animations */
                @keyframes voiceCallsBounce {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }

                @keyframes voiceCallsPulse {
                    0%, 100% { box-shadow: 0 4px 20px rgba(251, 191, 36, 0.4); }
                    50% { box-shadow: 0 4px 30px rgba(251, 191, 36, 0.8); }
                }

                /* Responsive */
                @media (max-width: 640px) {
                    .voice-calls-staff-modal-content {
                        max-width: 100%;
                        max-height: 100%;
                        border-radius: 0;
                    }

                    .voice-calls-modal-content {
                        max-width: 100%;
                        margin: 16px;
                        border-radius: 12px;
                    }

                    .voice-calls-control-buttons {
                        flex-direction: row;
                    }

                    .voice-calls-btn-control {
                        padding: 12px 16px;
                    }
                }
            `;
        },

        /**
         * Cleanup - remove all elements and timers
         */
        destroy() {
            // Stop timers
            this._stopIncomingCallPolling();
            this._stopCallDurationTimer();
            this._stopRingtone();

            // Cleanup WebRTC
            this._cleanupPeerConnection();

            // Remove audio elements
            Object.values(this.audioElements).forEach(el => el?.remove());
            this.ringtone = null;

            // Remove modals
            ['voice-calls-incoming-modal', 'voice-calls-active-modal', 'voice-calls-staff-modal', 'voice-calls-fab'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.remove();
            });

            // Remove styles
            const styles = document.getElementById('voice-calls-styles');
            if (styles) styles.remove();
        }
    };

    // Auto-inject styles on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => VoiceCalls.injectStyles());
    } else {
        VoiceCalls.injectStyles();
    }

    // Expose to global scope
    window.VoiceCalls = VoiceCalls;

})();
