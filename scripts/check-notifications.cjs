const assert = require('node:assert/strict');
const fs = require('node:fs');
const server = require('./serve.cjs');

let chromium;

try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('C:/Users/TheMa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
}

(async () => {
  await new Promise((resolve) => server.listen(4179, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const origin = 'http://127.0.0.1:4179';

  async function mockAPI(context, options = {}) {
    await context.route('https://aquapaz-api-production.up.railway.app/**', (route) => {
      const request = route.request();

      if (options.offline) return route.abort('internetdisconnected');

      if (request.method() === 'POST') {
        if (options.fail) {
          return route.fulfill({ status: 503, json: { error: 'Sin servicio' } });
        }

        return route.fulfill({
          json: { id: 42, client_id: request.postDataJSON().client_id },
        });
      }

      if (request.url().includes('/api/gestion/')) {
        return route.fulfill({ status: 403, json: { error: 'Vista ciudadana' } });
      }

      return route.fulfill({ json: [] });
    });
  }

  async function signIn(page) {
    await page.evaluate(async () => {
      const api = await import('/src/services/apiService.js');

      await api.writeSetting('session', {
        token: 'notification-test',
        user: { id: 7, nombre: 'Prueba', colonia: 'Centro' },
      });

      window.dispatchEvent(new Event('auth-change'));
      location.hash = '/reportes';
    });

    await page.locator('#reporte-form').waitFor();
  }

  try {
    const ui = await browser.newContext({ serviceWorkers: 'block' });
    await mockAPI(ui);
    await ui.addInitScript(() => {
      window.testPermission = 'default';
      window.permissionRequests = 0;

      Object.defineProperty(Notification, 'permission', {
        configurable: true,
        get: () => window.testPermission,
      });
      Object.defineProperty(Notification, 'requestPermission', {
        configurable: true,
        value: async () => {
          window.permissionRequests++;
          window.permissionHadUserGesture = navigator.userActivation.isActive;
          window.testPermission = window.nextPermission || 'granted';
          return window.testPermission;
        },
      });
    });

    const page = await ui.newPage();
    await page.goto(`${origin}/?sync=off`);
    await page.locator('#login').waitFor();
    await signIn(page);

    const control = page.locator('#notify-btn');
    assert.equal(await control.getAttribute('data-permission'), 'default');
    assert.equal(await page.evaluate(() => window.permissionRequests), 0);

    await control.click();
    assert.equal(await page.evaluate(() => window.permissionRequests), 1);
    assert.equal(await control.getAttribute('data-permission'), 'granted');
    assert.equal(await page.evaluate(() => window.permissionHadUserGesture), true);

    await page.evaluate(async () => {
      const { initNotificationButton } = await import('/src/pwa/notificationButton.js');
      initNotificationButton();
      window.testPermission = 'default';
      window.nextPermission = 'default';
      window.dispatchEvent(new Event('focus'));
    });
    await control.click();
    assert.equal(await page.evaluate(() => window.permissionRequests), 2);
    assert.equal(await control.isDisabled(), true);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    assert.equal(await control.isDisabled(), true);
    await page.locator('#notification-help-button').click();
    assert.equal(await page.locator('#notification-help').evaluate((element) => element.open), true);
    assert.equal(await page.locator('[data-notification-origin]').innerText(), origin);
    await page.locator('#notification-recheck-button').click();
    assert.equal(await control.isDisabled(), false);

    await page.evaluate(() => {
      window.testPermission = 'denied';
      window.dispatchEvent(new Event('focus'));
    });
    assert.equal(await control.getAttribute('data-permission'), 'denied');
    assert.equal(await control.isDisabled(), true);
    assert.match(await page.locator('#notification-permission-status').innerText(), /permisos del sitio/);
    assert.equal(await page.locator('#notification-help-button').isVisible(), true);

    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('#notification-help-button').click();
    assert.equal(await page.locator('#notification-help').evaluate((element) => element.scrollWidth <= element.clientWidth), true);
    await page.locator('#notification-recheck-button').click();
    await ui.close();

    const context = await browser.newContext({ permissions: ['notifications'] });
    const options = { fail: false };
    await mockAPI(context, options);

    const app = await context.newPage();
    const errors = [];
    app.on('pageerror', (error) => errors.push(error.message));

    await app.goto(`${origin}/?sync=off`);
    await app.locator('#login').waitFor();
    await app.evaluate(() => navigator.serviceWorker.ready);
    await app.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await signIn(app);

    await app.evaluate(async () => {
      await navigator.locks.request('aquapaz-outbox-send', () => {});

      window.localNotices = [];
      const original = ServiceWorkerRegistration.prototype.showNotification;

      ServiceWorkerRegistration.prototype.showNotification = async function (title, options) {
        window.localNotices.push({ title, ...options });
        if (window.failNotice) throw new Error('Notification unavailable');
        return original.call(this, title, options);
      };
    });

    async function enqueueAndFlush(count) {
      await app.evaluate(async (total) => {
        const outbox = await import('/src/services/outboxService.js');

        for (let index = 0; index < total; index++) {
          await outbox.enqueueReport({
            tipo: 'agua',
            estado: 'no_agua',
            comentario: 'Reporte guardado sin conexión para validación local.',
          });
        }

        await outbox.flushOutbox();
      }, count);
    }

    await enqueueAndFlush(2);

    const notice = await app.evaluate(() => window.localNotices[0]);
    assert.match(notice.title, /Reportes sincronizados/);
    assert.match(notice.body, /2 reportes/);
    assert.equal(notice.icon, `${origin}/icons/manifest-icon-192.png`);
    assert.equal(notice.tag, 'aquapaz-reportes-sincronizados');
    assert.equal(notice.data.url, `${origin}/#/reportes`);

    await enqueueAndFlush(0);
    assert.equal(await app.evaluate(() => window.localNotices.length), 1);

    await enqueueAndFlush(1);
    assert.equal(await app.evaluate(() => window.localNotices.length), 2);
    assert.equal(await app.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return (await registration.getNotifications({ tag: 'aquapaz-reportes-sincronizados' })).length;
    }), 1);

    options.fail = true;
    await assert.rejects(enqueueAndFlush(1));
    assert.equal(await app.evaluate(() => window.localNotices.length), 2);
    options.fail = false;

    await app.evaluate(async () => {
      window.failNotice = true;
      const outbox = await import('/src/services/outboxService.js');
      await outbox.flushOutbox();
      if ((await outbox.records('outbox')).length) throw new Error('A notice failure restored a sent report');
      window.failNotice = false;
    });

    const beforeDenied = await app.evaluate(() => window.localNotices.length);
    await app.evaluate(() => {
      Object.defineProperty(Notification, 'permission', {
        configurable: true,
        get: () => 'denied',
      });
    });
    await enqueueAndFlush(1);
    assert.equal(await app.evaluate(() => window.localNotices.length), beforeDenied);

    const clickResults = await app.evaluate(async () => {
      const { handleNotificationClick } = await import('/src/pwa/notificationClick.js');
      const results = [];

      for (const existing of [true, false]) {
        const calls = [];
        let lifetime;
        const client = {
          url: `${location.origin}/#/pipas`,
          async navigate(url) {
            calls.push(['navigate', url]);
            return this;
          },
          async focus() {
            calls.push(['focus']);
          },
        };
        const clients = {
          async matchAll() { return existing ? [client] : []; },
          async openWindow(url) { calls.push(['open', url]); },
        };
        const event = {
          notification: {
            data: { url: `${location.origin}/#/reportes` },
            close() { calls.push(['close']); },
          },
          waitUntil(promise) { lifetime = promise; },
        };

        handleNotificationClick(event, clients);
        await lifetime;
        results.push(calls);
      }

      return results;
    });

    assert.deepEqual(clickResults[0], [
      ['close'], ['navigate', `${origin}/#/reportes`], ['focus'],
    ]);
    assert.deepEqual(clickResults[1], [['close'], ['open', `${origin}/#/reportes`]]);

    const version = fs.readFileSync('sw.js', 'utf8').match(/const CACHE_VERSION = '([^']+)'/)[1];
    const cached = await app.evaluate(async (name) => {
      const cache = await caches.open(name);
      return (await cache.keys()).map((request) => new URL(request.url).pathname);
    }, version);

    for (const file of [
      '/src/pwa/notifications.js',
      '/src/pwa/notificationButton.js',
      '/src/pwa/notificationClick.js',
      '/src/services/localNotificationService.js',
      '/styles/notifications.css',
    ]) assert.ok(cached.includes(file), file);

    options.offline = true;
    await context.setOffline(true);
    await app.reload();
    await app.locator('#reporte-form').waitFor();
    await app.locator('#r-comment').fill('Reporte real pendiente sin conexión.');
    await app.locator('#reporte-form [type=submit]').click();
    await app.waitForFunction(() => document.querySelector('#outbox-list').textContent.includes('Reporte real pendiente'));
    assert.equal(await app.evaluate(async () => {
      const { records } = await import('/src/services/outboxService.js');
      return (await records('outbox')).length;
    }), 1);
    assert.deepEqual(errors, []);

    console.log('PASS permisos por clic, estados, sincronización confirmada, aviso nativo, tag, errores sin reenvío, clic y recarga sin conexión');

    await context.setOffline(false);
    await app.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      for (const notification of await registration.getNotifications()) notification.close();
    });
    await context.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
