self.addEventListener('install', (event) => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  clients.claim();
});
// Optional: basic fetch passthrough (keeps PWA "installable" without aggressive caching)
self.addEventListener('fetch', () => {});
