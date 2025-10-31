// src/utils/media.js
/* ===================== NEW LOGIC =====================
 * - Normalize origin (strip trailing slashes)
 * - Build absolute for non-absolute paths
 * - Keep data: and http(s) untouched
 * ==================================================== */
const RAW_ORIGIN = (import.meta?.env?.VITE_API_URL || "").trim().replace(/\/+$/, "");
export const API_ORIGIN = RAW_ORIGIN;

export function absUrl(path) {
  if (!path) return "";
  const p = String(path);
  if (/^https?:\/\//i.test(p) || p.startsWith("data:")) return p;

  if (!API_ORIGIN) {
    // same-origin backend/static
    return p.startsWith("/") ? p : `/${p.replace(/^\/+/, "")}`;
  }
  const clean = p.replace(/^\/+/, "");
  return `${API_ORIGIN}/${clean}`;
}
