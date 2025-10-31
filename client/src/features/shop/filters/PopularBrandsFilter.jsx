/**
 * PopularBrandsFilter
 * Summary: Checkbox grid that writes comma-separated `brand` into URL params.

 */

import React, { useMemo } from "react";
import { Box, Typography, FormControlLabel, Checkbox } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { BRAND_CASE, ORANGE } from "./constants";

/**
 * Render popular brand checkboxes; writes comma-separated `brand`.
 */
export default function PopularBrandsFilter() {
  const [sp, setSp] = useSearchParams();

  const selectedBrands = useMemo(
    () => (sp.get("brand") || "").split(",").map((s) => s.trim()).filter(Boolean),
    [sp]
  );

  const writeParams = (obj) => {
    const next = new URLSearchParams(sp);
    Object.entries(obj).forEach(([k, v]) => (v ? next.set(k, String(v)) : next.delete(k)));
    next.set("page", "1");
    setSp(next);
  };

  const toggleBrand = (label) => {
    const actual = BRAND_CASE[label] || label;
    const set = new Set(selectedBrands);
    set.has(actual) ? set.delete(actual) : set.add(actual);
    writeParams({ brand: set.size ? Array.from(set).join(",") : null });
  };

  return (
    <>
      <Typography sx={{ fontWeight: 700, fontSize: 12, color: "#5F6C72", mb: 1 }}>
        POPULAR BRANDS
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 0.5,
        }}
      >
        {Object.keys(BRAND_CASE).map((label) => {
          const actual = BRAND_CASE[label] || label;
          const checked = selectedBrands.includes(actual); //  reuse memoized parse
          return (
            <FormControlLabel
              key={label}
              control={
                <Checkbox
                  checked={checked}
                  onChange={() => toggleBrand(label)}
                  size="small"
                  sx={{
                    color: checked ? ORANGE : "#98A2B3",
                    "&.Mui-checked": { color: ORANGE },
                  }}
                  aria-label={`Filter brand ${label}`}
                />
              }
              label={<Typography sx={{ fontSize: 13 }}>{label}</Typography>}
            />
          );
        })}
      </Box>
    </>
  );
}
