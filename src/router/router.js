/**
 * Router — enrutador de cliente basado en la History API.
 *
 * Estado actual: SOLO soporta rutas EXACTAS (route.path === path).
 * TODO (Ejercicio - Parte A, punto 1): agrega soporte para rutas con
 * parámetros, como "/item/:id", dentro de matchRoute().
 */
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

  /**
   * Debe devolver { route, params } si alguna ruta coincide con "path",
   * o null si ninguna coincide.
   *
   * Ahora mismo SOLO compara de forma exacta, por lo que "/item/1" no
   * hace match con la ruta definida como "/item/:id".
   *
   * TODO: soporta segmentos dinámicos (":id") y regresa también los
   * parámetros capturados, ej:
   *   matchRoute("/item/2") -> { route: <ruta /item/:id>, params: { id: "2" } }
   */
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
    this.render();
  }
}
