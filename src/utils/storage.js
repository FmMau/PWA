function showStorageWarning() {
  if (document.getElementById("storage-warning")) return;
  const el = document.createElement("div");
  el.id = "storage-warning";
  el.className = "storage-warning";
  el.textContent = "El almacenamiento local no está disponible en este navegador.";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
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
