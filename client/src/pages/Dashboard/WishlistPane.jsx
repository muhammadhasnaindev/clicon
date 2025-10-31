// src/pages/account/WishlistPane.jsx
/**
 * WishlistPane
 * - Consistent container rhythm with Cart, unclipped overlays.
 * - ===== NEW LOGIC: live count header + subtle empty-state hint (delegated to table) =====
 */

import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import WishlistTable from "../../features/wishlist/WishlistTable";

export default function WishlistPane() {
  // ===== NEW LOGIC: robust selector with fallback =====
  const items = useSelector((s) => s.wishlist?.items || []);
  const count = Array.isArray(items) ? items.length : 0;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1320,
        mx: "auto",
        px: { xs: 2, md: 4 },
        py: { xs: 2, md: 3 },
        overflow: "visible",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, md: 2 },
          border: "1px solid #E5E7EB",
          borderRadius: 2,
          mb: 2,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 1,
          overflow: "visible",
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 20, lineHeight: 1.3 }}>
          Wishlist
        </Typography>
        <Typography sx={{ color: "#6B7280", fontSize: 13 }}>
          {count} {count === 1 ? "item" : "items"}
        </Typography>
      </Paper>

      <WishlistTable />
    </Box>
  );
}
