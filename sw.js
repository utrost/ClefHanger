const APP_VERSION = 'clefhanger-slice69-tester-readiness-2026-09-16';
const CACHE_NAME = 'clefhanger-pwa-v64';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/app.js',
  './src/core/audio.js',
  './src/core/game.js',
  './src/core/content.js',
  './src/core/input-compatibility.js',
  './src/core/scoring.js',
  './src/core/pitch.js',
  './src/core/mic-diagnostics.js',
  './src/core/learning.js',
  './src/core/lessons.js',
  './src/core/music-theory.js',
  './src/ui/staff-renderer.js',
  './src/ui/semantic-presenter.js',
  './src/ui/summary-focus.js',
  './src/platform/storage.js',
  './src/platform/microphone-session.js',
  './src/platform/microphone-controller.js',
  './src/platform/mic-recording-diagnostic.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
];

function appShellAssetForVersionedRequest(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return null;
  if (url.searchParams.size !== 1 || url.searchParams.get('v') !== APP_VERSION) return null;

  const scopePath = new URL('./', self.location.href).pathname;
  if (!url.pathname.startsWith(scopePath)) return null;

  const asset = `./${url.pathname.slice(scopePath.length)}`;
  return APP_SHELL.includes(asset) ? asset : null;
}

function matchVersionedPrecacheRequest(request) {
  const asset = appShellAssetForVersionedRequest(request);
  return asset ? caches.match(asset) : Promise.resolve(undefined);
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || matchVersionedPrecacheRequest(request))),
  );
});
