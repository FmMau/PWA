import {
  canPromptInstall,
  getInstallHelp,
  getInstallLog,
  isAppInstalled,
  promptInstall,
} from "../pwa/installPrompt.js";

const ALLOWED_DISPLAY_MODES = new Set([
  "standalone",
  "fullscreen",
  "minimal-ui",
  "window-controls-overlay",
]);

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

async function getInstallCriteria() {
  const manifestLink = document.querySelector('link[rel="manifest"]');
  let manifest = null;
  let manifestURL = null;
  let registration = null;

  if (manifestLink) {
    manifestURL = manifestLink.href;
    try {
      const response = await fetch(manifestURL);
      if (response.ok) manifest = await response.json();
    } catch {
      manifest = null;
    }
  }

  if ("serviceWorker" in navigator) {
    try {
      registration = await navigator.serviceWorker.getRegistration();
    } catch {
      registration = null;
    }
  }

  const icons = manifest?.icons ?? [];
  async function hasReachableIcon(size) {
    const icon = icons.find((item) =>
      (item.sizes ?? "").split(/\s+/).includes(`${size}x${size}`)
    );
    if (!icon || !manifestURL) return false;
    try {
      const response = await fetch(new URL(icon.src, manifestURL));
      return response.ok;
    } catch {
      return false;
    }
  }

  let startURLWithinScope = false;
  if (manifest?.start_url) {
    try {
      const startURL = new URL(manifest.start_url, manifestURL);
      const scopeURL = new URL(manifest.scope || "./", manifestURL);
      startURLWithinScope = startURL.origin === scopeURL.origin &&
        startURL.pathname.startsWith(scopeURL.pathname);
    } catch {
      startURLWithinScope = false;
    }
  }

  return [
    ["Contexto seguro (HTTPS o localhost)", window.isSecureContext],
    ["Manifest enlazado y JSON legible", Boolean(manifest)],
    ["Nombre de la aplicación", Boolean(manifest?.name || manifest?.short_name)],
    ["start_url declarado", Boolean(manifest?.start_url)],
    ["start_url dentro de scope", startURLWithinScope],
    ["display válido para instalación", ALLOWED_DISPLAY_MODES.has(manifest?.display)],
    ["Ícono 192 × 192 disponible", await hasReachableIcon(192)],
    ["Ícono 512 × 512 disponible", await hasReachableIcon(512)],
    ["Instalación relacionada no forzada", Boolean(manifest) && manifest.prefer_related_applications !== true],
    ["Service worker registrado y activo", Boolean(registration?.active)],
    ["Service worker controla esta página", Boolean(navigator.serviceWorker?.controller)],
  ];
}

function renderCriteria(rows) {
  return `<div class="install-table-wrap"><table class="install-table">
    <thead><tr><th>Criterio</th><th>Estado</th></tr></thead>
    <tbody>${rows.map(([label, passes]) => `<tr><td>${escapeHTML(label)}</td><td><span class="install-result ${passes ? "is-ok" : "is-missing"}">${passes ? "Cumple" : "Falta"}</span></td></tr>`).join("")}</tbody>
  </table></div>`;
}

function renderLog() {
  const entries = getInstallLog();
  if (!entries.length) return "<p class=\"install-empty\">Aún no se ha recibido un evento de instalación en este navegador.</p>";

  return `<div class="install-table-wrap"><table class="install-table">
    <thead><tr><th>Hora</th><th>Evento</th><th>Detalle</th></tr></thead>
    <tbody>${entries.map(({ time, type, detail }) => `<tr><td>${escapeHTML(time)}</td><td><code>${escapeHTML(type)}</code></td><td>${escapeHTML(detail)}</td></tr>`).join("")}</tbody>
  </table></div>`;
}

async function updateInstallView(root) {
  const criteria = root.querySelector("#install-criteria");
  const status = root.querySelector("#install-status");
  const help = root.querySelector("#install-help");
  const button = root.querySelector("#install-view-button");
  const log = root.querySelector("#install-log");
  if (!criteria || !status || !help || !button || !log) return;

  criteria.innerHTML = "<p class=\"install-empty\">Evaluando los requisitos de instalación…</p>";
  const rows = await getInstallCriteria();
  criteria.innerHTML = renderCriteria(rows);
  status.textContent = isAppInstalled()
    ? "AquaPaz se está ejecutando como aplicación instalada."
    : canPromptInstall()
      ? "Este navegador ofrece la instalación integrada."
      : "AquaPaz está abierta en una pestaña del navegador.";
  help.textContent = getInstallHelp();
  button.hidden = !canPromptInstall() || isAppInstalled();
  log.innerHTML = renderLog();
}

window.addEventListener("aqua-install-state-change", () => {
  const root = document.getElementById("app");
  if (root?.querySelector("#install-criteria")) void updateInstallView(root);
});

document.addEventListener("click", async (event) => {
  const root = document.getElementById("app");
  const target = event.target instanceof Element ? event.target : null;
  if (!target || !root?.contains(target)) return;

  if (target.closest("[data-install-refresh]")) {
    await updateInstallView(root);
  }
  if (target.closest("#install-view-button")) {
    await promptInstall();
  }
});

export default {
  template() {
    return `
      <section class="page install-page">
        <header class="page-header">
          <span class="page-eyebrow">AquaPaz</span>
          <h2>Instalar la aplicación</h2>
          <p>Revisa los criterios técnicos y las opciones disponibles para instalar AquaPaz en este dispositivo.</p>
        </header>

        <article class="card install-card">
          <h3>Auditoría de instalación</h3>
          <p>Esta lista orienta la revisión local; la validación final se confirma en DevTools → Application → Manifest → Installability.</p>
          <div id="install-criteria" aria-live="polite"></div>
          <button type="button" class="btn-primary install-refresh" data-install-refresh>Actualizar auditoría</button>
        </article>

        <article class="card install-card">
          <h3>Estado y ayuda para instalar</h3>
          <p id="install-status" role="status" aria-live="polite"></p>
          <p id="install-help" class="install-help"></p>
          <button id="install-view-button" type="button" class="btn-primary" hidden>Instalar app</button>
        </article>

        <article class="card install-card">
          <h3>Eventos de instalación</h3>
          <div id="install-log" aria-live="polite"></div>
        </article>
      </section>
    `;
  },
  async init(root) {
    await updateInstallView(root);
  },
};
