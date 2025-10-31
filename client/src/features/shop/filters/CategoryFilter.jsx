/**
 * CategoryFilter
 * Summary: Radio list that writes `category` to URL search params and resets page.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, RadioGroup, FormControlLabel, Radio, Skeleton } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { ORANGE, GRAY_RING, FALLBACK_CATEGORIES } from "./constants";

const SKELETON_ROWS = 6;

const CatUncheckedIcon = (
  <Box sx={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${GRAY_RING}`, bgcolor: "#fff" }} />
);
const CatCheckedIcon = (
  <Box sx={{ width: 20, height: 20, borderRadius: "50%", border: `6px solid ${ORANGE}`, bgcolor: "#fff" }} />
);

/**
 * Render category list; choosing a category sets `category` in URL params.
 */
export default function CategoryFilter() {
  const [sp, setSp] = useSearchParams();
  const [catItems, setCatItems] = useState(null);

  /* ========================= NEW/REVISED LOGIC =========================
   * PRO: Normalize backend response; keep UI non-blocking on failures.
   * - If the endpoint requires cookies, `credentials: "include"` avoids silent 401s.
   */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/products/categories", { credentials: "include" });
        if (!r.ok) throw new Error(`Categories fetch failed (HTTP ${r.status})`);
        const json = await r.json();
        const arr = Array.isArray(json?.categories) ? json.categories : Array.isArray(json) ? json : [];
        if (alive) setCatItems(arr.filter((c) => c && (c.name || c.label)));
      } catch {
        if (alive) setCatItems([]); // show fallbacks, keep UX flowing
      }
    })();
    return () => { alive = false; };
  }, []);

  const categories = useMemo(() => {
    if (!catItems || !catItems.length) return FALLBACK_CATEGORIES.map((name) => ({ name, count: undefined }));
    return catItems.map((c) => ({ name: c.name || c.label, count: typeof c.count === "number" ? c.count : undefined }));
  }, [catItems]);

  const selectedCategory = sp.get("category") || "";

  const writeParams = (obj) => {
    const next = new URLSearchParams(sp);
    Object.entries(obj).forEach(([k, v]) => (v ? next.set(k, String(v)) : next.delete(k)));
    next.set("page", "1");
    setSp(next);
  };

  return (
    <>
      <Typography sx={{ fontWeight: 700, fontSize: 12, color: "#5F6C72", mb: 1 }}>
        CATEGORY
      </Typography>

      {!catItems && (
        <Box sx={{ mb: 1 }}>
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <Skeleton key={i} height={18} sx={{ mb: 1 }} />
          ))}
        </Box>
      )}

      <RadioGroup
        aria-label="Filter by category"
        value={selectedCategory}
        onChange={(e) => writeParams({ category: e.target.value })}
        sx={{
          maxHeight: { xs: 280, md: "none" },
          overflowY: { xs: "auto", md: "visible" },
          pr: 0.5,
          "& .MuiFormControlLabel-root": { mb: 0.75, alignItems: "flex-start" },
          "& .MuiFormControlLabel-label": { fontSize: 13, color: "#2E3338", width: "100%" },
          scrollbarWidth: "thin",
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-thumb": { background: "#e3e5e7", borderRadius: 6 },
        }}
      >
        {categories.map(({ name, count }) => (
          <FormControlLabel
            key={name}
            value={name}
            control={<Radio size="small" icon={CatUncheckedIcon} checkedIcon={CatCheckedIcon} sx={{ p: 0.25 }} />}
            label={
              <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 1 }}>
                <Typography sx={{ fontSize: 13 }} noWrap title={name}>{name}</Typography>
                {typeof count === "number" && (
                  <Typography sx={{ fontSize: 12, color: "#98A2B3", flexShrink: 0 }}>
                    {count}
                  </Typography>
                )}
              </Box>
            }
          />
        ))}
      </RadioGroup>
    </>
  );
}
