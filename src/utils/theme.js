import {
  getLocalStorage,
  setLocalStorage,
} from "./storage.js";

const THEME_KEY = "aquapaz-theme";


export function initTheme() {
  const savedTheme =
    getLocalStorage(THEME_KEY, "light");

  applyTheme(savedTheme);

  const button =
    document.getElementById("theme-toggle");

  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    const currentTheme =
      document.documentElement.dataset.theme ||
      "light";

    const newTheme =
      currentTheme === "light"
        ? "dark"
        : "light";

    setLocalStorage(
      THEME_KEY,
      newTheme
    );

    applyTheme(newTheme);
  });
}


export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;

  updateThemeIcon(theme);
}


function updateThemeIcon(theme) {
  const icon =
    document.querySelector("#theme-toggle i");

  if (!icon) {
    return;
  }

  if (theme === "dark") {
    icon.className = "fa-solid fa-sun";
  } else {
    icon.className = "fa-solid fa-moon";
  }
}