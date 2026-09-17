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

const safeLocalStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      showStorageWarning();
      return false;
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};

const safeSessionStorage = {
  getItem(key) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  removeItem(key) {
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};

function setCookie(name, value, days) {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  document.cookie =
    `${name}=${encodeURIComponent(value)}; ` +
    `expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const prefix = `${name}=`;
  for (let cookie of document.cookie.split(";")) {
    cookie = cookie.trim();
    if (cookie.startsWith(prefix)) {
      return decodeURIComponent(cookie.slice(prefix.length));
    }
  }
  return null;
}

function deleteCookie(name) {
  document.cookie =
    `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export { safeLocalStorage, safeSessionStorage, setCookie, getCookie, deleteCookie };
