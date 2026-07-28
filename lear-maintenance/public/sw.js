const CACHE_NAME = 'lear-maintenance-v2';
const URLS_A_METTRE_EN_CACHE = ['/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_A_METTRE_EN_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((noms) =>
      Promise.all(noms.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // On ne touche à rien de ce qui n'est pas une simple requête GET sur notre propre domaine :
  // ni les appels vers le backend Render (autre origine), ni les navigations de page,
  // ni les POST/PUT/DELETE. On les laisse passer normalement au réseau.
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') return;
  if (!URLS_A_METTRE_EN_CACHE.includes(url.pathname)) return;

  event.respondWith(
    caches.match(event.request).then((reponse) => reponse || fetch(event.request))
  );
});