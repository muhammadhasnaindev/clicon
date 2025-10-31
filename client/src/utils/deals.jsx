// src/utils/deals.js (or keep with your existing constants if you prefer)
export const DEALS_DEFAULT_DAYS = 16; // change to 10 when needed

/* ===================== NEW LOGIC =====================
 * - Accept Date/string/number in dealEndsAt
 * - Ignore past/invalid dates
 * - If none valid, fallback to now + fallbackDays
 * ==================================================== */
export const computeSoonestEndISO = (items = [], fallbackDays = DEALS_DEFAULT_DAYS) => {
  const now = Date.now();
  const toMs = (v) => {
    if (!v && v !== 0) return NaN;
    const d = v instanceof Date ? v : new Date(v);
    return +d;
  };
  const ends = items
    .map((p) => toMs(p?.dealEndsAt))
    .filter((ms) => Number.isFinite(ms) && ms > now);

  const target = ends.length ? Math.min(...ends) : now + fallbackDays * 24 * 60 * 60 * 1000;
  return new Date(target).toISOString();
};
