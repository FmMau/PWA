import { canPromptInstall, isAppInstalled, promptInstall } from "./installPrompt.js";

function updateInstallButton() {
  const button = document.getElementById("install-app-button");
  if (!button) return;

  button.hidden = !canPromptInstall() || isAppInstalled();
}

export function initInstallButton() {
  updateInstallButton();
  window.addEventListener("aqua-install-state-change", updateInstallButton);

  document.getElementById("install-app-button")?.addEventListener("click", async () => {
    await promptInstall();
    updateInstallButton();
  });
}
