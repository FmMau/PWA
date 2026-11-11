import { resource, request, escapeHTML as e } from '../services/apiService.js';
import { readPosition, locationError } from '../services/geolocationService.js';

export default {
  template:()=>`<section class="page" data-api-page id="pipa-offers"><div class="page-header"><span class="page-eyebrow">MI PIPA Y ENTREGAS</span><h2>Pedidos disponibles</h2><p>Activa tu disponibilidad y comparte tu ubicación para recibir ofertas cercanas.</p><nav class="pipa-tabs"><a href="#/pipas" data-link>Solicitar pipa</a><a href="#/operador" data-link>Mi pipa y entregas</a></nav></div><div class="home-card"><button class="btn-primary" data-position>Compartir mi ubicación</button><button class="btn-secondary" data-refresh>Actualizar pedidos</button><p data-position-status role="status">La ubicación solo se comparte mientras esta pantalla está abierta y visible.</p></div><p data-feedback role="status" aria-live="polite"></p><div data-offers></div></section>`,
  async init(container){
    const page=container.querySelector('#pipa-offers'),feedback=page.querySelector('[data-feedback]');let sharing=false,busy=false,locating=false;
    async function refresh(){
      if(busy||!page.isConnected)return;busy=true;
      try{
        const results=await Promise.allSettled([resource('/api/pipas/ofertas'),resource('/api/pipas/disponibles')]);
        if(!page.isConnected)return;
        const entries=results.flatMap((result,index)=>result.status==='fulfilled'&&Array.isArray(result.value.data)?result.value.data.map(row=>({...row,cached:result.value.cached,modern:index===0})):[]);
        page.querySelector('[data-offers]').innerHTML=entries.map(order=>`<article class="home-card"><span class="page-eyebrow">${order.modern?'OFERTA CERCANA':'SOLICITUD DISPONIBLE'}</span><h3>${e(order.litros)} litros · ${e(order.colonia)}</h3><p>Pedido #${e(order.id)}${order.precio_centavos?' · '+(order.precio_centavos/100).toLocaleString('es-MX',{style:'currency',currency:'MXN'}):''}</p>${order.oferta_vence_en?`<p>Vence: ${e(new Date(order.oferta_vence_en).toLocaleTimeString('es-MX'))}</p>`:''}${order.cached?'<p>Consulta guardada; actualiza con conexión para aceptar.</p>':`<button class="btn-primary" data-accept="${e(order.id)}" ${order.modern?`data-offer="${e(order.oferta_id)}"`:''}>Aceptar pedido</button>${order.modern?` <button class="btn-secondary" data-decline="${e(order.id)}" data-offer="${e(order.oferta_id)}">Rechazar oferta</button>`:''}`}</article>`).join('')||'<article class="home-card"><h3>Sin pedidos disponibles</h3><p>Las ofertas vigentes aparecerán aquí. Verifica que tu pipa esté disponible y su capacidad sea suficiente.</p></article>';
        feedback.textContent=results.every(result=>result.status==='rejected')?'No pudimos consultar los pedidos. Revisa la conexión y tu perfil de operador.':'';
      }catch(error){feedback.textContent=error.message;}finally{busy=false;}
    }
    async function position(){
      if(locating||!sharing||!page.isConnected||document.visibilityState!=='visible')return;locating=true;
      try{const point=await readPosition();if(!sharing||!page.isConnected)return;const result=await request('/api/pipas/operador/posicion',{method:'PUT',body:{latitud:point.latitude,longitud:point.longitude,precision:point.accuracy,observada_en:Math.round(point.timestamp)}});if(page.isConnected)page.querySelector('[data-position-status]').textContent=result.aceptada?'Ubicación compartida mientras permaneces en esta pantalla.':'No se actualizó la ubicación. Verifica que tu pipa esté disponible.';await refresh();}
      catch(error){if(page.isConnected)page.querySelector('[data-position-status]').textContent=locationError(error);}finally{locating=false;}
    }
    page.querySelector('[data-position]').addEventListener('click',()=>{sharing=!sharing;page.querySelector('[data-position]').textContent=sharing?'Dejar de compartir':'Compartir mi ubicación';if(sharing)void position();else page.querySelector('[data-position-status]').textContent='Se detuvo el envío de ubicación desde esta pantalla.';});
    page.querySelector('[data-refresh]').addEventListener('click',refresh);
    page.addEventListener('click',async event=>{const button=event.target.closest('[data-accept],[data-decline]');if(!button)return;button.disabled=true;try{const id=button.dataset.accept||button.dataset.decline;await request(`/api/pipas/pedidos/${id}/${button.dataset.accept?'aceptar':'rechazar-oferta'}`,{method:'POST',body:button.dataset.offer?{oferta_id:Number(button.dataset.offer)}:{}});if(button.dataset.accept){location.hash='/operador';return;}await refresh();}catch(error){feedback.textContent=error.message;}finally{button.disabled=false;}});
    await refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible'){if(sharing)void position();void refresh();}},15000);
    return()=>{sharing=false;clearInterval(timer);};
  },
};
