// Única base: se resuelve respecto al módulo, nunca respecto al hash del router.
export const APP_BASE = new URL('../../', import.meta.url);
export const swURL = new URL('sw.js', APP_BASE);
export const temporaryURL = new URL('src/pwa/temporary/sw.js', APP_BASE);
export const temporaryScope = new URL('./', temporaryURL);
export const narrowScope = new URL('laboratorio/', APP_BASE);

export function isWithinScope(route, scope) {
  const url = new URL(route, APP_BASE);
  url.hash = '';
  return url.href.startsWith(new URL(scope, APP_BASE).href);
}

export async function registerSW() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Este navegador no soporta Service Workers.');
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register(swURL.href, {
      scope: APP_BASE.href,
    });
    console.info('[PWA] Registro correcto. Scope:', registration.scope);
    console.info('[PWA] Controller al registrar:', navigator.serviceWorker.controller);
    window.dispatchEvent(new Event('pwa-registration'));
    return registration;
  } catch (error) {
    console.error('[PWA] No se pudo registrar el Service Worker:', error);
    return null;
  }
}
