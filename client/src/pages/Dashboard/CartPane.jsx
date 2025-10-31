// src/pages/account/CartPane.jsx
/**
 * Cart page: clean header + roomy container.

 */
import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import ShoppingCart from "../../features/cart/ShoppingCart";

export default function CartPane() {
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
      aria-label="Shopping Cart"
    >
      {/* Page header strip (separate from the component’s internal card) */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, md: 2 },
          border: "1px solid #E5E7EB",
          borderRadius: 2,
          mb: 2,
          overflow: "visible",
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 20, lineHeight: 1.3 }}>
          Shopping Cart
        </Typography>
        <Typography sx={{ color: "#6B7280", fontSize: 13, mt: 0.25 }}>
          Review items, update quantities, and apply coupons.
        </Typography>
      </Paper>

      {/* Main cart UI (already responsive) */}
      <ShoppingCart />
    </Box>
  );
}
