import { escapeHTML as escape } from '../services/apiService.js';

export const deliveryStates = {
  solicitada: 'Solicitada',
  asignada: 'Asignada',
  en_camino: 'En camino',
  en_sitio: 'En sitio',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

export function formatDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Sin fecha';
  return new Date(value).toLocaleString('es-MX');
}

function formatLiters(value) {
  return `${Number(value).toLocaleString('es-MX')} L`;
}

function stateBadge(state) {
  return `
    <span class="delivery-badge" data-state="${escape(state)}">
      ${escape(deliveryStates[state] || state)}
    </span>
  `;
}

function selectOptions(items) {
  return items.map(([value, label]) => `
    <option value="${escape(value)}">${escape(label)}</option>
  `).join('');
}

export function managementTemplate(context) {
  return `
    <section class="page truck-management" id="truck-management">
      <div class="page-header dashboard-heading">
        <div>
          <span class="page-eyebrow">Centro de Control / Pipas</span>
          <h2>Gestión de pipas</h2>
          <p>Asigna solicitudes y da seguimiento a las entregas de todas las colonias.</p>
        </div>
        <button class="btn-primary" id="refresh-trucks">Actualizar pedidos</button>
      </div>

      <div class="scope-banner">
        <span>
          <strong>Pedidos de todas las colonias</strong><br>
          ${context.permisos.gestionar
            ? 'Puedes asignar una pipa y registrar notas de seguimiento.'
            : 'Acceso de consulta: puedes revisar los pedidos y su historial.'}
        </span>
        <span>El operador confirma el viaje y la entrega; el cliente acepta el precio.</span>
      </div>

      <div class="stats-grid ops-stats" id="truck-stats"></div>

      <form class="truck-filters" id="truck-filters" aria-label="Filtros de pedidos">
        <label>
          Buscar pedido
          <input name="q" type="search" maxlength="100" placeholder="Folio, colonia, pipa o responsable">
        </label>
        <label>
          Estado de entrega
          <select name="estado">
            ${selectOptions([
              ['', 'Todos los estados'],
              ['activos', 'Pedidos activos'],
              ...Object.entries(deliveryStates),
            ])}
          </select>
        </label>
        <label>
          Colonia
          <select name="colonia">
            ${selectOptions([
              ['', 'Todas las colonias'],
              ...context.colonias.map((name) => [name, name]),
            ])}
          </select>
        </label>
        <label>
          Pipa asignada
          <select name="operador_id">
            ${selectOptions([
              ['', 'Todas las pipas'],
              ['sin_asignar', 'Sin asignar'],
              ...context.pipas.map((pipa) => [pipa.id, `${pipa.nombre} · ${pipa.placas}`]),
            ])}
          </select>
        </label>
        <div class="truck-filter-actions">
          <button class="btn-primary" type="submit">Aplicar filtros</button>
          <button class="btn-secondary" type="reset">Limpiar filtros</button>
        </div>
      </form>

      <p id="truck-status" role="status" aria-live="polite"></p>
      <div class="truck-order-list" id="truck-orders" aria-busy="true"></div>

      <nav class="inbox-pagination" aria-label="Páginas de pedidos">
        <button class="btn-secondary" id="truck-prev" disabled>Anterior</button>
        <span id="truck-page"></span>
        <button class="btn-secondary" id="truck-next" disabled>Siguiente</button>
      </nav>

      <details class="truck-fleet">
        <summary>Flota registrada (${context.pipas.length})</summary>
        <div id="truck-fleet">${renderFleet(context.pipas)}</div>
      </details>

      <dialog class="report-dialog truck-dialog" id="truck-detail" aria-labelledby="truck-detail-title">
        <div class="detail-heading">
          <h2 id="truck-detail-title">Detalle del pedido</h2>
          <button class="btn-secondary" id="close-truck-detail" aria-label="Cerrar detalle del pedido">
            Cerrar
          </button>
        </div>
        <p id="truck-detail-status" role="status" aria-live="polite"></p>
        <div id="truck-detail-content"></div>
      </dialog>
    </section>
  `;
}

export function renderStats(summary) {
  const cards = [
    ['Pendientes de asignar', summary.pendientes],
    ['Asignadas', summary.asignadas],
    ['En entrega', summary.en_entrega],
    ['Completadas', summary.completadas],
  ];

  return cards.map(([label, value]) => `
    <article class="stat-card">
      <span class="stat-label">${label}</span>
      <strong class="stat-value">${escape(value)}</strong>
      <span class="stat-description">Con los filtros aplicados</span>
    </article>
  `).join('');
}

export function renderOrders(orders) {
  if (!orders.length) {
    return `
      <div class="dashboard-empty">
        <h3>No hay pedidos con estos filtros</h3>
        <p>Prueba otra colonia, otro estado o limpia los filtros.</p>
      </div>
    `;
  }

  return orders.map((order) => `
    <article class="truck-order">
      <div class="truck-order-main">
        <span class="page-eyebrow">Pedido #${escape(order.id)}</span>
        <h3>${escape(order.colonia)}</h3>
        <p>${escape(formatLiters(order.litros))} · ${escape(formatDate(order.fecha))}</p>
      </div>
      <div>
        <span class="truck-field-label">Entrega</span>
        ${stateBadge(order.estado)}
      </div>
      <div>
        <span class="truck-field-label">Pipa / responsable</span>
        <strong>${escape(order.pipa_nombre || 'Sin asignar')}</strong>
        <span>${escape(order.operador_nombre || 'Pendiente de asignación')}</span>
      </div>
      <button
        class="btn-secondary"
        data-truck-detail="${escape(order.id)}"
        aria-label="Ver pedido ${escape(order.id)}"
      >
        Ver seguimiento →
      </button>
    </article>
  `).join('');
}

export function renderFleet(fleet) {
  if (!fleet.length) return '<p>No hay pipas registradas.</p>';

  return `
    <ul class="truck-fleet-list">
      ${fleet.map((pipa) => `
        <li>
          <strong>${escape(pipa.nombre)} · ${escape(pipa.placas)}</strong>
          <span>${escape(pipa.operador_nombre)} · ${escape(formatLiters(pipa.capacidad))}</span>
          <span>${pipa.pedido_activo_id
            ? `Entrega activa #${escape(pipa.pedido_activo_id)}`
            : pipa.disponible ? 'Disponible para asignación' : 'Disponibilidad desactivada'}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderLocation(data) {
  const position = data.ubicacion;

  if (!position) {
    return '<p>No hay ubicación de pipa informada para esta etapa.</p>';
  }

  const age = Date.parse(data.hora_servidor) - Date.parse(position.observada_en);
  const recent = Number.isFinite(age) && age >= -30000 && age <= 120000;

  return `
    <p>
      <strong>${recent ? 'Última ubicación reciente' : 'Última ubicación antigua o sin hora verificable'}</strong><br>
      ${escape(position.latitud)}, ${escape(position.longitud)}<br>
      Observada: ${escape(formatDate(position.observada_en))}<br>
      Precisión informada: ${position.precision == null ? 'No disponible' : `${escape(position.precision)} m`}
    </p>
  `;
}

function renderEditor(data) {
  const order = data.pedido;
  const canAssign = order.estado === 'solicitada' && order.operador_id === null;

  return `
    <form class="attention-form" id="truck-followup-form">
      <h3>Registrar seguimiento</h3>
      <label>
        Acción
        <select name="accion">
          <option value="nota">Añadir nota de seguimiento</option>
          ${canAssign ? '<option value="asignacion">Asignar pipa</option>' : ''}
        </select>
      </label>
      ${canAssign ? `
        <label data-pipa-selector hidden>
          Pipa disponible
          <select name="operador_id" disabled>
            <option value="">Selecciona una pipa</option>
            ${selectOptions(data.pipas_disponibles.map((pipa) => [
              pipa.id,
              `${pipa.nombre} · ${pipa.placas} · ${formatLiters(pipa.capacidad)} · ${pipa.operador_nombre}`,
            ]))}
          </select>
        </label>
        ${!data.pipas_disponibles.length ? `
          <p>No hay pipas disponibles con capacidad suficiente para esta solicitud.</p>
        ` : ''}
      ` : ''}
      <label>
        Nota de seguimiento
        <textarea name="nota" required maxlength="2000" rows="3"
          placeholder="Describe la asignación o el seguimiento realizado"></textarea>
      </label>
      <p>La nota y su autor quedan registrados. La asignación se confirma en el servidor.</p>
      <div class="truck-filter-actions">
        <button class="btn-primary" type="submit">Guardar seguimiento</button>
        <button class="btn-secondary" type="button" data-reload-truck>Recargar detalle</button>
      </div>
      <p data-truck-feedback role="status" aria-live="polite"></p>
    </form>
  `;
}

export function renderDetail(data, canManage) {
  const order = data.pedido;
  const price = order.precio_centavos == null ? 'Sin cotización' : new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(order.precio_centavos / 100);

  const quoteState = order.precio_aceptado_en
    ? `Aceptada por el cliente: ${formatDate(order.precio_aceptado_en)}`
    : order.precio_centavos == null ? 'Pendiente de cotización del operador' : 'Pendiente de aceptación del cliente';

  return `
    <div class="truck-detail-overview">
      ${stateBadge(order.estado)}
      <p>${escape(formatLiters(order.litros))} · Solicitada ${escape(formatDate(order.fecha))}</p>
      <p>Último cambio operativo: ${escape(formatDate(order.actualizado))}</p>
    </div>

    <section class="truck-detail-section">
      <h3>Entrega y contacto</h3>
      <dl class="truck-facts">
        <dt>Dirección</dt><dd>${escape(order.direccion)}</dd>
        <dt>Referencias</dt><dd>${escape(order.referencias || 'Sin referencias')}</dd>
        <dt>Teléfono de entrega</dt><dd>${escape(order.telefono)}</dd>
        <dt>Pipa</dt><dd>${escape(order.pipa_nombre || 'Sin asignar')}</dd>
        <dt>Responsable</dt><dd>${escape(order.operador_nombre || 'Sin asignar')}</dd>
        <dt>Placas</dt><dd>${escape(order.pipa_placas || 'Sin asignar')}</dd>
        <dt>Contacto del operador</dt><dd>${escape(order.operador_telefono || 'Sin asignar')}</dd>
      </dl>
    </section>

    <section class="truck-detail-section">
      <h3>Seguimiento de entrega</h3>
      ${order.estado === 'cancelada' ? '<p>Pedido cancelado.</p>' : `
        <ol class="truck-delivery-steps" aria-label="Etapas de la entrega">
          ${Object.entries(deliveryStates).filter(([state]) => state !== 'cancelada').map(([state, label]) => `
            <li ${state === order.estado ? 'aria-current="step"' : ''}>${label}</li>
          `).join('')}
        </ol>
      `}
      ${renderLocation(data)}
    </section>

    <section class="truck-detail-section">
      <h3>Cotización</h3>
      <p><strong>${escape(price)}</strong> · ${escape(quoteState)}</p>
      ${order.llegada_estimada_minutos ? `
        <p>Estimación informada por el operador: ${escape(order.llegada_estimada_minutos)} minutos.</p>
      ` : ''}
      ${order.cotizacion_notas ? `<p class="detail-comment">${escape(order.cotizacion_notas)}</p>` : ''}
    </section>

    ${canManage ? renderEditor(data) : '<p class="scope-banner">Tu cuenta tiene acceso de consulta.</p>'}

    <section class="attention-history">
      <h3>Historial de gestión</h3>
      <p>Asignaciones y notas del centro de control. El estado de entrega se consulta arriba.</p>
      ${data.historial.length ? `
        <ol>
          ${data.historial.map((item) => `
            <li>
              <div>
                <strong>${escape(item.actor_nombre)}</strong>
                <time>${escape(formatDate(item.fecha))}</time>
              </div>
              <p>${item.accion === 'asignacion' ? 'Asignación' : 'Nota'} · ${escape(item.pipa_nombre || 'Sin pipa asignada')}</p>
              <p class="detail-comment">${escape(item.nota)}</p>
            </li>
          `).join('')}
        </ol>
      ` : '<p>Todavía no hay seguimiento registrado por un gestor.</p>'}
    </section>
  `;
}
