/* Sankirtan service worker — offline app shell + asset caching.
   Strategy:
   - Navigations (opening the app)  : network first, fall back to cached index.html
   - Same-origin static assets       : stale-while-revalidate (serve cache, refresh in background)
   - CDN scripts (Tailwind, Firebase): stale-while-revalidate
   - Firestore / Google APIs / YouTube: never cached, network only
*/

const CACHE = 'sankirtan-v1';
const SHELL = ['/', '/index.html', '/manifest.json', '/logo192.png', '/logo512.png', '/favicon.ico'];

const CDN_HOSTS = ['cdn.tailwindcss.com', 'www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const NEVER_CACHE = [
  'firestore.googleapis.com', 'firebase.googleapis.com', 'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com', 'www.googleapis.com', 'www.google-analytics.com',
  'firebaseinstallations.googleapis.com', 'youtube.com', 'youtube-nocookie.com', 'ytimg.com',
  'googlevideo.com', 'accounts.google.com', 'apis.google.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function staleWhileRevalidate(request) {
  return caches.open(CACHE).then((cache) =>
    cache.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
            cache.put(request, res.clone());
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Live data and third-party embeds: leave untouched
  if (NEVER_CACHE.some((h) => url.hostname === h || url.hostname.endsWith('.' + h))) return;

  // App navigations: network first, cached shell when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(CACHE).then((cache) => cache.put('/index.html', res.clone()));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isCdn = CDN_HOSTS.includes(url.hostname);

  if (sameOrigin || isCdn) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
