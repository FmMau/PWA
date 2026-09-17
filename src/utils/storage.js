export function setLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn("localStorage no está disponible:", error);
    showStorageWarning();
    return false;
  }
}

export function getLocalStorage(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(key);

    if (value === null) {
      return defaultValue;
    }

    return JSON.parse(value);
  } catch (error) {
    console.warn("No se pudo leer localStorage:", error);
    showStorageWarning();
    return defaultValue;
  }
}

export function removeLocalStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn("No se pudo limpiar localStorage:", error);
    showStorageWarning();
    return false;
  }
}


export function setSessionStorage(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn("sessionStorage no está disponible:", error);
    showStorageWarning();
    return false;
  }
}

export function getSessionStorage(key, defaultValue = null) {
  try {
    const value = sessionStorage.getItem(key);

    if (value === null) {
      return defaultValue;
    }

    return JSON.parse(value);
  } catch (error) {
    console.warn("No se pudo leer sessionStorage:", error);
    showStorageWarning();
    return defaultValue;
  }
}

export function removeSessionStorage(key) {
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn("No se pudo limpiar sessionStorage:", error);
    showStorageWarning();
    return false;
  }
}


function showStorageWarning() {
  if (document.querySelector(".storage-warning")) {
    return;
  }

  const warning = document.createElement("div");

  warning.className = "storage-warning";

  warning.innerHTML = `
    <i class="fa-solid fa-circle-exclamation"></i>
    Algunas preferencias no pudieron guardarse en este navegador.
  `;

  document.body.appendChild(warning);

  setTimeout(() => {
    warning.remove();
  }, 4000);
}