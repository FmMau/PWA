import { flushOutbox, notify, SYNC_TAG } from '../services/outboxService.js';
let registrationFailed = false;
export function syncMode() {
  if (new URL(location.href).searchParams.get('sync') === 'off') return 'Plan B simulado: al abrir, evento online y botón Reintentar ahora.';
  return 'SyncManager' in window && !registrationFailed ? 'Background Sync: envío en segundo plano y reintento manual.' : 'Plan B: al abrir, evento online y botón Reintentar ahora.';
}
export async function retryReports() {
  if ('SyncManager' in window && new URL(location.href).searchParams.get('sync') !== 'off') {
    try {
      const reg = await navigator.serviceWorker.getRegistration(new URL('../../', import.meta.url).href);
      if (!reg?.active || !reg.sync) throw new Error('SW aún no disponible');
      await reg.sync.register(SYNC_TAG);
      registrationFailed = false;
    } catch { registrationFailed = true; }
  }
  await notify();
  try { await flushOutbox(); } finally { await notify(); }
}
export function initReportSync() {
  const retry = () => retryReports().catch(error => console.info('[Outbox] Pendiente:', error.message));
  window.addEventListener('online', retry);
  window.addEventListener('pwa-registration', retry);
  window.addEventListener('auth-change', retry);
  navigator.serviceWorker?.addEventListener('message', event => { if (event.data?.type === 'OUTBOX_CHANGED') notify(); });
  retry();
}
