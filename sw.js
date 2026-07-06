// World Cup 26 — Match Day Map · service worker
// App-shell caching for offline + installability. Network-first for navigations
// and for data.js (fresh app + fresh match data when online, cached fallback
// offline); cache-first for the other static shell assets (icons, manifest) —
// bump CACHE when THOSE change; runtime cache for cross-origin CDN assets
// (Leaflet, fonts, flags).
const CACHE = 'wcviz-v24';
const SHELL = [
  './',
  './index.html',
  './data.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never cache live data APIs — always hit the network.
  if (/wikipedia\.org|espn\.com/.test(url.hostname)) return;

  // Media (the Mexico easter-egg clip): bypass the SW entirely. Audio seeking sends
  // Range requests the Cache API can't store (206 partials throw on cache.put), and
  // there's no reason to precache a one-off clip — let the browser handle it natively.
  if (/\.(mp3|m4a|ogg|wav)$/i.test(url.pathname)) return;

  // Navigations: network-first, fall back to the cached app shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        caches.open(CACHE).then(c => c.put('./index.html', res.clone()));
        return res;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // data.js: network-first (revalidate) so score/time edits reach clients on a
  // normal reload without a CACHE bump; fall back to the cached copy when offline.
  if (url.origin === self.location.origin && url.pathname.endsWith('/data.js')) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Same-origin shell: cache-first, then network (and cache the result).
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => hit))
    );
    return;
  }

  // Cross-origin CDN assets (map tiles, Leaflet, fonts, flags): stale-while-revalidate.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

// Focus/open the app when a notification is tapped.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      for (const c of cs) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
