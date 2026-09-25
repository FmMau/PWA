import { APP_BASE, swURL, temporaryURL, temporaryScope, narrowScope, isWithinScope } from './registerSW.js';

const escape = (value) => String(value ?? '—').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const yes = (value) => value ? 'Sí' : 'No';
let experimentMessage = 'Todavía no se ha ejecutado ningún experimento.';

export async function serviceWorkerPanel() {
  const supported = 'serviceWorker' in navigator;
  let registrations = [];
  let error = '';
  try {
    if (supported) registrations = await navigator.serviceWorker.getRegistrations();
  } catch (cause) { error = `${cause.name}: ${cause.message}`; }
  const own = registrations.filter((r) => r.scope.startsWith(APP_BASE.href));
  const registration = own.find((r) => r.scope === APP_BASE.href);
  const worker = registration?.active || registration?.waiting || registration?.installing;
  const routes = [
    ['Raíz de la app', APP_BASE.href],
    ['Ruta del router', new URL('#/diagnostico', APP_BASE).href],
    ['Archivo interno', new URL('src/main.js', APP_BASE).href],
    ['Raíz sin diagonal final', APP_BASE.href.replace(/\/$/, '')],
    ['Fuera del proyecto', APP_BASE.pathname === '/' ? 'https://example.org/otro-proyecto/' : new URL('../fuera-del-proyecto/', APP_BASE).href],
    ['Copia temporal', temporaryURL.href],
    ['Página del scope estrecho', narrowScope.href],
  ];
  return `<section class="sw-panel" aria-labelledby="sw-title">
    <h2 id="sw-title">Diagnóstico de Service Workers</h2>
    <dl class="sw-facts">
      <dt>¿El navegador soporta Service Workers?</dt><dd>${yes(supported)}</dd>
      <dt>¿Contexto seguro?</dt><dd>${yes(window.isSecureContext)}</dd>
      <dt>¿SW registrado para la raíz de la app?</dt><dd>${yes(registration)}</dd>
      <dt>Scope</dt><dd>${escape(registration?.scope)}</dd>
      <dt>URL del script</dt><dd>${escape(worker?.scriptURL)}</dd>
      <dt>Estado del worker</dt><dd>${escape(worker?.state || 'Sin worker')}</dd>
      <dt>¿Controla esta página?</dt><dd>${yes(supported && navigator.serviceWorker.controller)} — ${escape(supported ? navigator.serviceWorker.controller?.scriptURL : null)}</dd>
    </dl>
    <button class="diagnostic-clear" data-sw-action="refresh">Actualizar estado</button>
    <p role="status">${escape(error)}</p>
    <h3>Verificador de scope</h3>
    <div class="sw-table-wrap"><table><thead><tr><th>Ruta</th><th>URL</th><th>Scope de la app</th><th>Scope temporal</th></tr></thead><tbody>
    ${routes.map(([label, url]) => `<tr><td>${escape(label)}</td><td>${escape(url)}</td><td>${isWithinScope(url, APP_BASE) ? 'Dentro' : 'Fuera'}</td><td>${isWithinScope(url, temporaryScope) ? 'Dentro' : 'Fuera'}</td></tr>`).join('')}
    </tbody></table></div>
    <p>Scope de la app: ${escape(APP_BASE.href)}<br>Scope temporal: ${escape(temporaryScope.href)}</p>
    <h3>Experimentos</h3>
    <div class="sw-actions">
      <button class="diagnostic-clear" data-sw-action="invalid" ${supported ? '' : 'disabled'}>Probar scope inválido</button>
      <button class="diagnostic-clear" data-sw-action="temporary" ${supported ? '' : 'disabled'}>Registrar copia temporal</button>
      <button class="diagnostic-clear" data-sw-action="narrow" ${supported ? '' : 'disabled'}>Registrar segundo SW</button>
      <button class="diagnostic-clear" data-sw-action="cleanup" ${supported ? '' : 'disabled'}>Retirar registros de experimentos</button>
    </div>
    <pre id="sw-experiment" role="status">${escape(experimentMessage)}</pre>
    <h3>Registros del origen: getRegistrations()</h3>
    <ul>${registrations.map((r) => `<li>${escape(r.scope)} — ${escape((r.active || r.waiting || r.installing)?.scriptURL)} — ${escape((r.active || r.waiting || r.installing)?.state)}</li>`).join('') || '<li>No hay registros.</li>'}</ul>
    <p><a href="${escape(narrowScope.href)}">Abrir página del scope estrecho</a></p>
  </section>`;
}

export function initSWDiagnostics() {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-sw-action]');
    if (!button) return;
    button.disabled = true;
    try {
      const action = button.dataset.swAction;
      if (action === 'invalid') {
        await navigator.serviceWorker.register(temporaryURL.href, { scope: APP_BASE.href });
        experimentMessage = 'El servidor permitió ampliar el scope. Revisa la cabecera Service-Worker-Allowed.';
      } else if (action === 'temporary' || action === 'narrow') {
        const r = await navigator.serviceWorker.register(action === 'temporary' ? temporaryURL.href : swURL.href, {
          scope: action === 'temporary' ? temporaryScope.href : narrowScope.href,
        });
        experimentMessage = `Registro correcto. Scope obtenido: ${r.scope}`;
      } else if (action === 'cleanup') {
        const records = await navigator.serviceWorker.getRegistrations();
        await Promise.all(records.filter((r) => [temporaryScope.href, narrowScope.href].includes(r.scope)).map((r) => r.unregister()));
        experimentMessage = 'Registros de experimentos retirados. Recarga las páginas de prueba.';
      }
    } catch (error) {
      experimentMessage = `${error.name}: ${error.message}`;
      console.error('[PWA] Experimento:', error);
    } finally {
      button.disabled = false;
      if (document.querySelector('.sw-panel')) window.dispatchEvent(new PopStateEvent('popstate'));
    }
  });
}
