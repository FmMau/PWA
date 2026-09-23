import { safeSessionStorage } from "../utils/storage.js";
import {
  addReporte,
  getAllReportes,
  getReportesByTipo,
  deleteReporte,
} from "../services/dbService.js";

const SS_KEY  = "aquapaz-reportes-filtro";
const TIPOS   = ["Fuga", "Desabasto", "Baja presión"];
const FILTROS = ["Todos", ...TIPOS];
const ESTADOS = ["Pendiente", "En revisión", "Atendido"];

function showToast(msg, tipo = "error") {
  const prev = document.getElementById("reports-toast");
  if (prev) prev.remove();

  const el = document.createElement("div");
  el.id        = "reports-toast";
  el.className = `reports-toast reports-toast--${tipo}`;
  el.innerHTML = `
    <i class="fa-solid ${tipo === "success" ? "fa-circle-check" : "fa-circle-exclamation"}"></i>
    ${msg}
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function estadoBadge(estado) {
  const map = {
    "Pendiente":   "badge--warning",
    "En revisión": "badge--info",
    "Atendido":    "badge--success",
  };
  return `<span class="badge ${map[estado] ?? ""}">${estado}</span>`;
}

function reportCard(r) {
  return `
    <article class="card reporte-card" data-id="${r.id}">
      <div class="reporte-card-header">
        ${estadoBadge(r.estado)}
        <button class="reporte-delete-btn" data-id="${r.id}" aria-label="Eliminar reporte">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>

      <h3>${r.titulo}</h3>
      <p>${r.descripcion}</p>

      <div class="reporte-meta">
        <span><i class="fa-solid fa-location-dot"></i> ${r.colonia}</span>
        <span><i class="fa-solid fa-tag"></i> ${r.tipo}</span>
      </div>
    </article>
  `;
}

function formTemplate() {
  const tipoOptions   = TIPOS.map(t  => `<option value="${t}">${t}</option>`).join("");
  const estadoOptions = ESTADOS.map(e => `<option value="${e}">${e}</option>`).join("");

  return `
    <form class="reporte-form" id="reporte-form" novalidate>

      <div class="reporte-form-title">
        <i class="fa-solid fa-circle-plus"></i>
        <span>Nuevo reporte</span>
      </div>

      <div class="reporte-form-fields">

        <div class="field-group">
          <label for="r-titulo">Título <span class="required">*</span></label>
          <input
            type="text"
            id="r-titulo"
            name="titulo"
            placeholder="Ej. Fuga en calle principal"
            autocomplete="off"
            required
          />
        </div>

        <div class="field-group">
          <label for="r-desc">Descripción <span class="required">*</span></label>
          <textarea
            id="r-desc"
            name="descripcion"
            rows="3"
            placeholder="Describe el problema con el mayor detalle posible..."
            required
          ></textarea>
        </div>

        <div class="reporte-form-row">
          <div class="field-group">
            <label for="r-colonia">Colonia <span class="required">*</span></label>
            <input
              type="text"
              id="r-colonia"
              name="colonia"
              placeholder="Ej. Centro"
              autocomplete="off"
              required
            />
          </div>

          <div class="field-group">
            <label for="r-tipo">Tipo <span class="required">*</span></label>
            <select id="r-tipo" name="tipo" required>
              <option value="">— Selecciona —</option>
              ${tipoOptions}
            </select>
          </div>

          <div class="field-group">
            <label for="r-estado">Estado</label>
            <select id="r-estado" name="estado">
              ${estadoOptions}
            </select>
          </div>
        </div>

      </div>

      <div class="reporte-form-footer">
        <span id="reporte-form-error" class="field-error" aria-live="polite"></span>
        <button type="submit" id="btn-submit-reporte" class="btn-primary">
          <i class="fa-solid fa-paper-plane"></i> Guardar reporte
        </button>
      </div>

    </form>
  `;
}

function template() {
  const filtroActivo = safeSessionStorage.getItem(SS_KEY) || "Todos";

  const chips = FILTROS.map(
    (f) => `
      <button
        class="filter-chip ${f === filtroActivo ? "filter-chip--active" : ""}"
        data-filter="${f}"
      >${f}</button>
    `
  ).join("");

  return `
    <section class="page">

      <div class="page-header">
        <div>
          <span class="page-eyebrow">
            Operación
          </span>

          <h2>Reportes ciudadanos</h2>

          <p>
            Registra y da seguimiento a las incidencias relacionadas
            con el suministro de agua. Los datos se guardan localmente.
          </p>
        </div>
      </div>

      ${formTemplate()}

      <div class="filter-bar" id="filter-bar">${chips}</div>

      <div id="reports-list">
        <div class="loading-inline">
          <div class="loading-circle loading-circle--sm"></div>
          <span>Cargando reportes…</span>
        </div>
      </div>

    </section>
  `;
}

async function renderList(container, filtro) {
  const list = container.querySelector("#reports-list");
  list.innerHTML = "";

  const reportes =
    filtro === "Todos"
      ? await getAllReportes()
      : await getReportesByTipo(filtro);

  if (!reportes.length) {
    const msg =
      filtro === "Todos"
        ? "Aún no hay reportes registrados. Usa el formulario para agregar el primero."
        : `No hay reportes de tipo "${filtro}".`;

    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <h3>Sin reportes</h3>
        <p>${msg}</p>
      </div>
    `;
    return;
  }

  list.innerHTML = `<div class="grid">${reportes.map(reportCard).join("")}</div>`;
}

async function init(container) {
  const filterBar = container.querySelector("#filter-bar");
  const form      = container.querySelector("#reporte-form");
  const errorSpan = container.querySelector("#reporte-form-error");

  const getFiltroActivo = () => safeSessionStorage.getItem(SS_KEY) || "Todos";

  await renderList(container, getFiltroActivo());

  filterBar.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;

    const filtro = btn.dataset.filter;
    safeSessionStorage.setItem(SS_KEY, filtro);

    filterBar
      .querySelectorAll(".filter-chip")
      .forEach((c) => c.classList.remove("filter-chip--active"));
    btn.classList.add("filter-chip--active");

    await renderList(container, filtro);
  });

  container
    .querySelector("#reports-list")
    .addEventListener("click", async (e) => {
      const btn = e.target.closest(".reporte-delete-btn");
      if (!btn) return;

      const id = Number(btn.dataset.id);
      await deleteReporte(id);
      await renderList(container, getFiltroActivo());
    });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorSpan.textContent = "";

    const data = {
      titulo:      form.titulo.value.trim(),
      descripcion: form.descripcion.value.trim(),
      colonia:     form.colonia.value.trim(),
      tipo:        form.tipo.value,
      estado:      form.estado.value,
      fecha:       new Date().toISOString(),
    };

    if (!data.titulo || !data.descripcion || !data.colonia || !data.tipo) {
      errorSpan.textContent = "Completa todos los campos obligatorios (*).";
      return;
    }

    const submitBtn = form.querySelector("#btn-submit-reporte");
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';

    try {
      await addReporte(data);
      form.reset();
      await renderList(container, getFiltroActivo());
      showToast("Reporte guardado correctamente.", "success");
    } catch (err) {
      console.error("[dbService] Error al guardar reporte:", err);
      errorSpan.textContent = "No se pudo guardar el reporte. Intenta de nuevo.";
      showToast("Error al guardar en la base de datos local.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Guardar reporte';
    }
  });
}

export default { template, init };
