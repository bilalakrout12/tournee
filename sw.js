/* Tournée Piscines : fonctionnement hors ligne.
   Change VERSION à chaque mise en ligne d'une nouvelle version de l'appli. */
const VERSION = 'tournee-v1.0';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'tournee-fonts').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // Réponse immédiate depuis le cache, mise à jour en arrière-plan quand le réseau est là.
    const key = req.mode === 'navigate' ? './index.html' : req;
    const fresh = fetch(req).then(async r => {
      if (r && r.ok) { const c = await caches.open(VERSION); await c.put(key, r.clone()); }
      return r;
    }).catch(() => null);
    e.waitUntil(fresh.then(() => undefined));
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      const hit = await c.match(key, { ignoreSearch: true });
      return hit || (await fresh) || new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    })());
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith((async () => {
      const c = await caches.open('tournee-fonts');
      const hit = await c.match(req);
      if (hit) return hit;
      try { const r = await fetch(req); c.put(req, r.clone()); return r; }
      catch { return new Response('', { status: 504 }); }
    })());
  }
});
