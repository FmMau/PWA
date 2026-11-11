import { escapeHTML as e, context } from '../services/apiService.js';
import { catalog, loadCommunity, summarize, WATER_STATES, dateLabel } from '../services/communityService.js';

export default {
  template: () => `<section class="page" id="water-map"><div class="page-header dashboard-heading"><div><span class="page-eyebrow">TU COMUNIDAD</span><h2>Mapa del agua</h2><p>Explora los reportes de las colonias de La Paz.</p></div><button class="btn-secondary" data-refresh>Actualizar mapa</button></div><p data-source role="status" aria-live="polite"></p><div class="map-layout"><article class="home-card geographic-card"><div class="map-controls"><label>Buscar colonia<select data-colony aria-label="Seleccionar colonia"></select></label><button class="btn-secondary" data-zoom="in" aria-label="Acercar mapa">+</button><button class="btn-secondary" data-zoom="out" aria-label="Alejar mapa">−</button><button class="btn-secondary" data-reset>Ver ciudad</button></div><div data-map></div><div class="map-legend">${Object.values(WATER_STATES).map(s=>`<span><i style="background:${s.color}"></i>${s.label}</span>`).join('')}</div><p class="home-caption">Límites de colonia de AquaPaz. Selecciona una zona para consultar su estado. Último reporte por vecino, vigente durante 24 horas.</p></article><aside data-detail></aside></div></section>`,
  async init(container, { query = new URLSearchParams() } = {}) {
    const page = container.querySelector('#water-map');
    const { session } = await context();
    const source = page.querySelector('[data-source]');
    let selected = query.get('colonia') || session.user.colonia, features, snapshot, scale = 1, center = [500,350], projection;
    function draw() {
      if (!features || !page.isConnected) return;
      const rows = snapshot?.data.colonias || [];
      const mine = summarize(rows.find(row=>row.colonia===selected));
      const state = WATER_STATES[mine.state], w=1000/scale, h=700/scale;
      page.querySelector('[data-map]').innerHTML = `<svg class="colony-map" viewBox="${center[0]-w/2} ${center[1]-h/2} ${w} ${h}" role="group" aria-label="Colonias de La Paz; selecciona una zona">${features.map((feature,index)=>{
        const name=feature.properties.nombre, summary=summarize(rows.find(row=>row.colonia===name));
        const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
        const d=polygons.map(rings=>rings.map(ring=>ring.map((point,i)=>`${i?'L':'M'}${projection(point).join(',')}`).join(' ')+' Z').join(' ')).join(' ');
        return `<path d="${d}" fill="${WATER_STATES[summary.state].color}" fill-opacity="${name===selected?'.85':'.3'}" stroke="${name===selected?'#0077c8':'#fff'}" stroke-width="${name===selected?3:1}" vector-effect="non-scaling-stroke" fill-rule="evenodd" tabindex="0" role="button" aria-label="${e(name)}: ${WATER_STATES[summary.state].label}" data-zone="${index}"><title>${e(name)} · ${WATER_STATES[summary.state].label}</title></path>`;
      }).join('')}</svg>`;
      page.querySelector('[data-colony]').value=selected;
      page.querySelector('[data-detail]').innerHTML=`<article class="home-card"><span class="page-eyebrow">COLONIA SELECCIONADA</span><h3>${e(selected)}</h3><p class="map-state" style="color:${state.color}">${snapshot?state.label:'Información no disponible'}</p><p>${mine.total?`${mine.total} vecinos con reportes vigentes.`:'Sin reportes vigentes. Esto no confirma un suministro normal.'}</p><div class="water-counts">${Object.entries(mine.counts).map(([key,value])=>`<div><strong style="color:${WATER_STATES[key].color}">${snapshot?value:'—'}</strong><span>${WATER_STATES[key].label}</span></div>`).join('')}</div><p class="home-caption">${mine.updatedAt?'Último reporte: '+dateLabel(mine.updatedAt):'Comparte cómo está el agua en tu domicilio.'}</p><a class="home-report-button" href="#/reportes" data-link>Reportar en mi colonia →</a></article>`;
    }
    function select(name, zoom=false){
      selected=name;
      if(zoom){const f=features.find(f=>f.properties.nombre===name);const ring=f.geometry.type==='Polygon'?f.geometry.coordinates[0]:f.geometry.coordinates[0][0];const points=ring.map(projection);center=[points.reduce((s,p)=>s+p[0],0)/points.length,points.reduce((s,p)=>s+p[1],0)/points.length];scale=3;}
      draw();
    }
    async function refresh(){
      page.querySelector('[data-refresh]').disabled=true;
      const results=await Promise.allSettled([catalog(),loadCommunity()]);if(!page.isConnected)return;
      if(results[0].status==='fulfilled'){
        features=results[0].value;
        const points=features.flatMap(f=>f.geometry.coordinates.flat(f.geometry.type==='Polygon'?1:2));
        const xs=points.map(p=>p[0]*Math.cos(24.125*Math.PI/180)),ys=points.map(p=>-p[1]);
        const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),factor=Math.min(940/(maxX-minX),640/(maxY-minY));
        projection=([x,y])=>[30+(x*Math.cos(24.125*Math.PI/180)-minX)*factor,30+(-y-minY)*factor];
        const names=[...new Set(features.map(f=>f.properties.nombre))].sort((a,b)=>a.localeCompare(b,'es'));
        if(!names.includes(selected))selected=names[0];
        page.querySelector('[data-colony]').innerHTML=names.map(name=>`<option value="${e(name)}">${e(name)}</option>`).join('');
      }
      snapshot=results[1].status==='fulfilled'?results[1].value:null;
      source.textContent=snapshot?`${snapshot.cached?'Consulta guardada · sin actualización':'Datos comunitarios'} · ${dateLabel(snapshot.date)}`:'No pudimos actualizar el agua por colonia.';
      if(!features)source.textContent+=' El mapa de colonias no está disponible.';
      draw();page.querySelector('[data-refresh]').disabled=false;
    }
    page.querySelector('[data-refresh]').addEventListener('click',refresh);
    page.querySelector('[data-colony]').addEventListener('change',event=>select(event.target.value,true));
    page.addEventListener('click',event=>{const zone=event.target.closest('[data-zone]');if(zone)select(features[Number(zone.dataset.zone)].properties.nombre);const zoom=event.target.closest('[data-zoom]');if(zoom){scale=Math.max(1,Math.min(8,scale*(zoom.dataset.zoom==='in'?1.5:1/1.5)));draw();}if(event.target.closest('[data-reset]')){scale=1;center=[500,350];draw();}});
    page.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)&&event.target.matches('[data-zone]')){event.preventDefault();select(features[Number(event.target.dataset.zone)].properties.nombre);}});
    await refresh();
  },
};
