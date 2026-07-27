const CACHE_NAME = 'lear-maintenance-v1';
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
  // On ne cache jamais les appels API : les données doivent toujours être fraîches.
  if (event.request.url.includes('/api/') || event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((reponse) => reponse || fetch(event.request))
  );
});