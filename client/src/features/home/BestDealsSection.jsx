/**
 * BestDealsSection
 * Summary: Section header with a global countdown + responsive product grid.
 */

import React, { useMemo, useState, useEffect } from "react";
import { Box, Typography, Button, Stack, Grid, Skeleton } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrency, selectRates } from "../../store/slices/settingsSlice";
import { convert, formatMoney } from "../../utils/money";
import ProductCardGrid from "../shop/ProductCardGrid";

const BLUE = "#1B6392";
const DARK = "#191C1F";
const MUTED = "#5F6C72";

/* ========================= NEW/REVISED LOGIC =========================
 * PRO: Centralize timing values to avoid "magic numbers" and make tests easier.
 */
const ONE_SECOND_MS = 1000;
const ONE_MINUTE_MS = 60 * ONE_SECOND_MS;
const ONE_HOUR_MS   = 60 * ONE_MINUTE_MS;
const ONE_DAY_MS    = 24 * ONE_HOUR_MS;
const COUNTDOWN_TICK_MS = ONE_SECOND_MS;

/**
 * Compact, pill-styled countdown.
 * @param {{ endISO: string, compact?: boolean }} props
 */
function CountdownPills({ endISO, compact = false }) {
  /* ========================= NEW/REVISED LOGIC =========================
   * PRO: Parse target once; if invalid, render "Ended" and don't set intervals.
   * Also, keep state as a number to avoid NaN leaks into the UI.
   */
  const target = useMemo(() => {
    const ms = +new Date(endISO);
    return Number.isFinite(ms) ? ms : NaN;
  }, [endISO]);

  const [leftMs, setLeftMs] = useState(() =>
    Number.isFinite(target) ? Math.max(0, target - Date.now()) : 0
  );

  useEffect(() => {
    if (!Number.isFinite(target)) {
      setLeftMs(0);
      return; // invalid date → show "Ended" without starting a timer
    }
    // If already passed, no timer either
    if (target <= Date.now()) {
      setLeftMs(0);
      return;
    }

    const t = setInterval(() => {
      const next = Math.max(0, target - Date.now());
      setLeftMs(next);
      if (next === 0) clearInterval(t); // stop at zero
    }, COUNTDOWN_TICK_MS);

    return () => clearInterval(t);
  }, [target]);

  if (!leftMs) {
    return (
      <Typography
        sx={{ fontWeight: 700, color: DARK, fontSize: 13 }}
        aria-live="polite"
      >
        Ended
      </Typography>
    );
  }

  const d = Math.floor(leftMs / ONE_DAY_MS);
  const h = Math.floor((leftMs % ONE_DAY_MS) / ONE_HOUR_MS);
  const m = Math.floor((leftMs % ONE_HOUR_MS) / ONE_MINUTE_MS);
  const s = Math.floor((leftMs % ONE_MINUTE_MS) / ONE_SECOND_MS);

  const Pill = ({ children }) => (
    <Box
      sx={{
        px: 1.25,
        py: 0.5,
        bgcolor: "#FFF3C6",
        border: "1px solid #F6E27A",
        borderRadius: 1,
        fontWeight: 800,
        color: DARK,
        minWidth: compact ? 44 : 54,
        textAlign: "center",
        lineHeight: 1.1,
        fontSize: 13,
      }}
    >
      {children}
    </Box>
  );

  return (
    <Stack direction="row" alignItems="center" spacing={0.5} aria-live="polite">
      <Pill>{d}d</Pill>
      <Typography sx={{ fontWeight: 800, color: DARK }}>:</Typography>
      <Pill>{String(h).padStart(2, "0")}h</Pill>
      <Typography sx={{ fontWeight: 800, color: DARK }}>:</Typography>
      <Pill>{String(m).padStart(2, "0")}m</Pill>
      <Typography sx={{ fontWeight: 800, color: DARK }}>:</Typography>
      <Pill>{String(s).padStart(2, "0")}s</Pill>
    </Stack>
  );
}

/* ========================= NEW/REVISED LOGIC =========================
 * PRO: Slightly clearer date building by parsing once; keeps behavior identical.
 */
const computeHeaderEndISO = (items, fallbackDays = 16) => {
  const now = Date.now();
  const ends = (items || [])
    .map((p) => (p?.dealEndsAt ? +new Date(p.dealEndsAt) : NaN))
    .filter((ms) => Number.isFinite(ms) && ms > now);

  const targetMs =
    ends.length > 0 ? Math.min(...ends) : now + fallbackDays * ONE_DAY_MS;

  return new Date(targetMs).toISOString();
};

/**
 * Best deals grid with a global header countdown.
 * @param {{ loading?: boolean, items?: any[], defaultEndsInDays?: number }} props
 */
export default function BestDealsSection({ loading, items = [], defaultEndsInDays = 16 }) {
  const currency = useSelector(selectCurrency);
  const rates = useSelector(selectRates);

  // Keeping fmt for future price display hooks in header if needed.
  const fmt = (v) => formatMoney(convert(Number(v || 0), rates, currency), currency);

  const headerEndISO = useMemo(
    () => computeHeaderEndISO(items, defaultEndsInDays),
    [items, defaultEndsInDays]
  );

  const list = loading ? Array.from({ length: 8 }) : items;

  return (
    <Box sx={{ py: { xs: 4, md: 6 } }}>
      {/* Header */}
      <Box
        sx={{
          maxWidth: 1320,
          mx: "auto",
          px: { xs: 2, md: 0 },
          mb: 2.5,
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: 20, md: 24 },
              color: DARK,
              whiteSpace: "nowrap",
            }}
          >
            Best Deals
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ display: { xs: "none", sm: "flex" }, flexShrink: 0 }}
          >
            <Typography sx={{ color: MUTED, fontSize: 14 }}>Deals end in</Typography>
            <CountdownPills endISO={headerEndISO} />
          </Stack>
        </Stack>

        <Button
          component={RouterLink}
          to="/shop"
          variant="text"
          sx={{ textTransform: "none", color: BLUE, fontWeight: 700, ml: "auto" }}
        >
          {/* ========================= NEW/REVISED LOGIC =========================
             PRO: Corrected copy. */}
          Browse All Products →
        </Button>
      </Box>

      {/* Grid */}
      <Box sx={{ maxWidth: 1320, mx: "auto", px: { xs: 2, md: 0 } }}>
        <Grid container spacing={3}>
          {list.map((p, i) => (
            <Grid item xs={12} sm={6} md={4} key={p?._id || p?.id || p?.slug || i}>
              {loading ? (
                <Box sx={{ border: "1px solid #E0E0E0", borderRadius: 1, p: 2 }}>
                  <Skeleton variant="rectangular" height={130} sx={{ mb: 1 }} />
                  <Skeleton width="90%" />
                  <Skeleton width="70%" />
                  <Skeleton width="40%" />
                </Box>
              ) : (
                <ProductCardGrid product={p} />
              )}
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
