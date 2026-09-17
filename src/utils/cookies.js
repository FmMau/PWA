export function setCookie(name, value, days) {
  try {
    const date = new Date();

    date.setTime(
      date.getTime() + days * 24 * 60 * 60 * 1000
    );

    const expires = `expires=${date.toUTCString()}`;

    document.cookie =
      `${encodeURIComponent(name)}=` +
      `${encodeURIComponent(value)};` +
      `${expires};path=/;SameSite=Lax`;

    return true;
  } catch (error) {
    console.warn("No se pudo crear la cookie:", error);
    return false;
  }
}


export function getCookie(name) {
  try {
    const cookieName =
      `${encodeURIComponent(name)}=`;

    const cookies =
      document.cookie.split(";");

    for (let cookie of cookies) {
      cookie = cookie.trim();

      if (cookie.startsWith(cookieName)) {
        return decodeURIComponent(
          cookie.substring(cookieName.length)
        );
      }
    }

    return null;
  } catch (error) {
    console.warn("No se pudo leer la cookie:", error);
    return null;
  }
}


export function deleteCookie(name) {
  try {
    document.cookie =
      `${encodeURIComponent(name)}=;` +
      `expires=Thu, 01 Jan 1970 00:00:00 GMT;` +
      `path=/;SameSite=Lax`;

    return true;
  } catch (error) {
    console.warn("No se pudo eliminar la cookie:", error);
    return false;
  }
}