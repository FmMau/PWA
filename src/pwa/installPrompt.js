let deferredPrompt = null;
let installedEventObserved = false;
let initialized = false;
const installLog = [];

const DISPLAY_MODES = [
  "standalone",
  "fullscreen",
  "minimal-ui",
  "window-controls-overlay",
];

function notify(type, detail) {
  installLog.unshift({
    time: new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date()),
    type,
    detail,
  });
  installLog.length = Math.min(installLog.length, 30);
  window.dispatchEvent(new CustomEvent("aqua-install-state-change"));
}

export function isStandalone() {
  if (navigator.standalone === true) return true;
  if (typeof window.matchMedia !== "function") return false;

  return DISPLAY_MODES.some((mode) =>
    window.matchMedia(`(display-mode: ${mode})`).matches
  );
}

export function isAppInstalled() {
  return installedEventObserved || isStandalone();
}

export function canPromptInstall() {
  return deferredPrompt !== null && !isAppInstalled();
}

export function isIOS() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

export function getInstallHelp() {
  if (isAppInstalled()) {
    return "AquaPaz ya se está ejecutando como una aplicación instalada.";
  }
  if (canPromptInstall()) {
    return "Tu navegador permite instalar AquaPaz. Usa el botón «Instalar app».";
  }
  if (isIOS()) {
    return "En iPhone o iPad: toca Compartir y elige «Agregar a pantalla de inicio».";
  }
  return "Este navegador no ofreció el evento de instalación. Revisa el menú del navegador para buscar «Instalar app» o «Agregar a pantalla principal». Las demás funciones de AquaPaz siguen disponibles.";
}

export function getInstallLog() {
  return [...installLog];
}

export function initInstallPrompt() {
  if (initialized) return;
  initialized = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notify("beforeinstallprompt", "El navegador permite instalar AquaPaz.");
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installedEventObserved = true;
    notify("appinstalled", "AquaPaz se instaló en este dispositivo.");
  });

  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    window.dispatchEvent(new CustomEvent("aqua-install-state-change"));
  });

  if (typeof window.matchMedia === "function") {
    for (const mode of DISPLAY_MODES) {
      const query = window.matchMedia(`(display-mode: ${mode})`);
      query.addEventListener?.("change", () => {
        window.dispatchEvent(new CustomEvent("aqua-install-state-change"));
      });
    }
  }
}

export async function promptInstall() {
  if (!canPromptInstall()) return null;

  const installEvent = deferredPrompt;
  deferredPrompt = null;
  notify("install-prompt-opened", "Se abrió el diálogo de instalación.");

  try {
    // prompt() se ejecuta directamente desde el clic del usuario y solo una vez.
    const result = await installEvent.prompt();
    const outcome = result?.outcome ??
      (await installEvent.userChoice)?.outcome ??
      "unknown";
    notify(
      "install-choice",
      outcome === "accepted"
        ? "El usuario aceptó la instalación."
        : outcome === "dismissed"
          ? "El usuario descartó la instalación."
          : "El navegador no devolvió una respuesta reconocida."
    );
    return outcome;
  } catch (error) {
    notify("install-error", `No se pudo abrir el diálogo: ${error.message}`);
    return null;
  }
}
