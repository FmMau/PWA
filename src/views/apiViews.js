import {resource,request,context,escapeHTML as e} from '../services/apiService.js';
import { dateLabel } from '../services/communityService.js';
const field=(name,label,type='text',extra='')=>`<label>${label}<input name="${name}" type="${type}" required ${extra}></label>`;
const select=(name,label,values)=>`<label>${label}<select name="${name}">${values.map(v=>`<option value="${v}">${v}</option>`).join('')}</select></label>`;
const form=(id,title,fields)=>`<form id="${id}" class="reporte-form"><h3>${title}</h3>${fields}<button type="submit" class="btn-primary">${title}</button></form>`;
const values = {no_agua:'Sin agua',baja_presion:'Baja presión',tengo_agua:'Con agua',agua:'Suministro',fuga:'Fuga',solicitada:'Solicitada',asignada:'Asignada',en_camino:'En camino',en_sitio:'En sitio',completada:'Completada',cancelada:'Cancelada'};
const money=value=>(Number(value)/100).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
const card=r=>r.litros?`<article class="home-card"><div class="section-title"><span class="page-eyebrow">Pedido #${e(r.id)}</span><strong>${e(values[r.estado]||'Solicitud recibida')}</strong></div><h3>${e(r.litros)} litros · ${e(r.colonia)}</h3>${r.direccion?`<p>${e(r.direccion)}</p>`:''}${r.operador?.nombre?`<p>Pipa: ${e(r.operador.nombre)}</p>`:''}${r.precio_centavos?`<p><strong>${money(r.precio_centavos)}</strong>${r.llegada_estimada_minutos?` · Llegada estimada: ${e(r.llegada_estimada_minutos)} min`:''}</p>`:''}<p class="home-caption">${e(dateLabel(r.fecha))}</p></article>`:`<article class="home-card"><span class="page-eyebrow">MI PIPA</span><h3>${e(r.nombre||'Tu pipa')}</h3><p>${e(r.placas||'')} · ${e(r.capacidad||'')} litros</p><p>${r.disponible?'Disponible para recibir pedidos':'Fuera de servicio'}</p></article>`;
function apiView(title,path,render,forms='',actions={}) {
 return {template:()=>`<section class="page" data-api-page><div class="page-header"><div><span class="page-eyebrow">TU CUENTA AQUAPAZ</span><h2>${title}</h2>${path.startsWith('/api/pipas')?'<nav class="pipa-tabs" aria-label="Pipas"><a href="#/pipas" data-link>Solicitar pipa</a><a href="#/operador" data-link>Mi pipa y entregas</a><a href="#/disponibles" data-link>Pedidos disponibles</a></nav>':'<p>Los avisos de tus pedidos y tu comunidad.</p>'}</div></div>${forms}<button data-refresh class="btn-secondary">Actualizar</button><p data-feedback role="status" aria-live="polite"></p><p data-source></p><div data-content></div></section>`,
 async init(container){
  const page=container.querySelector('[data-api-page]'), feedback=page.querySelector('[data-feedback]');let current;
  async function refresh(){
   try{current=await resource(path);if(!page.isConnected)return;page.querySelector('[data-source]').textContent=current.cached?'Sin conexión. Se muestran tus pedidos guardados.':'';page.querySelector('[data-content]').innerHTML=render(current.data,current.cached);if(path==='/api/pipas/operador'){page.querySelector('#operator').hidden=Boolean(current.data.perfil);page.querySelector('#quote').hidden=!current.data.pedido||current.data.pedido.estado!=='asignada'||Boolean(current.data.pedido.precio_aceptado_en);}}
   catch(error){page.querySelector('[data-source]').textContent=error.message;}
  }
  page.querySelector('[data-refresh]').addEventListener('click',refresh);
  for(const [id,action] of Object.entries(actions)) page.querySelector(`#${id}`)?.addEventListener('submit',async event=>{
   event.preventDefault();const button=event.target.querySelector('[type=submit]');button.disabled=true;
   try{await action(Object.fromEntries(new FormData(event.target)),current?.data);feedback.textContent='Listo. Los cambios se guardaron.';event.target.reset();await refresh();}
   catch(error){feedback.textContent=error.message;}finally{button.disabled=false;}
  });
  page.addEventListener('click',async event=>{
   const button=event.target.closest('[data-action]');if(!button)return;button.disabled=true;
   try {
    const kind=button.dataset.action,id=button.dataset.id;
    if(kind==='read')await request(`/api/notificaciones/${id}/leida`,{method:'PUT'});
    if(kind==='remove')await request(`/api/notificaciones/${id}`,{method:'DELETE'});
    if(kind==='cancel')await request(`/api/pipas/pedidos/${id}/cancelar`,{method:'POST'});
    if(kind==='accept-order')await request(`/api/pipas/pedidos/${id}/aceptar`,{method:'POST'});
    if(kind==='accept-price'||kind==='reject-price'){
     const order=current.data.find(x=>String(x.id)===id);
     await request(`/api/pipas/pedidos/${id}/${kind==='accept-price'?'aceptar-precio':'rechazar-precio'}`,{method:'POST',body:{version:order.cotizacion_version,...(kind==='accept-price'?{precio_centavos:order.precio_centavos}:{})}});
    }
    if(kind==='available')await request('/api/pipas/operador/disponibilidad',{method:'PUT',body:{disponible:button.dataset.value==='true'}});
    if(kind==='advance')await request(`/api/pipas/pedidos/${id}/estado`,{method:'PUT',body:{estado:button.dataset.value}});
    if(kind==='location'){const r=await request(`/api/pipas/pedidos/${id}/ubicacion`);const point=r.ubicacion;const age=Date.parse(r.hora_servidor)-Date.parse(point?.observada_en);if(point&&Number.isFinite(point.latitud)&&Number.isFinite(point.longitud)&&Number.isFinite(age)&&age>=0&&age<=45000){feedback.innerHTML=`Ubicación reciente de tu pipa. <a class="text-link" target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat=${point.latitud}&mlon=${point.longitud}#map=16/${point.latitud}/${point.longitud}">Ver ubicación en el mapa</a>`;}else feedback.textContent='La pipa aún no comparte una ubicación reciente.';return;}
    feedback.textContent='Listo. Los cambios se guardaron.';await refresh();
   }catch(error){feedback.textContent=error.message;}finally{button.disabled=false;}
  });
  await refresh();
  if(path==='/api/pipas/pedidos'){
   const orderForm=page.querySelector('#order'),account=await context();
   if(orderForm){orderForm.elements.colonia.value=account.session?.user.colonia||'';orderForm.elements.telefono.value=account.session?.user.telefono||'';
    const locate=orderForm.querySelector('[data-locate-delivery]');
    orderForm.addEventListener('invalid',event=>{if(['latitud','longitud'].includes(event.target.name))orderForm.querySelector('#delivery-coordinates').open=true;},true);
    locate.addEventListener('click',async()=>{locate.disabled=true;try{const {readPosition,locationError}=await import('../services/geolocationService.js');try{const point=await readPosition();orderForm.elements.latitud.value=point.latitude;orderForm.elements.longitud.value=point.longitude;feedback.textContent='Punto de entrega actualizado. Confirma que corresponda a tu dirección.';}catch(error){throw new Error(locationError(error));}}catch(error){feedback.textContent=error.message;}finally{locate.disabled=false;}});
   }
  }
  if(path==='/api/pipas/pedidos'){
   const {readSetting}=await import('../services/apiService.js');
   const {base,session}=await context();
   const draft=session && await readSetting(`pipa-draft|${base}|${session.user.id}`);
   if(draft){for(const [name,value] of Object.entries(draft.body)){const input=page.querySelector('#order').elements[name];if(input)input.value=value;}feedback.textContent='Solicitud anterior sin confirmar recuperada. Reintenta para conocer su resultado.';}
  }
 }};
}
const button=(action,id,text,extra='')=>`<button class="btn-primary" data-action="${action}" data-id="${e(id)}" ${extra}>${text}</button>`;
const orderFields=field('colonia','Colonia')+field('direccion','Dirección','text','minlength="5" maxlength="300"')+'<label>Referencias (opcional)<input name="referencias" maxlength="500"></label>'+field('telefono','Teléfono','tel')+select('litros','Litros',[5000,10000,20000])+'<div class="delivery-point"><h4>Punto de entrega</h4><p>Indica dónde debe llegar la pipa.</p><button type="button" class="btn-secondary" data-locate-delivery>Usar mi ubicación</button><details id="delivery-coordinates"><summary>Ajustar el punto manualmente</summary>'+field('latitud','Latitud','number','min="-90" max="90" step="any"')+field('longitud','Longitud','number','min="-180" max="180" step="any"')+'</details></div>';
export const TrucksApiView=apiView('Pedidos de pipas','/api/pipas/pedidos',(data,cached)=>data.map(o=>card(o)+(cached?'':(['solicitada','asignada'].includes(o.estado)?button('cancel',o.id,'Cancelar pedido'):'')+(o.estado==='asignada'&&o.precio_centavos&&!o.precio_aceptado_en?`<p>Total: ${(o.precio_centavos/100).toFixed(2)} MXN · llegada ${e(o.llegada_estimada_minutos)} minutos</p>${button('accept-price',o.id,'Aceptar este precio')} ${button('reject-price',o.id,'Rechazar y cancelar')}`:'')+button('location',o.id,'Consultar ubicación de entrega'))).join('')||'<p>Sin pedidos.</p>',form('order','Solicitar pipa',orderFields),{
 order:async data=>{
  // Se retiene la misma clave y payload tras error/timeout para recuperar una respuesta perdida.
  const {readSetting,writeSetting,context}=await import('../services/apiService.js');const {base,session}=await context();if(!session)throw new Error('Inicia sesión.');
  const key=`pipa-draft|${base}|${session.user.id}`;const body={...data,litros:Number(data.litros),latitud:Number(data.latitud),longitud:Number(data.longitud)};
  const previous=await readSetting(key);
  if(previous&&JSON.stringify(previous.body)!==JSON.stringify(body))throw new Error('Existe una solicitud sin confirmar. Reintenta con los mismos datos antes de crear otra.');
  let draft=previous;
  if(!draft){
   const quote=await request('/api/pipas/cotizar',{method:'POST',body:{litros:body.litros,latitud:body.latitud,longitud:body.longitud}});
   const total=(Number(quote.precio_centavos)/100).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
   if(!Number.isSafeInteger(quote.id)||!Number.isSafeInteger(quote.precio_centavos))throw new Error('No se pudo obtener una cotización válida.');
   if(!confirm(`Cotización de tu pipa: ${total}. ${quote.prueba?'Tarifa de prueba. ':''}${quote.fuente==='aproximada'?'Distancia y llegada aproximadas. ':''}¿Aceptas este importe y deseas solicitar la pipa?`))throw new Error('No se creó el pedido. Puedes revisar los datos e intentar de nuevo.');
   draft={body,id:crypto.randomUUID(),quote};await writeSetting(key,draft);
  }
  try { await request('/api/pipas/pedidos',{method:'POST',body:{...draft.body,client_id:draft.id,...(draft.quote?{cotizacion_id:draft.quote.id,precio_centavos:draft.quote.precio_centavos,aceptar_cotizacion:true}:{})}}); }
  catch(error) { if (/^(400|401|403|409):/.test(error.message)) await writeSetting(key,null); throw error; }
  await writeSetting(key,null);
 }
});
const operatorFields=field('nombre','Nombre de la pipa')+field('placas','Placas')+field('telefono','Teléfono','tel')+select('capacidad','Capacidad',[5000,10000,20000]);
export const OperatorView=apiView('Operador de pipa','/api/pipas/operador',(data,cached)=>`${data.perfil?card(data.perfil):'<p>Aún no tienes pipa registrada.</p>'}${cached||!data.perfil?'':button('available','',data.perfil?.disponible?'Desactivar disponibilidad':'Activar disponibilidad',`data-value="${!data.perfil?.disponible}"`)}${data.pedido?card(data.pedido)+(cached?'':({asignada:'en_camino',en_camino:'en_sitio',en_sitio:'completada'}[data.pedido.estado]?button('advance',data.pedido.id,'Marcar: '+values[({asignada:'en_camino',en_camino:'en_sitio',en_sitio:'completada'}[data.pedido.estado])],`data-value="${({asignada:'en_camino',en_camino:'en_sitio',en_sitio:'completada'}[data.pedido.estado])}"`):'')):'<p>Sin entrega activa.</p>'}<p><a href="#/disponibles" data-link>Ver pedidos disponibles</a></p>`,form('operator','Registrar pipa',operatorFields)+form('quote','Enviar cotización',field('precio','Importe total (MXN)','number','min="0.01" max="100000" step="0.01"')+field('llegada_estimada_minutos','Llegada estimada en minutos','number','min="1" max="1440" step="1"')+field('notas','Notas')) ,{
 operator:data=>request('/api/pipas/operador',{method:'POST',body:{...data,capacidad:Number(data.capacidad)}}),
 quote:(data,current)=>{if(!current?.pedido)throw new Error('Sin entrega activa.');return request(`/api/pipas/pedidos/${current.pedido.id}/cotizacion`,{method:'PUT',body:{...data,precio_centavos:Math.round(Number(data.precio)*100),llegada_estimada_minutos:Number(data.llegada_estimada_minutos),version:current.pedido.cotizacion_version}});}
});

