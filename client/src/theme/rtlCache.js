// src/theme/rtlCache.js
import createCache from "@emotion/cache";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";

export const cacheLtr = createCache({ key: "mui", prepend: true });

/* ========================= NEW LOGIC =========================
 * Keep plugin order explicit: RTL transform first, then prefixer.
 * This mirrors MUI guidance and avoids rare double-flip issues.
 * ============================================================ */
export const cacheRtl = createCache({
  key: "mui-rtl",
  stylisPlugins: [rtlPlugin, prefixer],
  prepend: true,
});
