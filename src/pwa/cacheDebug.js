import { APP_BASE } from './registerSW.js';

async function activeCache() {
  const registration = await navigator.serviceWorker.ready;
  const worker = navigator.serviceWorker.controller || registration.active;
  const version = await new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => reject(new Error('El SW no respondió. Recarga para activar la versión nueva.')), 3000);
    channel.port1.onmessage = ({ data }) => {
      clearTimeout(timeout);
      channel.port1.close();
      resolve(data);
    };
    worker.postMessage({ type: 'CACHE_VERSION' }, [channel.port2]);
  });
  return { version, cache: await caches.open(version) };
}

export const cacheDebug = {
  async list() {
    const { version, cache } = await activeCache();
    const urls = (await cache.keys()).map((request) => request.url);
    console.info('[Cache Debug]', version);
    console.table(urls);
    return { version, urls };
  },
  async delete(url) {
    const { cache } = await activeCache();
    return cache.delete(new URL(url, APP_BASE).href);
  },
};

export function initCacheDebug() {
  window.cacheDebug = cacheDebug;
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-cache-action]');
    if (!button) return;
    const output = document.getElementById('cache-output');
    button.disabled = true;
    try {
      if (button.dataset.cacheAction === 'delete') {
        const deleted = await cacheDebug.delete(document.getElementById('cache-url').value);
        output.textContent = deleted ? 'Entrada eliminada con cache.delete().' : 'La entrada no existe.';
      } else if (button.dataset.cacheAction === 'sample') {
        const response = await fetch(new URL('data/cache-demo.json', APP_BASE), { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        output.textContent = await response.text();
      } else {
        const { version, urls } = await cacheDebug.list();
        output.textContent = `${version}\n${urls.join('\n')}`;
      }
    } catch (error) {
      output.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}

export function cacheDebugPanel() {
  return `<section class="sw-panel">
    <h2>Depuración de Cache Storage</h2>
    <button class="diagnostic-clear" data-cache-action="list">Listar entradas</button>
    <label>URL de la entrada <input id="cache-url" value="data/cache-demo.json"></label>
    <button class="diagnostic-clear" data-cache-action="delete">Eliminar entrada</button>
    <button class="diagnostic-clear" data-cache-action="sample">Consultar dato de prueba</button>
    <pre id="cache-output" role="status" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>
  </section>`;
}
