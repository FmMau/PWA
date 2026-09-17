import {
  getLocalStorage,
  getSessionStorage,
  removeLocalStorage,
  removeSessionStorage,
} from "../utils/storage.js";

import {
  getCookie,
  deleteCookie,
} from "../utils/cookies.js";

export default function DiagnosticsView() {
  const theme =
    getLocalStorage(
      "aquapaz-theme",
      "No guardado"
    );

  const weatherFilter =
    getSessionStorage(
      "aquapaz-weather-filter",
      "No guardado"
    );

  const lastVisit =
    getCookie("aquapaz-last-visit")
      || "No guardado";

  return `
    <section class="page">

      <div class="page-header">

        <span class="page-eyebrow">
          Sistema
        </span>

        <h2>Diagnóstico de almacenamiento</h2>

        <p>
          Información almacenada actualmente
          por AquaPaz en este navegador.
        </p>

      </div>

      <div class="diagnostics-grid">

        ${createDiagnosticCard(
          "Local Storage",
          "Tema de la aplicación",
          theme,
          "local"
        )}

        ${createDiagnosticCard(
          "Session Storage",
          "Filtro temporal del clima",
          weatherFilter,
          "session"
        )}

        ${createDiagnosticCard(
          "Cookie",
          "Última visita",
          formatCookieDate(lastVisit),
          "cookie"
        )}

      </div>

    </section>
  `;
}

function createDiagnosticCard(
  storage,
  description,
  value,
  type
) {
  return `
    <article class="diagnostic-card">

      <div class="diagnostic-icon">
        <i class="fa-solid fa-database"></i>
      </div>

      <span class="diagnostic-type">
        ${storage}
      </span>

      <h3>${description}</h3>

      <div class="diagnostic-value">
        ${value}
      </div>

      <button
        class="diagnostic-clear"
        data-clear-storage="${type}"
      >
        Limpiar
      </button>

    </article>
  `;
}

function formatCookieDate(value) {
  if (
    !value ||
    value === "No guardado"
  ) {
    return "No guardado";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

let diagnosticsInitialized = false;

export function initDiagnostics() {
  if (diagnosticsInitialized) {
    return;
  }

  diagnosticsInitialized = true;

  document.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "[data-clear-storage]"
        );

      if (!button) {
        return;
      }

      const type =
        button.dataset.clearStorage;

      if (type === "local") {
        removeLocalStorage(
          "aquapaz-theme"
        );

        document.documentElement.dataset.theme =
          "light";
      }

      if (type === "session") {
        removeSessionStorage(
          "aquapaz-weather-filter"
        );
      }

      if (type === "cookie") {
        deleteCookie(
          "aquapaz-last-visit"
        );
      }

      window.dispatchEvent(
        new PopStateEvent("popstate")
      );
    }
  );
}
