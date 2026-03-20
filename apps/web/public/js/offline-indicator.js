/**
 * Offline Indicator Component
 * Shows/hides a banner when the app goes offline or comes back online
 * 
 * Usage: Include this script in HTML pages or import as a module
 */

(function() {
  'use strict';

  // Create styles
  const styles = `
    .offline-indicator {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 12px 20px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #1f2937;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      text-align: center;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
      transform: translateY(100%);
      transition: transform 0.3s ease-in-out;
    }

    .offline-indicator.visible {
      transform: translateY(0);
    }

    .offline-indicator .icon {
      font-size: 18px;
    }

    .offline-indicator .message {
      flex: 1;
    }

    .offline-indicator .retry-btn {
      padding: 6px 16px;
      background: rgba(0, 0, 0, 0.2);
      border: none;
      border-radius: 6px;
      color: inherit;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .offline-indicator .retry-btn:hover {
      background: rgba(0, 0, 0, 0.3);
    }

    .offline-indicator .dismiss-btn {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      width: 24px;
      height: 24px;
      background: rgba(0, 0, 0, 0.2);
      border: none;
      border-radius: 50%;
      color: inherit;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .offline-indicator .dismiss-btn:hover {
      background: rgba(0, 0, 0, 0.3);
    }

    /* Online indicator (subtle) */
    .online-indicator {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 8px 16px;
      background: linear-gradient(135deg, #16a34a 0%, #059669 100%);
      color: white;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-weight: 500;
      border-radius: 20px;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(22, 163, 74, 0.4);
      opacity: 0;
      transform: translateY(-20px);
      transition: opacity 0.3s, transform 0.3s;
      pointer-events: none;
    }

    .online-indicator.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .online-indicator .dot {
      width: 8px;
      height: 8px;
      background: white;
      border-radius: 50%;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;

  // Inject styles
  function injectStyles() {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  // Create offline indicator element
  function createOfflineIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'offline-indicator';
    indicator.id = 'offlineIndicator';
    indicator.innerHTML = `
      <span class="icon">📡</span>
      <span class="message">You're offline. Some features may be limited.</span>
      <button class="retry-btn" onclick="location.reload()">Retry</button>
      <button class="dismiss-btn" onclick="OfflineIndicator.dismiss()">×</button>
    `;
    document.body.appendChild(indicator);
    return indicator;
  }

  // Create online indicator element
  function createOnlineIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'online-indicator';
    indicator.id = 'onlineIndicator';
    indicator.innerHTML = `
      <span class="dot"></span>
      <span>Back online</span>
    `;
    document.body.appendChild(indicator);
    return indicator;
  }

  // Offline Indicator Controller
  const OfflineIndicator = {
    isOffline: false,
    isDismissed: false,
    retryTimeout: null,
    checkInterval: null,

    init() {
      // Don't run on service worker itself
      if (typeof document === 'undefined') return;

      injectStyles();
      this.offlineEl = createOfflineIndicator();
      this.onlineEl = createOnlineIndicator();

      // Listen for online/offline events
      window.addEventListener('online', () => this.onOnline());
      window.addEventListener('offline', () => this.onOffline());

      // Listen for service worker messages
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.addEventListener('message', (event) => {
          if (event.data.type === 'sync-success') {
            this.showOnlineIndicator();
          }
        });
      }

      // Initial state
      this.isOffline = !navigator.onLine;
      if (this.isOffline) {
        this.show();
      }

      // Periodic connectivity check
      this.startConnectivityCheck();
    },

    onOffline() {
      if (!this.isOffline) {
        this.isOffline = true;
        this.isDismissed = false;
        this.show();
        console.log('[OfflineIndicator] Gone offline');
      }
    },

    onOnline() {
      if (this.isOffline) {
        this.isOffline = false;
        this.hide();
        this.showOnlineIndicator();
        console.log('[OfflineIndicator] Back online');
        
        // Auto-hide online indicator after 3 seconds
        setTimeout(() => {
          this.onlineEl.classList.remove('visible');
        }, 3000);
      }
    },

    show() {
      if (!this.isDismissed && this.offlineEl) {
        this.offlineEl.classList.add('visible');
      }
    },

    hide() {
      if (this.offlineEl) {
        this.offlineEl.classList.remove('visible');
      }
    },

    dismiss() {
      this.isDismissed = true;
      this.hide();
    },

    showOnlineIndicator() {
      if (this.onlineEl) {
        this.onlineEl.classList.add('visible');
        setTimeout(() => {
          this.onlineEl.classList.remove('visible');
        }, 3000);
      }
    },

    startConnectivityCheck() {
      // Check connectivity every 30 seconds
      this.checkInterval = setInterval(async () => {
        try {
          // Try to fetch a small resource
          const response = await fetch('/api/health', {
            method: 'HEAD',
            cache: 'no-store'
          });
          
          if (!this.isOffline && response.ok) {
            this.onOnline();
          }
        } catch (error) {
          // If we get here with isOnline, we're actually offline
          if (navigator.onLine) {
            this.onOffline();
          }
        }
      }, 30000);
    },

    destroy() {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
      }
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
      }
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => OfflineIndicator.init());
  } else {
    OfflineIndicator.init();
  }

  // Export for external use
  window.OfflineIndicator = OfflineIndicator;

})();
