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
  await new Promise((resolve) => server.listen(4178, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  try {
    const context = await browser.newContext({
      serviceWorkers: 'block',
      viewport: { width: 1440, height: 1000 },
    });

    const now = new Date().toISOString();
    const orders = Array.from({ length: 25 }, (_, index) => ({
      id: index + 1,
      usuario_id: index + 20,
      operador_id: null,
      colonia: index === 0 ? 'Centro' : 'Otra',
      litros: 10000,
      estado: 'solicitada',
      fecha: now,
      actualizado: now,
      gestion_version: 0,
      direccion: 'Calle de prueba 123',
      referencias: '<img src=x onerror=alert(1)> Casa azul',
      telefono: '6121234567',
      precio_centavos: null,
      precio_aceptado_en: null,
      cotizacion_notas: '',
      pipa_nombre: null,
      operador_nombre: null,
    }));

    const history = new Map();
    const mutations = [];
    let role = 'gestor';
    let conflict = false;
    let outage = false;

    function fleet() {
      return [
        {
          id: 12,
          nombre: 'Pipa del Mar',
          placas: 'BCS-120',
          capacidad: 20000,
          disponible: true,
          operador_nombre: 'Luis Rivera',
          pedido_activo_id: orders[0].operador_id ? 1 : null,
        },
        {
          id: 13,
          nombre: 'Unidad Norte',
          placas: 'BCS-130',
          capacidad: 10000,
          disponible: true,
          operador_nombre: 'Ana López',
          pedido_activo_id: 99,
        },
      ];
    }

    await context.route('https://aquapaz-api-production.up.railway.app/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      function reply(body, status = 200) {
        return route.fulfill({ json: body, status });
      }

      if (!url.pathname.startsWith('/api/gestion/pipas')) return reply([]);
      if (outage) return reply({ error: 'Gestión temporalmente no disponible' }, 503);
      if (role === 'ciudadano') return reply({ error: 'Sin permiso de gestión' }, 403);

      if (url.pathname.endsWith('/contexto')) {
        return reply({
          permisos: { consultar: true, gestionar: role === 'gestor' },
          colonias: ['Centro', 'Otra'],
          pipas: fleet(),
        });
      }

      const match = url.pathname.match(/\/pedidos\/(\d+)(\/seguimiento)?$/);

      if (match) {
        const order = orders.find((item) => item.id === Number(match[1]));

        if (request.method() === 'POST') {
          const body = request.postDataJSON();
          mutations.push(body);

          if (conflict) {
            order.gestion_version++;
            return reply({ error: 'El pedido cambió. Recarga el detalle.' }, 409);
          }

          assert.equal(body.version, order.gestion_version);
          assert.ok(body.nota.trim());

          if (body.accion === 'asignacion') {
            assert.equal(body.operador_id, 12);
            order.estado = 'asignada';
            order.operador_id = 12;
            order.pipa_nombre = 'Pipa del Mar';
            order.pipa_placas = 'BCS-120';
            order.operador_nombre = 'Luis Rivera';
            order.operador_telefono = '6129999999';
          } else {
            assert.equal(body.operador_id, undefined);
          }

          order.gestion_version++;
          const previous = history.get(order.id) || [];

          history.set(order.id, [{
            actor_nombre: 'María',
            accion: body.accion,
            nota: body.nota,
            fecha: now,
            pipa_nombre: order.pipa_nombre,
          }, ...previous]);

          return reply(order);
        }

        return reply({
          pedido: order,
          pipas_disponibles: order.estado === 'solicitada' ? [fleet()[0]] : [],
          historial: history.get(order.id) || [],
          ubicacion: null,
          hora_servidor: now,
        });
      }

      const query = url.searchParams;
      const filtered = orders.filter((order) => (
        (!query.get('colonia') || order.colonia === query.get('colonia'))
        && (!query.get('estado') || order.estado === query.get('estado'))
      ));
      const pageNumber = Number(query.get('pagina') || 1);

      return reply({
        pedidos: filtered.slice((pageNumber - 1) * 20, pageNumber * 20),
        resumen: {
          total: filtered.length,
          pendientes: filtered.filter((order) => order.estado === 'solicitada').length,
          asignadas: filtered.filter((order) => order.estado === 'asignada').length,
          en_entrega: 0,
          completadas: 0,
        },
        pagina: pageNumber,
        limite: 20,
      });
    });

    const page = await context.newPage();
    const errors = [];

    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('http://127.0.0.1:4178');
    await page.locator('#login').waitFor();
    await page.evaluate(async () => {
      const api = await import('/src/services/apiService.js');

      await api.writeSetting('session', {
        token: 'test',
        user: { id: 7, nombre: 'María', colonia: 'Centro' },
      });

      window.dispatchEvent(new Event('auth-change'));
      location.hash = '/pipas';
    });

    await page.locator('.truck-order').first().waitFor();
    assert.equal(await page.locator('.truck-order').count(), 20);
    assert.equal(await page.locator('#order').count(), 0);
    assert.deepEqual(await page.locator('#truck-stats .stat-value').allTextContents(), ['25', '0', '0', '0']);

    fs.mkdirSync('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/pipas-gestor.png', fullPage: true });

    await page.locator('#truck-next').click();
    await page.waitForFunction(() => document.querySelector('#truck-page').textContent === 'Página 2 de 2');
    assert.equal(await page.locator('.truck-order').count(), 5);

    await page.locator('[name=colonia]').selectOption('Centro');
    await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.truck-order').length === 1);

    await page.getByRole('button', { name: 'Ver pedido 1', exact: true }).click();
    await page.locator('#truck-followup-form').waitFor();

    assert.equal(await page.locator('#truck-detail img').count(), 0);
    assert.match(await page.locator('#truck-detail-content').innerText(), /Casa azul/);
    await page.locator('[name=accion]').selectOption('asignacion');

    const selector = page.locator('#truck-followup-form [name=operador_id]');
    assert.equal(await selector.isVisible(), true);
    assert.equal(await selector.locator('option').count(), 2);

    await selector.selectOption('12');
    await page.locator('[name=nota]').fill('Asignada a Luis por disponibilidad y capacidad.');
    await page.getByRole('button', { name: 'Guardar seguimiento', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#truck-detail-status').textContent.includes('confirmado'));

    assert.equal(mutations.length, 1);
    assert.match(await page.locator('.attention-history').innerText(), /Asignada a Luis/);
    assert.equal(await page.locator('[name=accion] option[value=asignacion]').count(), 0);
    assert.match(await page.locator('#truck-detail-content').innerText(), /Pendiente de cotización del operador/);

    conflict = true;
    await page.locator('[name=nota]').fill('Conservar esta nota ante conflicto.');
    await page.getByRole('button', { name: 'Guardar seguimiento', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-truck-feedback]').textContent.includes('409'));

    assert.equal(await page.locator('[name=nota]').inputValue(), 'Conservar esta nota ante conflicto.');
    assert.equal(await page.getByRole('button', { name: 'Guardar seguimiento', exact: true }).isDisabled(), true);

    conflict = false;
    await page.getByRole('button', { name: 'Recargar detalle', exact: true }).click();
    await page.locator('#truck-followup-form').waitFor();

    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator('#truck-detail').evaluate((element) => element.scrollWidth <= element.clientWidth), true);
    await page.screenshot({ path: 'test-results/pipas-detalle-mobile.png', fullPage: true });

    const beforeOffline = mutations.length;
    await page.locator('[name=nota]').fill('Nota pendiente de conexión.');
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Guardar seguimiento', exact: true }).click();

    assert.equal(mutations.length, beforeOffline);
    assert.match(await page.locator('[data-truck-feedback]').innerText(), /Conéctate/);

    await context.setOffline(false);
    await page.getByRole('button', { name: 'Cerrar detalle del pedido', exact: true }).click();
    assert.doesNotMatch(page.url(), /pedido=1/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: 'test-results/pipas-gestor-mobile.png', fullPage: true });

    role = 'consulta';
    await page.reload();
    await page.locator('.truck-order').first().waitFor();
    await page.getByRole('button', { name: 'Ver pedido 1', exact: true }).click();
    await page.locator('.attention-history').waitFor();
    assert.equal(await page.locator('#truck-followup-form').count(), 0);

    await page.getByRole('button', { name: 'Cerrar detalle del pedido', exact: true }).click();
    role = 'ciudadano';
    await page.locator('#refresh-trucks').click();
    await page.waitForFunction(() => document.querySelector('#truck-status').textContent.includes('rechazó'));
    assert.equal(await page.locator('.truck-order').count(), 0);
    assert.equal(await page.locator('.truck-fleet-list').count(), 0);

    await page.reload();
    await page.getByRole('link', { name: 'Mis solicitudes de pipa', exact: true }).waitFor();
    assert.equal(await page.locator('#truck-management').count(), 0);
    await page.getByRole('link', { name: 'Mis solicitudes de pipa', exact: true }).click();
    await page.locator('#order').waitFor();

    role = 'gestor';
    outage = true;
    await page.goto('http://127.0.0.1:4178/#/pipas');
    await page.locator('[data-retry-trucks]').waitFor();
    assert.equal(await page.locator('#truck-followup-form').count(), 0);
    assert.deepEqual(errors, []);

    console.log('PASS gestión de pipas: filtros, paginación, asignación, notas, conflictos, consulta, revocación, flujo ciudadano, desconexión y móvil');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
