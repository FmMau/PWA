import { resource, request, escapeHTML as e } from '../services/apiService.js';

const formatDate = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('es-MX') : 'Sin fecha';
const normalize = value => String(value).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('es');
const count = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : 0;
const views = ['con_datos', 'incidencias', 'sin_datos', 'vencidas', 'todas'];

export default {
  template: () => `<section class="page" id="colony-supply" data-api-page><div class="page-header dashboard-heading"><div><span class="page-eyebrow">Centro de Control / Suministro</span><h2>Suministro por colonia</h2><p>Consulta las observaciones ciudadanas recientes y detecta zonas que necesitan revisión.</p></div><button class="btn-primary" data-refresh>Actualizar suministro</button></div>
    <div class="scope-banner"><span><strong>Observaciones de las últimas 24 horas</strong><br>Se considera la última observación de suministro de cada vecino por colonia. No se incluyen fugas.</span><span>Una colonia sin observaciones no confirma un servicio normal.</span></div>
    <p data-source role="status" aria-live="polite">Consultando colonias…</p><div class="stats-grid ops-stats" data-colony-stats></div>
    <form class="colony-filters" aria-label="Filtrar colonias"><label>Buscar colonia<input name="q" type="search" maxlength="100" placeholder="Nombre de la colonia"></label><label>Mostrar<select name="vista"><option value="con_datos">Con observaciones</option><option value="incidencias">Sin agua o baja presión</option><option value="sin_datos">Sin observaciones</option><option value="vencidas">Observaciones vencidas</option><option value="todas">Todas las colonias</option></select></label><button class="btn-secondary" type="reset">Limpiar filtros</button></form>
    <p data-results-status role="status" aria-live="polite"></p><div class="colony-list" data-colonies></div><nav class="inbox-pagination" aria-label="Páginas de colonias"><button class="btn-secondary" data-prev disabled>Anterior</button><span data-page></span><button class="btn-secondary" data-next disabled>Siguiente</button></nav>
  </section>`,
  async init(container, { query = new URLSearchParams() } = {}) {
    const page = container.querySelector('#colony-supply');
    const form = page.querySelector('form');
    const source = page.querySelector('[data-source]');
    const list = page.querySelector('[data-colonies]');
    const stats = page.querySelector('[data-colony-stats]');
    const button = page.querySelector('[data-refresh]');
    const catalogPromise = fetch(new URL('../../data/colonias.json', import.meta.url)).then(response => {
      if (!response.ok) throw new Error('Catálogo no disponible');
      return response.json();
    });
    // Attach a rejection handler immediately while the API is being consulted.
    const catalog = catalogPromise.catch(() => null);
    let colonies = [], canConsultReports = false, pageNumber = 1, loaded = false;
    form.elements.q.value = (query.get('colonia') || query.get('q') || '').slice(0,100);
    form.elements.vista.value = views.includes(query.get('vista')) ? query.get('vista') : form.elements.q.value ? 'todas' : 'con_datos';
    function rememberFilters() {
      const params = new URLSearchParams();
      if (form.elements.q.value.trim()) params.set('q',form.elements.q.value.trim());
      if (form.elements.vista.value !== 'con_datos') params.set('vista',form.elements.vista.value);
      history.replaceState({}, '', `#/suministro${params.size ? '?' + params : ''}`);
    }
    function render() {
      if (!page.isConnected || !loaded) return;
      const now = Date.now();
      const data = colonies.map(c => {
        const total = c.no_agua + c.baja_presion + c.tengo_agua;
        const valid = total > 0 && Date.parse(c.expira) > now;
        const incident = valid && c.no_agua + c.baja_presion > 0;
        return { ...c, total, valid, incident, priority: incident ? 0 : valid ? 1 : total ? 2 : 3 };
      });
      stats.innerHTML = [['Con observaciones vigentes',data.filter(c=>c.valid).length],['Con falta de agua o baja presión',data.filter(c=>c.incident).length],['Con observaciones vencidas',data.filter(c=>c.total && !c.valid).length],['Sin observaciones',data.filter(c=>!c.total).length]].map(([label,value]) => `<article class="stat-card"><span class="stat-label">${label}</span><strong class="stat-value">${value}</strong><span class="stat-description">Colonias del catálogo disponible</span></article>`).join('');
      const text = normalize(form.elements.q.value.trim());
      const view = form.elements.vista.value;
      const filtered = data.filter(c => normalize(c.colonia).includes(text) && (view === 'todas' || (view === 'con_datos' && c.total > 0) || (view === 'incidencias' && c.incident) || (view === 'sin_datos' && !c.total) || (view === 'vencidas' && c.total > 0 && !c.valid))).sort((a,b) => a.priority-b.priority || (b.no_agua+b.baja_presion)-(a.no_agua+a.baja_presion) || a.colonia.localeCompare(b.colonia,'es'));
      const lastPage = Math.max(1,Math.ceil(filtered.length/20));
      pageNumber = Math.min(pageNumber,lastPage);
      const visible = filtered.slice((pageNumber-1)*20,pageNumber*20);
      page.querySelector('[data-results-status]').textContent = `${filtered.length} colonias coinciden · Los indicadores superiores corresponden al catálogo completo.`;
      list.innerHTML = visible.length ? visible.map(c => {
        const state = !c.total ? 'none' : !c.valid ? 'expired' : c.incident ? 'incident' : 'water';
        const label = !c.total ? 'Sin observaciones' : !c.valid ? 'Requiere actualización' : c.incident ? 'Falta de agua o baja presión reportada' : 'Con agua reportada';
        return `<article class="colony-card" data-colony="${e(c.colonia)}"><div class="colony-heading"><div><h3>${e(c.colonia)}</h3><span class="colony-status" data-status="${state}">${label}</span></div>${canConsultReports ? `<a class="btn-secondary" href="#/reportes?${e(new URLSearchParams({colonia:c.colonia}).toString())}" data-link>Ver reportes →</a>` : ''}</div>
          ${c.total ? `<div class="colony-observations"><span><strong>${c.no_agua}</strong> Sin agua</span><span><strong>${c.baja_presion}</strong> Baja presión</span><span><strong>${c.tengo_agua}</strong> Con agua</span></div><div class="colony-bar" aria-hidden="true"><span class="bar-no-water" style="width:${c.no_agua/c.total*100}%"></span><span class="bar-low-water" style="width:${c.baja_presion/c.total*100}%"></span><span class="bar-water" style="width:${c.tengo_agua/c.total*100}%"></span></div><p>${c.valid ? 'Última observación' : 'Observaciones guardadas, sin vigencia confirmada'}: ${e(formatDate(c.ultima_actualizacion))}<br>Vigencia del conjunto hasta: ${e(formatDate(c.expira))}</p>` : '<p>No hay observaciones de suministro en la ventana consultada. No se puede determinar el estado del servicio.</p>'}</article>`;
      }).join('') : '<div class="dashboard-empty"><h3>No hay colonias con estos filtros</h3><p>Cambia la búsqueda o elige Todas las colonias.</p></div>';
      page.querySelector('[data-page]').textContent = `Página ${pageNumber} de ${lastPage}`;
      page.querySelector('[data-prev]').disabled = pageNumber <= 1;
      page.querySelector('[data-next]').disabled = pageNumber >= lastPage;
    }
    async function refresh() {
      if (button.disabled) return;
      button.disabled = true;
      source.textContent = 'Consultando suministro…';
      try {
        const outcomes = await Promise.allSettled([resource('/api/reportes/mapa'), catalog, request('/api/gestion/reportes/contexto')]);
        if (!page.isConnected) return;
        if (outcomes[0].status === 'rejected') throw outcomes[0].reason;
        const result = outcomes[0].value;
        if (!Array.isArray(result.data?.colonias)) throw new Error('El servidor no devolvió observaciones por colonia.');
        canConsultReports = outcomes[2].status === 'fulfilled' && outcomes[2].value?.permisos?.consultar === true;
        const names = outcomes[1].status === 'fulfilled' && Array.isArray(outcomes[1].value) ? outcomes[1].value : [];
        const observed = new Map(result.data.colonias.map(c => [c.colonia,c]));
        colonies = [...new Set([...names, ...observed.keys()])].filter(name=>typeof name === 'string').map(name => {
          const c = observed.get(name) || {};
          return { colonia:name, no_agua:count(c.no_agua), baja_presion:count(c.baja_presion), tengo_agua:count(c.tengo_agua), ultima_actualizacion:c.ultima_actualizacion, expira:c.expira };
        });
        loaded = true;
        source.textContent = `${result.cached ? 'Copia guardada · no se pudo actualizar la red' : 'Datos del servidor'} · Consultado ${formatDate(result.date)}${names.length ? '' : ' · Catálogo no disponible: solo se muestran colonias con observaciones.'}`;
        pageNumber = 1;
        render();
      } catch (error) {
        if (!page.isConnected) return;
        loaded = false;
        colonies = [];
        list.innerHTML = '';
        stats.innerHTML = '';
        page.querySelector('[data-results-status]').textContent = '';
        page.querySelector('[data-page]').textContent = '';
        page.querySelector('[data-prev]').disabled = true;
        page.querySelector('[data-next]').disabled = true;
        source.textContent = `No se pudo consultar el suministro: ${error.message}`;
      } finally { button.disabled = false; }
    }
    form.addEventListener('submit', event => { event.preventDefault(); pageNumber = 1; rememberFilters(); render(); });
    form.addEventListener('input', () => { pageNumber = 1; rememberFilters(); render(); });
    form.addEventListener('change', () => { pageNumber = 1; rememberFilters(); render(); });
    form.addEventListener('reset', event => { event.preventDefault(); form.elements.q.value = ''; form.elements.vista.value = 'con_datos'; pageNumber = 1; rememberFilters(); render(); });
    button.addEventListener('click', refresh);
    page.querySelector('[data-prev]').addEventListener('click', () => { if (pageNumber > 1) { pageNumber--; render(); } });
    page.querySelector('[data-next]').addEventListener('click', () => { pageNumber++; render(); });
    await refresh();
  },
};
