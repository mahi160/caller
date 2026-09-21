// Minimal service worker: only exists so the browser considers the PWA
// installable (Chrome requires a registered SW with a fetch handler). No
// offline caching — calls are realtime/server-dependent anyway, so caching
// stale data would be actively misleading.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
