import { resource, context, escapeHTML as e } from '../services/apiService.js';

const states = { no_agua: 'Sin agua', baja_presion: 'Baja presión', tengo_agua: 'Con agua' };
export default {
  template: () => `<section class="page" data-api-page>
    <div class="page-header dashboard-heading"><div><span class="page-eyebrow">Centro de Control</span><h2>Resumen del suministro</h2><p>Consulta las observaciones ciudadanas y da seguimiento al servicio.</p></div><button class="btn-primary" data-refresh>Actualizar resumen</button></div>
    <div class="scope-banner"><span><strong data-colonia>Colonia de la cuenta</strong><br>Los indicadores corresponden a los reportes visibles de esta colonia.</span><a href="#/suministro" data-link>Consultar otras colonias →</a></div>
    <p data-source role="status" aria-live="polite">Consultando reportes…</p><div data-content></div>
    <div class="dashboard-grid dashboard-shortcuts">
      <a class="dashboard-card" href="#/reportes" data-link><span class="page-eyebrow">Reportes</span><h3>Consultar observaciones →</h3><p>Revisa reportes ciudadanos y sus confirmaciones.</p></a>
      <a class="dashboard-card" href="#/suministro" data-link><span class="page-eyebrow">Suministro</span><h3>Revisar colonias →</h3><p>Consulta observaciones recientes y su vigencia.</p></a>
    </div></section>`,
  async init(container) {
    const page = container.querySelector('[data-api-page]');
    const { session } = await context();
    page.querySelector('[data-colonia]').textContent = session?.user?.colonia || 'Colonia sin especificar';
    const content = page.querySelector('[data-content]');
    const source = page.querySelector('[data-source]');
    const button = page.querySelector('[data-refresh]');
    async function refresh() {
      button.disabled = true;
      try {
        const result = await resource('/api/reportes');
        if (!page.isConnected) return;
        const data = result.data;
        source.textContent = `${result.cached ? 'Copia guardada · no se pudo actualizar' : 'Datos del servidor'} · ${new Date(result.date).toLocaleString('es-MX')}`;
        content.innerHTML = `<div class="stats-grid">${[['Reportes visibles', data.length], ...Object.entries(states).map(([state, label]) => [label, data.filter(r => r.estado === state).length])].map(([label, count]) => `<article class="stat-card"><span class="stat-label">${label}</span><strong class="stat-value">${count}</strong><span class="stat-description">Reportes de la colonia</span></article>`).join('')}</div>
          <p class="dashboard-note">Los conteos pueden incluir varios reportes de una misma persona. La ausencia de reportes no confirma un suministro normal.</p>
          <article class="dashboard-card"><div class="section-title"><div><h3>Reportes recientes</h3><p>Hasta cinco observaciones, ordenadas por fecha cuando está disponible.</p></div><a href="#/reportes" data-link>Ver reportes →</a></div>
          ${[...data].sort((a,b) => (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0)).slice(0,5).map(r => `<div class="report-preview"><strong>${e(states[r.estado] || r.estado)} · ${e(r.colonia || session?.user?.colonia)}</strong><span>${e(r.comentario || 'Sin comentario adicional')}</span><span>Folio #${e(r.id)}${r.fecha ? ` · ${e(r.fecha)}` : ''}</span></div>`).join('') || '<div class="dashboard-empty"><h3>Sin reportes para mostrar</h3><p>Las observaciones disponibles aparecerán aquí al actualizar.</p></div>'}</article>`;
      } catch (error) {
        source.textContent = 'No se pudo consultar el resumen.';
        content.innerHTML = `<div class="empty-state dashboard-empty"><h3>Información no disponible</h3><p>${e(error.message)}</p><p>Vuelve a actualizar cuando tengas conexión.</p></div>`;
      } finally { button.disabled = false; }
    }
    button.addEventListener('click', refresh);
    await refresh();
  }
};
