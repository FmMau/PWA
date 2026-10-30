const APP_BASE = new URL('../../', import.meta.url);
const NOTIFICATION_ICON = new URL('icons/manifest-icon-192.png', APP_BASE).href;

export function supportsNotifications() {
  return Boolean(
    globalThis.isSecureContext
    && 'Notification' in globalThis
    && (globalThis.registration || globalThis.navigator?.serviceWorker),
  );
}

export function getPermission() {
  return supportsNotifications() ? Notification.permission : 'unsupported';
}

export async function requestPermission() {
  if (getPermission() !== 'default') return getPermission();
  return Notification.requestPermission();
}

export async function enableNotifications() {
  return requestPermission();
}

export async function showLocalNotification(title, options = {}) {
  if (getPermission() !== 'granted') return false;

  const registration = globalThis.registration
    || await navigator.serviceWorker.getRegistration(APP_BASE.href);

  if (!registration?.active || typeof registration.showNotification !== 'function') {
    return false;
  }

  await registration.showNotification(title, {
    icon: NOTIFICATION_ICON,
    data: { url: new URL('#/reportes', APP_BASE).href },
    ...options,
  });

  return true;
}
