import { request, escapeHTML as escape } from '../services/apiService.js';
import {
  managementTemplate,
  renderStats,
  renderOrders,
  renderDetail,
  renderFleet,
  formatDate,
} from '../components/TruckManagementPanel.js';

const endpoint = '/api/gestion/pipas';

function validContext(value) {
  return value?.permisos?.consultar
    && Array.isArray(value.colonias)
    && Array.isArray(value.pipas);
}

export default {
  template() {
    return `
      <div id="truck-management-entry">
        <p role="status">Comprobando acceso a la gestión de pipas…</p>
      </div>
    `;
  },

  async init(container, { query = new URLSearchParams() } = {}) {
    const entry = container.querySelector('#truck-management-entry');
    let context;

    try {
      context = await request(`${endpoint}/contexto`);

      if (!validContext(context)) {
        throw new Error('La API necesita actualizarse para habilitar la gestión de pipas.');
      }
    } catch (error) {
      if (!entry.isConnected) return;

      entry.innerHTML = `
        <section class="empty-state dashboard-empty">
          <h2>Gestión de pipas no disponible</h2>
          <p>${escape(error.message)}</p>
          <button class="btn-primary" data-retry-trucks>Reintentar</button>
          <p>
            <a href="#/mis-pedidos" data-link>Mis solicitudes de pipa</a>
            · <a href="#/operador" data-link>Mi operación de pipa</a>
          </p>
        </section>
      `;

      entry.querySelector('[data-retry-trucks]').addEventListener('click', () => {
        entry.innerHTML = '<p role="status">Comprobando acceso…</p>';
        this.init(container, { query });
      });

      return;
    }

    if (!entry.isConnected) return;

    entry.innerHTML = managementTemplate(context);

    const page = entry.querySelector('#truck-management');
    const filters = page.querySelector('#truck-filters');
    const orders = page.querySelector('#truck-orders');
    const status = page.querySelector('#truck-status');
    const stats = page.querySelector('#truck-stats');
    const dialog = page.querySelector('#truck-detail');
    const detail = page.querySelector('#truck-detail-content');
    const detailStatus = page.querySelector('#truck-detail-status');
    const closeButton = page.querySelector('#close-truck-detail');
    const refreshButton = page.querySelector('#refresh-trucks');

    let pageNumber = 1;
    let lastPage = 1;
    let listRevision = 0;
    let detailRevision = 0;
    let currentOrder = null;
    let saving = false;

    for (const name of ['q', 'estado', 'colonia', 'operador_id']) {
      if (query.has(name)) filters.elements[name].value = query.get(name);
    }

    function filterValues() {
      return Object.fromEntries(
        [...new FormData(filters)].filter(([, value]) => value),
      );
    }

    let appliedFilters = filterValues();

    function rememberFilters(orderId) {
      if (!page.isConnected) return;

      const params = new URLSearchParams(appliedFilters);

      if (orderId) params.set('pedido', orderId);

      history.replaceState({}, '', `#/pipas${params.size ? `?${params}` : ''}`);
    }

    function clearAccess() {
      context.permisos.gestionar = false;
      detailRevision++;
      currentOrder = null;

      orders.innerHTML = '';
      stats.innerHTML = '';
      detail.innerHTML = '';
      page.querySelector('#truck-fleet').innerHTML = '';

      if (dialog.open) dialog.close();

      status.textContent = 'El servidor rechazó el acceso. Recarga la página para verificar tus permisos.';
    }

    async function updateFleet() {
      const fresh = await request(`${endpoint}/contexto`);

      if (!page.isConnected || !validContext(fresh)) return;

      context = fresh;
      page.querySelector('#truck-fleet').innerHTML = renderFleet(fresh.pipas);
      page.querySelector('.truck-fleet summary').textContent = `Flota registrada (${fresh.pipas.length})`;

      if (!fresh.permisos.gestionar && detail.querySelector('#truck-followup-form')) {
        detail.querySelector('#truck-followup-form').remove();
        detailStatus.textContent = 'Tu permiso actual permite consultar el seguimiento.';
      }
    }

    async function loadOrders() {
      const revision = ++listRevision;

      orders.setAttribute('aria-busy', 'true');
      status.textContent = 'Consultando pedidos…';
      page.querySelector('#truck-prev').disabled = true;
      page.querySelector('#truck-next').disabled = true;

      try {
        const params = new URLSearchParams({
          ...appliedFilters,
          pagina: pageNumber,
        });
        const data = await request(`${endpoint}/pedidos?${params}`);

        if (!page.isConnected || revision !== listRevision) return;

        if (!Array.isArray(data.pedidos) || !data.resumen) {
          throw new Error('El servidor no devolvió una bandeja válida.');
        }

        lastPage = Math.max(1, Math.ceil(data.resumen.total / data.limite));

        if (pageNumber > lastPage) {
          pageNumber = lastPage;
          return await loadOrders();
        }

        stats.innerHTML = renderStats(data.resumen);
        orders.innerHTML = renderOrders(data.pedidos);
        status.textContent = `${data.resumen.total} pedidos · Datos del servidor · ${formatDate(new Date().toISOString())}`;

        page.querySelector('#truck-page').textContent = `Página ${pageNumber} de ${lastPage}`;
        page.querySelector('#truck-prev').disabled = pageNumber <= 1;
        page.querySelector('#truck-next').disabled = pageNumber >= lastPage;
      } catch (error) {
        if (!page.isConnected || revision !== listRevision) return;

        orders.innerHTML = '';
        stats.innerHTML = '';
        page.querySelector('#truck-page').textContent = '';
        status.textContent = `No se pudo actualizar la bandeja: ${error.message}`;

        if (/^(401|403):/.test(error.message)) clearAccess();
      } finally {
        if (revision === listRevision) orders.setAttribute('aria-busy', 'false');
      }
    }

    async function loadDetail(id) {
      const revision = ++detailRevision;

      currentOrder = null;
      detail.innerHTML = '';
      detailStatus.textContent = 'Consultando entrega, pipas disponibles e historial…';

      try {
        const data = await request(`${endpoint}/pedidos/${encodeURIComponent(id)}`);

        if (!page.isConnected || revision !== detailRevision) return false;

        if (!data.pedido || !Array.isArray(data.historial) || !Array.isArray(data.pipas_disponibles)) {
          throw new Error('El servidor no devolvió el detalle esperado.');
        }

        currentOrder = data.pedido;
        page.querySelector('#truck-detail-title').textContent = `Pedido #${currentOrder.id} · ${currentOrder.colonia}`;
        detailStatus.textContent = '';
        detail.innerHTML = renderDetail(data, context.permisos.gestionar);

        return true;
      } catch (error) {
        if (!page.isConnected || revision !== detailRevision) return false;

        detailStatus.textContent = error.message;
        detail.innerHTML = '<button class="btn-secondary" data-retry-truck>Reintentar detalle</button>';
        detail.querySelector('[data-retry-truck]').addEventListener('click', () => loadDetail(id));

        if (/^(401|403):/.test(error.message)) clearAccess();

        return false;
      }
    }

    filters.addEventListener('submit', (event) => {
      event.preventDefault();
      appliedFilters = filterValues();
      pageNumber = 1;
      rememberFilters();
      loadOrders();
    });

    filters.addEventListener('reset', () => {
      appliedFilters = {};
      pageNumber = 1;
      rememberFilters();
      loadOrders();
    });

    refreshButton.addEventListener('click', async () => {
      if (refreshButton.disabled) return;
      refreshButton.disabled = true;

      try {
        await updateFleet();
        await loadOrders();
      } catch (error) {
        orders.innerHTML = '';
        stats.innerHTML = '';
        page.querySelector('#truck-fleet').innerHTML = '';
        status.textContent = error.message;
        if (/^(401|403):/.test(error.message)) clearAccess();
      } finally {
        refreshButton.disabled = false;
      }
    });

    page.querySelector('#truck-prev').addEventListener('click', () => {
      if (pageNumber <= 1) return;
      pageNumber--;
      loadOrders();
    });

    page.querySelector('#truck-next').addEventListener('click', () => {
      if (pageNumber >= lastPage) return;
      pageNumber++;
      loadOrders();
    });

    orders.addEventListener('click', (event) => {
      const button = event.target.closest('[data-truck-detail]');
      if (!button) return;

      rememberFilters(button.dataset.truckDetail);
      dialog.showModal();
      loadDetail(button.dataset.truckDetail);
    });

    closeButton.addEventListener('click', () => {
      if (saving) return;
      rememberFilters();
      dialog.close();
    });

    dialog.addEventListener('cancel', (event) => {
      if (saving) event.preventDefault();
      else rememberFilters();
    });

    dialog.addEventListener('close', () => {
      detailRevision++;
      currentOrder = null;
      detail.innerHTML = '';
      rememberFilters();
    });

    detail.addEventListener('change', (event) => {
      if (event.target.name !== 'accion') return;

      const selector = detail.querySelector('[data-pipa-selector]');
      if (!selector) return;

      const assigning = event.target.value === 'asignacion';
      selector.hidden = !assigning;
      selector.querySelector('select').disabled = !assigning;
      selector.querySelector('select').required = assigning;
    });

    detail.addEventListener('click', (event) => {
      if (event.target.closest('[data-reload-truck]') && currentOrder && !saving) {
        loadDetail(currentOrder.id);
      }
    });

    detail.addEventListener('submit', async (event) => {
      if (event.target.id !== 'truck-followup-form') return;
      event.preventDefault();

      if (saving || !currentOrder || !context.permisos.gestionar) return;

      const form = event.target;
      const feedback = form.querySelector('[data-truck-feedback]');

      if (!navigator.onLine) {
        feedback.textContent = 'Conéctate para guardar. La nota se conserva.';
        return;
      }

      const values = Object.fromEntries(new FormData(form));

      if (!values.nota.trim()) {
        feedback.textContent = 'Escribe una nota de seguimiento.';
        return;
      }

      const id = currentOrder.id;
      const body = {
        accion: values.accion,
        version: currentOrder.gestion_version,
        nota: values.nota.trim(),
      };

      if (values.accion === 'asignacion') body.operador_id = Number(values.operador_id);

      saving = true;
      closeButton.disabled = true;
      form.querySelectorAll('button, input, select, textarea').forEach((input) => {
        input.disabled = true;
      });

      try {
        await request(`${endpoint}/pedidos/${encodeURIComponent(id)}/seguimiento`, {
          method: 'POST',
          body,
        });

        const loaded = await loadDetail(id);
        detailStatus.textContent = loaded
          ? 'Seguimiento confirmado por el servidor.'
          : 'Seguimiento confirmado. Reintenta la consulta del detalle.';

        const updates = await Promise.allSettled([loadOrders(), updateFleet()]);

        if (updates[1].status === 'rejected' && page.isConnected) {
          page.querySelector('#truck-fleet').textContent = 'Actualiza la flota para consultar su disponibilidad.';
        }
      } catch (error) {
        feedback.textContent = `${error.message} La nota se conserva.`;

        if (/^409:/.test(error.message)) {
          form.dataset.conflict = 'true';
          feedback.textContent += ' Copia la nota antes de recargar el detalle.';
        }

        if (/^(401|403):/.test(error.message)) clearAccess();
      } finally {
        saving = false;
        closeButton.disabled = false;

        form.querySelectorAll('button, input, select, textarea').forEach((input) => {
          input.disabled = false;
        });

        const pipa = form.elements.operador_id;
        if (pipa) pipa.disabled = form.elements.accion.value !== 'asignacion';

        form.querySelector('[type="submit"]').disabled = (
          form.dataset.conflict === 'true' || !context.permisos.gestionar
        );
      }
    });

    await loadOrders();

    if (page.isConnected && /^[1-9]\d*$/.test(query.get('pedido') || '')) {
      dialog.showModal();
      await loadDetail(query.get('pedido'));
    }
  },
};
