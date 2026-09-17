export default class Router {
  constructor(routes, rootElement) {
    this.routes = routes;
    this.root = rootElement;

    window.addEventListener("popstate", () => this.render());

    document.addEventListener("click", (event) => {
      const link = event.target.closest("[data-link]");
      if (!link) return;
      event.preventDefault();
      this.navigate(link.getAttribute("href"));
    });
  }

  navigate(path) {
    window.history.pushState({}, "", path);
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
    const path = window.location.pathname;

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

    const html = await match.route.view(match.params);

    this.root.innerHTML = html;

    document.title = `AquaPaz — ${path}`;
  }

  init() {
    initTheme();
    this.render();
  }
}
