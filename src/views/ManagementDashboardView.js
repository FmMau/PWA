import { request, escapeHTML as e } from '../services/apiService.js';
import CitizenDashboardView from './CitizenDashboardView.js';

const attention = { nuevo: 'Nuevo', en_revision: 'En revisión', en_atencion: 'En atención' };
const link = query => `#/reportes?${new URLSearchParams(query)}`;
const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('es-MX') : 'Sin fecha';
const reportList = (reports, empty) => reports.length ? `<ul class="ops-report-list">${reports.map(r => `<li><a href="${e(link({reporte:r.id}))}" data-link><div><strong>#${e(r.id)} · ${e(r.colonia || 'Sin colonia')}</strong><span class="attention-badge" data-state="${e(r.estado_atencion)}">${e(attention[r.estado_atencion] || r.estado_atencion)}</span></div><p>${e(r.comentario || 'Sin comentario adicional')}</p><span>${e(r.responsable_nombre || 'Sin responsable')} · ${e(date(r.fecha))}</span><span class="ops-report-action">Abrir seguimiento →</span></a></li>`).join('')}</ul>` : `<div class="dashboard-empty"><p>${empty}</p></div>`;

export default {
  template: () => `<section class="page" data-api-page id="manager-dashboard"><div class="page-header dashboard-heading"><div><span class="page-eyebrow">Centro de Control</span><h2>Resumen de gestión</h2><p>Prioriza la atención de reportes y consulta el suministro por colonia.</p></div><button class="btn-primary" data-refresh>Actualizar resumen</button></div><p data-source role="status" aria-live="polite">Comprobando acceso…</p><div data-content></div></section>`,
  async init(container) {
    const page = container.querySelector('#manager-dashboard');
    const source = page.querySelector('[data-source]');
    const content = page.querySelector('[data-content]');
    const button = page.querySelector('[data-refresh]');
    async function refresh() {
      if (button.disabled) return;
      button.disabled = true;
      content.innerHTML = '';
      source.textContent = 'Consultando resumen…';
      try {
        const ctx = await request('/api/gestion/reportes/contexto');
        if (!ctx?.permisos?.consultar) throw new Error('403: Resumen de gestión no habilitado.');
        const data = await request('/api/gestion/reportes/resumen');
        if (!page.isConnected) return;
        if (!data.resumen || !Array.isArray(data.pendientes) || !Array.isArray(data.en_atencion)) throw new Error('El servidor no devolvió un resumen válido.');
        const cards = [
          ['Pendientes globales', data.resumen.pendientes, 'Nuevos, en revisión y en atención', {pendientes:'true'}],
          ['Sin responsable', data.resumen.sin_responsable, 'Pendientes que necesitan asignación', {pendientes:'true',responsable_id:'sin_asignar'}],
          ['En revisión', data.resumen.en_revision, 'Pendientes de diagnóstico', {estado_atencion:'en_revision'}],
          ['En atención', data.resumen.en_atencion, 'Casos con trabajo en curso', {estado_atencion:'en_atencion'}],
        ];
        source.textContent = `Todas las colonias · Datos del servidor · ${date(data.actualizado)}`;
        content.innerHTML = `<div class="scope-banner"><span><strong>Atención en toda la ciudad</strong><br>Los pendientes excluyen reportes resueltos y descartados.</span><a href="#/suministro" data-link>Consultar suministro por colonia →</a></div>
          <div class="stats-grid ops-stats">${cards.map(([label,count,description,query]) => `<a class="stat-card" href="${e(link(query))}" data-link><span class="stat-label">${label}</span><strong class="stat-value">${e(count)}</strong><span class="stat-description">${description}</span><span class="ops-report-action">Ver reportes →</span></a>`).join('')}</div>
          <div class="ops-panels"><article class="dashboard-card"><div class="section-title"><div><h3>Pendientes por priorizar</h3><p>Hasta cinco casos: primero sin responsable y después los más antiguos.</p></div><a href="${e(link({pendientes:'true'}))}" data-link>Ver todos →</a></div>${reportList(data.pendientes,'No hay reportes pendientes de atención.')}</article>
          <article class="dashboard-card"><div class="section-title"><div><h3>Casos en atención</h3><p>Hasta cinco casos en curso, de mayor antigüedad.</p></div><a href="${e(link({estado_atencion:'en_atencion'}))}" data-link>Ver todos →</a></div>${reportList(data.en_atencion,'No hay casos en atención en este momento.')}</article></div>
          <p class="dashboard-note">${e(data.resumen.resueltos)} resueltos · ${e(data.resumen.descartados)} descartados · ${e(data.resumen.total)} reportes en total. Los estados de atención no indican por sí solos el estado actual del suministro.</p>`;
      } catch (error) {
        if (!page.isConnected) return;
        // Only the account's own report snapshot can be used without staff access.
        if (/^403:/.test(error.message) || !navigator.onLine) {
          page.innerHTML = CitizenDashboardView.template();
          await CitizenDashboardView.init(page);
          return;
        }
        source.textContent = 'No se pudo actualizar el resumen de gestión.';
        content.innerHTML = `<div class="empty-state dashboard-empty"><h3>Resumen no disponible</h3><p>${e(/^404:/.test(error.message) ? 'La API necesita actualizarse para mostrar el resumen global.' : error.message)}</p><p>Utiliza Actualizar resumen para reintentar.</p></div>`;
      } finally { button.disabled = false; }
    }
    button.addEventListener('click', refresh);
    await refresh();
  },
};
