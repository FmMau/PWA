console.info('[SW] Se ejecutó el Service Worker');
console.info('[SW] Contexto global:', self.constructor.name);
console.info('[SW] typeof window:', typeof window);
console.info('[SW] typeof document:', typeof document);
console.info('[SW] typeof localStorage:', typeof localStorage);
console.info('[SW] Scope:', self.registration.scope);

const CACHE_VERSION = 'aquapaz-app-shell-v2'; 
const APP_BASE = new URL('./', self.location.href);
const APP_SHELL = [
  'index.html',
  'styles/shell.css',
  'styles/main.css',
  'src/main.js',
  'src/router/router.js',
  'src/pwa/registerSW.js',
  'src/utils/theme.js',
  'src/utils/storage.js',
  'src/utils/visitCookie.js',
  'src/utils/cookies.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
].map((resource) => new URL(resource, APP_BASE).href);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await cache.addAll(APP_SHELL);
    console.info('[SW] App Shell precacheado:', CACHE_VERSION, APP_SHELL);
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    console.info('[SW] Cachés existentes:', names);
    await Promise.all(names.filter((name) => name !== CACHE_VERSION).map(async (name) => {
      await caches.delete(name);
      console.info('[SW] Caché anterior eliminada:', name);
    }));
    console.info('[SW] Versión activa:', CACHE_VERSION);
  })());
});
