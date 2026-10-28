import { request, escapeHTML as e } from '../services/apiService.js';
import CitizenReportsView from './CitizenReportsView.js';

const endpoint = '/api/gestion/reportes';
const labels = { nuevo: 'Nuevo', en_revision: 'En revisión', en_atencion: 'En atención', resuelto: 'Resuelto', descartado: 'Descartado' };
const water = { no_agua: 'Sin agua', baja_presion: 'Baja presión', tengo_agua: 'Con agua' };
const nextStates = { nuevo: ['en_revision','descartado'], en_revision: ['en_atencion','descartado'], en_atencion: ['en_revision','resuelto'], resuelto: ['en_revision'], descartado: ['en_revision'] };
const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('es-MX') : 'Sin fecha';
const options = (items, selected) => items.map(([value,label]) => `<option value="${e(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${e(label)}</option>`).join('');

function managementTemplate(ctx) {
  return `<section class="page management-page" id="management-page">
    <div class="page-header dashboard-heading"><div><span class="page-eyebrow">Centro de Control / Reportes</span><h2>Bandeja de gestión</h2><p>Organiza los reportes ciudadanos y registra su seguimiento de atención.</p></div><button class="btn-primary" id="refresh-inbox">Actualizar bandeja</button></div>
    <div class="scope-banner"><span><strong>Reportes de todas las colonias</strong><br>Acceso de ${ctx.permisos.gestionar ? 'gestión: puedes asignar responsables y registrar atención.' : 'consulta: puedes revisar reportes e historial.'}</span><span>El estado del agua y el de atención se muestran por separado.</span></div>
    <div class="stats-grid management-stats" id="inbox-stats" aria-label="Indicadores de los filtros aplicados"></div>
    <form class="inbox-filters" id="inbox-filters" aria-label="Filtros de reportes">
      <label class="inbox-search">Buscar<input name="q" type="search" maxlength="100" placeholder="Folio, colonia o comentario"></label>
      <label>Colonia<select name="colonia">${options([['','Todas las colonias'], ...ctx.colonias.map(c => [c,c])])}</select></label>
      <label>Tipo<select name="tipo">${options([['','Todos los tipos'],['agua','Suministro'],['fuga','Fuga']])}</select></label>
      <label>Atención<select name="estado_atencion">${options([['','Todos los estados'],...Object.entries(labels)])}</select></label>
      <label>Responsable<select name="responsable_id">${options([['','Todos'],['sin_asignar','Sin asignar'],...ctx.responsables.map(r => [r.id,r.nombre])])}</select></label>
      <label>Desde<input name="desde" type="date"></label><label>Hasta<input name="hasta" type="date"></label>
      <div class="inbox-filter-actions"><button class="btn-primary" type="submit">Aplicar filtros</button><button class="btn-secondary" type="reset">Limpiar filtros</button></div>
    </form>
    <p id="inbox-status" role="status" aria-live="polite"></p>
    <div class="inbox-results" id="inbox-results" aria-busy="true"></div>
    <nav class="inbox-pagination" aria-label="Páginas de reportes"><button class="btn-secondary" id="inbox-prev" disabled>Anterior</button><span id="inbox-page"></span><button class="btn-secondary" id="inbox-next" disabled>Siguiente</button></nav>
    <dialog class="report-dialog" id="report-detail" aria-labelledby="detail-title"><div class="detail-heading"><h2 id="detail-title">Detalle del reporte</h2><button type="button" class="btn-secondary" id="close-detail" aria-label="Cerrar detalle">Cerrar</button></div><p id="detail-status" role="status" aria-live="polite"></p><div id="detail-content"></div></dialog>
  </section>`;
}

export default {
  template: () => '<div id="reports-entry"><p role="status">Comprobando acceso a la bandeja de gestión…</p></div>',
  async init(container) {
    const entry = container.querySelector('#reports-entry');
    let ctx;
    try {
      ctx = await request(`${endpoint}/contexto`);
      if (!ctx?.permisos?.consultar || !Array.isArray(ctx.responsables) || !Array.isArray(ctx.colonias)) throw new Error('404: Gestión no disponible en este servidor.');
    } catch (error) {
      if (!entry.isConnected) return;
      if (/^(403|404):/.test(error.message) || !navigator.onLine) {
        const message = !navigator.onLine ? 'La bandeja de gestión requiere conexión. Puedes guardar reportes ciudadanos en este dispositivo.' : `${error.message.replace(/^\d+:\s*/, '')} Puedes continuar con tus reportes ciudadanos.`;
        entry.innerHTML = `<div class="scope-banner" role="status"><span><strong>${!navigator.onLine ? 'Sin conexión' : 'Bandeja de gestión no habilitada para esta cuenta'}</strong><br>${e(message)}</span></div>${CitizenReportsView.template()}`;
        await CitizenReportsView.init(entry);
      } else {
        entry.innerHTML = `<div class="empty-state dashboard-empty"><h2>No se pudo verificar el acceso</h2><p>${e(error.message)}</p><button class="btn-primary" data-retry-access>Reintentar</button></div>`;
        entry.querySelector('[data-retry-access]').addEventListener('click', () => {
          entry.innerHTML = '<p role="status">Comprobando acceso…</p>';
          this.init(container);
        });
      }
      return;
    }
    if (!entry.isConnected) return;
    entry.innerHTML = managementTemplate(ctx);
    const page = entry.querySelector('#management-page');
    const filters = page.querySelector('#inbox-filters');
    const status = page.querySelector('#inbox-status');
    const results = page.querySelector('#inbox-results');
    const dialog = page.querySelector('#report-detail');
    const detail = page.querySelector('#detail-content');
    const detailStatus = page.querySelector('#detail-status');
    let pageNumber = 1, lastPage = 1, filtersApplied = {}, listRevision = 0, detailRevision = 0, selected = null, saving = false;
    const controls = () => {
      page.querySelector('#inbox-prev').disabled = pageNumber <= 1;
      page.querySelector('#inbox-next').disabled = pageNumber >= lastPage;
    };
    function revoke() {
      ctx.permisos.gestionar = false;
      results.innerHTML = '';
      page.querySelector('#inbox-stats').innerHTML = '';
      detail.innerHTML = '';
      if (dialog.open) dialog.close();
      status.textContent = 'El servidor rechazó el acceso. Actualiza la página para verificar tus permisos.';
    }
    async function loadList() {
      const revision = ++listRevision;
      results.setAttribute('aria-busy', 'true');
      status.textContent = 'Consultando reportes…';
      page.querySelector('#inbox-prev').disabled = true;
      page.querySelector('#inbox-next').disabled = true;
      try {
        const query = new URLSearchParams({ ...filtersApplied, pagina: pageNumber, limite: 20 });
        const data = await request(`${endpoint}?${query}`);
        if (!page.isConnected || revision !== listRevision) return;
        if (!Array.isArray(data.reportes) || !data.resumen) throw new Error('Respuesta de bandeja inválida.');
        lastPage = Math.max(1, Math.ceil(data.resumen.total / data.limite));
        if (pageNumber > lastPage) { pageNumber = lastPage; return await loadList(); }
        page.querySelector('#inbox-stats').innerHTML = [['Reportes',data.resumen.total],['Nuevos',data.resumen.nuevos],['En proceso',data.resumen.en_proceso],['Resueltos',data.resumen.resueltos]].map(([label,count]) => `<article class="stat-card"><span class="stat-label">${label}</span><strong class="stat-value">${e(count)}</strong><span class="stat-description">Con los filtros aplicados</span></article>`).join('');
        results.innerHTML = data.reportes.length ? `<div class="inbox-column-headings" aria-hidden="true"><span>Reporte</span><span>Estado del agua</span><span>Atención</span><span>Responsable</span><span>Seguimiento</span></div>${data.reportes.map(r => `<article class="inbox-row"><div class="inbox-report"><span class="page-eyebrow">#${e(r.id)} · ${r.tipo === 'fuga' ? 'Fuga' : 'Suministro'}</span><h3>${e(r.colonia || 'Sin colonia')}</h3><p>${e(r.comentario || 'Sin comentario adicional')}</p><time>${e(date(r.fecha))}</time></div><div><span class="inbox-mobile-label">Estado del agua</span><span class="water-status">${e(water[r.estado] || r.estado)}</span></div><div><span class="inbox-mobile-label">Atención</span><span class="attention-badge" data-state="${e(r.estado_atencion)}">${e(labels[r.estado_atencion] || r.estado_atencion)}</span></div><div><span class="inbox-mobile-label">Responsable</span>${e(r.responsable_nombre || 'Sin asignar')}</div><button class="btn-secondary" data-detail="${e(r.id)}" aria-label="Ver seguimiento del reporte ${e(r.id)}">Ver detalle →</button></article>`).join('')}` : '<div class="dashboard-empty"><h3>No hay reportes con estos filtros</h3><p>Prueba otra colonia, otro periodo o limpia los filtros.</p></div>';
        status.textContent = `${data.resumen.total} reportes · ${data.resumen.descartados} descartados · Actualizado ${date(new Date().toISOString())}`;
        page.querySelector('#inbox-page').textContent = `Página ${pageNumber} de ${lastPage}`;
        controls();
      } catch (error) {
        if (!page.isConnected || revision !== listRevision) return;
        results.innerHTML = '';
        page.querySelector('#inbox-stats').innerHTML = '';
        page.querySelector('#inbox-page').textContent = '';
        status.textContent = `No se pudo actualizar la bandeja: ${error.message}`;
        if (/^(401|403):/.test(error.message)) revoke();
      } finally {
        if (revision === listRevision) results.setAttribute('aria-busy', 'false');
      }
    }
    async function loadDetail(id) {
      const revision = ++detailRevision;
      selected = null;
      detail.innerHTML = '';
      detailStatus.textContent = 'Consultando detalle e historial…';
      try {
        const data = await request(`${endpoint}/${encodeURIComponent(id)}`);
        if (!page.isConnected || revision !== detailRevision) return;
        selected = data.reporte;
        const r = selected;
        page.querySelector('#detail-title').textContent = `Reporte #${r.id} · ${r.colonia}`;
        detailStatus.textContent = '';
        const inactive = r.responsable_id !== null && !ctx.responsables.some(x => x.id === r.responsable_id);
        detail.innerHTML = `<div class="detail-summary"><span class="attention-badge" data-state="${e(r.estado_atencion)}">${e(labels[r.estado_atencion])}</span><p>${e(r.tipo === 'fuga' ? 'Fuga' : 'Suministro')} · ${e(water[r.estado] || r.estado)} · ${e(date(r.fecha))}</p><p class="detail-comment">${e(r.comentario || 'Sin comentario adicional')}</p><p>Responsable: <strong>${e(r.responsable_nombre || 'Sin asignar')}</strong></p></div>
          ${ctx.permisos.gestionar ? `<form class="attention-form" id="attention-form"><h3>Registrar seguimiento</h3><div class="attention-fields"><label for="attention-state">Estado de atención<select id="attention-state" name="estado_atencion">${options([r.estado_atencion,...(nextStates[r.estado_atencion] || [])].map(s => [s,labels[s]]),r.estado_atencion)}</select></label><label for="attention-owner">Responsable<select id="attention-owner" name="responsable_id">${options([['','Sin asignar'],...(inactive ? [[r.responsable_id,`${r.responsable_nombre || 'Responsable anterior'} (sin permiso vigente)`]] : []),...ctx.responsables.map(x => [x.id,x.nombre])], r.responsable_id ?? '')}</select></label></div><label for="attention-note">Nota de seguimiento<textarea id="attention-note" name="nota" maxlength="2000" required rows="3" placeholder="Describe la revisión, asignación o trabajo realizado"></textarea></label><p>Para atender o resolver se requiere responsable. Cada cambio queda registrado en el historial.</p><button class="btn-primary" type="submit" ${!navigator.onLine ? 'disabled' : ''}>Guardar seguimiento</button><p data-save-feedback role="status" aria-live="polite">${!navigator.onLine ? 'Conéctate para guardar seguimiento.' : ''}</p><button class="btn-secondary" type="button" data-reload-detail>Recargar detalle</button></form>` : '<p class="scope-banner">Tu acceso permite consultar el historial.</p>'}
          <section class="attention-history"><h3>Historial de atención</h3>${data.historial.length ? `<ol>${data.historial.map(h => `<li><div><strong>${e(h.actor_nombre)}</strong><time>${e(date(h.fecha))}</time></div><p>${e(labels[h.estado_anterior])} → ${e(labels[h.estado_nuevo])} · ${e(h.responsable_nuevo_nombre || 'Sin asignar')}</p><p class="detail-comment">${e(h.nota)}</p><small>Versión ${e(h.version)}</small></li>`).join('')}</ol>` : '<p>Todavía no se ha registrado atención para este reporte.</p>'}</section>`;
      } catch (error) {
        if (!page.isConnected || revision !== detailRevision) return;
        detailStatus.textContent = error.message;
        detail.innerHTML = '<button class="btn-secondary" data-retry-detail>Reintentar detalle</button>';
        detail.querySelector('[data-retry-detail]').addEventListener('click', () => loadDetail(id));
        if (/^(401|403):/.test(error.message)) revoke();
      }
    }
    filters.addEventListener('submit', event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(filters));
      if (values.desde && values.hasta && values.desde > values.hasta) { status.textContent = 'La fecha inicial debe ser anterior o igual a la final.'; return; }
      filtersApplied = Object.fromEntries(Object.entries(values).filter(([,value]) => value));
      pageNumber = 1; loadList();
    });
    filters.addEventListener('reset', () => { filtersApplied = {}; pageNumber = 1; loadList(); });
    page.querySelector('#refresh-inbox').addEventListener('click', loadList);
    page.querySelector('#inbox-prev').addEventListener('click', () => { if (pageNumber > 1) { pageNumber--; loadList(); } });
    page.querySelector('#inbox-next').addEventListener('click', () => { if (pageNumber < lastPage) { pageNumber++; loadList(); } });
    results.addEventListener('click', event => {
      const button = event.target.closest('[data-detail]');
      if (button) { dialog.showModal(); loadDetail(button.dataset.detail); }
    });
    page.querySelector('#close-detail').addEventListener('click', () => { if (!saving) dialog.close(); });
    dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
    dialog.addEventListener('close', () => { detailRevision++; selected = null; detail.innerHTML = ''; });
    detail.addEventListener('click', event => {
      if (event.target.closest('[data-reload-detail]') && selected && !saving) loadDetail(selected.id);
    });
    detail.addEventListener('submit', async event => {
      if (event.target.id !== 'attention-form') return;
      event.preventDefault();
      if (saving || !selected || !ctx.permisos.gestionar) return;
      const form = event.target, feedback = form.querySelector('[data-save-feedback]');
      if (!navigator.onLine) { feedback.textContent = 'Conéctate para guardar. La nota se conserva.'; return; }
      const values = Object.fromEntries(new FormData(form));
      if (!values.nota.trim()) { feedback.textContent = 'Escribe una nota de seguimiento.'; return; }
      const id = selected.id;
      saving = true;
      form.querySelectorAll('button').forEach(button => { button.disabled = true; });
      page.querySelector('#close-detail').disabled = true;
      try {
        await request(`${endpoint}/${encodeURIComponent(id)}/atencion`, { method: 'PUT', body: { version: selected.version_atencion, estado_atencion: values.estado_atencion, responsable_id: values.responsable_id ? Number(values.responsable_id) : null, nota: values.nota.trim() } });
        await loadDetail(id);
        detailStatus.textContent = 'Seguimiento confirmado por el servidor.';
        await loadList();
      } catch (error) {
        feedback.textContent = `${error.message} La nota se conserva. ${/^409:/.test(error.message) ? 'Copia tu nota antes de recargar el detalle.' : ''}`;
        if (/^409:/.test(error.message)) form.dataset.conflict = 'true';
        if (/^(401|403):/.test(error.message)) revoke();
      } finally {
        saving = false;
        form.querySelectorAll('button').forEach(button => { button.disabled = button.type === 'submit' && (form.dataset.conflict === 'true' || !navigator.onLine || !ctx.permisos.gestionar); });
        page.querySelector('#close-detail').disabled = false;
      }
    });
    await loadList();
  },
};
