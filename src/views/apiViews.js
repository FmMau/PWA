import {resource,request,context,escapeHTML as e} from '../services/apiService.js';
import {getAllSolicitudes} from '../services/truckDbService.js';
const field=(name,label,type='text',extra='')=>`<label>${label}<input name="${name}" type="${type}" required ${extra}></label>`;
const select=(name,label,values)=>`<label>${label}<select name="${name}">${values.map(v=>`<option value="${v}">${v}</option>`).join('')}</select></label>`;
const form=(id,title,fields)=>`<form id="${id}" class="reporte-form"><h3>${title}</h3>${fields}<button class="btn-primary">${title}</button></form>`;
const labels = {id:'Folio',nombre:'Nombre',placas:'Placas',telefono:'Teléfono',capacidad:'Capacidad en litros',disponible:'Disponible',colonia:'Colonia',tipo:'Tipo',estado:'Estado',comentario:'Comentario',direccion:'Dirección',referencias:'Referencias',litros:'Litros',fecha:'Fecha',actualizado:'Actualizado',precio_centavos:'Precio en centavos MXN',llegada_estimada_minutos:'Llegada estimada en minutos',cotizacion_notas:'Condiciones',precio_aceptado_en:'Precio aceptado',operador:'Pipa asignada',titulo:'Título',mensaje:'Mensaje',leida:'Leída',evento:'Evento',no_agua:'Vecinos sin agua',baja_presion:'Vecinos con baja presión',tengo_agua:'Vecinos con agua',ultima_actualizacion:'Última observación',expira:'Válido hasta',vigencia:'Vigencia'};
const values = {no_agua:'Sin agua',baja_presion:'Baja presión',tengo_agua:'Con agua',agua:'Suministro',fuga:'Fuga',solicitada:'Solicitada',asignada:'Asignada',en_camino:'En camino',en_sitio:'En sitio',completada:'Completada',cancelada:'Cancelada'};
const card=r=>`<article class="card">${Object.entries(r).filter(([k,v])=>v!==null && labels[k]).map(([k,v])=>`<p><strong>${labels[k]}:</strong> ${e(typeof v==='object' ? [v.nombre,v.placas,v.telefono].filter(Boolean).join(' · ') : typeof v==='boolean' ? (v?'Sí':'No') : values[v]||v)}</p>`).join('')}</article>`;
function apiView(title,path,render,forms='',actions={}) {
 return {template:()=>`<section class="page" data-api-page><div class="page-header"><div><h2>${title}</h2><p><a href="#/operador" data-link>Operador</a></p></div></div><p>Las operaciones de esta sección requieren conexión. Reportes permite guardar sin conexión.</p>${forms}<button data-refresh class="btn-primary">Actualizar</button><p data-feedback role="status" aria-live="polite"></p><p data-source></p><div data-content></div></section>`,
 async init(container){
  const page=container.querySelector('[data-api-page]'), feedback=page.querySelector('[data-feedback]');let current;
  async function refresh(){
   try{current=await resource(path);page.querySelector('[data-source]').textContent=`${current.cached?'Copia guardada; sin actualización de red':'Datos del servidor'} · ${current.date}`;page.querySelector('[data-content]').innerHTML=render(current.data,current.cached);}
   catch(error){page.querySelector('[data-source]').textContent=error.message;}
  }
  page.querySelector('[data-refresh]').addEventListener('click',refresh);
  for(const [id,action] of Object.entries(actions)) page.querySelector(`#${id}`)?.addEventListener('submit',async event=>{
   event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;
   try{await action(Object.fromEntries(new FormData(event.target)),current?.data);feedback.textContent='Operación confirmada por el servidor.';event.target.reset();await refresh();}
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
    if(kind==='location'){const r=await request(`/api/pipas/pedidos/${id}/ubicacion`);feedback.textContent=JSON.stringify(r);return;}
    feedback.textContent='Operación confirmada por el servidor.';await refresh();
   }catch(error){feedback.textContent=error.message;}finally{button.disabled=false;}
  });
  await refresh();
  if(path==='/api/pipas/pedidos'){
   const {readSetting}=await import('../services/apiService.js');
   const {base,session}=await context();
   const draft=session && await readSetting(`pipa-draft|${base}|${session.user.id}`);
   if(draft){for(const [name,value] of Object.entries(draft.body)){const input=page.querySelector('#order').elements[name];if(input)input.value=value;}feedback.textContent='Solicitud anterior sin confirmar recuperada. Reintenta para conocer su resultado.';}
   const old=await getAllSolicitudes();const details=document.createElement('details');details.innerHTML=`<summary>Solicitudes locales anteriores (${old.length})</summary><p>Se conservan; no se envían automáticamente.</p>${old.map(card).join('')}`;page.append(details);
  }
 }};
}
const button=(action,id,text,extra='')=>`<button class="btn-primary" data-action="${action}" data-id="${e(id)}" ${extra}>${text}</button>`;
export const NotificationsView=apiView('Notificaciones','/api/notificaciones',(data,cached)=>data.map(n=>card(n)+(cached?'':button('read',n.id,'Marcar leída')+' '+button('remove',n.id,'Eliminar aviso'))).join('')||'<p>Sin notificaciones.</p>');
export const StatisticsApiView=apiView('Estadísticas de tu colonia','/api/reportes',data=>`${['no_agua','baja_presion','tengo_agua'].map(state=>`<article class="card"><h3>${e(state)}</h3><p>${data.filter(r=>r.estado===state).length} reportes</p></article>`).join('')}<p>Conteos de reportes de la colonia, sin deduplicar vecinos. No equivalen al mapa de 24 horas.</p>`);
const orderFields=field('colonia','Colonia')+field('direccion','Dirección','text','minlength="5" maxlength="300"')+field('referencias','Referencias (escribe Ninguna si no aplica)')+field('telefono','Teléfono','tel')+select('litros','Litros',[5000,10000,20000])+field('latitud','Latitud del punto de entrega','number','min="-90" max="90" step="any"')+field('longitud','Longitud del punto de entrega','number','min="-180" max="180" step="any"');
export const TrucksApiView=apiView('Pedidos de pipas','/api/pipas/pedidos',(data,cached)=>data.map(o=>card(o)+(cached?'':(['solicitada','asignada'].includes(o.estado)?button('cancel',o.id,'Cancelar pedido'):'')+(o.estado==='asignada'&&o.precio_centavos&&!o.precio_aceptado_en?`<p>Total: ${(o.precio_centavos/100).toFixed(2)} MXN · llegada ${e(o.llegada_estimada_minutos)} minutos · versión ${e(o.cotizacion_version)}</p>${button('accept-price',o.id,'Aceptar este precio')} ${button('reject-price',o.id,'Rechazar y cancelar')}`:'')+button('location',o.id,'Consultar ubicación de entrega'))).join('')||'<p>Sin pedidos.</p>',form('order','Solicitar pipa',orderFields),{
 order:async data=>{
  // Se retiene la misma clave y payload tras error/timeout para recuperar una respuesta perdida.
  const {readSetting,writeSetting,context}=await import('../services/apiService.js');const {base,session}=await context();if(!session)throw new Error('Inicia sesión.');
  const key=`pipa-draft|${base}|${session.user.id}`;const body={...data,litros:Number(data.litros),latitud:Number(data.latitud),longitud:Number(data.longitud)};
  const previous=await readSetting(key);
  if(previous&&JSON.stringify(previous.body)!==JSON.stringify(body))throw new Error('Existe una solicitud sin confirmar. Reintenta con los mismos datos antes de crear otra.');
  const draft=previous||{body,id:crypto.randomUUID()};await writeSetting(key,draft);
  try { await request('/api/pipas/pedidos',{method:'POST',body:{...body,client_id:draft.id}}); }
  catch(error) { if (/^(400|401|403):/.test(error.message)) await writeSetting(key,null); throw error; }
  await writeSetting(key,null);
 }
});
const operatorFields=field('nombre','Nombre de la pipa')+field('placas','Placas')+field('telefono','Teléfono','tel')+select('capacidad','Capacidad',[5000,10000,20000]);
export const OperatorView=apiView('Operador de pipa','/api/pipas/operador',(data,cached)=>`${data.perfil?card(data.perfil):'<p>Aún no tienes pipa registrada.</p>'}${cached?'':button('available','',data.perfil?.disponible?'Desactivar disponibilidad':'Activar disponibilidad',`data-value="${!data.perfil?.disponible}"`)}${data.pedido?card(data.pedido)+(cached?'':({asignada:'en_camino',en_camino:'en_sitio',en_sitio:'completada'}[data.pedido.estado]?button('advance',data.pedido.id,'Avanzar a '+({asignada:'en_camino',en_camino:'en_sitio',en_sitio:'completada'}[data.pedido.estado]),`data-value="${({asignada:'en_camino',en_camino:'en_sitio',en_sitio:'completada'}[data.pedido.estado])}"`):'')):'<p>Sin entrega activa.</p>'}<p><a href="#/disponibles" data-link>Ver pedidos disponibles</a></p>`,form('operator','Registrar pipa',operatorFields)+form('quote','Enviar cotización',field('precio_centavos','Precio total en centavos MXN','number','min="1" max="10000000" step="1"')+field('llegada_estimada_minutos','Llegada estimada en minutos','number','min="1" max="1440" step="1"')+field('notas','Notas')) ,{
 operator:data=>request('/api/pipas/operador',{method:'POST',body:{...data,capacidad:Number(data.capacidad)}}),
 quote:(data,current)=>{if(!current?.pedido)throw new Error('Sin entrega activa.');return request(`/api/pipas/pedidos/${current.pedido.id}/cotizacion`,{method:'PUT',body:{...data,precio_centavos:Number(data.precio_centavos),llegada_estimada_minutos:Number(data.llegada_estimada_minutos),version:current.pedido.cotizacion_version}});}
});
export const AvailableView=apiView('Pedidos disponibles','/api/pipas/disponibles',(data,cached)=>data.map(o=>card(o)+(cached?'':button('accept-order',o.id,'Aceptar pedido'))).join('')||'<p>Sin pedidos disponibles.</p>');

