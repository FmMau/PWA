const CACHE_VERSION = 'aquapaz-app-shell-v4';
const APP_BASE = new URL('./', self.location.href);
const LOCAL_RESOURCES = [
  'index.html', 'styles/shell.css', 'styles/main.css', 'src/main.js', 'src/router/router.js',
  ...['registerSW', 'connectionStatus', 'diagnostics', 'cacheDebug'].map(n => `src/pwa/${n}.js`),
  'src/components/ItemCard.js',
  ...['About', 'Dashboard', 'Diagnostics', 'ItemDetail', 'Map', 'NotFound', 'Reports', 'Statistics', 'Storage', 'Supply', 'Trucks', 'Weather'].map(n => `src/views/${n}View.js`),
  ...['WeatherService', 'dbService', 'itemsService', 'truckDbService'].map(n => `src/services/${n}.js`),
  ...['cookies', 'slugify', 'storage', 'theme', 'visitCookie'].map(n => `src/utils/${n}.js`),
  'src/vendor/idb.js', 'data/cache-demo.json', 'data/avisos.json',
];
const ICON_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/';
const EXTERNAL_RESOURCES = [`${ICON_BASE}css/all.min.css`,
  ...['fa-solid-900', 'fa-regular-400', 'fa-brands-400'].map(n => `${ICON_BASE}webfonts/${n}.woff2`)];
const APP_SHELL = [...LOCAL_RESOURCES.map(p => new URL(p, APP_BASE).href), ...EXTERNAL_RESOURCES];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await (await caches.open(CACHE_VERSION)).addAll(APP_SHELL);
    console.info('[SW] Precaching completo', CACHE_VERSION, APP_SHELL);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith('aquapaz-app-shell-') && n !== CACHE_VERSION).map(n => caches.delete(n)));
    await self.clients.claim();
    console.info('[SW] Versión activa', CACHE_VERSION);
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'CACHE_VERSION') event.ports[0]?.postMessage(CACHE_VERSION);
});
function emergency(request) {
  const url = new URL(request.url);
  const json = url.pathname.endsWith('.json') || url.hostname === 'api.open-meteo.com';
  return new Response(json ? JSON.stringify({ error: 'Sin conexión y sin datos guardados.' }) : 'AquaPaz: recurso no disponible sin conexión.', {
    status: 503, headers: { 'Content-Type': json ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8' },
  });
}
async function fromNetwork(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(request, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await (await caches.open(CACHE_VERSION)).put(request, response.clone());
    return response;
  } finally { clearTimeout(timeout); }
}
async function cacheFirst(request) {
  const cached = await (await caches.open(CACHE_VERSION)).match(request);
  console.info('[SW] Cache First', cached ? 'caché' : 'red', request.url);
  return cached || await fromNetwork(request).catch(() => emergency(request));
}
async function networkFirst(request) {
  try {
    const response = await fromNetwork(request);
    console.info('[SW] Network First: red', request.url);
    return response;
  } catch {
    const cached = await (await caches.open(CACHE_VERSION)).match(request);
    console.info('[SW] Network First:', cached ? 'caché' : '503', request.url);
    return cached || emergency(request);
  }
}
function staleWhileRevalidate(request, event) {
  // waitUntil debe registrarse durante, antes de cualquier await.
  const update = fromNetwork(request).catch(() => null);
  event.waitUntil(update);
  return (async () => {
    const cached = await (await caches.open(CACHE_VERSION)).match(request);
    console.info('[SW] SWR:', cached ? 'caché y actualización' : 'red', request.url);
    return cached || await update || emergency(request);
  })();
}
function strategyFor(request) {
  const url = new URL(request.url);
  if (request.method !== 'GET') return null;
  if (url.origin === APP_BASE.origin && url.pathname.startsWith(APP_BASE.pathname)) {
    if (url.pathname === new URL('data/cache-demo.json', APP_BASE).pathname) return networkFirst;
    if (url.pathname === new URL('data/avisos.json', APP_BASE).pathname) return staleWhileRevalidate;
    return cacheFirst;
  }
  if (EXTERNAL_RESOURCES.includes(url.href)) return cacheFirst;
  if (url.origin === 'https://api.open-meteo.com' && url.pathname === '/v1/forecast') return networkFirst;
  return null;
}
self.addEventListener('fetch', event => {
  const strategy = strategyFor(event.request);
  if (!strategy) return;
  const request = event.request.mode === 'navigate' && event.request.url.startsWith(APP_BASE.href)
    ? new Request(new URL('index.html', APP_BASE)) : event.request;
  event.respondWith(strategy(request, event));
});
