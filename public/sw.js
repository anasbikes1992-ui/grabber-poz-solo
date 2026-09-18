// Minimal app-shell service worker: makes /pos and /shop installable and speeds up
// repeat loads of hashed static assets. Deliberately never caches HTML or /api/*
// responses — the existing IndexedDB offline queue (offline-engine.ts) owns
// transaction durability, so this worker must not risk serving stale commerce data.
const STATIC_CACHE = 'grabber-static-v1';
const CACHEABLE_PATH_PREFIXES = ['/_next/static/'];
const CACHEABLE_EXACT_PATHS = ['/icon.svg', '/manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

function isCacheable(url) {
  return (
    CACHEABLE_EXACT_PATHS.includes(url.pathname) ||
    CACHEABLE_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !isCacheable(url)) return;

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
  );
});
