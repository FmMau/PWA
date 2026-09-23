import { addSolicitud, getAllSolicitudes, getSolicitudesByPrioridad, deleteSolicitud } from "../services/truckDbService.js";

function template() {
  return `
    <section class="page" id="trucks-page">
      <div class="page-header"><div>
        <span class="page-eyebrow">Distribución</span>
        <h2>Solicitudes de pipas</h2>
        <p>Organiza solicitudes de agua guardadas en este navegador. Este registro local no envía una pipa ni confirma una entrega.</p>
      </div></div>
      <form class="reporte-form" id="truck-form">
        <h3>Nueva solicitud</h3>
        <div class="reporte-form-fields">
          <div class="field-group">
            <label for="truck-colonia">Colonia *</label>
            <input id="truck-colonia" name="colonia" required maxlength="100" placeholder="Ej. Centro">
          </div>
          <div class="field-group">
            <label for="truck-direccion">Dirección o referencia *</label>
            <input id="truck-direccion" name="direccion" required maxlength="200" placeholder="Calle y referencia de entrega">
          </div>
          <div class="reporte-form-row">
            <div class="field-group">
              <label for="truck-litros">Litros solicitados *</label>
              <input id="truck-litros" name="litros" type="number" min="1" max="100000" step="1" required>
            </div>
            <div class="field-group">
              <label for="truck-prioridad">Prioridad *</label>
              <select id="truck-prioridad" name="prioridad" required>
                <option>Normal</option><option>Urgente</option>
              </select>
            </div>
          </div>
        </div>
        <div class="reporte-form-footer"><button class="btn-primary" type="submit">Guardar solicitud</button></div>
      </form>
      <p id="truck-feedback" role="status" aria-live="polite"></p>
      <div class="field-group truck-filter">
        <label for="truck-filter">Filtrar por prioridad</label>
        <select id="truck-filter"><option value="">Todas</option><option>Normal</option><option>Urgente</option></select>
      </div>
      <div id="truck-list" aria-live="polite">Cargando solicitudes…</div>
    </section>`;
}

async function init(container) {
  const page = container.querySelector("#trucks-page");
  const form = page.querySelector("form");
  const filter = page.querySelector("#truck-filter");
  const list = page.querySelector("#truck-list");
  const feedback = page.querySelector("#truck-feedback");
  let revision = 0;
  function message(text, error = false) {
    feedback.textContent = text;
    feedback.className = error ? "field-error" : "";
  }
  async function renderList() {
    const current = ++revision;
    list.setAttribute("aria-busy", "true");
    try {
      const records = filter.value ? await getSolicitudesByPrioridad(filter.value) : await getAllSolicitudes();
      if (current !== revision) return;
      list.replaceChildren();
      if (!records.length) {
        list.textContent = "No hay solicitudes para esta prioridad. Agrega una con el formulario.";
        return;
      }
      const grid = document.createElement("div");
      grid.className = "grid";
      for (const record of records.reverse()) {
        const card = document.createElement("article");
        card.className = "card truck-card";
        // Los datos se insertan como texto, nunca como HTML.
        for (const [tag, text] of [
          ["h3", record.colonia], ["p", record.direccion],
          ["p", `${record.litros.toLocaleString("es-MX")} litros · ${record.prioridad}`],
          ["p", `Registrada: ${new Date(record.fecha).toLocaleString("es-MX")}`],
        ]) {
          const element = document.createElement(tag);
          element.textContent = text;
          card.append(element);
        }
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn-primary";
        button.textContent = "Eliminar solicitud";
        button.dataset.id = record.id;
        button.setAttribute("aria-label", `Eliminar solicitud de ${record.colonia}`);
        card.append(button);
        grid.append(card);
      }
      list.append(grid);
    } catch (error) {
      if (current !== revision) return;
      console.error("No se pudieron leer las solicitudes:", error);
      list.textContent = "No se pudieron cargar las solicitudes locales. ";
      const retry = document.createElement("button");
      retry.textContent = "Reintentar";
      retry.className = "btn-primary";
      retry.addEventListener("click", renderList);
      list.append(retry);
    } finally {
      if (current === revision) list.setAttribute("aria-busy", "false");
    }
  }
  filter.addEventListener("change", renderList);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(form);
    const record = {
      colonia: data.get("colonia").trim(), direccion: data.get("direccion").trim(),
      litros: Number(data.get("litros")), prioridad: data.get("prioridad"), fecha: new Date().toISOString(),
    };
    if (!record.colonia || !record.direccion || !Number.isInteger(record.litros) || record.litros < 1 || record.litros > 100000 || !["Normal", "Urgente"].includes(record.prioridad)) {
      message("Completa los campos y escribe una cantidad válida de litros (1 a 100 000).", true);
      return;
    }
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    try {
      await addSolicitud(record);
      form.reset();
      filter.value = "";
      message("Solicitud guardada en este navegador.");
      await renderList();
    } catch (error) {
      console.error("No se pudo guardar la solicitud:", error);
      message("No se pudo guardar la solicitud. Tus campos se conservan; intenta nuevamente.", true);
    } finally { submit.disabled = false; }
  });
  list.addEventListener("click", async event => {
    const button = event.target.closest("button[data-id]");
    if (!button || button.disabled) return;
    button.disabled = true;
    try {
      await deleteSolicitud(Number(button.dataset.id));
      message("Solicitud eliminada.");
      await renderList();
    } catch (error) {
      console.error("No se pudo eliminar la solicitud:", error);
      message("No se pudo eliminar la solicitud. Intenta nuevamente.", true);
      button.disabled = false;
    }
  });
  await renderList();
}
export default { template, init };
