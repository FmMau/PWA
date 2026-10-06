console.info('[SW] Se ejecutó el Service Worker');
console.info('[SW] Contexto global:', self.constructor.name);
console.info('[SW] typeof window:', typeof window);
console.info('[SW] typeof document:', typeof document);
console.info('[SW] typeof localStorage:', typeof localStorage);
console.info('[SW] Scope:', self.registration.scope);

const CACHE_VERSION = 'aquapaz-app-shell-v3';
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
    await Promise.all(names.filter((name) => name.startsWith('aquapaz-app-shell-') && name !== CACHE_VERSION).map(async (name) => {
      await caches.delete(name);
      console.info('[SW] Caché anterior eliminada:', name);
    }));
    console.info('[SW] Versión activa:', CACHE_VERSION);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_VERSION') event.ports[0]?.postMessage(CACHE_VERSION);
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Solo GET, las operaciones que modifican datos no deben responderse desde caché
  if (request.method !== 'GET') return;
  // Solo el mismo origen, los servicios externos conservan su comportamiento de red
  if (new URL(request.url).origin !== self.location.origin) return;

  // Todas las navegaciones usan una unica entrada del App Shell, sin duplicar rutas
  const key = request.mode === 'navigate' ? new URL('index.html', APP_BASE).href : request;
  const responsePromise = (async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(key);
    console.info(cached ? '[SW] HIT' : '[SW] MISS', request.url);
    if (cached) return { response: cached };
    const response = await fetch(key);
    // Clonar antes de entregar el body al navegador
    return { response, copy: response.ok ? response.clone() : null };
  })();
  event.respondWith(responsePromise.then(({ response }) => response));
  // Se registra durante el evento para mantener vivo el SW hasta terminar cache.put
  event.waitUntil(responsePromise.then(async ({ copy }) => {
    if (!copy) return; // Los errores no deben persistir ni ocultar una recuperación
    const cache = await caches.open(CACHE_VERSION);
    await cache.put(key, copy);
  }).catch((error) => console.warn('[SW] No se pudo guardar el recurso:', request.url, error)));
});
