// Service Worker for SmartSpend PWA
const CACHE_NAME = 'smartspend-v2';
const STATIC_CACHE_NAME = 'smartspend-static-v2';
const DYNAMIC_CACHE_NAME = 'smartspend-dynamic-v2';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/login',
  '/transactions',
  '/incomes',
  '/settings',
  '/overview',
  '/manifest.json',
  // Add other static assets as needed
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests (like Firebase, Google APIs)
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache', request.url);
          return cachedResponse;
        }

        // Otherwise, fetch from network and cache the response
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response before caching
            const responseToCache = response.clone();

            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                console.log('Service Worker: Caching new resource', request.url);
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.log('Service Worker: Fetch failed, serving offline page', error);

            // Return a custom offline page for navigation requests
            if (request.destination === 'document') {
              return caches.match('/offline.html') || new Response(
                '<html><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
              );
            }
          });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);

  if (event.tag === 'expense-sync') {
    event.waitUntil(syncOfflineExpenses());
  }

  if (event.tag === 'income-sync') {
    event.waitUntil(syncOfflineIncomes());
  }
});

// Sync offline expenses when connection is restored
async function syncOfflineExpenses() {
  try {
    console.log('Service Worker: Syncing offline expenses...');

    // Get offline expenses from IndexedDB
    const offlineExpenses = await getOfflineExpenses();

    if (offlineExpenses.length > 0) {
      // Send notification to main thread to sync data
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_OFFLINE_EXPENSES',
          data: offlineExpenses
        });
      });
    }
  } catch (error) {
    console.error('Service Worker: Error syncing offline expenses', error);
  }
}

// Sync offline incomes when connection is restored
async function syncOfflineIncomes() {
  try {
    console.log('Service Worker: Syncing offline incomes...');

    // Get offline incomes from IndexedDB
    const offlineIncomes = await getOfflineIncomes();

    if (offlineIncomes.length > 0) {
      // Send notification to main thread to sync data
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_OFFLINE_INCOMES',
          data: offlineIncomes
        });
      });
    }
  } catch (error) {
    console.error('Service Worker: Error syncing offline incomes', error);
  }
}

// Helper functions for IndexedDB operations
async function getOfflineExpenses() {
  // This would integrate with IndexedDB to get offline expenses
  // For now, return empty array
  return [];
}

async function getOfflineIncomes() {
  // This would integrate with IndexedDB to get offline incomes
  // For now, return empty array
  return [];
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New notification from SmartSpend',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view-icon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/close-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('SmartSpend', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});