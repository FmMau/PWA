import {readPosition,locationError,permissionState} from '../services/geolocationService.js';
import {shareContent} from '../services/shareService.js';
export const locationTemplate = () => `<fieldset><legend>Ubicación opcional del reporte</legend>
 <p>Usa tu ubicación para indicar dónde ocurre la fuga o falta de agua. Se adjuntará al comentario al guardar y se incluirá al compartir. Puedes escribir una dirección sin dar permiso.</p>
 <p id="geo-permission" role="status">Consultando permiso…</p>
 <button type="button" id="locate-report" class="btn-primary">Usar mi ubicación</button>
 <button type="button" id="clear-location">Quitar coordenadas</button>
 <p id="geo-status" role="status" aria-live="polite"></p>
 <div class="field-group"><label for="report-address">Dirección o referencia (opcional)</label><input id="report-address" maxlength="300" autocomplete="street-address"></div>
 <p>Vista previa del contenido que compartirás (incluye ubicación si la agregaste):</p><pre id="share-preview" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>
 <button type="button" id="share-report" class="btn-primary">Compartir reporte</button><p id="share-status" role="status" aria-live="polite"></p></fieldset>`;
export function initReportLocation(form, colony) {
 let position=null;
 const q=s=>form.querySelector(s), status=q('#geo-status');
 const locationText=()=>[q('#report-address').value.trim(),position ? `Coordenadas: ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)} (±${Math.round(position.accuracy)} m)` : ''].filter(Boolean).join(' · ');
 const comment=()=>[form.elements.comentario.value.trim(),locationText()].filter(Boolean).join('\nUbicación: ');
 const data=()=>({title:'Reporte ciudadano · AquaPaz',text:[`Colonia: ${colony || 'Sin especificar'}`,form.elements.tipo.selectedOptions[0].textContent,form.elements.estado.selectedOptions[0].textContent,comment()].filter(Boolean).join('\n'),url:new URL('#/reportes',location.href).href});
 const preview=()=>{q('#share-preview').textContent=[data().title,data().text,data().url].join('\n');};
 const renderPermission=state=>{q('#geo-permission').textContent='Permiso de ubicación: '+({granted:'concedido',denied:'denegado; puedes escribir una dirección',prompt:'pendiente; se preguntará al pulsar Usar mi ubicación'}[state]||'no consultable; se comprobará al pulsar Usar mi ubicación');};
 permissionState().then(permission=>{renderPermission(permission?.state);if(permission){const change=()=>{if(!form.isConnected){permission.removeEventListener('change',change);return;}renderPermission(permission.state);};permission.addEventListener('change',change);}});
 q('#locate-report').addEventListener('click',async event=>{
  const button=event.currentTarget;button.disabled=true;status.textContent='Obteniendo ubicación…';
  try {position=await readPosition();status.textContent='Ubicación agregada. '+locationText();renderPermission('granted');}
  catch(error){status.textContent=locationError(error);if(error.code===1)renderPermission('denied');}
  finally{button.disabled=false;preview();}
 });
 q('#clear-location').addEventListener('click',()=>{position=null;status.textContent='Coordenadas eliminadas.';preview();});
 q('#share-report').addEventListener('click',async()=>{try{q('#share-status').textContent=await shareContent(data());}catch(error){q('#share-status').textContent=error.message;}});
 form.addEventListener('input',preview);
 form.addEventListener('reset',()=>{position=null;status.textContent='';q('#share-status').textContent='';setTimeout(preview,0);});
 preview();return {comment};
}
