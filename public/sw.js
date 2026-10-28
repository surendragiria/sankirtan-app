/* Sankirtan service worker — offline app shell + asset caching.
   Strategy:
   - Navigations (opening the app)  : cached shell first, refresh in background (S131)
   - Same-origin static assets       : stale-while-revalidate (serve cache, refresh in background)
   - CDN scripts (Tailwind, Firebase): stale-while-revalidate
   - Firestore / Google APIs / YouTube: never cached, network only
*/

const CACHE = 'sankirtan-v3'; // S137: rebuilt with shell assets precached
const SHELL = ['/index.html', '/manifest.json', '/logo192.png', '/logo512.png', '/favicon.ico', '/keepawake.mp4'];

const CDN_HOSTS = ['cdn.tailwindcss.com', 'www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const NEVER_CACHE = [
  'firestore.googleapis.com', 'firebase.googleapis.com', 'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com', 'www.googleapis.com', 'www.google-analytics.com',
  'firebaseinstallations.googleapis.com', 'youtube.com', 'youtube-nocookie.com', 'ytimg.com',
  'googlevideo.com', 'accounts.google.com', 'apis.google.com',
];

// S137: the shell is only usable together with the hashed JS/CSS it points
// at, so whenever we store an index.html we also store its assets. (S131
// stored new shells whose assets were not yet cached — opening the app on a
// weak or absent network then stalled on a script that was not there.)
async function cacheShellAssets(cache, html) {
  const urls = [];
  const re = /(?:src|href)="(\/static\/[^"]+\.(?:js|css))"/g;
  let m;
  while ((m = re.exec(html))) if (!urls.includes(m[1])) urls.push(m[1]);
  await Promise.all(urls.map(async (u) => {
    try {
      if (await cache.match(u)) return;
      const r = await fetch(u, { cache: 'no-cache' });
      if (r && r.ok) await cache.put(u, r);
    } catch (e) { /* retried on next load */ }
  }));
}

// A cached response that came via a redirect cannot be used to answer a
// navigation (Chrome fails the load with ERR_FAILED), and hosts redirect
// /index.html → /. So the shell is always stored as a fresh, plain Response.
const shellResponse = (html) => new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
async function storeShell(cache, html) {
  await cacheShellAssets(cache, html);
  await cache.put('/index.html', shellResponse(html));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const res = await fetch('/', { cache: 'no-cache' });
    const html = await res.text();
    await storeShell(cache, html);
    await Promise.all(SHELL.filter((u) => u !== '/index.html' && u !== '/').map((u) => cache.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
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
        .catch(() => cached || new Response('', { status: 503, statusText: 'offline' }));
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
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      let cached = await cache.match('/index.html');
      let cachedHtml = cached ? await cached.text() : null;
      if (cached && cached.redirected) { await cache.put('/index.html', shellResponse(cachedHtml)); } // repair entries made by older workers
      const refresh = (async () => {
        const res = await fetch(request);
        if (!res || !res.ok) return null;
        const html = await res.text();
        if (html !== cachedHtml) {
          await storeShell(cache, html);
          if (cachedHtml !== null) {
            const clients = await self.clients.matchAll({ type: 'window' });
            clients.forEach((c) => c.postMessage({ type: 'sankirtan-shell-updated' }));
          }
        }
        return html;
      })().catch(() => null);
      if (cachedHtml !== null) { event.waitUntil(refresh); return shellResponse(cachedHtml); }
      const fresh = await refresh;
      return fresh !== null ? shellResponse(fresh) : fetch(request);
    })());
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isCdn = CDN_HOSTS.includes(url.hostname);

  if (sameOrigin || isCdn) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
