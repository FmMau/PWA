import { escapeHTML as e, context } from '../services/apiService.js';
import { catalog, loadCommunity, summarize, WATER_STATES, dateLabel } from '../services/communityService.js';
export default {
  template: () => `<section class="page" data-api-page id="community-data"><div class="page-header dashboard-heading"><div><span class="page-eyebrow">OBSERVACIONES CIUDADANAS</span><h2>Datos de la comunidad</h2><p>El último reporte de cada vecino en las últimas 24 horas.</p></div><button class="btn-secondary" data-refresh>Actualizar datos</button></div><p data-source role="status"></p><div data-metrics></div><div class="home-card"><div class="map-controls"><label>Buscar colonia<input type="search" data-search placeholder="Nombre de la colonia"></label><label>Estado<select data-state><option value="">Todos</option>${Object.entries(WATER_STATES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}</select></label></div><div data-rows></div><button class="btn-secondary" data-more hidden>Mostrar más colonias</button></div></section>`,
  async init(container){
    const page=container.querySelector('#community-data');let rows=[],visible=20;const {session}=await context();
    function render(){
      const search=page.querySelector('[data-search]').value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase(),state=page.querySelector('[data-state]').value;
      const filtered=rows.filter(r=>r.name.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().includes(search)&&(!state||r.state===state));
      page.querySelector('[data-rows]').innerHTML=filtered.slice(0,visible).map(row=>`<a class="data-colony-row" href="#/mapa?colonia=${encodeURIComponent(row.name)}" data-link><div><strong>${e(row.name)}${row.name===session.user.colonia?' · Tu colonia':''}</strong><span>${row.total} vecinos con reportes vigentes</span></div><span style="color:${WATER_STATES[row.state].color}">${WATER_STATES[row.state].label} →</span></a>`).join('')||'<p>No hay colonias que coincidan.</p>';
      page.querySelector('[data-more]').hidden=filtered.length<=visible;
    }
    async function refresh(){
      page.querySelector('[data-refresh]').disabled=true;
      try{const [features,snapshot]=await Promise.all([catalog(),loadCommunity()]);if(!page.isConnected)return;
        rows=[...new Set([...features.map(f=>f.properties.nombre),...snapshot.data.colonias.map(r=>r.colonia)])].map(name=>({name,...summarize(snapshot.data.colonias.find(r=>r.colonia===name))}));
        page.querySelector('[data-source]').textContent=`${snapshot.cached?'Consulta guardada · sin actualización':'Datos del servidor'} · ${dateLabel(snapshot.date)}. Estos datos no son una medición de toda la ciudad.`;
        const covered=rows.filter(r=>r.total>0);
        page.querySelector('[data-metrics]').innerHTML=`<div class="stats-grid community-metrics">${[['Colonias con datos',covered.length],['Vecinos con reportes',rows.reduce((s,r)=>s+r.total,0)],['Colonias sin datos',rows.length-covered.length]].map(([label,value])=>`<article class="stat-card"><span class="stat-label">${label}</span><strong class="stat-value">${value}</strong><span class="stat-description">Últimas 24 horas</span></article>`).join('')}</div>`;
        render();
      }catch(error){page.querySelector('[data-source]').textContent=error.message;}finally{page.querySelector('[data-refresh]').disabled=false;}
    }
    page.querySelector('[data-refresh]').addEventListener('click',refresh);for(const selector of ['[data-search]','[data-state]'])page.querySelector(selector).addEventListener('input',()=>{visible=20;render();});
    page.querySelector('[data-more]').addEventListener('click',()=>{visible+=20;render();});await refresh();
  },
};
