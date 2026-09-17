import { safeLocalStorage, safeSessionStorage, getCookie, deleteCookie } from "../utils/storage.js";

const LS_KEY      = "aquapaz-theme";
const SS_KEY      = "aquapaz-reportes-filtro";
const COOKIE_NAME = "aquapaz-ultima-visita";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-MX");
  } catch {
    return iso;
  }
}

function storageCard(id, mecanismo, clave, descripcion) {
  return `
    <article class="storage-card" id="card-${id}">
      <div class="storage-card-header">
        <span class="storage-mechanism">${mecanismo}</span>
        <button class="storage-clear-btn" id="btn-clear-${id}">
          <i class="fa-solid fa-trash-can"></i> Limpiar
        </button>
      </div>
      <code class="storage-key">${clave}</code>
      <div class="storage-value" id="val-${id}"></div>
      <p class="storage-desc">${descripcion}</p>
    </article>
  `;
}

function template() {
  return `
    <section class="page">

      <div class="page-header">
        <span class="page-eyebrow">Sistema</span>
        <h2>Diagnóstico de almacenamiento</h2>
        <p>Estado actual de los tres mecanismos de persistencia en el cliente.</p>
      </div>

      <div class="storage-grid">

        ${storageCard(
          "ls",
          "localStorage",
          LS_KEY,
          "Preferencia de tema claro/oscuro. Persiste indefinidamente y se comparte entre pestañas del mismo origen."
        )}

        ${storageCard(
          "ss",
          "sessionStorage",
          SS_KEY,
          "Filtro activo en la vista de Reportes. Sobrevive a F5 pero desaparece al cerrar la pestaña."
        )}

        ${storageCard(
          "ck",
          "Cookie (7 días)",
          COOKIE_NAME,
          "Fecha de última visita. Expira en 7 días — suficiente para reconocer al usuario recurrente sin comprometer privacidad."
        )}

      </div>

    </section>
  `;
}

async function init(container) {
  function refresh() {
    const lsVal = safeLocalStorage.getItem(LS_KEY);
    const ssVal = safeSessionStorage.getItem(SS_KEY);
    const ckVal = getCookie(COOKIE_NAME);

    const empty = `<span class="storage-empty">sin valor</span>`;

    container.querySelector("#val-ls").innerHTML = lsVal ?? empty;
    container.querySelector("#val-ss").innerHTML = ssVal ?? empty;
    container.querySelector("#val-ck").innerHTML = ckVal
      ? formatDate(ckVal)
      : empty;
  }

  refresh();

  container.querySelector("#btn-clear-ls").addEventListener("click", () => {
    safeLocalStorage.removeItem(LS_KEY);
    document.documentElement.setAttribute("data-theme", "light");
    const icon = document.getElementById("btn-tema")?.querySelector("i");
    if (icon) icon.className = "fa-solid fa-moon";
    refresh();
  });

  container.querySelector("#btn-clear-ss").addEventListener("click", () => {
    safeSessionStorage.removeItem(SS_KEY);
    refresh();
  });

  container.querySelector("#btn-clear-ck").addEventListener("click", () => {
    deleteCookie(COOKIE_NAME);
    refresh();
  });
}

export default { template, init };
