// src/utils/asset.js (if this lives alongside, otherwise keep it in the same file where assetUrl is defined)
export function assetUrl(path) {
  if (!path) return "";
  /* ===================== NEW LOGIC =====================
   * - Keep absolute URLs intact
   * - Force leading slash for relative assets
   * - Collapse accidental double slashes (except protocol)
   * ==================================================== */
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.replace(/([^:])\/{2,}/g, "$1/"); // don't touch "https://"
}
