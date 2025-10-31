// src/theme/theme.js
import { createTheme } from "@mui/material/styles";
import { colors, z } from "./tokens";

/* ========================= NEW LOGIC =========================
 * - Centralize z-index from tokens (header/modals alignment).
 * - Slightly tighter radii/weights are preserved.
 * - Add responsive font sizes for h1–h3 without breaking Figma look.
 * ============================================================ */

const theme = createTheme({
  palette: {
    primary: { main: colors.brand, contrastText: colors.white },
    secondary: { main: colors.brandAlt, contrastText: colors.white },
    warning: { main: colors.accent, contrastText: colors.dark },
    text: { primary: colors.text, secondary: colors.textMuted },
    background: { default: colors.white, paper: colors.white },
    divider: colors.border,
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: `"Public Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans"`,
    h1: { fontWeight: 700, color: colors.dark, fontSize: "2rem", "@media (min-width:900px)": { fontSize: "2.25rem" } },
    h2: { fontWeight: 700, color: colors.dark, fontSize: "1.6rem", "@media (min-width:900px)": { fontSize: "1.8rem" } },
    h3: { fontWeight: 700, color: colors.dark, fontSize: "1.3rem", "@media (min-width:900px)": { fontSize: "1.45rem" } },
    subtitle1: { fontWeight: 600, color: colors.dark },
    body1: { color: colors.text },
    body2: { color: colors.textMuted },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 700, borderRadius: 8 },
        containedPrimary: { background: colors.brand, "&:hover": { background: colors.brandDark } },
        outlinedPrimary: {
          borderColor: colors.brand, color: colors.brand,
          "&:hover": { borderColor: colors.brandDark, color: colors.brandDark },
        },
        textPrimary: { color: colors.brand, "&:hover": { backgroundColor: "rgba(255,106,0,.08)" } },
      },
    },
    MuiIconButton: { styleOverrides: { root: { color: colors.dark } } },
    MuiPaper: { styleOverrides: { root: { borderRadius: 8 } } },
  },
  zIndex: {
    appBar: z.header,       // keep header above content
    modal: z.modal,         // dialog > dropdown
    fab: z.modal + 10,
  },
});

export default theme;
