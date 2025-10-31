// src/theme/tokens.js
/* 
 * Exposes both legacy single-color exports and grouped objects.
 */

/* ========================= NEW LOGIC =========================
 * - Single source of truth for colors + z-index.
 * - Also export legacy ORANGE/BLUE/DARK/MUTED/BORDER for older imports.
 * ============================================================ */

export const colors = {
  brand: "#FF6A00",      // primary CTA (orange)
  brandDark: "#E65A00",  // primary hover
  brandAlt: "#1B6392",   // blue (top bar, accents)
  accent: "#EBC80C",     // yellow badges
  dark: "#191C1F",       // headings
  text: "#191C1F",
  textMuted: "#5F6C72",
  border: "#E0E0E0",
  bg: "#F5F7F9",
  white: "#FFFFFF",
};

// z-index scale for consistent layering
export const z = {
  header: 1100,
  dropdown: 1200,
  modal: 1300,
};

/* -------- Legacy named exports (kept for backwards compat) -------- */
export const ORANGE = "#FA8232";
export const BLUE = "#1B6392";
export const DARK = "#191C1F";
export const MUTED = "#5F6C72";
export const BORDER = "#E5E7EB";
