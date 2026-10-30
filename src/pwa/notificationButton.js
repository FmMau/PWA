import {
  supportsNotifications,
  getPermission,
  enableNotifications,
} from './notifications.js';

const button = () => document.getElementById('notify-btn');
const status = () => document.getElementById('notification-permission-status');

let requesting = false;
let requestError = '';
let dismissed = false;
let previousPermission;

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
    default: 'Sin solicitar (default)',
    granted: 'Permitidas (granted)',
    denied: 'Bloqueadas por el navegador (denied). Revisa los permisos del sitio.',
    unsupported: 'Requieren un navegador compatible y HTTPS o localhost.',
  };

  if (permission !== 'default') requestError = '';

  element.hidden = !supportsNotifications();
  element.dataset.permission = permission;
  element.disabled = requesting || dismissed || permission !== 'default';
  element.querySelector('span').textContent = requesting
    ? 'Solicitando permiso…'
    : dismissed && permission === 'default' ? 'Revisa la solicitud del navegador' : labels[permission];

  description.textContent = requestError || (dismissed && permission === 'default'
    ? 'Sin decisión (default). La solicitud se cerró o el navegador usa un aviso silencioso. Revisa la barra de direcciones.'
    : messages[permission]);

  if (help) help.hidden = permission !== 'denied' && !dismissed;
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
    if (requesting || dismissed || getPermission() !== 'default') return;

    requesting = true;
    requestError = '';
    paint();

    try {
      const permission = await enableNotifications();
      dismissed = permission === 'default';
    } catch {
      requestError = 'No se pudo solicitar el permiso. Intenta de nuevo.';
    } finally {
      requesting = false;
      paint();
    }
  });

  window.addEventListener('focus', paint);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') paint();
  });
}
