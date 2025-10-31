// src/components/.../AllCategoryDropdown.jsx
/**
 * Summary:
 * Responsive categories mega-dropdown; inline on mobile, fixed on desktop.
 
 */

import React, { useEffect, useMemo, useState } from "react";
import { Box, List, ListItemButton, Typography, Skeleton } from "@mui/material";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { alpha } from "@mui/material/styles";
import CategoryMenuContent from "./CategoryMenuContent";
import { useGetCategoriesQuery } from "../../../store/api/apiSlice";

const DROPDOWN_WIDTH = 950;
const H_MARGIN = 8;

export default function AllCategoryDropdown({ buttonRef, dropdownRef, onClose }) {
  const { data, isLoading } = useGetCategoriesQuery();

  const categories = useMemo(() => {
    const arr = Array.isArray(data?.categories)
      ? data.categories
      : Array.isArray(data)
      ? data
      : [];
    return Array.isArray(arr) ? arr : [];
  }, [data]);

  const [activeCat, setActiveCat] = useState(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Pick first category once data is ready (avoid empty state).
  useEffect(() => {
    if (!activeCat && categories.length) setActiveCat(categories[0]);
  }, [categories, activeCat]);

  const isInlineMobile = !buttonRef?.current;

  // PRO: Recalculate anchored position on mount/resize/scroll; clamp to viewport.
  useEffect(() => {
    if (isInlineMobile) return;
    const update = () => {
      const rect = buttonRef?.current?.getBoundingClientRect?.();
      if (!rect) return;
      let left = rect.left;
      const maxLeft = window.innerWidth - DROPDOWN_WIDTH - H_MARGIN;
      if (left > maxLeft) left = Math.max(H_MARGIN, maxLeft);
      setPos({ top: rect.bottom + 5, left });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [buttonRef, isInlineMobile]);

  return (
    <Box
      ref={dropdownRef}
      sx={{
        position: isInlineMobile ? "relative" : "fixed",
        top: isInlineMobile ? "auto" : pos.top,
        left: isInlineMobile ? "auto" : { xs: H_MARGIN, md: pos.left },
        right: isInlineMobile ? "auto" : { xs: H_MARGIN, md: "auto" },
        width: isInlineMobile ? "100%" : { xs: `calc(100vw - ${H_MARGIN * 2}px)`, md: "auto" },
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: { xs: 1.5, md: 3 },
        zIndex: 1400,
        height: { xs: "auto", md: 420 },
        maxHeight: { xs: "unset", md: 420 },
      }}
    >
      {/* categories column */}
      <Box
        sx={{
          backgroundColor: "#fff",
          borderRadius: 1,
          boxShadow: isInlineMobile ? "none" : "0 8px 30px rgba(0,0,0,0.08)",
          p: 1,
          width: { xs: "100%", md: 240 },
          overflowY: { xs: "visible", md: "auto" },
          border: "1px solid #E5E7EB",
        }}
      >
        {isLoading ? (
          <Box sx={{ p: 1 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={36} sx={{ mb: 1, borderRadius: 1 }} />
            ))}
          </Box>
        ) : (
          <List
            sx={{
              p: 0,
              display: "flex",
              flexDirection: "column",
              overflowX: "hidden",
              borderBottom: 0,
            }}
          >
            {categories.map((cat) => {
              const key = cat.id || cat._id || cat.name;
              const selected = activeCat?.name === cat.name;
              return (
                <ListItemButton
                  key={key}
                  selected={selected}
                  onClick={() => setActiveCat(cat)}
                  sx={{
                    px: 1.5,
                    py: 0.8,
                    borderRadius: 0.8,
                    "&.Mui-selected": { backgroundColor: "#F7F8FA", fontWeight: "bold" },
                    "&:hover": { backgroundColor: alpha("#1B6392", 0.04) },
                  }}
                >
                  <Typography fontSize={14} noWrap title={cat.name} sx={{ flex: 1 }}>
                    {cat.name}
                  </Typography>
                  <Typography fontSize={12} color="text.secondary" sx={{ mr: 1 }}>
                    ({cat.count || 0})
                  </Typography>
                  {!isInlineMobile && selected && <KeyboardArrowRightIcon sx={{ ml: "auto" }} />}
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>

      {/* content */}
      <Box
        sx={{
          backgroundColor: "#fff",
          borderRadius: 1,
          boxShadow: isInlineMobile ? "none" : "0 8px 30px rgba(0,0,0,0.08)",
          minWidth: { xs: "100%", md: 700 },
          overflowY: "auto",
          border: "1px solid #E5E7EB",
          flex: 1,
        }}
      >
        {activeCat ? (
          <CategoryMenuContent category={activeCat} onClose={onClose} />
        ) : (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="text" width={180} />
            <Skeleton variant="rectangular" height={260} sx={{ mt: 1, borderRadius: 1 }} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
