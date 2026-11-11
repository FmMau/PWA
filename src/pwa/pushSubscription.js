import { context, request } from '../services/apiService.js';

const APP_BASE = new URL('../../', import.meta.url);
export const supportsPush = () => Boolean(globalThis.isSecureContext && 'Notification' in globalThis
  && globalThis.navigator?.serviceWorker && 'PushManager' in globalThis);

async function registration() {
  return navigator.serviceWorker.getRegistration(APP_BASE.href);
}

export async function getSubscription() {
  if (!supportsPush()) return null;
  return (await registration())?.pushManager.getSubscription() || null;
}

export function decodeKey(value) {
  const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

export async function subscribeToPush() {
  // Solicitar permiso antes del primer await conserva el gesto del usuario.
  const permission = Notification.permission === 'default'
    ? await Notification.requestPermission() : Notification.permission;
  if (permission !== 'granted') return permission;
  const current = await context();
  if (!current.session?.token) throw new Error('Inicia sesión para activar los avisos push.');
  const reg = await registration();
  if (!reg?.active) throw new Error('Espera a que termine de iniciar la aplicación e intenta de nuevo.');
  const { publicKey } = await request('/api/push/public-key', { ...current, publicAccess: true });
  const key = decodeKey(publicKey);
  let subscription = await reg.pushManager.getSubscription();
  const previous = subscription?.options.applicationServerKey;
  if (subscription && previous && String(new Uint8Array(previous)) !== String(key)) {
    await request('/api/push/unsubscribe', { ...current, method: 'POST', body: { endpoint: subscription.endpoint } });
    await subscription.unsubscribe();
    subscription = null;
  }
  const created = !subscription;
  subscription ||= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  try {
    await request('/api/push/subscribe', { ...current, method: 'POST', body: subscription.toJSON() });
  } catch (error) {
    if (created) await subscription.unsubscribe().catch(() => {});
    throw error;
  }
  return permission;
}

export async function syncSubscription() {
  const current = await context();
  if (!current.session?.token) return;
  const subscription = await getSubscription();
  if (subscription) await request('/api/push/subscribe', { ...current, method: 'POST', body: subscription.toJSON() });
}

export async function unsubscribeFromPush() {
  const subscription = await getSubscription();
  if (!subscription) return;
  await request('/api/push/unsubscribe', { method: 'POST', body: { endpoint: subscription.endpoint } });
  if (!await subscription.unsubscribe()) throw new Error('No se pudo dar de baja este dispositivo. Intenta de nuevo.');
}
