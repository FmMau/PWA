import {
  supportsNotifications,
  getPermission,
  enableNotifications,
} from './notifications.js';
import { supportsPush, getSubscription, subscribeToPush, unsubscribeFromPush, syncSubscription } from './pushSubscription.js';

const button = () => document.getElementById('notify-btn');
const status = () => document.getElementById('notification-permission-status');

let requesting = false;
let requestError = '';
let dismissed = false;
let previousPermission;
let subscribed = false;

function paint() {
  const element = button();
  const description = status();

  if (!element || !description) return;

  const permission = getPermission();
  const help = document.getElementById('notification-help-button');

  if (previousPermission && previousPermission !== permission) dismissed = false;
  previousPermission = permission;
  const labels = {
    default: 'Activar notificaciones',
    granted: 'Notificaciones activas',
    denied: 'Notificaciones bloqueadas',
    unsupported: 'Notificaciones no disponibles',
  };
  const messages = {
    default: '',
    granted: '',
    denied: 'Revisa los permisos del sitio para recibir avisos.',
    unsupported: '',
  };

  element.hidden = !supportsNotifications();
  element.dataset.permission = permission;
  element.disabled = requesting || dismissed || permission === 'denied' || permission === 'unsupported'
    || (permission === 'granted' && !supportsPush());
  element.querySelector('span').textContent = requesting
    ? 'Solicitando permiso…'
    : dismissed && permission === 'default' ? 'Revisa la solicitud del navegador'
      : permission === 'granted' && supportsPush()
        ? subscribed ? 'Desactivar avisos push' : 'Activar avisos push' : labels[permission];

  description.textContent = requestError || (dismissed && permission === 'default'
    ? 'Revisa la solicitud de permiso en la barra de direcciones.'
    : messages[permission]);
  description.hidden = !description.textContent;

  if (help) help.hidden = permission !== 'denied' && !dismissed;
}

async function refreshPush() {
  subscribed = Boolean(await getSubscription());
  paint();
}

async function watchPermission() {
  try {
    const permission = await navigator.permissions.query({ name: 'notifications' });
    permission.onchange = paint;
  } catch {
  }
}

export function initNotificationButton() {
  const element = button();
  if (!element || element.dataset.initialized === 'true') return;
  element.dataset.initialized = 'true';

  paint();
  watchPermission();
  const synchronize = async () => {
    try { await syncSubscription(); }
    catch (error) { requestError = error.message; }
    await refreshPush();
  };
  synchronize().catch(console.warn);
  window.addEventListener('pwa-registration', () => synchronize().catch(console.warn));
  window.addEventListener('auth-change', () => synchronize().catch(console.warn));
  window.addEventListener('online', () => synchronize().catch(console.warn));

  const help = document.getElementById('notification-help');

  document.getElementById('notification-help-button')?.addEventListener('click', () => {
    help.querySelector('[data-notification-origin]').textContent = location.origin;
    if (!help.open) help.showModal();
  });

  document.getElementById('notification-recheck-button')?.addEventListener('click', () => {
    dismissed = false;
    requestError = '';
    paint();
    help.close();
  });

  button()?.addEventListener('click', async () => {
    if (requesting || dismissed || ['denied', 'unsupported'].includes(getPermission())) return;

    requesting = true;
    requestError = '';
    paint();

    try {
      const permission = supportsPush()
        ? subscribed ? (await unsubscribeFromPush(), getPermission()) : await subscribeToPush()
        : await enableNotifications();
      dismissed = permission === 'default';
    } catch (error) {
      requestError = error.message || 'No se pudo activar push. Intenta de nuevo.';
    } finally {
      requesting = false;
      await refreshPush();
    }
  });

  window.addEventListener('focus', paint);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') paint();
  });
}
