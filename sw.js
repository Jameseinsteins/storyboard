/* ================================================================
   sw.js — Service Worker for PWA offline support
   Caches all core assets so the site loads instantly on phones.
   MP3s are NOT precached (too large) but cached on first play.
   ================================================================ */

const CACHE_NAME = 'james-story-v1';

/* Files to precache on install */
const PRECACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/animation.js',
    '/game.js',
    '/pixelwater.js',
    '/storygame.js',
    '/maze.js',
    '/ads.js',
    '/music.js',
    '/manifest.json',
    '/icon.svg',
    '/nowme.jpeg',
    '/gooding.jpeg',
    '/earlychild.jpeg',
    '/schooldays.jpeg',
    '/lala.jpeg',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Playfair+Display:ital,wght@0,700;1,400&display=swap',
];

/* Install — cache all core assets */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

/* Activate — delete old caches */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

/* Fetch — cache-first for precached assets, network-first for MP3s */
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // MP3s: network first, cache as fallback (lazy cache)
    if (url.pathname.endsWith('.mp3')) {
        event.respondWith(
            fetch(event.request)
                .then(res => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                    return res;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Everything else: cache first, then network
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(res => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                return res;
            });
        })
    );
});
