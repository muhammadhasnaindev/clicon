// src/theme/headerParts.js
// header piece heights (desktop defaults). we measure at runtime too.
export const HEADER_PARTS = {
  announcement: 48,
  top: 52,
  middle: 72,
  bottom: 80,
  breadcrumb: 48,
};

/** Compute sum of provided parts.
 * Accepts a partial map; missing keys are treated as 0.
 */
export const computeHeaderOffset = (parts = {}) =>
  Object.values(parts).reduce((n, v) => n + (v || 0), 0);

/* ========================= NEW LOGIC =========================
 * Runtime-aware helpers so pages can align their first fold even
 * if some header rows are conditionally hidden or resized.
 * - `coerceHeights`: keeps numbers sane (>=0, finite).
 * - `measureHeaderPartsFromDOM`: reads clientHeight of known rows.
 * - `mergeHeaderParts`: overlay runtime measures on defaults.
 * ============================================================ */

/** Ensure all heights are safe non-negative numbers. */
export function coerceHeights(map = {}) {
  const out = {};
  for (const [k, v] of Object.entries(map)) {
    const n = Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0;
    out[k] = n;
  }
  return out;
}

/** Measure heights by query selectors (ids/classes you actually render). */
export function measureHeaderPartsFromDOM(selectors = {}) {
  if (typeof document === "undefined") return {};
  const out = {};
  for (const [k, sel] of Object.entries(selectors)) {
    const el = sel ? document.querySelector(sel) : null;
    out[k] = el ? el.clientHeight || 0 : 0;
  }
  return coerceHeights(out);
}

/** Merge measured heights over the static defaults. */
export function mergeHeaderParts(defaults = HEADER_PARTS, measured = {}) {
  const a = coerceHeights(defaults);
  const b = coerceHeights(measured);
  return { ...a, ...b };
}

/** Convenience: compute final offset with optional DOM selectors. */
export function headerOffsetWithDOM(selectors) {
  const measured = measureHeaderPartsFromDOM(selectors);
  return computeHeaderOffset(mergeHeaderParts(HEADER_PARTS, measured));
}
