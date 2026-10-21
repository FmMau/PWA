import { request, writeSetting } from '../services/apiService.js';

function authView(register = false) {
  return {
    template() {
      return `<section class="auth-layout">
        <div class="auth-intro"><a class="auth-brand" href="#/login" data-link><span class="auth-drop">◆</span> AquaPaz</a><small>La Paz, Baja California Sur</small></div>
        <div class="auth-content"><div class="auth-card"><span class="auth-eyebrow">BIENVENIDO A AQUAPAZ</span><h2>${register ? 'Crea tu cuenta' : 'Inicia sesión'}</h2><p class="auth-description">${register ? 'Forma parte de la comunidad y mantente al tanto de tu colonia.' : 'Ingresa para consultar tu colonia y dar seguimiento a tus reportes.'}</p>
        <nav class="auth-tabs" aria-label="Acceso"><a href="#/login" data-link ${!register ? 'aria-current="page"' : ''}>Iniciar sesión</a><a href="#/registro" data-link ${register ? 'aria-current="page"' : ''}>Crear cuenta</a></nav>
        <form id="${register ? 'register' : 'login'}" class="auth-form">
          ${register ? '<label for="auth-name">Nombre completo<input id="auth-name" name="nombre" autocomplete="name" maxlength="100" required placeholder="Tu nombre"></label>' : ''}
          <label for="auth-email">Correo electrónico<input id="auth-email" name="email" type="email" autocomplete="username" maxlength="120" required placeholder="tu@correo.com"></label>
          ${register ? '<div class="auth-row"><label for="auth-phone">Teléfono<input id="auth-phone" name="telefono" type="tel" autocomplete="tel" required placeholder="10 dígitos"></label><label for="auth-colonia">Colonia<input id="auth-colonia" name="colonia" list="auth-colonias" autocomplete="address-level3" required placeholder="Selecciona tu colonia"></label></div><datalist id="auth-colonias"></datalist>' : ''}
          <label for="auth-password">Contraseña<div class="auth-password"><input id="auth-password" name="password" type="password" autocomplete="${register ? 'new-password' : 'current-password'}" ${register ? 'minlength="8"' : ''} required placeholder="${register ? 'Al menos 8 caracteres' : 'Tu contraseña'}"><button type="button" id="toggle-password" aria-label="Mostrar contraseña" aria-pressed="false">Mostrar</button></div></label>
          <p id="auth-feedback" role="status" aria-live="polite"></p><button class="auth-submit" type="submit">${register ? 'Crear mi cuenta' : 'Entrar a AquaPaz'} <span aria-hidden="true">→</span></button>
        </form>
        <p class="auth-switch">${register ? '¿Ya tienes cuenta? <a href="#/login" data-link>Inicia sesión</a>' : '¿Aún no tienes cuenta? <a href="#/registro" data-link>Regístrate</a>'}</p>
        <p class="auth-note">Necesitas conexión para ${register ? 'crear tu cuenta' : 'iniciar sesión'}. Después podrás guardar reportes sin internet.</p>

        </div></div></section>`;
    },
    async init(container) {
      const form = container.querySelector('form');
      const feedback = container.querySelector('#auth-feedback');
      container.querySelector('#toggle-password').addEventListener('click', event => {
        const input = form.elements.password;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        event.currentTarget.textContent = show ? 'Ocultar' : 'Mostrar';
        event.currentTarget.setAttribute('aria-pressed', String(show));
        event.currentTarget.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
      });
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const button = form.querySelector('[type=submit]');
        button.disabled = true;
        button.textContent = register ? 'Creando cuenta…' : 'Iniciando sesión…';
        feedback.textContent = '';
        try {
          const body = Object.fromEntries(new FormData(form));
          if (register && new TextEncoder().encode(body.password).length > 72) throw new Error('La contraseña debe tener un máximo de 72 bytes.');
          const result = await request(`/api/auth/${register ? 'register' : 'login'}`, {method:'POST', publicAccess:true, body});
          if (!result.token || !result.user) throw new Error('No se pudo confirmar tu sesión. Intenta de nuevo.');
          await writeSetting('session', result);
          window.dispatchEvent(new Event('auth-change'));
          form.reset();
          if (form.isConnected) { history.replaceState({}, '', '#/'); window.dispatchEvent(new PopStateEvent('popstate')); }
        } catch (error) {
          feedback.textContent = navigator.onLine ? error.message.replace(/^\d+:\s*/, '') : 'Sin conexión. Conéctate a internet para continuar.';
        } finally {
          button.disabled = false;
          button.textContent = register ? 'Crear mi cuenta →' : 'Entrar a AquaPaz →';
        }
      });
      if (register) {
        try {
          const response = await fetch(new URL('../../data/colonias.json', import.meta.url));
          const names = await response.json();
          const list = container.querySelector('#auth-colonias');
          if (list) for (const name of names) { const option = document.createElement('option'); option.value = name; list.append(option); }
        } catch { feedback.textContent = 'No se pudo cargar el catálogo. Escribe el nombre completo de tu colonia.'; }
      }
    }
  };
}
export const LoginView = authView();
export const RegisterView = authView(true);
