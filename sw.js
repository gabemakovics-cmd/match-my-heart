const cacheName = 'match-my-heart-v1';
const assets = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './globals.js',
  './saveandload.js',
  './ui.js',
  './powerups.js',
  './boosters.js',
  './level-initialize.js',
  './game-engine.js',
  './input.js',
  './debug.js',
  './level-end.js',
  './icon-192.png',
  './icon-512.png'
  // Ha szeretnéd, hogy a háttérképek is működjenek offline, add hozzá őket is:
  // './kep1.jpg', './kep2.jpg' ... stb.
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => {
      return res || fetch(e.request);
    })
  );
});