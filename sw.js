/* Mon cahier à gommettes : fonctionnement sans connexion.
   La page est cherchée sur internet d'abord (pour recevoir les mises à jour),
   puis dans la copie gardée sur le téléphone si le réseau manque.
   Changer VERSION à chaque mise à jour des fichiers. */
const VERSION = 'gommettes-v2';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];
const FONTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function keep(req, res) {
  if (res && (res.ok || res.type === 'opaque')) {
    const copy = res.clone();
    caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // La page elle-même : réseau d'abord, copie locale si hors ligne
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => keep('./index.html', res))
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Icônes, manifeste et polices : copie locale tout de suite, mise à jour en arrière-plan
  if (url.origin === self.location.origin || FONTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => keep(req, res)).catch(() => hit);
        return hit || net;
      })
    );
  }
});
