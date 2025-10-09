self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));
// Не хващаме fetch — оставяме браузъра да си тегли директно (няма кеш ловене)
