/**
 * PopularTagsFilter
 * Summary: Clickable chips that write a simple OR regex into `q`.
 
 */

import React from "react";
import { Box, Typography, Chip } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { POPULAR_TAGS, ORANGE, BORDER } from "./constants";

/**
 * Render popular tag chips and toggle presence in a basic `(A|B)` query regex.
 */
export default function PopularTagsFilter() {
  const [sp, setSp] = useSearchParams();

  const writeParams = (obj) => {
    const next = new URLSearchParams(sp);
    Object.entries(obj).forEach(([k, v]) => (v ? next.set(k, String(v)) : next.delete(k)));
    next.set("page", "1");
    setSp(next);
  };

  const toggleTag = (label) => {
    const q = sp.get("q") || "";
    const set = new Set();
    POPULAR_TAGS.forEach((t) => {
      if (new RegExp(t, "i").test(q)) set.add(t);
    });
    set.has(label) ? set.delete(label) : set.add(label);
    const regex = set.size ? `(${Array.from(set).join("|")})` : null;
    writeParams({ q: regex });
  };

  return (
    <>
      <Typography sx={{ fontWeight: 700, fontSize: 12, color: "#5F6C72", mb: 1 }}>
        POPULAR TAG
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {POPULAR_TAGS.map((t) => {
          const isActive = new RegExp(t, "i").test(sp.get("q") || "");
          return (
            <Chip
              key={t}
              label={t}
              onClick={() => toggleTag(t)}
              aria-label={`Toggle tag ${t}`}
              sx={{
                height: 32,
                px: 1.25,
                borderRadius: "8px",
                border: isActive ? `1.5px solid ${ORANGE}` : `1.5px solid ${BORDER}`,
                bgcolor: isActive ? "rgba(250,130,50,0.08)" : "#fff",
                color: isActive ? ORANGE : "#344054",
                fontWeight: isActive ? 700 : 500,
                "&:hover": { borderColor: ORANGE },
              }}
            />
          );
        })}
      </Box>
    </>
  );
}
