import ItemCard from "../components/ItemCard.js";
import { safeSessionStorage } from "../utils/storage.js";

const SS_KEY = "aquapaz-reportes-filtro";

const FILTROS = ["Todos", "Fuga", "Desabasto", "Baja presión"];

const reports = [
  {
    id: "1",
    title: "Fuga de agua en vía pública",
    description:
      "Se reporta una fuga constante de agua potable en la calle principal.",
    colonia: "Centro",
    tipo: "Fuga",
    estado: "Pendiente",
  },
  {
    id: "2",
    title: "Falta de suministro de agua",
    description:
      "Vecinos reportan falta de agua potable desde hace dos días.",
    colonia: "Camino Real",
    tipo: "Desabasto",
    estado: "En revisión",
  },
  {
    id: "3",
    title: "Baja presión de agua",
    description:
      "El suministro presenta presión muy baja durante gran parte del día.",
    colonia: "El Centenario",
    tipo: "Baja presión",
    estado: "Pendiente",
  },
  {
    id: "4",
    title: "Fuga en toma domiciliaria",
    description:
      "Se detectó una fuga cerca de una toma domiciliaria.",
    colonia: "Indeco",
    tipo: "Fuga",
    estado: "Atendido",
  },
];

function renderCards(filtro) {
  const filtered =
    filtro === "Todos"
      ? reports
      : reports.filter((r) => r.tipo === filtro);

  return filtered.length
    ? filtered.map((r) => ItemCard(r)).join("")
    : `<p class="no-results">No hay reportes con este filtro.</p>`;
}

function template() {
  const filtroActivo = safeSessionStorage.getItem(SS_KEY) || "Todos";

  const chips = FILTROS.map(
    (f) => `
      <button class="filter-chip ${f === filtroActivo ? "filter-chip--active" : ""}" data-filter="${f}">
        ${f}
      </button>
    `
  ).join("");

  return `
    <section class="page">

      <div class="page-header">
        <div>
          <span class="page-eyebrow">Operación</span>
          <h2>Reportes ciudadanos</h2>
          <p>
            Consulta y da seguimiento a las incidencias
            relacionadas con el suministro de agua.
          </p>
        </div>
      </div>

      <div class="filter-bar" id="filter-bar">
        ${chips}
      </div>

      <div class="grid" id="reports-grid">
        ${renderCards(filtroActivo)}
      </div>

    </section>
  `;
}

async function init(container) {
  const filterBar = container.querySelector("#filter-bar");
  const grid      = container.querySelector("#reports-grid");

  filterBar.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;

    const filtro = btn.dataset.filter;

    safeSessionStorage.setItem(SS_KEY, filtro);

    filterBar
      .querySelectorAll(".filter-chip")
      .forEach((c) => c.classList.remove("filter-chip--active"));
    btn.classList.add("filter-chip--active");

    grid.innerHTML = renderCards(filtro);
  });
}

export default { template, init };
