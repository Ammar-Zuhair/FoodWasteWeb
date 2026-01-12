// Service Worker for PWA
const CACHE_NAME = 'hsa-food-waste-v2';
const urlsToCache = [
  '/',
  '/dashboard',
  '/index.html'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Use Promise.allSettled to handle individual failures gracefully
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err);
              return null;
            })
          )
        );
      })
      .then(() => {
        console.log('Cache populated');
      })
      .catch(err => {
        console.error('Cache installation failed:', err);
      })
  );
  // Force activation of new service worker
  self.skipWaiting();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Skip caching for Vite dev server requests
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/@') || url.pathname.includes('vite') || url.hostname === 'localhost') {
    // For Vite dev server, always fetch from network
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
      .catch(() => {
        // If fetch fails, return cached response if available
        return caches.match(event.request);
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});




