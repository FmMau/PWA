const APP_BASE = new URL('../../', import.meta.url);

export function handlePush(event, registration) {
  let message = {};
  try { message = event.data?.json() || {}; }
  catch { message = { body: event.data?.text() || '' }; }
  if (typeof message === 'string') message = { body: message };
  let target = new URL('#/notificaciones', APP_BASE);
  try {
    const candidate = new URL(message.url, APP_BASE);
    if (typeof message.url === 'string' && candidate.origin === APP_BASE.origin
      && candidate.pathname.startsWith(APP_BASE.pathname) && !candidate.username && !candidate.password) target = candidate;
  } catch {}
  event.waitUntil(registration.showNotification(
    typeof message.title === 'string' ? message.title : 'AquaPaz', {
      body: typeof message.body === 'string' ? message.body : 'Tienes un nuevo aviso.',
      icon: new URL('icons/manifest-icon-192.png', APP_BASE).href,
      badge: new URL('icons/manifest-icon-192.png', APP_BASE).href,
      tag: typeof message.tag === 'string' ? message.tag : 'aquapaz-push',
      data: { url: target.href },
    },
  ));
}
