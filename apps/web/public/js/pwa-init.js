/**
 * PWA Registration Script
 * Registers the service worker and initializes offline support
 * 
 * Usage:
 * <script src="/js/pwa-init.js"><\/script>
 */

(function() {
  'use strict';

  // PWA Configuration
  const PWA_CONFIG = {
    serviceWorkerPath: '/sw.js',
    offlineIndicatorPath: '/js/offline-indicator.js',
    autoRegister: true
  };

  // PWA Controller
  const PWA = {
    registration: null,
    updateAvailable: false,

    /**
     * Initialize PWA functionality
     */
    async init() {
      // Check if PWA features are supported
      if (!('serviceWorker' in navigator)) {
        console.log('[PWA] Service workers not supported');
        return;
      }

      // Load offline indicator
      this.loadOfflineIndicator();

      // Register service worker
      if (PWA_CONFIG.autoRegister) {
        await this.registerServiceWorker();
      }
    },

    /**
     * Load the offline indicator script
     */
    loadOfflineIndicator() {
      const script = document.createElement('script');
      script.src = PWA_CONFIG.offlineIndicatorPath;
      script.async = true;
      document.head.appendChild(script);
    },

    /**
     * Register the service worker
     */
    async registerServiceWorker() {
      try {
        console.log('[PWA] Registering service worker...');
        
        this.registration = await navigator.serviceWorker.register(PWA_CONFIG.serviceWorkerPath, {
          scope: '/'
        });

        console.log('[PWA] Service worker registered:', this.registration.scope);

        // Handle updates
        this.registration.addEventListener('updatefound', () => {
          console.log('[PWA] New service worker found');
          const newWorker = this.registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New version available
                console.log('[PWA] New version available');
                this.updateAvailable = true;
                this.notifyUpdate();
              } else {
                // First install
                console.log('[PWA] Content cached for offline use');
              }
            }
          });
        });

        // Handle controller change (after page refresh with new SW)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (this.updateAvailable) {
            // Reload to get new version
            window.location.reload();
          }
        });

      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    },

    /**
     * Notify user of available update
     */
    notifyUpdate() {
      // Create update banner
      const banner = document.createElement('div');
      banner.id = 'pwa-update-banner';
      banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        padding: 12px 20px;
        background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
        color: white;
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 14px;
        text-align: center;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      `;
      banner.innerHTML = `
        <span>🎉 A new version is available!</span>
        <button onclick="PWA.updateApp()" style="
          padding: 8px 20px;
          background: white;
          color: #0d9488;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        ">Update Now</button>
        <button onclick="this.parentElement.remove()" style="
          padding: 8px 12px;
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        ">Later</button>
      `;
      
      document.body.appendChild(banner);
    },

    /**
     * Update the app to the new version
     */
    updateApp() {
      // Remove update banner
      const banner = document.getElementById('pwa-update-banner');
      if (banner) banner.remove();
      
      // Reload to activate new service worker
      window.location.reload();
    },

    /**
     * Request background sync
     */
    async requestSync(tag = 'sync-queue-actions') {
      if (this.registration && 'sync' in this.registration) {
        try {
          await this.registration.sync.register(tag);
          console.log('[PWA] Background sync registered:', tag);
        } catch (error) {
          console.error('[PWA] Background sync registration failed:', error);
        }
      }
    },

    /**
     * Send message to service worker
     */
    sendMessage(message) {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(message);
      }
    },

    /**
     * Check if app is running as PWA
     */
    isStandalone() {
      return window.matchMedia('(display-mode: standalone)').matches ||
             window.navigator.standalone === true;
    },

    /**
     * Get cached data
     */
    async getCachedData(key) {
      if (!this.registration) return null;
      
      const cache = await caches.open('static-v1');
      const response = await cache.match(key);
      
      if (response) {
        return response.json();
      }
      return null;
    }
  };

  // Export globally
  window.PWA = PWA;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PWA.init());
  } else {
    PWA.init();
  }

})();
