const CACHE_NAME = 'memorabet-web-v104';

const LOCAL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './auth.js',
  './audio.js',
  './constants.js',
  './database.js',
  './firebase-config.js',
  './game.js',
  './i18n.js',
  './state.js',
  './ui.js',
  './utils.js',
  './manifest.webmanifest',
  './assets/logo.png',
  './assets/memorabet-logo.png',
  './assets/casino-background.png',
  './assets/app-icon-192.png',
  './assets/app-icon-512.png',
  './assets/mode-solo.png',
  './assets/mode-duel.png',
  './assets/mode-online-duel.png',
  './assets/mode-memory-duel.png',
  './assets/mode-online-memory-duel.png',
  './assets/animals/vaca.png',
  './assets/animals/zorro.png',
  './assets/animals/gato.png',
  './assets/animals/pollo.png',
  './assets/animals/raton.png',
  './assets/animals/leon.png',
  './assets/animals/rana.png',
  './assets/animals/perro.png',
  './assets/card-backs/skin-galaxy.png?v=2',
  './assets/card-backs/skin-arcane.png?v=2',
  './assets/card-backs/skin-forest.png?v=2',
  './assets/card-backs/skin-storm.png?v=2',
  './assets/card-backs/skin-royal.png?v=2',
  './assets/card-backs/skin-inferno.png?v=2',
  './assets/card-backs/skin-radiant.png?v=2',
  './assets/card-backs/skin-tech.png?v=2',
  './assets/sounds/rival-found.mp3',
  './assets/sounds/casino-vip-7.mp3',
  './assets/sounds/we-will-empty-this-casino.mp3',
  './assets/sounds/casino-vip-1.mp3'
];

const avatarAssets = Array.from({ length: 37 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return `./assets/avatars/avatar-${number}.png`;
});

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([...LOCAL_ASSETS, ...avatarAssets]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if(request.method !== 'GET') return;

  const url = new URL(request.url);
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if(response && response.ok){
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
