import { context } from '../services/apiService.js';
import { enqueueReport, records } from '../services/outboxService.js';
import { retryReports } from '../pwa/reportSync.js';

const choices = [
  ['tengo_agua', 'Tengo agua', 'droplet', '#059669'],
  ['baja_presion', 'Baja presión', 'gauge-simple', '#d97706'],
  ['no_agua', 'No tengo agua', 'droplet-slash', '#dc2626'],
];
export default {
  template: () => `<section class="page report-page" id="reports-page"><div class="page-header"><span class="page-eyebrow">TU COMUNIDAD</span><h2>Reportar estado del agua</h2><p>Comparte cómo está el suministro en tu domicilio.</p></div>
    <form class="reporte-form citizen-report-form" id="reporte-form"><div class="report-colony"><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span id="report-colonia"></span></div><input name="tipo" value="agua" type="hidden">
    <fieldset class="report-choices"><legend>¿Cómo está el agua en tu domicilio?</legend>${choices.map(([value,label,icon,color])=>`<label class="report-choice" style="--choice-color:${color}"><input type="radio" name="estado" value="${value}" ${value==='no_agua'?'checked':''} required><i class="fa-solid fa-${icon}" aria-hidden="true"></i><span>${label}</span><span class="choice-check" aria-hidden="true">✓</span></label>`).join('')}</fieldset>
    <label class="report-comment" for="r-comment">Comentario <span>(opcional)</span><textarea id="r-comment" name="comentario" maxlength="2000" rows="4" placeholder="Por ejemplo: desde esta mañana no llega agua."></textarea></label>
    <p class="report-privacy">Tus vecinos recibirán un aviso y podrán confirmar si les ocurre lo mismo.</p><button class="btn-primary report-submit" type="submit">Enviar reporte</button></form>
    <p id="report-feedback" role="status" aria-live="polite"></p><div class="report-pending" data-pending hidden role="status"></div></section>`,
  async init(container) {
    const page=container.querySelector('#reports-page'),form=page.querySelector('form'),feedback=page.querySelector('#report-feedback');
    const {base,session}=await context();let lastSubmitted;
    page.querySelector('#report-colonia').textContent=session?.user.colonia||'Tu colonia';
    async function pending(){
      if(!page.isConnected)return;
      const items=(await records('outbox')).filter(item=>item.base===base&&item.owner===session?.user.id);
      if(!page.isConnected)return;
      const banner=page.querySelector('[data-pending]');banner.hidden=!items.length;
      banner.textContent=items.length===1?'Tienes un reporte guardado. Se enviará al recuperar conexión.':`Tienes ${items.length} reportes guardados. Se enviarán al recuperar conexión.`;
      if(lastSubmitted&&!items.some(item=>item.id===lastSubmitted))feedback.textContent='Gracias. Tu reporte se compartió con tu colonia.';
      return items;
    }
    const onChange=()=>{void pending().catch(()=>{});};
    window.addEventListener('outbox-change',onChange);window.addEventListener('online',onChange);window.addEventListener('offline',onChange);
    form.addEventListener('submit',async event=>{
      event.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;button.textContent='Enviando…';feedback.textContent='';
      try{
        const item=await enqueueReport({tipo:'agua',estado:form.elements.estado.value,comentario:form.elements.comentario.value.trim()});
        lastSubmitted=item.id;form.reset();feedback.textContent='Tu reporte quedó guardado. Se enviará al recuperar conexión.';
        try{await retryReports();}catch{/* The durable report will retry automatically. */}
        await pending();
      }catch{feedback.textContent='No pudimos guardar tu reporte. Intenta nuevamente; lo que escribiste se conserva.';}
      finally{button.disabled=false;button.textContent='Enviar reporte';}
    });
    await pending();return()=>{window.removeEventListener('outbox-change',onChange);window.removeEventListener('online',onChange);window.removeEventListener('offline',onChange);};
  },
};
