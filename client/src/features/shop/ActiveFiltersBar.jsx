/**
 * ActiveFiltersBar
 * Summary: Renders active search filters as removable chips + result count.

 */

import React, { useMemo } from "react";
import { Box, Chip, Typography } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrency, selectRates } from "../../store/slices/settingsSlice";
import { convert, formatMoney } from "../../utils/money";

const LIGHT = "#F6F8FA";
const DARK  = "#191C1F";

/**
 * Displays currently applied filters as chips and allows removing them.
 */
export default function ActiveFiltersBar() {
  const [sp, setSp] = useSearchParams();
  const currency = useSelector(selectCurrency);
  const rates    = useSelector(selectRates);

  /* ========================= NEW/REVISED LOGIC =========================
   * PRO: Build chip list defensively:
   * - Trim tokens, drop empties.
   * - Price label adapts if only min OR only max is present.
   */
  const chipItems = useMemo(() => {
    const arr = [];
    const push = (k, label) => arr.push({ k, label });

    const category = sp.get("category");
    if (category) push("category", category);

    const q = sp.get("q");
    if (q) push("q", `“${q}”`);

    const brand = sp.get("brand");
    if (brand) {
      brand
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean)
        .forEach((b) => push("brand", b));
    }

    const tags = sp.get("tags");
    if (tags) {
      tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((t) => push("tags", t));
    }

    const min = sp.get("minPrice");
    const max = sp.get("maxPrice");
    if (min || max) {
      const fmtUSD = (usd) => formatMoney(convert(Number(usd || 0), rates, currency), currency);
      const label =
        min && max ? `${fmtUSD(min)} – ${fmtUSD(max)}`
        : min ? `≥ ${fmtUSD(min)}`
        : `≤ ${fmtUSD(max)}`;
      push("price", label);
    }

    return arr;
  }, [sp, currency, rates]);

  const results = sp.get("results") || "";
  if (!chipItems.length && !results) return null;

  const removeChip = (c) => {
    const next = new URLSearchParams(sp.toString());
    if (c.k === "brand" || c.k === "tags") {
      const list   = next.get(c.k)?.split(",").map((x) => x.trim()).filter(Boolean) || [];
      const pruned = list.filter((x) => x !== c.label);
      if (pruned.length) next.set(c.k, pruned.join(",")); else next.delete(c.k);
    } else if (c.k === "price") {
      next.delete("minPrice"); next.delete("maxPrice");
    } else {
      next.delete(c.k);
    }
    next.set("page", "1");
    setSp(next, { replace: true });
  };

  return (
    <Box
      sx={{
        bgcolor: LIGHT,
        borderRadius: 1,
        px: { xs: 1.25, sm: 2 },
        py: 1.25,
        mb: 2,
        display: "flex",
        alignItems: "center",
        gap: 1,
        flexWrap: "wrap",
      }}
    >
      <Typography sx={{ color: "#6B7280", fontWeight: 700, mr: 0.5, fontSize: 13 }}>
        Active Filters:
      </Typography>
      {chipItems.map((c, i) => (
        <Chip
          key={`${c.k}-${c.label}-${i}`}
          label={c.label}
          onDelete={() => removeChip(c)}
          sx={{ bgcolor: "#fff" }}
        />
      ))}
      <Box sx={{ ml: "auto" }}>
        {results ? (
          <Typography sx={{ color: DARK, fontWeight: 800, fontSize: 13 }} aria-live="polite">
            {Number(results).toLocaleString()} Results found.
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}
