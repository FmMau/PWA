const appBase = new URL('../../', import.meta.url);

function relatedURL(value) {
  try {
    const target = new URL(value, appBase);

    if (
      typeof value === 'string'
      && target.origin === appBase.origin
      && target.pathname.startsWith(appBase.pathname)
      && !target.username
      && !target.password
    ) {
      return target;
    }
  } catch {
  }

  return new URL('#/reportes', appBase);
}

export async function openOrFocus(value, clients) {
  const target = relatedURL(value);
  const windows = await clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  const appWindows = windows.filter((client) => {
    const url = new URL(client.url);
    return url.origin === appBase.origin && url.pathname.startsWith(appBase.pathname);
  });
  const existing = appWindows.find((client) => client.url === target.href)
    || appWindows.find((client) => client.visibilityState === 'visible')
    || appWindows[0];

  if (existing) {
    try {
      const client = existing.url === target.href
        ? existing
        : await existing.navigate(target.href);

      if (client) return await client.focus();
    } catch {
    }
  }

  return clients.openWindow(target.href);
}

export function handleNotificationClick(event, clients) {
  event.notification.close();
  event.waitUntil(openOrFocus(event.notification.data?.url, clients));
}
