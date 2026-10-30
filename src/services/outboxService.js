import { getDB } from './dbService.js';
import { context, request } from './apiService.js';
import { showReportSyncNotification } from './localNotificationService.js';

export const SYNC_TAG = 'aquapaz-reportes-v1';
export async function records(store) {
  const db = await getDB();
  try { return await db.getAll(store); } finally { db.close(); }
}
export async function enqueueReport(payload) {
  const {base, session} = await context();
  if (!session?.user) throw new Error('Inicia sesión antes de guardar reportes.');
  const id = crypto.randomUUID();
  const item = {id, base, owner: session.user.id, payload: {...payload, colonia: session.user.colonia, client_id: id}, created: new Date().toISOString(), attempts: 0};
  const db = await getDB();
  try { await db.add('outbox', item); } finally { db.close(); }
  return item;
}
export async function notify() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('outbox-change'));
  else for (const client of await self.clients.matchAll({type: 'window'})) client.postMessage({type: 'OUTBOX_CHANGED'});
}
// Lease transaccional compartido por pestañas y SW; mayor que el timeout HTTP.
async function acquire(db, token) {
  const tx = db.transaction('settings', 'readwrite');
  const lock = await tx.store.get('outbox-lock');
  const ok = !lock || lock.until < Date.now();
  if (ok) await tx.store.put({id: 'outbox-lock', token, until: Date.now() + 60000});
  await tx.done;
  return ok;
}
export async function flushOutbox() {
  if (globalThis.navigator?.locks) {
    return navigator.locks.request('aquapaz-outbox-send', () => drain(true));
  }
  return drain(false);
}
async function drain(webLock) {
  const db = await getDB(), token = crypto.randomUUID();
  if (!webLock && !await acquire(db, token)) { db.close(); throw new Error('Hay otro envío en curso. Reintenta en un minuto.'); }
  try {
    const {base, session} = await context();
    let syncedCount = 0;
    for (const item of await db.getAll('outbox')) {
      if (!session || item.base !== base || item.owner !== session.user.id) continue;
      // Renovación antes de cada petición; nunca mantener una transacción durante fetch.
      if (!webLock) await db.put('settings', {id: 'outbox-lock', token, until: Date.now() + 60000});
      try {
        if (session.user.colonia !== item.payload.colonia) throw new Error('La colonia cambió. Recupera la colonia original para enviar este pendiente.');
        const server = await request('/api/reportes', {method: 'POST', body: item.payload, base, session});
        if (!server.id || server.client_id !== item.id) throw new Error('Respuesta sin confirmación válida; se conserva el pendiente.');
        const tx = db.transaction(['outbox', 'receipts'], 'readwrite');
        await tx.objectStore('receipts').put({...item, server, sent: new Date().toISOString()});
        await tx.objectStore('outbox').delete(item.id);
        await tx.done;
        syncedCount++;
        console.info('[Outbox] Envío confirmado', server.id);
      } catch (error) {
        await db.put('outbox', {...item, attempts: item.attempts + 1, error: error.message});
        throw error; // El rechazo llega a sync.waitUntil para permitir reintentos.
      } finally { await notify(); }
    }

    if (syncedCount > 0) {
      const remaining = (await db.getAll('outbox')).some((item) => (
        item.base === base && item.owner === session.user.id
      ));

      if (!remaining) {
        await showReportSyncNotification({ count: syncedCount, owner: session.user.id, base });
      }
    }
  } finally {
    const tx = db.transaction('settings', 'readwrite');
    const lock = await tx.store.get('outbox-lock');
    if (lock?.token === token) await tx.store.delete('outbox-lock');
    await tx.done;
    db.close();
  }
}
