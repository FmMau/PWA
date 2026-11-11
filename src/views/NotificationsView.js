import { resource, request, escapeHTML as e } from '../services/apiService.js';
import { dateLabel } from '../services/communityService.js';

export default {
  template: () => `<section class="page notifications-page" data-api-page id="notifications-page"><div class="page-header dashboard-heading"><div><span class="page-eyebrow">TU COMUNIDAD</span><h2>Notificaciones</h2><p>Lo que ocurre en tu colonia y las novedades de tus pedidos.</p></div><button class="btn-secondary" data-refresh>Actualizar</button></div><p data-feedback role="status" aria-live="polite"></p><div data-notices></div></section>`,
  async init(container, { query = new URLSearchParams() } = {}) {
    const page=container.querySelector('#notifications-page'),feedback=page.querySelector('[data-feedback]');
    let snapshot,items=[],busy=false,focused=false;
    const selected=query.get('reporte');
    function render(){
      if(!page.isConnected)return;
      page.querySelector('[data-notices]').innerHTML=items.map(item=>{
        const report=item.tipo==='reporte'&&Number.isSafeInteger(item.reporte_id);
        const decided=['confirmar','rechazar'].includes(item.mi_decision);
        const canConfirm=report&&item.puede_confirmar&&!decided&&!snapshot.cached&&navigator.onLine;
        const positive=item.reporte_estado==='tengo_agua'?'También tengo agua':'También me ocurre';
        return `<article class="home-card notice-card ${item.leido?'':'is-unread'} ${report&&String(item.reporte_id)===selected?'is-highlighted':''}" data-notice="${e(item.id)}"><div class="notice-icon"><i class="fa-solid fa-${report?'droplet':item.tipo==='pipa'?'truck-droplet':'bell'}" aria-hidden="true"></i></div><div class="notice-body"><div class="section-title"><h3>${e(item.titulo||'Aviso de AquaPaz')}</h3>${!item.leido?'<span class="notice-new">Nuevo</span>':''}</div><p>${e(item.mensaje)}</p><time>${e(dateLabel(item.fecha))}</time>
        ${decided?`<p class="notice-decision">${item.mi_decision==='confirmar'?'Confirmaste este reporte. Gracias por participar.':'Registraste que no te ocurre lo mismo.'}</p>`:canConfirm?`<div class="notice-confirm"><p>¿En tu domicilio ocurre lo mismo?</p><button class="btn-primary" data-decision="confirmar" data-id="${e(item.id)}">${positive}</button><button class="btn-secondary" data-decision="rechazar" data-id="${e(item.id)}">No me ocurre</button></div>`:report&&item.puede_confirmar?'<p class="home-caption">Conéctate y actualiza los avisos para confirmar.</p>':''}
        ${item.tipo==='pipa'?`<a class="text-link" href="#/${item.destinatario==='operador'?'operador':'pipas'}" data-link>Ver pedido →</a>`:''}
        <div class="notice-actions">${!item.leido?`<button class="notification-text-action" data-read="${e(item.id)}">Marcar como leída</button>`:''}<button class="notification-text-action" data-remove="${e(item.id)}">Eliminar aviso</button></div></div></article>`;
      }).join('')||'<article class="home-card notices-empty"><i class="fa-regular fa-bell" aria-hidden="true"></i><h3>Estás al día</h3><p>Cuando un vecino comparta un reporte, lo verás aquí y podrás confirmar si también te ocurre.</p></article>';
      if(snapshot.cached)feedback.textContent='Sin conexión. Se muestran tus avisos guardados.';
      if(selected&&!focused){const match=items.find(item=>String(item.reporte_id)===selected);if(match){page.querySelector(`[data-notice="${Number(match.id)}"]`)?.scrollIntoView({block:'center'});focused=true;}}
    }
    async function refresh(){
      if(busy||!page.isConnected)return;busy=true;page.querySelector('[data-refresh]').disabled=true;
      try{const result=await resource('/api/notificaciones');if(!page.isConnected)return;if(!Array.isArray(result.data))throw new Error('No se pudieron consultar los avisos.');snapshot=result;items=result.data;render();}
      catch{feedback.textContent='No pudimos actualizar tus avisos. Intenta nuevamente.';}
      finally{busy=false;if(page.isConnected)page.querySelector('[data-refresh]').disabled=false;}
    }
    page.querySelector('[data-refresh]').addEventListener('click',()=>{feedback.textContent='';void refresh();});
    page.addEventListener('click',async event=>{
      const button=event.target.closest('[data-decision],[data-read],[data-remove]');if(!button)return;
      const id=Number(button.dataset.id||button.dataset.read||button.dataset.remove),item=items.find(item=>item.id===id);if(!item)return;
      const card=button.closest('article');card.querySelectorAll('button').forEach(element=>element.disabled=true);feedback.textContent='';
      try{
        if(button.dataset.decision){
          if(!item.puede_confirmar||snapshot.cached||!navigator.onLine)throw new Error('Conéctate y actualiza los avisos para confirmar.');
          await request(`/api/reportes/${item.reporte_id}/confirmar`,{method:'POST',body:{decision:button.dataset.decision}});
          item.mi_decision=button.dataset.decision;item.puede_confirmar=false;item.leido=true;render();
          feedback.textContent=button.dataset.decision==='confirmar'?'Gracias. Tu confirmación ayuda a tu comunidad.':'Gracias por compartir cómo está el agua en tu domicilio.';
        }else if(button.dataset.read){await request(`/api/notificaciones/${id}/leida`,{method:'PUT'});item.leido=true;render();}
        else{await request(`/api/notificaciones/${id}`,{method:'DELETE'});items=items.filter(row=>row.id!==id);render();}
        await refresh();
      }catch(error){feedback.textContent=error.message.replace(/^\d+:\s*/,'');if(card.isConnected)card.querySelectorAll('button').forEach(element=>element.disabled=false);}
    });
    await refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},30000);const online=()=>{void refresh();};window.addEventListener('online',online);
    return()=>{clearInterval(timer);window.removeEventListener('online',online);};
  },
};
