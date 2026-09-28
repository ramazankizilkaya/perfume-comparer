const CACHE_NAME = 'aura-compare-v1';
const PRECACHE_ASSETS = [
    '/',
    '/tr',
    '/favicon.ico',
    '/icon-192.png',
    '/icon-512.png',
    '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn('Pre-cache error:', err);
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Skip API, admin, and chrome extensions
    if (
        url.pathname.startsWith('/api') ||
        url.pathname.startsWith('/tr/admin') ||
        url.protocol.startsWith('chrome-extension')
    ) {
        return;
    }

    // Network-first strategy with cache fallback
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                }
                return response;
            })
            .catch(async () => {
                const cachedResponse = await caches.match(request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                if (request.mode === 'navigate') {
                    const fallback = (await caches.match('/tr')) || (await caches.match('/'));
                    if (fallback) return fallback;
                }
                return new Response('Çevrimdışısınız. Lütfen internet bağlantınızı kontrol edin.', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                });
            })
    );
});
