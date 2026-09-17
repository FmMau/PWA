import {
  getCookie,
  setCookie,
} from "./cookies.js";

const LAST_VISIT =
  "aquapaz-last-visit";

const CURRENT_VISIT =
  "aquapaz-current-visit";

export function registerVisit() {
  const previousVisit =
    getCookie(CURRENT_VISIT);

  if (previousVisit) {
    setCookie(
      LAST_VISIT,
      previousVisit,
      30
    );
  }

  setCookie(
    CURRENT_VISIT,
    new Date().toISOString(),
    30
  );
}
