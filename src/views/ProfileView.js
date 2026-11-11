import { context, request, writeSetting, escapeHTML as e } from '../services/apiService.js';
import { records } from '../services/outboxService.js';
export default {
  template: () => `<section class="page account-page" id="profile-page"><div class="page-header"><span class="page-eyebrow">TU CUENTA AQUAPAZ</span><h2>Mi perfil</h2><p>La misma cuenta para tu app móvil y la versión web.</p></div><p data-feedback role="status" aria-live="polite">Consultando tu perfil…</p><form class="reporte-form" data-profile><label>Correo electrónico<input name="email" type="email" readonly></label><label>Nombre completo<input name="nombre" required minlength="2" maxlength="100" autocomplete="name"></label><label>Teléfono<input name="telefono" type="tel" required pattern="[0-9]{10}" maxlength="10" autocomplete="tel"></label><label>Colonia<select name="colonia" required></select></label><button type="submit" class="btn-primary" disabled>Guardar cambios</button></form><div class="home-card"><h3>¿Tienes una pipa?</h3><p>Consulta tu perfil de operador, activa tu disponibilidad y da seguimiento a tus entregas.</p><a class="text-link" href="#/operador" data-link>Mi pipa y mis entregas →</a></div></section>`,
  async init(container){
    const page=container.querySelector('#profile-page'),form=page.querySelector('form'),feedback=page.querySelector('[data-feedback]');
    const owner=await context();let original;
    try{
      const [result,response]=await Promise.all([request('/api/auth/perfil'),fetch(new URL('../../data/colonias.json',import.meta.url))]);
      if(!response.ok)throw new Error('No pudimos cargar las colonias.');
      const names=await response.json();if(!page.isConnected)return;
      original=result.user;form.elements.colonia.innerHTML=names.map(name=>`<option value="${e(name)}">${e(name)}</option>`).join('');
      for(const key of ['email','nombre','telefono','colonia'])form.elements[key].value=original[key]||'';
      form.querySelector('button').disabled=false;feedback.textContent='';
    }catch(error){feedback.textContent=`No pudimos consultar tu perfil: ${error.message}`;}
    form.addEventListener('submit',async event=>{
      event.preventDefault();const button=form.querySelector('button');button.disabled=true;
      try{
        const data=Object.fromEntries(new FormData(form));delete data.email;
        if(data.colonia!==original.colonia){const pending=(await records('outbox')).filter(row=>row.owner===owner.session.user.id&&row.base===owner.base);if(pending.length)throw new Error('Envía tus reportes pendientes antes de cambiar de colonia.');}
        const result=await request('/api/auth/perfil',{method:'PUT',body:data});
        const active=await context();if(active.session?.token!==owner.session.token)return;
        await writeSetting('session',{...active.session,user:{...active.session.user,...result.user}});
        original=result.user;window.dispatchEvent(new Event('profile-change'));feedback.textContent='Tu perfil se guardó correctamente.';
      }catch(error){feedback.textContent=error.message;}finally{button.disabled=false;}
    });
  },
};
