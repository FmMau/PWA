import { context } from '../services/apiService.js';
export default class Router {
  constructor(routes, rootElement) {
    this.routes = routes;
    this.root = rootElement;

    window.addEventListener("popstate", () => this.render());
    window.addEventListener("hashchange", () => this.render());
    window.addEventListener('auth-change', () => this.render());

    document.addEventListener("click", (event) => {
      const link = event.target.closest("[data-link]");
      if (!link) return;
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      this.navigate(link.getAttribute("href"));
    });
  }

  navigate(path) {
    window.history.pushState({}, "", path.startsWith("#") ? path : `#${path}`);
    this.render();
  }

  matchRoute(path) {
    for (const route of this.routes) {
      const routeParts = route.path.split("/").filter(Boolean);
      const pathParts = path.split("/").filter(Boolean);

      if (routeParts.length !== pathParts.length) {
        continue;
      }

      const params = {};
      let matches = true;

      for (let i = 0; i < routeParts.length; i++) {
        const routePart = routeParts[i];
        const pathPart = pathParts[i];

        if (routePart.startsWith(":")) {
          const paramName = routePart.slice(1);
          params[paramName] = pathPart;
        } else if (routePart !== pathPart) {
          matches = false;
          break;
        }
      }

      if (matches) {
        return { route, params };
      }
    }

    return null;
  }

  async render() {
    const revision = this.revision = (this.revision || 0) + 1;
    const hash = window.location.hash.slice(1) || '/';
    const separator = hash.indexOf('?');
    let path = separator < 0 ? hash : hash.slice(0, separator);
    let query = new URLSearchParams(separator < 0 ? '' : hash.slice(separator + 1));
    const { session } = await context();
    if (revision !== this.revision) return;
    const publicRoute = ['/login', '/registro'].includes(path);
    const authenticated = !!(session?.token && session?.user?.id);
    if (!authenticated && !publicRoute) {
      path = '/login';
      history.replaceState({}, '', '#/login');
      query = new URLSearchParams();
    } else if (authenticated && publicRoute) {
      path = '/';
      history.replaceState({}, '', '#/');
      query = new URLSearchParams();
    }
    if (authenticated && path === '/mapa') {
      path = '/suministro';
      history.replaceState({}, '', `#/suministro${query.size ? '?' + query : ''}`);
    }
    document.body.classList.toggle('auth-page', ['/login', '/registro'].includes(path));
    const titles = {'/':'Resumen', '/reportes':'Reportes', '/suministro':'Suministro por colonia', '/pipas':'Pedidos de pipas', '/estadisticas':'Estadísticas', '/notificaciones':'Notificaciones', '/operador':'Operador de pipa', '/disponibles':'Pedidos disponibles'};
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
      if (link.getAttribute('href') === `#${path}`) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    const title = document.querySelector('.topbar-title');
    if (title) title.textContent = titles[path] || 'Centro de Control';

    this.root.innerHTML = `
      <div class="loading">
        <div class="loading-circle"></div>
        <p>Cargando información...</p>
      </div>
    `;

    // Para simular un retraso al cargar y poder ver la animación
    //await new Promise((resolve) => setTimeout(resolve, 500));

    const match = this.matchRoute(path);

    if (!match) {
      const { default: NotFoundView } = await import(
        "../views/NotFoundView.js"
      );

      this.root.innerHTML = NotFoundView();
      return;
    }

    const viewModule = match.route.view;

    if (
      typeof viewModule === "object" &&
      typeof viewModule.template === "function"
    ) {
      this.root.innerHTML = viewModule.template(match.params);
      document.title = `AquaPaz · ${titles[path] || 'Centro de Control'}`;

      if (typeof viewModule.init === "function") {
        await viewModule.init(this.root, { ...match.params, query });
      }

    } else {
      const html = await viewModule(match.params);
      this.root.innerHTML = html;
      document.title = `AquaPaz — ${path}`;
    }
  }

  init() {
    this.render();
  }
}
