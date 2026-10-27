import {locationTemplate, initReportLocation} from '../components/ReportLocation.js';
import { context, resource, request, escapeHTML as e } from '../services/apiService.js';
import { enqueueReport, records } from '../services/outboxService.js';
import { getAllReportes } from '../services/dbService.js';
import { retryReports, syncMode } from '../pwa/reportSync.js';
const states = {no_agua:'Sin agua', baja_presion:'Baja presión', tengo_agua:'Con agua'};
function template() {
 return `<section class="page" id="reports-page"><div class="page-header"><div><h2>Reportes ciudadanos</h2><p>Se guardan primero en este dispositivo y se envían con tu cuenta.</p></div></div>
 <p id="sync-mode" role="status"></p><button class="btn-primary" id="retry-reports">Reintentar ahora</button>
 <form class="reporte-form" id="reporte-form"><h3>Nuevo reporte</h3><p id="report-colonia"></p><div class="reporte-form-fields">
 <div class="field-group"><label for="r-tipo">Tipo</label><select id="r-tipo" name="tipo"><option value="agua">Suministro de agua</option><option value="fuga">Fuga</option></select></div>
 <div class="field-group"><label for="r-estado">Estado del agua</label><select id="r-estado" name="estado">${Object.entries(states).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>
 <div class="field-group"><label for="r-comment">Comentario</label><textarea id="r-comment" name="comentario" maxlength="2000" rows="3"></textarea></div></div>${locationTemplate()}<button class="btn-primary" type="submit">Guardar reporte</button></form>
 <p id="report-feedback" role="status" aria-live="polite"></p><h3>Pendientes de envío</h3><div id="outbox-list"></div><h3>Envíos confirmados por el servidor</h3><div id="receipt-list"></div>
 <h3>Reportes de tu colonia</h3><button id="refresh-reports" class="btn-primary">Actualizar reportes</button><p id="remote-status"></p><div id="reports-list"></div>
 <details><summary>Registros locales anteriores (conservados)</summary><p>Usan el formato anterior y no se envían automáticamente.</p><div id="legacy-reports"></div></details></section>`;
}
async function init(container) {
 const page = container.querySelector('#reports-page'), form = page.querySelector('form'), feedback = page.querySelector('#report-feedback');
 const {base,session} = await context();
 page.querySelector('#report-colonia').textContent = session ? `Colonia de tu cuenta: ${session.user.colonia}` : 'Inicia sesión para registrar reportes.';
 form.querySelector('[type=submit]').disabled = !session;
 const reportLocation = initReportLocation(form, session?.user.colonia);
 async function local() {
  if (!page.isConnected) return;
  page.querySelector('#sync-mode').textContent = `${navigator.onLine?'Con conexión':'Sin conexión'} · ${syncMode()}`;
  const visible = list=>list.filter(x=>x.base===base && x.owner===session?.user.id);
  const pending=visible(await records('outbox')), sent=visible(await records('receipts'));
  page.querySelector('#outbox-list').innerHTML = pending.length ? pending.map(x=>`<article class="card"><strong>Pendiente · ${e(states[x.payload.estado])}</strong><p>${e(x.payload.comentario)}</p><p>${e(x.payload.colonia)} · ${e(x.id)}</p><p>Intentos: ${x.attempts} · ${e(x.error||'Esperando envío')}</p></article>`).join('') : '<p>Cola vacía para esta cuenta y servidor.</p>';
  page.querySelector('#receipt-list').innerHTML = sent.length ? sent.slice(-20).reverse().map(x=>`<p>Envío confirmado · reporte #${e(x.server.id)} · ${e(x.payload.comentario)} · ${e(x.sent)}</p>`).join('') : '<p>Aún no hay envíos confirmados.</p>';
 }
 async function remote() {
  try {
   const result=await resource('/api/reportes');
   page.querySelector('#remote-status').textContent=`${result.cached?'Copia guardada; no se pudo actualizar':'Datos del servidor'} · ${result.date}`;
   page.querySelector('#reports-list').innerHTML=result.data.map(r=>`<article class="card"><h3>${e(r.tipo)} · ${e(states[r.estado]||r.estado)}</h3><p>${e(r.comentario)}</p><p>${e(r.colonia)} · #${e(r.id)}</p>${String(r.usuario_id)!==String(session?.user.id)&&!result.cached?`<button data-confirm="${e(r.id)}" data-decision="confirmar">Confirmar</button> <button data-confirm="${e(r.id)}" data-decision="rechazar">Rechazar</button>`:''}</article>`).join('')||'<p>Sin reportes en tu colonia.</p>';
  } catch(error) {page.querySelector('#remote-status').textContent=error.message;}
 }
 const change=()=>{if(!page.isConnected){window.removeEventListener('outbox-change',change);return;} local().catch(console.error);};
 window.addEventListener('outbox-change',change);
 window.addEventListener('offline',change,{once:true});
 form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;
  try {
   if(reportLocation.comment().length>2000)throw new Error('El comentario con ubicación supera 2000 caracteres. Acorta el texto');
   await enqueueReport({tipo:form.elements.tipo.value,estado:form.elements.estado.value,comentario:reportLocation.comment()});
   form.reset();feedback.textContent='Reporte guardado en la cola. Pendiente de confirmación del servidor.';await local();
   try{await retryReports();feedback.textContent='Envío procesado. Revisa pendientes y confirmaciones.';await remote();}
   catch(error){feedback.textContent=`Guardado; sigue pendiente: ${error.message}`;}await local();
  }catch(error){feedback.textContent=`No se pudo guardar: ${error.message}. Tus campos se conservan.`;}
  finally{button.disabled=false;}
 });
 page.querySelector('#retry-reports').addEventListener('click',async event=>{
  const button=event.target;button.disabled=true;
  try{await retryReports();feedback.textContent='Reintento terminado. Revisa las confirmaciones.';await remote();}
  catch(error){feedback.textContent=`Se conserva la cola: ${error.message}`;}
  finally{await local();button.disabled=false;}
 });
 page.querySelector('#refresh-reports').addEventListener('click',remote);
 page.querySelector('#reports-list').addEventListener('click',async event=>{
  const button=event.target.closest('[data-confirm]');if(!button)return;button.disabled=true;
  try{const r=await request(`/api/reportes/${button.dataset.confirm}/confirmar`,{method:'POST',body:{decision:button.dataset.decision}});feedback.textContent=`Decisión registrada. Confirmaciones: ${r.confirmaciones}`;}
  catch(error){feedback.textContent=error.message;}finally{button.disabled=false;}
 });
 page.querySelector('#legacy-reports').innerHTML=(await getAllReportes()).map(r=>`<article class="card"><h3>${e(r.titulo)}</h3><p>${e(r.descripcion)}</p><p>${e(r.colonia)} · ${e(r.tipo)} · ${e(r.estado)}</p></article>`).join('')||'<p>Sin registros anteriores.</p>';
 await local();await remote();
}
export default {template,init};
