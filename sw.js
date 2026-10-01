// Network first, so updates show up straight away; the cache keeps the app working offline.
const CACHE = 'note-by-note-v8';
const ASSETS = [
  './',
  'index.html',
  'app.css',
  'manifest.webmanifest',
  'js/app.js',
  'js/art.js',
  'js/audio.js',
  'js/import.js',
  'js/lane.js',
  'js/lessons.js',
  'js/library.js',
  'js/midi.js',
  'js/music.js',
  'js/musicxml.js',
  'js/nbn.js',
  'js/pin.js',
  'js/pitch.js',
  'js/score.js',
  'js/songs.js',
  'js/store.js',
  'js/text.js',
  'js/tune.js',
  'js/unzip.js',
  'js/xml.js',
  'fonts/fraunces-soft.woff2',
  'fonts/nunito.woff2',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
