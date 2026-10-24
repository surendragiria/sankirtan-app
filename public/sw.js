/* Sankirtan service worker — offline app shell + asset caching.
   Strategy:
   - Navigations (opening the app)  : cached shell first, refresh in background (S131)
   - Same-origin static assets       : stale-while-revalidate (serve cache, refresh in background)
   - CDN scripts (Tailwind, Firebase): stale-while-revalidate
   - Firestore / Google APIs / YouTube: never cached, network only
*/

const CACHE = 'sankirtan-v2'; // S129: bumped so stale /api/ responses are purged
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
  // Our own serverless API (fetch-lyrics, ocr): always live, never cached
  if (url.pathname.startsWith('/api/')) return;

  // App navigations (S131): cached shell FIRST so the app opens instantly on
  // weak or no network; the network copy is fetched in the background and,
  // if it changed, stored for next launch and the app is told so it can show
  // its "update available" banner. First-ever open (nothing cached) still
  // goes to the network.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => {
        const refresh = fetch(request)
          .then(async (res) => {
            if (!res || !res.ok) return res;
            const copy = res.clone();
            if (cached) {
              const [a, b] = await Promise.all([cached.clone().text(), res.clone().text()]);
              if (a !== b) {
                await caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
                const clients = await self.clients.matchAll({ type: 'window' });
                clients.forEach((c) => c.postMessage({ type: 'sankirtan-shell-updated' }));
              }
            } else {
              await caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
            }
            return res;
          })
          .catch(() => cached);
        if (cached) { event.waitUntil(refresh.catch(() => {})); return cached; }
        return refresh;
      })
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isCdn = CDN_HOSTS.includes(url.hostname);

  if (sameOrigin || isCdn) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
