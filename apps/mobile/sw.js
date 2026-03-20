const CACHE_NAME = 'limuru-hospital-v1';
const STATIC_CACHE = 'limuru-static-v1';
const API_CACHE = 'limuru-api-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

const API_ROUTES = [
  '/api/departments',
  '/api/queue',
  '/api/queue/patient'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/') && request.method === 'GET') {
    event.respondWith(networkFirst(request, API_CACHE));
  } else if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (request.destination === 'document' || url.pathname === '/') {
    event.respondWith(networkFirst(request, STATIC_CACHE));
  }
});

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/.test(pathname);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    
    if (request.destination === 'document' || request.url.includes('/api/')) {
      return caches.match('/index.html') || new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'Please check your internet connection and try again.' 
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response('Offline', { status: 503 });
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
