const CACHE_NAME = 'fifty-erp-v1';
const urlsToCache = [
  '/',
  '/admin',
  '/index.html',
  '/manifest-admin.json',
  '/manifest-client.json'
];

// Install Event: Cache essential assets
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache).catch(err => {
          console.warn('SW: Error caching some initial assets', err);
        });
      })
  );
});

// Activate Event: Cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Stale-While-Revalidate strategy for all requests
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // Ignore chrome-extension and firebase API requests
  if (!event.request.url.startsWith('http') || event.request.url.includes('firestore.googleapis.com')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // Cache the new response for future
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for offline mode, especially for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });

      // Return cached immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
