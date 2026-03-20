/**
 * Service Worker for Limuru Cottage Hospital Queue System
 * Implements caching strategies for offline support
 * 
 * Strategy:
 * - Static assets: Cache-first (for fast loads)
 * - API calls: Network-first (for fresh data)
 * - Images: Stale-while-revalidate
 * - Background sync for offline queue actions
 */

// ====================
// CACHE CONFIGURATION
// ====================

const CACHE_VERSION = 'v1';
const STATIC_CACHE_NAME = `static-${CACHE_VERSION}`;
const API_CACHE_NAME = `api-${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `images-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/login.html',
  '/kiosk.html',
  '/waiting-display.html',
  '/appointments.html',
  '/notifications.html',
  '/analytics.html',
  '/staff-dashboard.html',
  '/doctor-notes.html',
  '/css/glassmorphism.css',
  '/js/api.js',
  '/js/messaging.js',
  '/js/notifications.js',
  '/js/voice-calls.js',
  '/js/analytics.js'
];

// API endpoints that should be cached
const CACHEABLE_API_PATTERNS = [
  /\/api\/departments/,
  /\/api\/queue\/stats/,
  /\/api\/rooms/,
  /\/api\/doctors/,
  /\/api\/users/
];

// API endpoints that should NEVER be cached (require fresh data)
const NO_CACHE_API_PATTERNS = [
  /\/api\/auth/,
  /\/api\/queue$/,
  /\/api\/patients/,
  /\/api\/appointments/,
  /\/api\/voice/
];

// ====================
// SERVICE WORKER LIFECYCLE
// ====================

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        // Force activation
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        console.log('[SW] Found caches:', cacheNames);
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete old versions of caches
              return name.startsWith('static-') && name !== STATIC_CACHE_NAME ||
                     name.startsWith('api-') && name !== API_CACHE_NAME ||
                     name.startsWith('images-') && name !== IMAGE_CACHE_NAME;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// ====================
// FETCH HANDLING
// ====================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Log all fetch requests (for debugging)
  console.log('[SW] Fetch:', request.method, url.pathname);
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle image requests
  if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
    return;
  }
  
  // Handle static assets (HTML, CSS, JS)
  event.respondWith(handleStaticRequest(request));
});

// ====================
// CACHE STRATEGIES
// ====================

/**
 * Network-first strategy for API calls
 * Falls back to cache if network fails
 */
async function handleApiRequest(request) {
  const url = request.url;
  
  // Check if this endpoint should bypass cache
  if (shouldBypassCache(url)) {
    console.log('[SW] API bypass cache:', url);
    return fetch(request);
  }
  
  // Check if this endpoint should be cached
  if (shouldCacheApi(url)) {
    console.log('[SW] API cache-first:', url);
    try {
      // Try network first
      const networkResponse = await fetch(request);
      
      // Clone and cache the response
      if (networkResponse.ok) {
        const cache = await caches.open(API_CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
      
      return networkResponse;
    } catch (error) {
      console.log('[SW] Network failed, trying cache:', url);
      // Fall back to cache
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      // Return offline error response
      return createOfflineResponse();
    }
  }
  
  // Default: network-only for uncacheable APIs
  return fetch(request);
}

/**
 * Cache-first strategy for static assets
 * Falls back to network if cache fails
 */
async function handleStaticRequest(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Static cache hit:', request.url);
    // Update cache in background (stale-while-revalidate)
    fetchAndCache(request, STATIC_CACHE_NAME);
    return cachedResponse;
  }
  
  // Cache miss - fetch from network
  console.log('[SW] Static cache miss:', request.url);
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Static fetch failed:', error);
    // Return offline page if available
    const offlinePage = await caches.match('/');
    if (offlinePage) {
      return offlinePage;
    }
    throw error;
  }
}

/**
 * Stale-while-revalidate for images
 */
async function handleImageRequest(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = caches.open(IMAGE_CACHE_NAME);
        cache.then((c) => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
}

/**
 * Fetch and update cache in background
 */
async function fetchAndCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silently fail - this is just a background update
    console.log('[SW] Background cache update failed:', error);
  }
}

// ====================
// HELPER FUNCTIONS
// ====================

function isImageRequest(request) {
  return request.destination === 'image' ||
         /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(request.url);
}

function shouldBypassCache(url) {
  return NO_CACHE_API_PATTERNS.some((pattern) => pattern.test(url));
}

function shouldCacheApi(url) {
  return CACHEABLE_API_PATTERNS.some((pattern) => pattern.test(url));
}

function createOfflineResponse() {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'You are offline. Please check your connection.',
      offline: true
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

// ====================
// BACKGROUND SYNC
// ====================

// Queue for offline actions
const offlineActionQueue = [];

/**
 * Register a queue action for background sync
 */
function queueAction(action) {
  offlineActionQueue.push(action);
  // Store in IndexedDB or localStorage for persistence
  saveOfflineQueue();
}

/**
 * Save offline queue to storage
 */
async function saveOfflineQueue() {
  try {
    // Use BroadcastChannel for cross-tab communication
    const channel = new BroadcastChannel('offline-queue');
    channel.postMessage({
      type: 'queue-update',
      actions: offlineActionQueue
    });
  } catch (error) {
    console.error('[SW] Failed to save offline queue:', error);
  }
}

/**
 * Handle background sync event
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-queue-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

/**
 * Sync all queued offline actions
 */
async function syncOfflineActions() {
  console.log('[SW] Syncing offline actions...');
  
  // Load pending actions
  const pendingActions = offlineActionQueue;
  
  for (const action of pendingActions) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body
      });
      
      if (response.ok) {
        // Remove from queue on success
        const index = offlineActionQueue.indexOf(action);
        if (index > -1) {
          offlineActionQueue.splice(index, 1);
        }
        
        // Notify clients of successful sync
        notifyClients({
          type: 'sync-success',
          action: action
        });
      }
    } catch (error) {
      console.error('[SW] Failed to sync action:', error);
    }
  }
  
  // Save updated queue
  await saveOfflineQueue();
  
  console.log('[SW] Offline sync complete');
}

/**
 * Notify all connected clients
 */
async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage(message);
  });
}

// ====================
// PUSH NOTIFICATIONS
// ====================

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (!event.data) {
    console.log('[SW] No push data');
    return;
  }
  
  const data = event.data.json();
  
  const options = {
    body: data.body || 'New notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/dashboard.html'
    },
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Queue System', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const url = event.notification.data.url || '/dashboard.html';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Focus existing window if available
        for (const client of clients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

// ====================
// MESSAGE HANDLING
// ====================

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'getOfflineQueue') {
    event.ports[0].postMessage({
      queue: offlineActionQueue
    });
  }
  
  if (event.data.type === 'queueAction') {
    queueAction(event.data.action);
    // Request background sync
    self.registration.sync.register('sync-queue-actions');
  }
});

// ====================
// ERROR HANDLING
// ====================

self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});

// ====================
// LOGGING
// ====================

console.log('[SW] Service worker loaded');
